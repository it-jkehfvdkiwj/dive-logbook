import { db } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";

export interface UnmappedExternalSpecies {
  externalId: string;
  diveCount: number;
  dives: { id: string; date: Date; siteName: string; diveNumber: number | null }[];
  /** Andere (bereits bekannte) Tiere derselben Tauchgänge – hilft beim Erkennen */
  seenWith: string[];
}

/** Unbekannte Tier-IDs (z. B. aus SSI) in den Tauchgängen des Benutzers. */
export async function listUnmappedExternalSpecies(userId: string, source = "ssi"): Promise<UnmappedExternalSpecies[]> {
  const dives = await db.dive.findMany({
    where: { userId, source, NOT: { pendingExternalSpecies: { isEmpty: true } } },
    select: {
      id: true,
      date: true,
      diveNumber: true,
      pendingExternalSpecies: true,
      diveSite: { select: { name: true } },
      sightings: { select: { species: { select: { commonName: true } } } },
    },
    orderBy: { date: "desc" },
  });
  const byId = new Map<string, UnmappedExternalSpecies & { seen: Set<string> }>();
  for (const d of dives) {
    for (const ext of d.pendingExternalSpecies) {
      const entry = byId.get(ext) ?? { externalId: ext, diveCount: 0, dives: [], seenWith: [], seen: new Set<string>() };
      entry.diveCount++;
      entry.dives.push({ id: d.id, date: d.date, siteName: d.diveSite.name, diveNumber: d.diveNumber });
      d.sightings.forEach((s) => entry.seen.add(s.species.commonName));
      byId.set(ext, entry);
    }
  }
  return [...byId.values()]
    .map(({ seen, ...e }) => ({ ...e, seenWith: [...seen].slice(0, 6) }))
    .sort((a, b) => b.diveCount - a.diveCount || a.externalId.localeCompare(b.externalId));
}

export async function countUnmappedExternalSpecies(userId: string, source = "ssi"): Promise<number> {
  return (await listUnmappedExternalSpecies(userId, source)).length;
}

/**
 * Ordnet eine externe Tier-ID einer Art zu und trägt sie sofort bei allen betroffenen
 * Tauchgängen (aller Benutzer – die ID stammt aus dem globalen Katalog der Quelle) ein.
 */
export async function mapExternalSpecies(source: string, externalId: string, speciesId: string) {
  const species = await db.species.findUnique({ where: { id: speciesId }, select: { id: true } });
  if (!species) throw new NotFoundError("Species");
  return db.$transaction(async (tx) => {
    await tx.externalSpeciesMap.upsert({
      where: { source_externalId: { source, externalId } },
      update: { speciesId },
      create: { source, externalId, speciesId },
    });
    const dives = await tx.dive.findMany({
      where: { source, pendingExternalSpecies: { has: externalId } },
      select: { id: true, pendingExternalSpecies: true },
    });
    for (const d of dives) {
      await tx.sighting.upsert({
        where: { diveId_speciesId: { diveId: d.id, speciesId } },
        update: {},
        create: { diveId: d.id, speciesId, source, externalId },
      });
      await tx.dive.update({
        where: { id: d.id },
        data: { pendingExternalSpecies: d.pendingExternalSpecies.filter((x) => x !== externalId) },
      });
    }
    return { updatedDives: dives.length };
  });
}
