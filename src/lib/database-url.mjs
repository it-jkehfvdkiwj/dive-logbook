// Findet die Datenbank-URL – egal unter welchem Namen die Vercel/Neon-Integration sie ablegt
// (z. B. DATABASE_URL, POSTGRES_URL oder mit Präfix wie STORAGE_URL / STORAGE_DATABASE_URL).
// Reines JS ohne Abhängigkeiten, damit es von App, Prisma-Config, Seed und Build-Check nutzbar ist.

const isPg = (v) => typeof v === "string" && /^postgres(ql)?:\/\//.test(v);
const isDirectName = (k) => /(UNPOOLED|NON_POOLING)$/.test(k);

/** Gepoolte Verbindung (für die laufende App). */
export function getDatabaseUrl(env = process.env) {
  for (const k of ["DATABASE_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL"]) if (isPg(env[k])) return env[k];
  const keys = Object.keys(env).sort();
  const preferred = keys.find((k) => k.endsWith("_DATABASE_URL") && isPg(env[k]));
  if (preferred) return env[preferred];
  const any = keys.find((k) => k.endsWith("_URL") && !isDirectName(k) && isPg(env[k]));
  return any ? env[any] : undefined;
}

/** Direkte Verbindung (für Migrationen/Seed), fällt auf die gepoolte zurück. */
export function getDirectDatabaseUrl(env = process.env) {
  for (const k of ["DATABASE_URL_UNPOOLED", "POSTGRES_URL_NON_POOLING"]) if (isPg(env[k])) return env[k];
  const direct = Object.keys(env)
    .sort()
    .find((k) => isDirectName(k) && isPg(env[k]));
  return direct ? env[direct] : getDatabaseUrl(env);
}
