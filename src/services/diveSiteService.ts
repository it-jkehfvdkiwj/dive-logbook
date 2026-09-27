import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

export interface SiteInput {
  name: string;
  location: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  source?: string;
  externalId?: string | null;
}

type Tx = Prisma.TransactionClient;

/**
 * Findet einen passenden Tauchplatz oder legt ihn an.
 * - Externe Plätze (z. B. SSI) werden über source + externalId gematcht.
 * - Manuelle Plätze über Name + Location + Country (case-insensitiv).
 * Koordinaten werden übernommen, wenn sie angegeben sind.
 */
export async function resolveSite(input: SiteInput, tx: Tx = db): Promise<string> {
  const source = input.source ?? "manual";

  if (input.externalId) {
    const existing = await tx.diveSite.findUnique({
      where: { source_externalId: { source, externalId: input.externalId } },
    });
    if (existing) {
      await tx.diveSite.update({
        where: { id: existing.id },
        data: {
          name: input.name,
          location: input.location,
          country: input.country,
          latitude: input.latitude,
          longitude: input.longitude,
        },
      });
      return existing.id;
    }
  } else {
    const existing = await tx.diveSite.findFirst({
      where: {
        name: { equals: input.name, mode: "insensitive" },
        location: input.location ? { equals: input.location, mode: "insensitive" } : null,
        country: input.country ? { equals: input.country, mode: "insensitive" } : null,
      },
    });
    if (existing) {
      if (input.latitude != null && input.longitude != null) {
        await tx.diveSite.update({
          where: { id: existing.id },
          data: { latitude: input.latitude, longitude: input.longitude },
        });
      }
      return existing.id;
    }
  }

  const created = await tx.diveSite.create({
    data: {
      name: input.name,
      location: input.location,
      country: input.country,
      latitude: input.latitude,
      longitude: input.longitude,
      source,
      externalId: input.externalId ?? null,
    },
  });
  return created.id;
}

/** Entfernt Tauchplätze ohne Tauchgänge (nach Update/Delete). */
export async function deleteOrphanSites(tx: Tx = db): Promise<void> {
  await tx.diveSite.deleteMany({ where: { dives: { none: {} } } });
}

export async function listCountries(): Promise<string[]> {
  const rows = await db.diveSite.findMany({
    where: { country: { not: null }, dives: { some: {} } },
    select: { country: true },
    distinct: ["country"],
    orderBy: { country: "asc" },
  });
  return rows.map((r) => r.country!).filter(Boolean);
}

export async function listLocations(): Promise<string[]> {
  const rows = await db.diveSite.findMany({
    where: { location: { not: null }, dives: { some: {} } },
    select: { location: true },
    distinct: ["location"],
    orderBy: { location: "asc" },
  });
  return rows.map((r) => r.location!).filter(Boolean);
}
