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
import { getSettings } from "./settingsService";
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
      category: s.category ?? "Other",
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
 * Führt einen Import aus:
 *   Import → externalId vergleichen → neue Dives anlegen → bestehende aktualisieren
 *   → manuell geänderte Felder nicht überschreiben (außer in Settings erlaubt).
 */
export async function runImport(importer: DiveImporter): Promise<ImportResult> {
  const settings = await getSettings();
  const run = await db.importRun.create({ data: { source: importer.source } });
  const result: ImportResult = { runId: run.id, source: importer.source, created: 0, updated: 0, skipped: 0, errors: [] };

  try {
    const raw = await importer.importDives();

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

      await db.$transaction(async (tx) => {
        const now = new Date();
        const diveSiteId = await resolveSite(
          {
            name: dive.site.name,
            location: dive.site.location ?? null,
            country: dive.site.country ?? null,
            latitude: dive.site.latitude ?? null,
            longitude: dive.site.longitude ?? null,
            source: importer.source,
            externalId: dive.site.externalId ?? null,
          },
          tx,
        );
        const data = toSyncData(dive);

        const existing = await tx.dive.findUnique({
          where: { source_externalId: { source: importer.source, externalId: dive.externalId } },
        });

        if (!existing) {
          const created = await tx.dive.create({
            data: {
              ...data,
              diveSiteId,
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
          result.created++;
          return;
        }

        const protectedFields = settings.syncOverwriteManualEdits ? new Set<string>() : new Set(existing.manuallyEditedFields);
        const update: Prisma.DiveUncheckedUpdateInput = {};
        for (const field of SYNC_FIELDS) {
          if (protectedFields.has(field)) continue;
          if (!same(existing[field], data[field])) Object.assign(update, { [field]: data[field] });
        }
        if (!protectedFields.has("diveSite") && existing.diveSiteId !== diveSiteId) update.diveSiteId = diveSiteId;

        await tx.dive.update({
          where: { id: existing.id },
          data: {
            ...update,
            lastSyncedAt: now,
            ...(settings.syncOverwriteManualEdits ? { manuallyEditedFields: [] } : {}),
          },
        });
        await syncSightings(tx, importer.source, existing.id, dive.sightings);
        if (Object.keys(update).length) result.updated++;
        else result.skipped++;
      });
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
      },
    });
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db.importRun.update({
      where: { id: run.id },
      data: { status: "failed", finishedAt: new Date(), error: message },
    });
    throw err;
  }
}

export async function listImportRuns(take = 10) {
  return db.importRun.findMany({ orderBy: { startedAt: "desc" }, take });
}
