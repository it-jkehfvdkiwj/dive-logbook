// Läuft vor dem Vercel-Build und bricht mit einer verständlichen Meldung ab,
// wenn keine Datenbank verbunden ist.
import { getDatabaseUrl, getDirectDatabaseUrl } from "../src/lib/database-url.mjs";

const pooled = getDatabaseUrl();
if (!pooled) {
  const pgVars = Object.keys(process.env).filter((k) => /URL|PG|POSTGRES|DATABASE/.test(k));
  console.error(`
✖ Keine Datenbank-URL gefunden (DATABASE_URL o. ä.).

  Auf Vercel: Storage → Neon-Datenbank → "Connect to Project" (Production + Preview),
  danach Deployments → "Redeploy" (NICHT ein altes Deployment erneut starten, das
  vor dem Verbinden erstellt wurde).
  Lokal: .env.example nach .env kopieren und npm run db:up ausführen.

  Gefundene Variablennamen: ${pgVars.join(", ") || "(keine)"}
`);
  process.exit(1);
}
const host = (u) => { try { return new URL(u).host; } catch { return "?"; } };
console.log(`✓ Datenbank gefunden: ${host(pooled)} (Migrationen über ${host(getDirectDatabaseUrl())})`);
if (!process.env.APP_PASSWORD && process.env.VERCEL_ENV === "production") {
  console.warn("⚠ APP_PASSWORD ist nicht gesetzt – die App ist ohne Passwort öffentlich erreichbar.");
}
