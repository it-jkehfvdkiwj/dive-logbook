/** Entfernt alle Demo-Tauchgänge (source = "demo") inkl. Sichtungen. Arten-Katalog bleibt. */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { getDirectDatabaseUrl } from "../src/lib/database-url.mjs";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: getDirectDatabaseUrl()! }),
});

async function main() {
  const { count } = await db.dive.deleteMany({ where: { source: "demo" } });
  await db.diveSite.deleteMany({ where: { dives: { none: {} } } });
  console.log(`Removed ${count} demo dive(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
