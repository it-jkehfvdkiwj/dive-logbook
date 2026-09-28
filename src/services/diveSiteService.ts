import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { normalizeCountry } from "@/lib/countries";
import { NotFoundError } from "@/lib/errors";

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
export async function resolveSite(userId: string, input: SiteInput, tx: Tx = db): Promise<string> {
  const source = input.source ?? "manual";
  // Importe: GPS bestimmt das Land. Manuell: eingegebener Name gewinnt (vereinheitlicht).
  const { country, countryCode } = normalizeCountry(input, source !== "manual");

  if (input.externalId) {
    const existing = await tx.diveSite.findUnique({
      where: { userId_source_externalId: { userId, source, externalId: input.externalId } },
    });
    if (existing) {
      await tx.diveSite.update({
        where: { id: existing.id },
        data: existing.locationEdited
          ? { name: input.name, location: input.location }
          : {
              name: input.name,
              location: input.location,
              country,
              countryCode,
              latitude: input.latitude,
              longitude: input.longitude,
            },
      });
      return existing.id;
    }
  } else {
    const existing = await tx.diveSite.findFirst({
      where: {
        userId,
        name: { equals: input.name, mode: "insensitive" },
        location: input.location ? { equals: input.location, mode: "insensitive" } : null,
        country: country ? { equals: country, mode: "insensitive" } : null,
      },
    });
    if (existing) {
      if (input.latitude != null && input.longitude != null) {
        await tx.diveSite.update({
          where: { id: existing.id },
          data: { latitude: input.latitude, longitude: input.longitude, countryCode: countryCode ?? existing.countryCode },
        });
      }
      return existing.id;
    }
  }

  const created = await tx.diveSite.create({
    data: {
      userId,
      name: input.name,
      location: input.location,
      country,
      countryCode,
      latitude: input.latitude,
      longitude: input.longitude,
      source,
      externalId: input.externalId ?? null,
    },
  });
  return created.id;
}

/**
 * Position eines Tauchplatzes korrigieren (Karte / "Set location").
 * Gilt für alle Tauchgänge an diesem Platz; ein späterer Sync überschreibt es nicht.
 */
export async function updateSiteLocation(
  userId: string,
  id: string,
  input: { latitude: number | null; longitude: number | null; country?: string | null },
) {
  const site = await db.diveSite.findFirst({ where: { id, userId } });
  if (!site) throw new NotFoundError("Dive site");
  const explicitCountry = input.country !== undefined;
  const normalized = normalizeCountry(
    { country: explicitCountry ? input.country : site.country, latitude: input.latitude, longitude: input.longitude },
    !explicitCountry,
  );
  return db.diveSite.update({
    where: { id },
    data: {
      latitude: input.latitude,
      longitude: input.longitude,
      country: normalized.country,
      countryCode: normalized.countryCode,
      locationEdited: true,
    },
    select: { id: true, latitude: true, longitude: true, country: true, countryCode: true },
  });
}

/** Entfernt Tauchplätze ohne Tauchgänge (nach Update/Delete). */
export async function deleteOrphanSites(tx: Tx = db): Promise<void> {
  await tx.diveSite.deleteMany({ where: { dives: { none: {} } } });
}

export async function listCountries(userId: string): Promise<string[]> {
  const rows = await db.diveSite.findMany({
    where: { userId, country: { not: null }, dives: { some: {} } },
    select: { country: true },
    distinct: ["country"],
    orderBy: { country: "asc" },
  });
  return rows.map((r) => r.country!).filter(Boolean);
}

export async function listLocations(userId: string): Promise<string[]> {
  const rows = await db.diveSite.findMany({
    where: { userId, location: { not: null }, dives: { some: {} } },
    select: { location: true },
    distinct: ["location"],
    orderBy: { location: "asc" },
  });
  return rows.map((r) => r.location!).filter(Boolean);
}
