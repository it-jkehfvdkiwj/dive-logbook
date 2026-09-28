import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import {
  importedDiveSchema,
  type DiveImporter,
  type ImportedDive,
  type ImportedSighting,
  type ImportResult,
} from "@/importers/types";
import { deleteOrphanSites, resolveSite } from "./diveSiteService";
import { uniqueSlug } from "./speciesService";

type Tx = Prisma.TransactionClient;

/** Felder, die ein Sync aktualisieren darf (Site wird separat behandelt). */
const SYNC_FIELDS = [
  "date",
  "startTime",
  "diveNumber",
  "maxDepth",
  "avgDepth",
  "duration",
  "waterTemperature",
  "visibility",
  "conditions",
  "current",
  "weather",
  "entryType",
  "diveType",
  "buddy",
  "diveCenter",
  "notes",
] as const;

function toSyncData(d: ImportedDive) {
  return {
    date: new Date(`${d.date}T00:00:00.000Z`),
    startTime: d.startTime ?? null,
    diveNumber: d.diveNumber ?? null,
    maxDepth: d.maxDepth ?? null,
    avgDepth: d.avgDepth ?? null,
    duration: d.duration ?? null,
    waterTemperature: d.waterTemperature ?? null,
    visibility: d.visibility ?? null,
    conditions: d.conditions ?? null,
    current: d.current ?? null,
    weather: d.weather ?? null,
    entryType: d.entryType ?? null,
    diveType: d.diveType ?? null,
    buddy: d.buddy ?? null,
    diveCenter: d.diveCenter ?? null,
    notes: d.notes ?? null,
  };
}

const same = (a: unknown, b: unknown) =>
  a instanceof Date && b instanceof Date ? a.getTime() === b.getTime() : a === b;

/** Kategorie aus dem Namen raten (für neu importierte Arten). */
function guessCategory(name: string): string {
  const n = name.toLowerCase();
  const rules: [RegExp, string][] = [
    [/shark|hai\b|haie/, "Shark"],
    [/\bray\b|manta|stingray|rochen|guitarfish|skate/, "Ray"],
    [/turtle|schildkr/, "Turtle"],
    [/dolphin|delfin/, "Dolphin"],
    [/whale|\bwal\b/, "Whale"],
    [/dugong|seal|sea lion|robbe|seekuh/, "Mammal"],
    [/octopus|squid|cuttlefish|krake|tintenfisch|sepia/, "Cephalopod"],
    [/shrimp|crab|lobster|garnele|krabbe|languste|hummer/, "Crustacean"],
    [/nudibranch|nacktschnecke|sea slug|spanish dancer|flatworm/, "Nudibranch"],
    [/jelly|qualle/, "Jellyfish"],
    [/coral|koralle|anemone/, "Coral"],
    [/star|urchin|cucumber|seestern|seeigel|seegurke/, "Echinoderm"],
  ];
  return rules.find(([re]) => re.test(n))?.[1] ?? "Fish";
}

/** Findet eine Art über externe ID → wissenschaftlichen Namen → Common Name, sonst neu anlegen. */
async function resolveSpecies(tx: Tx, source: string, s: ImportedSighting): Promise<string> {
  if (s.speciesExternalId) {
    const hit = await tx.species.findUnique({
      where: { source_externalId: { source, externalId: s.speciesExternalId } },
      select: { id: true },
    });
    if (hit) return hit.id;
  }
  if (s.scientificName) {
    const hit = await tx.species.findFirst({
      where: { scientificName: { equals: s.scientificName, mode: "insensitive" } },
      select: { id: true },
    });
    if (hit) return hit.id;
  }
  const byName = await tx.species.findFirst({
    where: { commonName: { equals: s.commonName, mode: "insensitive" } },
    select: { id: true },
  });
  if (byName) return byName.id;

  const created = await tx.species.create({
    data: {
      commonName: s.commonName,
      scientificName: s.scientificName ?? null,
      category: s.category ?? guessCategory(s.commonName),
      slug: await uniqueSlug(s.commonName, tx),
      source,
      externalId: s.speciesExternalId ?? null,
    },
    select: { id: true },
  });
  return created.id;
}

async function syncSightings(tx: Tx, source: string, diveId: string, sightings: ImportedSighting[] = []) {
  for (const s of sightings) {
    const speciesId = await resolveSpecies(tx, source, s);
    // Nur ergänzen – manuell hinzugefügte Sichtungen werden nie gelöscht.
    await tx.sighting.upsert({
      where: { diveId_speciesId: { diveId, speciesId } },
      update: {},
      create: { diveId, speciesId, count: s.count ?? null, notes: s.notes ?? null, source },
    });
  }
}

/**
 * Externe Tier-IDs auflösen: bekannte (ExternalSpeciesMap) → Sighting, unbekannte → Dive.pendingExternalSpecies.
 */
async function applyPendingSpecies(
  tx: Tx,
  source: string,
  diveId: string,
  ids: string[],
  extMap: Map<string, string>,
) {
  const unmapped: string[] = [];
  for (const id of ids) {
    const speciesId = extMap.get(id);
    if (!speciesId) {
      unmapped.push(id);
      continue;
    }
    await tx.sighting.upsert({
      where: { diveId_speciesId: { diveId, speciesId } },
      update: {},
      create: { diveId, speciesId, source, externalId: id },
    });
  }
  await tx.dive.update({ where: { id: diveId }, data: { pendingExternalSpecies: unmapped } });
}

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));

/**
 * Führt einen Import aus:
 *   Import → externalId vergleichen → neue Dives anlegen → bestehende aktualisieren
 *   → manuell geänderte Felder nicht überschreiben (außer in Settings erlaubt).
 */
export async function runImport(importer: DiveImporter, userId: string): Promise<ImportResult> {
  const settings = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const run = await db.importRun.create({ data: { source: importer.source, userId } });
  const result: ImportResult = { runId: run.id, source: importer.source, created: 0, updated: 0, skipped: 0, errors: [] };

  try {
    const raw = await importer.importDives();

    // Performance: bestehende Dives dieser Quelle einmal laden, Sites pro Lauf cachen.
    // Unveränderte Dives kosten so keine Einzel-Queries (wichtig bei vielen Dives / weit entfernter DB).
    const existingDives = await db.dive.findMany({
      where: { userId, source: importer.source, externalId: { not: null } },
    });
    const existingByExt = new Map(existingDives.map((d) => [d.externalId!, d]));
    const siteCache = new Map<string, string>();
    const unchangedIds: string[] = [];
    const now = new Date();
    const extMap = new Map(
      (await db.externalSpeciesMap.findMany({ where: { source: importer.source } })).map((m) => [m.externalId, m.speciesId]),
    );

    for (const item of raw) {
      const parsed = importedDiveSchema.safeParse(item);
      if (!parsed.success) {
        result.skipped++;
        const externalId = (item as { externalId?: unknown })?.externalId;
        result.errors.push({
          externalId: typeof externalId === "string" ? externalId : undefined,
          message: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
        });
        continue;
      }
      const dive = parsed.data;
      const siteKey =
        dive.site.externalId ??
        [dive.site.name, dive.site.location ?? "", dive.site.country ?? ""].join("|").toLowerCase();
      let diveSiteId = siteCache.get(siteKey);
      if (!diveSiteId) {
        diveSiteId = await resolveSite(userId, {
          name: dive.site.name,
          location: dive.site.location ?? null,
          country: dive.site.country ?? null,
          latitude: dive.site.latitude ?? null,
          longitude: dive.site.longitude ?? null,
          source: importer.source,
          externalId: dive.site.externalId ?? null,
        });
        siteCache.set(siteKey, diveSiteId);
      }
      const siteId = diveSiteId;
      const data = toSyncData(dive);
      const existing = existingByExt.get(dive.externalId);

      if (!existing) {
        await db.$transaction(async (tx) => {
          const created = await tx.dive.create({
            data: {
              ...data,
              userId,
              diveSiteId: siteId,
              source: importer.source,
              externalId: dive.externalId,
              lastSyncedAt: now,
              photos: dive.photos?.length
                ? {
                    create: dive.photos.map((p) => ({
                      url: p.url,
                      caption: p.caption ?? null,
                      source: importer.source,
                      externalId: p.externalId ?? null,
                    })),
                  }
                : undefined,
            },
          });
          await syncSightings(tx, importer.source, created.id, dive.sightings);
          if (dive.pendingSpeciesIds?.length) {
            await applyPendingSpecies(tx, importer.source, created.id, dive.pendingSpeciesIds, extMap);
          }
          existingByExt.set(dive.externalId, created);
        });
        result.created++;
        continue;
      }

      const protectedFields = settings.syncOverwriteManualEdits ? new Set<string>() : new Set(existing.manuallyEditedFields);
      const update: Prisma.DiveUncheckedUpdateInput = {};
      for (const field of SYNC_FIELDS) {
        if (protectedFields.has(field)) continue;
        if (!same(existing[field], data[field])) Object.assign(update, { [field]: data[field] });
      }
      if (!protectedFields.has("diveSite") && existing.diveSiteId !== siteId) update.diveSiteId = siteId;

      const changed = Object.keys(update).length > 0;
      const pending = dive.pendingSpeciesIds ?? [];
      const pendingNeedsWork =
        pending.some((id) => extMap.has(id)) || !sameSet(pending.filter((id) => !extMap.has(id)), existing.pendingExternalSpecies);
      if (!changed && !dive.sightings?.length && !pendingNeedsWork && !settings.syncOverwriteManualEdits) {
        unchangedIds.push(existing.id);
        result.skipped++;
        continue;
      }

      await db.$transaction(async (tx) => {
        await tx.dive.update({
          where: { id: existing.id },
          data: {
            ...update,
            lastSyncedAt: now,
            ...(settings.syncOverwriteManualEdits ? { manuallyEditedFields: [] } : {}),
          },
        });
        await syncSightings(tx, importer.source, existing.id, dive.sightings);
        if (pendingNeedsWork) await applyPendingSpecies(tx, importer.source, existing.id, pending, extMap);
      });
      if (changed) result.updated++;
      else result.skipped++;
    }

    if (unchangedIds.length) {
      await db.dive.updateMany({ where: { id: { in: unchangedIds } }, data: { lastSyncedAt: now } });
    }

    await deleteOrphanSites();
    await db.importRun.update({
      where: { id: run.id },
      data: {
        status: "success",
        finishedAt: new Date(),
        created: result.created,
        updated: result.updated,
        skipped: result.skipped,
        error: result.errors.length ? `${result.errors.length} invalid record(s)` : null,
        log: buildLog(importer, result),
      },
    });
    result.log = importer.diagnostics?.();
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db.importRun.update({
      where: { id: run.id },
      data: { status: "failed", finishedAt: new Date(), error: message, log: buildLog(importer, result) },
    });
    throw err;
  }
}

function buildLog(importer: DiveImporter, result: ImportResult): string | null {
  const lines = [...(importer.diagnostics?.() ?? [])];
  for (const e of result.errors.slice(0, 10)) lines.push(`invalid ${e.externalId ?? "?"}: ${e.message}`);
  return lines.length ? lines.join("\n").slice(0, 12000) : null;
}

export async function listImportRuns(userId: string, take = 10) {
  return db.importRun.findMany({ where: { userId }, orderBy: { startedAt: "desc" }, take });
}
