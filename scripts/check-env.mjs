// Läuft vor dem Vercel-Build und bricht mit einer verständlichen Meldung ab,
// wenn keine Datenbank verbunden ist.
if (!process.env.DATABASE_URL && !process.env.DATABASE_URL_UNPOOLED) {
  console.error(`
✖ DATABASE_URL ist nicht gesetzt.

  Auf Vercel: Projekt → Storage → "Neon" (Postgres) hinzufügen/verbinden,
  danach Deployments → "Redeploy".
  Lokal: .env.example nach .env kopieren und npm run db:up ausführen.
`);
  process.exit(1);
}
if (!process.env.APP_PASSWORD && process.env.VERCEL_ENV === "production") {
  console.warn("⚠ APP_PASSWORD ist nicht gesetzt – die App ist ohne Passwort öffentlich erreichbar.");
}
