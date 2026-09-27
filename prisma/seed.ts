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
import { slugify } from "../src/lib/utils";
import { DEMO_DIVES, SPECIES_CATALOG } from "./seed-data";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL! }),
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

async function seedDemoDives(firstRun: boolean) {
  if (!firstRun) {
    console.log("Skipping demo dives – not the first run (delete demo data anytime in Settings).");
    return;
  }
  const count = await db.dive.count();
  if (count > 0) {
    console.log(`Skipping demo dives – database already contains ${count} dive(s).`);
    return;
  }

  for (const d of DEMO_DIVES) {
    const site =
      (await db.diveSite.findFirst({ where: { name: d.site.name, country: d.site.country } })) ??
      (await db.diveSite.create({ data: { ...d.site, source: "demo" } }));

    const dive = await db.dive.create({
      data: {
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

/** Legt die Settings an. Gibt true zurück, wenn die DB zum ersten Mal befüllt wird. */
async function seedSettings(): Promise<boolean> {
  const existing = await db.appSettings.findUnique({ where: { id: 1 }, select: { id: true } });
  if (existing) return false;
  await db.appSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, displayName: process.env.SEED_DISPLAY_NAME ?? "Quirin" },
  });
  return true;
}

async function main() {
  const withDemo = !process.argv.includes("--no-demo") && process.env.SEED_DEMO !== "false";
  const firstRun = await seedSettings();
  await seedCatalog();
  if (withDemo) await seedDemoDives(firstRun || process.argv.includes("--force-demo"));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
