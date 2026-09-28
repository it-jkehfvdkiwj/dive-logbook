import { db } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";
import { lookupInatTaxon, sleep } from "@/lib/inaturalist";

export interface EnrichResult {
  checked: number;
  updated: number;
  remaining: number;
  failed: number;
}

/**
 * Ergänzt Foto, Bildnachweis und deutschen Namen aus iNaturalist.
 * Überschreibt nur leere Felder – außer bei `force` (dann Foto + Name neu).
 */
export async function enrichSpecies(id: string, opts: { force?: boolean } = {}): Promise<boolean> {
  const s = await db.species.findUnique({ where: { id } });
  if (!s) throw new NotFoundError("Species");
  const info = await lookupInatTaxon(s.scientificName, s.commonName);
  const data: {
    enrichedAt: Date;
    inatTaxonId?: number;
    imageUrl?: string;
    imageAttribution?: string | null;
    commonNameDe?: string;
  } = { enrichedAt: new Date() };
  if (info) {
    data.inatTaxonId = info.taxonId;
    if (info.photoUrl && (opts.force || !s.imageUrl)) {
      data.imageUrl = info.photoUrl;
      data.imageAttribution = info.attribution;
    }
    if (info.nameDe && (opts.force || !s.commonNameDe)) data.commonNameDe = info.nameDe;
  }
  await db.species.update({ where: { id }, data });
  return Boolean(info && (data.imageUrl || data.commonNameDe));
}

/** Arbeitet noch nicht angereicherte Arten ab – gedrosselt und mit Zeitlimit (Serverless). */
export async function enrichMissingSpecies(budgetMs = 45_000): Promise<EnrichResult> {
  const deadline = Date.now() + budgetMs;
  const todo = await db.species.findMany({
    where: { enrichedAt: null },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  const result: EnrichResult = { checked: 0, updated: 0, remaining: todo.length, failed: 0 };
  for (const { id } of todo) {
    if (Date.now() > deadline) break;
    try {
      if (await enrichSpecies(id)) result.updated++;
    } catch {
      result.failed++;
    }
    result.checked++;
    result.remaining--;
    await sleep(1100);
  }
  return result;
}

/** Nach dem Anlegen einer Art: kurz versuchen, Foto/Name zu holen (blockiert nie lange). */
export async function tryEnrichQuickly(id: string): Promise<void> {
  try {
    await Promise.race([enrichSpecies(id), sleep(6000)]);
  } catch {
    /* später erneut über "Fetch photos" */
  }
}
