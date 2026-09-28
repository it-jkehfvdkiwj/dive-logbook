/**
 * Seed-Skript
 *   npm run db:seed            → Katalog + Demo-Dives (nur wenn noch keine Dives existieren)
 *   npm run db:seed -- --no-demo  → nur Arten-Katalog
 *   npm run db:seed -- --force-demo → Demo-Dives auch nach dem ersten Lauf (nur wenn DB leer)
 *
 * Idempotent: läuft auf Vercel bei jedem Deployment. Demo-Dives werden nur beim
 * allerersten Lauf angelegt – gelöschte Demo-Daten kommen also nicht zurück.
 *
 * Demo-Daten sind mit source = "demo" markiert und können in
 * Settings → Demo data (oder: npm run db:clear-demo) entfernt werden.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { getDirectDatabaseUrl } from "../src/lib/database-url.mjs";
import { slugify } from "../src/lib/utils";
import { lookupInatTaxon, sleep } from "../src/lib/inaturalist";
import { normalizeCountry } from "../src/lib/countries";
import { DEMO_DIVES, GERMAN_NAMES, SPECIES_CATALOG } from "./seed-data";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: getDirectDatabaseUrl()! }),
});

async function seedCatalog() {
  let created = 0;
  for (const s of SPECIES_CATALOG) {
    const existing = await db.species.findFirst({
      where: { scientificName: { equals: s.scientificName, mode: "insensitive" } },
      select: { id: true },
    });
    if (existing) continue;
    await db.species.create({
      data: {
        commonName: s.commonName,
        scientificName: s.scientificName,
        category: s.category,
        description: s.description ?? null,
        slug: slugify(s.commonName),
        source: "catalog",
      },
    });
    created++;
  }
  console.log(`Species catalog: ${created} created, ${SPECIES_CATALOG.length - created} already present`);
}

async function seedDemoDives(firstRun: boolean, userId: string) {
  if (!firstRun) {
    console.log("Skipping demo dives – not the first run (delete demo data anytime in Settings).");
    return;
  }
  const count = await db.dive.count({ where: { userId } });
  if (count > 0) {
    console.log(`Skipping demo dives – database already contains ${count} dive(s).`);
    return;
  }

  for (const d of DEMO_DIVES) {
    const site =
      (await db.diveSite.findFirst({ where: { userId, name: d.site.name, country: d.site.country } })) ??
      (await db.diveSite.create({ data: { ...d.site, userId, source: "demo" } }));

    const dive = await db.dive.create({
      data: {
        userId,
        diveNumber: d.diveNumber,
        date: new Date(`${d.date}T00:00:00.000Z`),
        startTime: d.startTime,
        diveSiteId: site.id,
        maxDepth: d.maxDepth,
        avgDepth: d.avgDepth,
        duration: d.duration,
        waterTemperature: d.waterTemperature,
        visibility: d.visibility,
        conditions: d.conditions ?? null,
        current: d.current ?? null,
        weather: d.weather ?? null,
        entryType: d.entryType ?? null,
        diveType: d.diveType ?? null,
        buddy: d.buddy ?? null,
        diveCenter: d.diveCenter ?? null,
        notes: d.notes ?? null,
        favorite: d.favorite ?? false,
        source: "demo",
      },
    });

    for (const s of d.sightings) {
      const species = await db.species.findFirstOrThrow({
        where: { scientificName: { equals: s.scientificName, mode: "insensitive" } },
      });
      await db.sighting.create({
        data: { diveId: dive.id, speciesId: species.id, count: s.count ?? null, notes: s.notes ?? null, source: "demo" },
      });
    }
  }
  console.log(`Demo dives: ${DEMO_DIVES.length} created`);
}

const OWNER_ID = "owner";

/** Legt beim allerersten Lauf den Owner (Admin) an. Gibt true zurück, wenn die DB neu ist. */
async function seedOwner(): Promise<boolean> {
  const users = await db.user.count();
  if (users > 0) return false;
  await db.user.create({
    data: { id: OWNER_ID, name: process.env.SEED_DISPLAY_NAME ?? "Quirin", isAdmin: true },
  });
  return true;
}

/**
 * Fotos + deutsche Namen aus iNaturalist für noch nicht angereicherte Arten (nur fehlende Felder).
 * Läuft beim Deployment mit Zeitlimit; Rest lässt sich in der App nachholen (Settings → Marine Life).
 * Bricht ab, wenn iNaturalist nicht erreichbar ist.
 */
async function enrichCatalog(budgetMs = 90_000) {
  if (process.env.SKIP_ENRICH === "1") return;
  const deadline = Date.now() + budgetMs;
  const todo = await db.species.findMany({ where: { enrichedAt: null }, orderBy: { createdAt: "asc" } });
  let updated = 0;
  let networkErrors = 0;
  for (const s of todo) {
    if (Date.now() > deadline || networkErrors >= 3) break;
    try {
      const info = await lookupInatTaxon(s.scientificName, s.commonName);
      await db.species.update({
        where: { id: s.id },
        data: {
          enrichedAt: new Date(),
          inatTaxonId: info?.taxonId ?? null,
          ...(info?.photoUrl && !s.imageUrl ? { imageUrl: info.photoUrl, imageAttribution: info.attribution } : {}),
          ...(info?.nameDe && !s.commonNameDe ? { commonNameDe: info.nameDe } : {}),
        },
      });
      if (info) updated++;
      networkErrors = 0;
    } catch {
      networkErrors++;
    }
    await sleep(1100);
  }
  if (networkErrors >= 3) console.log("iNaturalist not reachable – skipping photo/name enrichment for now.");
  console.log(`Enrichment: ${updated} species updated from iNaturalist`);

  // Fallback: kuratierte deutsche Namen für alles, was noch keinen hat
  let fallback = 0;
  for (const [scientificName, nameDe] of Object.entries(GERMAN_NAMES)) {
    const r = await db.species.updateMany({
      where: { scientificName: { equals: scientificName, mode: "insensitive" }, commonNameDe: null },
      data: { commonNameDe: nameDe },
    });
    fallback += r.count;
  }
  if (fallback) console.log(`German fallback names: ${fallback}`);
}

/** Länder aller Tauchplätze vereinheitlichen (GPS → Land, "Cap-Vert" → "Cape Verde"). */
async function normalizeSiteCountries() {
  const sites = await db.diveSite.findMany({
    select: { id: true, country: true, countryCode: true, latitude: true, longitude: true, source: true, locationEdited: true },
  });
  let changed = 0;
  for (const s of sites) {
    const n = normalizeCountry(s, s.source !== "manual" || s.locationEdited);
    if (n.country !== s.country || n.countryCode !== s.countryCode) {
      await db.diveSite.update({ where: { id: s.id }, data: n });
      changed++;
    }
  }
  console.log(`Countries normalized: ${changed} of ${sites.length} sites updated`);
}

async function main() {
  const withDemo = !process.argv.includes("--no-demo") && process.env.SEED_DEMO !== "false";
  const firstRun = await seedOwner();
  await seedCatalog();
  await enrichCatalog();
  if (withDemo) await seedDemoDives(firstRun || process.argv.includes("--force-demo"), OWNER_ID);
  await normalizeSiteCountries();
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
