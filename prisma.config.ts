import "dotenv/config";
import { defineConfig } from "prisma/config";

// Für Migrationen die direkte (ungepoolte) Verbindung nutzen, falls vorhanden.
// Neon auf Vercel setzt DATABASE_URL (gepoolt) und DATABASE_URL_UNPOOLED (direkt).
const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Beim reinen `prisma generate` (z. B. npm install ohne .env) wird keine URL benötigt.
    url: url ?? "postgresql://placeholder:placeholder@localhost:5432/placeholder",
  },
});
