import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { slugify } from "@/lib/utils";
import type { SpeciesFilters, SpeciesInput } from "@/lib/validation/species";
import type { SightingRef, SpeciesDetail, SpeciesListItem, SpeciesSummary } from "@/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Tx = Prisma.TransactionClient;

const sightingDiveSelect = {
  id: true,
  count: true,
  notes: true,
  createdAt: true,
  dive: {
    select: {
      id: true,
      date: true,
      diveNumber: true,
      favorite: true,
      startTime: true,
      diveSite: { select: { name: true, location: true, country: true } },
    },
  },
} satisfies Prisma.SightingSelect;

type SightingWithDive = Prisma.SightingGetPayload<{ select: typeof sightingDiveSelect }>;

function toSummary(s: {
  id: string;
  slug: string;
  commonName: string;
  scientificName: string | null;
  category: string;
  imageUrl: string | null;
}): SpeciesSummary {
  return {
    id: s.id,
    slug: s.slug,
    commonName: s.commonName,
    scientificName: s.scientificName,
    category: s.category,
    imageUrl: s.imageUrl,
  };
}

function compareSighting(a: SightingWithDive, b: SightingWithDive) {
  const diff = a.dive.date.getTime() - b.dive.date.getTime();
  if (diff !== 0) return diff;
  return (a.dive.startTime ?? "").localeCompare(b.dive.startTime ?? "");
}

function toRef(s: SightingWithDive | undefined): SightingRef | null {
  if (!s) return null;
  return {
    diveId: s.dive.id,
    date: s.dive.date,
    siteName: s.dive.diveSite.name,
    location: s.dive.diveSite.location,
    country: s.dive.diveSite.country,
  };
}

function withSightingStats(
  species: Parameters<typeof toSummary>[0] & { sightings: SightingWithDive[] },
): { item: SpeciesListItem; sorted: SightingWithDive[] } {
  const sorted = [...species.sightings].sort(compareSighting);
  return {
    item: {
      ...toSummary(species),
      sightingCount: sorted.length,
      firstSeen: toRef(sorted[0]),
      lastSeen: toRef(sorted[sorted.length - 1]),
    },
    sorted,
  };
}

export async function uniqueSlug(base: string, tx: Tx, excludeId?: string): Promise<string> {
  const root = slugify(base) || "species";
  let slug = root;
  for (let i = 2; ; i++) {
    const hit = await tx.species.findUnique({ where: { slug }, select: { id: true } });
    if (!hit || hit.id === excludeId) return slug;
    slug = `${root}-${i}`;
  }
}

async function assertScientificNameFree(name: string | null, tx: Tx, excludeId?: string) {
  if (!name) return;
  const hit = await tx.species.findFirst({
    where: { scientificName: { equals: name, mode: "insensitive" }, NOT: excludeId ? { id: excludeId } : undefined },
    select: { id: true, commonName: true },
  });
  if (hit) {
    throw new ConflictError(`A species with the scientific name "${name}" already exists (${hit.commonName}).`, {
      field: "scientificName",
      existingId: hit.id,
    });
  }
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Life List (view = "seen") oder kompletter Katalog (view = "all"). */
export async function listSpecies(
  userId: string,
  filters: Partial<SpeciesFilters> = {},
): Promise<SpeciesListItem[]> {
  const and: Prisma.SpeciesWhereInput[] = [];
  const view = filters.view ?? "seen";

  if (view === "seen") and.push({ sightings: { some: { dive: { userId } } } });
  if (filters.q) {
    const contains = { contains: filters.q, mode: "insensitive" as const };
    and.push({ OR: [{ commonName: contains }, { scientificName: contains }, { category: contains }] });
  }
  if (filters.category) and.push({ category: { equals: filters.category, mode: "insensitive" } });
  if (filters.country) {
    and.push({
      sightings: {
        some: { dive: { userId, diveSite: { country: { equals: filters.country, mode: "insensitive" } } } },
      },
    });
  }

  const rows = await db.species.findMany({
    where: and.length ? { AND: and } : undefined,
    include: { sightings: { where: { dive: { userId } }, select: sightingDiveSelect } },
    orderBy: { commonName: "asc" },
  });

  const items = rows.map((r) => withSightingStats(r).item);
  const time = (r: SightingRef | null) => r?.date.getTime() ?? 0;

  switch (filters.sort ?? "recent") {
    case "most_seen":
      items.sort((a, b) => b.sightingCount - a.sightingCount || a.commonName.localeCompare(b.commonName));
      break;
    case "first_seen":
      // Neueste Einträge in der Life List zuerst
      items.sort((a, b) => time(b.firstSeen) - time(a.firstSeen) || a.commonName.localeCompare(b.commonName));
      break;
    case "name":
      break;
    case "recent":
    default:
      items.sort((a, b) => time(b.lastSeen) - time(a.lastSeen) || a.commonName.localeCompare(b.commonName));
  }

  return items;
}

/** Schnelle Suche für den "Add Marine Life"-Dialog. */
export async function searchSpecies(
  userId: string,
  q: string,
  take = 20,
): Promise<(SpeciesSummary & { sightingCount: number })[]> {
  const term = q.trim();
  const contains = { contains: term, mode: "insensitive" as const };
  const rows = await db.species.findMany({
    where: term ? { OR: [{ commonName: contains }, { scientificName: contains }, { category: contains }] } : undefined,
    include: { _count: { select: { sightings: { where: { dive: { userId } } } } } },
    orderBy: { commonName: "asc" },
    take: 200,
  });
  // Eigene, oft gesehene Arten zuerst
  return rows
    .map((r) => ({ ...toSummary(r), sightingCount: r._count.sightings }))
    .sort((a, b) => b.sightingCount - a.sightingCount || a.commonName.localeCompare(b.commonName))
    .slice(0, take);
}

export async function getSpecies(userId: string, idOrSlug: string): Promise<SpeciesDetail | null> {
  const s = await db.species.findFirst({
    where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    include: { sightings: { where: { dive: { userId } }, select: sightingDiveSelect } },
  });
  if (!s) return null;

  const { item, sorted } = withSightingStats(s);
  const newestFirst = [...sorted].reverse();
  const counts = s.sightings.map((x) => x.count).filter((c): c is number => c != null);
  const unique = (values: (string | null)[]) => [...new Set(values.filter((v): v is string => !!v))].sort();

  return {
    ...item,
    description: s.description,
    source: s.source,
    sightings: newestFirst.map((x) => ({
      id: x.id,
      count: x.count,
      notes: x.notes,
      dive: {
        id: x.dive.id,
        date: x.dive.date,
        diveNumber: x.dive.diveNumber,
        favorite: x.dive.favorite,
        siteName: x.dive.diveSite.name,
        location: x.dive.diveSite.location,
        country: x.dive.diveSite.country,
      },
    })),
    stats: {
      sightings: s.sightings.length,
      dives: new Set(s.sightings.map((x) => x.dive.id)).size,
      individuals: counts.length ? counts.reduce((a, b) => a + b, 0) : null,
      locations: unique(s.sightings.map((x) => x.dive.diveSite.location ?? x.dive.diveSite.name)),
      countries: unique(s.sightings.map((x) => x.dive.diveSite.country)),
    },
  };
}

export async function getSpeciesForEdit(idOrSlug: string) {
  return db.species.findFirst({ where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] } });
}

/** Zuletzt gesichtete Arten (für das Dashboard). */
export async function listRecentlySeen(
  userId: string,
  take = 8,
): Promise<(SpeciesSummary & { lastSeen: SightingRef })[]> {
  const sightings = await db.sighting.findMany({
    where: { dive: { userId } },
    orderBy: [{ dive: { date: "desc" } }, { createdAt: "desc" }],
    select: { ...sightingDiveSelect, species: true },
    take: take * 4,
  });
  const seen = new Set<string>();
  const result: (SpeciesSummary & { lastSeen: SightingRef })[] = [];
  for (const s of sightings) {
    if (seen.has(s.species.id)) continue;
    seen.add(s.species.id);
    result.push({ ...toSummary(s.species), lastSeen: toRef(s)! });
    if (result.length >= take) break;
  }
  return result;
}

export async function listSpeciesCountries(userId: string): Promise<string[]> {
  const rows = await db.diveSite.findMany({
    where: { userId, country: { not: null }, dives: { some: { sightings: { some: {} } } } },
    select: { country: true },
    distinct: ["country"],
    orderBy: { country: "asc" },
  });
  return rows.map((r) => r.country!).filter(Boolean);
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function createSpecies(
  input: SpeciesInput,
  meta: { source?: string; externalId?: string | null } = {},
): Promise<SpeciesSummary> {
  return db.$transaction(async (tx) => {
    await assertScientificNameFree(input.scientificName, tx);
    const slug = await uniqueSlug(input.commonName, tx);
    const s = await tx.species.create({
      data: { ...input, slug, source: meta.source ?? "manual", externalId: meta.externalId ?? null },
    });
    return toSummary(s);
  });
}

export async function updateSpecies(id: string, input: SpeciesInput): Promise<SpeciesSummary> {
  return db.$transaction(async (tx) => {
    const existing = await tx.species.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Species");
    await assertScientificNameFree(input.scientificName, tx, id);
    const slug =
      existing.commonName === input.commonName ? existing.slug : await uniqueSlug(input.commonName, tx, id);
    const s = await tx.species.update({ where: { id }, data: { ...input, slug } });
    return toSummary(s);
  });
}

/**
 * Löscht eine Art inkl. der eigenen Sichtungen (Cascade). Die UI warnt vorher.
 * Der Katalog ist gemeinsam: Hat ein anderer Benutzer die Art geloggt, wird nicht gelöscht.
 */
export async function deleteSpecies(userId: string, id: string): Promise<{ deletedSightings: number }> {
  return db.$transaction(async (tx) => {
    const s = await tx.species.findUnique({ where: { id }, select: { id: true } });
    if (!s) throw new NotFoundError("Species");
    const [own, others] = await Promise.all([
      tx.sighting.count({ where: { speciesId: id, dive: { userId } } }),
      tx.sighting.count({ where: { speciesId: id, dive: { userId: { not: userId } } } }),
    ]);
    if (others > 0) {
      throw new ConflictError("This species is also used in another diver's logbook and cannot be deleted.");
    }
    await tx.species.delete({ where: { id } });
    return { deletedSightings: own };
  });
}
