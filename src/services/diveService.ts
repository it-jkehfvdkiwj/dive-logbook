import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { NotFoundError } from "@/lib/errors";
import type { DiveFilters, DiveInput } from "@/lib/validation/dive";
import type { DiveDetail, DiveListItem } from "@/types";
import { deleteOrphanSites, resolveSite } from "./diveSiteService";

// ---------------------------------------------------------------------------
// Mapping
// ---------------------------------------------------------------------------

const listInclude = {
  diveSite: true,
  _count: { select: { sightings: true } },
  photos: { take: 1, orderBy: { createdAt: "asc" }, select: { url: true } },
} satisfies Prisma.DiveInclude;

type DiveWithListInclude = Prisma.DiveGetPayload<{ include: typeof listInclude }>;

function toListItem(d: DiveWithListInclude): DiveListItem {
  return {
    id: d.id,
    diveNumber: d.diveNumber,
    date: d.date,
    startTime: d.startTime,
    site: {
      id: d.diveSite.id,
      name: d.diveSite.name,
      location: d.diveSite.location,
      country: d.diveSite.country,
      latitude: d.diveSite.latitude,
      longitude: d.diveSite.longitude,
    },
    maxDepth: d.maxDepth,
    duration: d.duration,
    diveType: d.diveType,
    favorite: d.favorite,
    speciesCount: d._count.sightings,
    coverPhotoUrl: d.photos[0]?.url ?? null,
  };
}

const toDbDate = (isoDate: string) => new Date(`${isoDate}T00:00:00.000Z`);

/** Felder, die direkt aus DiveInput in die Dive-Tabelle gehen (ohne Site-Felder). */
export const DIVE_DATA_FIELDS = [
  "diveNumber",
  "startTime",
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

function diveData(input: DiveInput) {
  return {
    date: toDbDate(input.date),
    diveNumber: input.diveNumber,
    startTime: input.startTime,
    maxDepth: input.maxDepth,
    avgDepth: input.avgDepth,
    duration: input.duration,
    waterTemperature: input.waterTemperature,
    visibility: input.visibility,
    conditions: input.conditions,
    current: input.current,
    weather: input.weather,
    entryType: input.entryType,
    diveType: input.diveType,
    buddy: input.buddy,
    diveCenter: input.diveCenter,
    notes: input.notes,
    favorite: input.favorite,
  };
}

function orderByFor(sort: DiveFilters["sort"]): Prisma.DiveOrderByWithRelationInput[] {
  switch (sort) {
    case "date_asc":
      return [{ date: "asc" }, { startTime: "asc" }, { createdAt: "asc" }];
    case "depth_desc":
      return [{ maxDepth: { sort: "desc", nulls: "last" } }, { date: "desc" }];
    case "duration_desc":
      return [{ duration: { sort: "desc", nulls: "last" } }, { date: "desc" }];
    case "number_desc":
      return [{ diveNumber: { sort: "desc", nulls: "last" } }, { date: "desc" }];
    case "date_desc":
    default:
      return [{ date: "desc" }, { startTime: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }];
  }
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function listDives(filters: Partial<DiveFilters> = {}, take?: number): Promise<DiveListItem[]> {
  const and: Prisma.DiveWhereInput[] = [];

  if (filters.q) {
    const contains = { contains: filters.q, mode: "insensitive" as const };
    and.push({
      OR: [
        { diveSite: { name: contains } },
        { diveSite: { location: contains } },
        { diveSite: { country: contains } },
        { buddy: contains },
        { diveCenter: contains },
      ],
    });
  }
  if (filters.favorite) and.push({ favorite: true });
  if (filters.country) and.push({ diveSite: { country: { equals: filters.country, mode: "insensitive" } } });
  if (filters.location) and.push({ diveSite: { location: { equals: filters.location, mode: "insensitive" } } });
  if (filters.diveType) and.push({ diveType: { equals: filters.diveType, mode: "insensitive" } });
  if (filters.from) and.push({ date: { gte: toDbDate(filters.from) } });
  if (filters.to) and.push({ date: { lte: toDbDate(filters.to) } });
  if (filters.minDepth != null) and.push({ maxDepth: { gte: filters.minDepth } });
  if (filters.maxDepth != null) and.push({ maxDepth: { lte: filters.maxDepth } });

  const dives = await db.dive.findMany({
    where: and.length ? { AND: and } : undefined,
    include: listInclude,
    orderBy: orderByFor(filters.sort ?? "date_desc"),
    take,
  });
  return dives.map(toListItem);
}

export async function countDives(): Promise<number> {
  return db.dive.count();
}

export async function listFavoriteDives(take?: number) {
  return listDives({ favorite: true }, take);
}

export async function getDive(id: string): Promise<DiveDetail | null> {
  const d = await db.dive.findUnique({
    where: { id },
    include: {
      ...listInclude,
      sightings: {
        include: { species: true },
        orderBy: { createdAt: "asc" },
      },
      photos: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!d) return null;

  return {
    ...toListItem({ ...d, photos: d.photos.slice(0, 1) }),
    avgDepth: d.avgDepth,
    waterTemperature: d.waterTemperature,
    visibility: d.visibility,
    conditions: d.conditions,
    current: d.current,
    weather: d.weather,
    entryType: d.entryType,
    buddy: d.buddy,
    diveCenter: d.diveCenter,
    notes: d.notes,
    source: d.source,
    externalId: d.externalId,
    lastSyncedAt: d.lastSyncedAt,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
    sightings: d.sightings.map((s) => ({
      id: s.id,
      count: s.count,
      notes: s.notes,
      createdAt: s.createdAt,
      species: {
        id: s.species.id,
        slug: s.species.slug,
        commonName: s.species.commonName,
        scientificName: s.species.scientificName,
        category: s.species.category,
        imageUrl: s.species.imageUrl,
      },
    })),
    photos: d.photos.map((p) => ({
      id: p.id,
      url: p.url,
      caption: p.caption,
      speciesId: p.speciesId,
      createdAt: p.createdAt,
    })),
  };
}

export async function getDiveOrThrow(id: string): Promise<DiveDetail> {
  const dive = await getDive(id);
  if (!dive) throw new NotFoundError("Dive");
  return dive;
}

/** Nächste freie Dive-Nummer als Vorschlag im Formular. */
export async function suggestNextDiveNumber(): Promise<number> {
  const agg = await db.dive.aggregate({ _max: { diveNumber: true } });
  return (agg._max.diveNumber ?? 0) + 1;
}

export async function listDiveTypes(): Promise<string[]> {
  const rows = await db.dive.findMany({
    where: { diveType: { not: null } },
    select: { diveType: true },
    distinct: ["diveType"],
    orderBy: { diveType: "asc" },
  });
  return rows.map((r) => r.diveType!).filter(Boolean);
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function createDive(input: DiveInput): Promise<{ id: string }> {
  return db.$transaction(async (tx) => {
    const diveSiteId = await resolveSite(
      {
        name: input.siteName,
        location: input.location,
        country: input.country,
        latitude: input.latitude,
        longitude: input.longitude,
      },
      tx,
    );
    const dive = await tx.dive.create({
      data: { ...diveData(input), diveSiteId, source: "manual" },
      select: { id: true },
    });
    return dive;
  });
}

export async function updateDive(id: string, input: DiveInput): Promise<{ id: string }> {
  return db.$transaction(async (tx) => {
    const existing = await tx.dive.findUnique({ where: { id }, include: { diveSite: true } });
    if (!existing) throw new NotFoundError("Dive");

    const diveSiteId = await resolveSite(
      {
        name: input.siteName,
        location: input.location,
        country: input.country,
        latitude: input.latitude,
        longitude: input.longitude,
      },
      tx,
    );

    const data = diveData(input);

    // Für importierte Dives merken, welche Felder manuell geändert wurden,
    // damit ein späterer Sync sie nicht überschreibt.
    let manuallyEditedFields = existing.manuallyEditedFields;
    if (existing.externalId) {
      const changed = new Set(manuallyEditedFields);
      for (const field of DIVE_DATA_FIELDS) {
        if (existing[field] !== data[field]) changed.add(field);
      }
      if (existing.date.getTime() !== data.date.getTime()) changed.add("date");
      if (existing.diveSiteId !== diveSiteId) changed.add("diveSite");
      manuallyEditedFields = [...changed];
    }

    await tx.dive.update({
      where: { id },
      data: { ...data, diveSiteId, manuallyEditedFields },
    });
    await deleteOrphanSites(tx);
    return { id };
  });
}

export async function setFavorite(id: string, favorite: boolean): Promise<{ id: string; favorite: boolean }> {
  const exists = await db.dive.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw new NotFoundError("Dive");
  return db.dive.update({ where: { id }, data: { favorite }, select: { id: true, favorite: true } });
}

/**
 * Löscht einen Dive. Sightings und Fotos werden per Cascade mitgelöscht.
 * Species bleiben erhalten – sie verschwinden nur aus der Life List,
 * wenn keine weitere Sichtung existiert.
 */
export async function deleteDive(id: string): Promise<{ deletedSightings: number }> {
  return db.$transaction(async (tx) => {
    const dive = await tx.dive.findUnique({
      where: { id },
      select: { _count: { select: { sightings: true } } },
    });
    if (!dive) throw new NotFoundError("Dive");
    await tx.dive.delete({ where: { id } });
    await deleteOrphanSites(tx);
    return { deletedSightings: dive._count.sightings };
  });
}
