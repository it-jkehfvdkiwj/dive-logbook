# Dive Log – Logbook & Marine Life Tracker

Persönliches, mobile-first Tauch-Logbuch als PWA.
**Stack:** Next.js 16 · TypeScript · Tailwind CSS 4 · shadcn/ui-Komponenten · Prisma 7 · PostgreSQL · Zod · lucide-react
**Hosting:** Vercel (App) + Neon (Postgres, kostenlos) – alles nur mit dem iPhone einrichtbar.

---

## Inhalt

1. [Deployment nur mit dem iPhone (Vercel + Neon)](#1-deployment-nur-mit-dem-iphone-vercel--neon)
2. [App auf dem iPhone installieren (PWA)](#2-app-auf-dem-iphone-installieren-pwa)
3. [Updates & Betrieb](#3-updates--betrieb)
4. [Lokale Entwicklung](#4-lokale-entwicklung)
5. [Warum PostgreSQL statt SQLite?](#5-warum-postgresql-statt-sqlite)
6. [Architektur](#6-architektur)
7. [Fehlerbehebung](#7-fehlerbehebung)

---

## 1. Deployment nur mit dem iPhone (Vercel + Neon)

Voraussetzung: Das Projekt liegt in deinem GitHub-Repository. Alles Weitere erledigst du in Safari, Zeitaufwand ca. 5 Minuten.

### Schritt 1 – Vercel-Konto
1. **vercel.com** öffnen → **Sign Up** → **Continue with GitHub**.
2. Hobby-Plan (kostenlos) wählen und Vercel Zugriff auf dein Repository geben.

### Schritt 2 – Projekt importieren
1. **vercel.com/new** öffnen → bei deinem Repo `dive-logbook` auf **Import** tippen.
2. Framework wird automatisch als **Next.js** erkannt. Build-Einstellungen **nicht ändern**, `vercel.json` setzt alles.
3. **Environment Variables** aufklappen und hinzufügen:

   | Name | Wert |
   | --- | --- |
   | `APP_PASSWORD` | ein Passwort deiner Wahl (schützt deine Daten) |
   | `SEED_DISPLAY_NAME` | `Quirin` (optional, Name für die Begrüßung) |

4. **Deploy** tippen.
   ➜ Der erste Build **bricht mit „DATABASE_URL ist nicht gesetzt“ ab. Das ist erwartet**, weil noch keine Datenbank verbunden ist.

### Schritt 3 – Datenbank (Neon) anlegen und verbinden
1. Im Vercel-Projekt oben auf **Storage** → **Create Database** → **Neon** (Serverless Postgres) → **Continue**.
2. Region **Frankfurt (aws-eu-central-1)** wählen, Plan **Free**, Name z. B. `divelog` → **Create**.
3. Im nächsten Dialog das Projekt `dive-logbook` mit **allen Environments** verbinden → **Connect**.
   Vercel setzt jetzt automatisch `DATABASE_URL` und `DATABASE_URL_UNPOOLED`.

### Schritt 4 – Erneut deployen
1. Im Projekt auf **Deployments** → beim letzten Eintrag **⋯** → **Redeploy**.
2. Der Build führt automatisch aus:
   `Env-Check → prisma generate → prisma migrate deploy → Seed (Arten-Katalog + Demo-Dives) → next build`
3. Nach ca. 1–2 Minuten: **Visit** → deine App läuft unter `https://dive-logbook-xxxx.vercel.app`.

> Die Demo-Tauchgänge werden **nur beim allerersten Deployment** angelegt. Löschen kannst du sie in der App unter **Settings → Demo data**. Sie kommen danach nicht zurück.

---

## 2. App auf dem iPhone installieren (PWA)

1. Die Vercel-URL in **Safari** öffnen und mit deinem `APP_PASSWORD` einloggen.
2. **Teilen**-Symbol (□↑) → **Zum Home-Bildschirm** → **Hinzufügen**.
3. App über das neue Icon öffnen: Sie startet im Vollbild ohne Browserleiste.
4. **Einmal erneut einloggen.** iOS trennt die Cookies von Home-Bildschirm-Apps und Safari. Der Login hält danach 1 Jahr.

Enthalten: Web App Manifest (`/manifest.webmanifest`), Icons (192/512/maskable/Apple-Touch-Icon), `display: standalone`, Theme-Color für Hell/Dunkel, `viewport-fit=cover` mit Safe Areas, Service Worker mit Offline-Seite.

---

## 3. Updates & Betrieb

| Aktion | So geht's |
| --- | --- |
| Code ändern | Commit/Push auf `main` → Vercel deployt automatisch (Migrationen laufen mit). |
| Passwort ändern | Vercel → Settings → Environment Variables → `APP_PASSWORD` ändern → Redeploy. Alle Geräte müssen sich neu einloggen. |
| Passwortschutz aus | `APP_PASSWORD` löschen → Redeploy. **Nicht empfohlen**: Dann kann jeder mit der URL deine Daten ändern. |
| Daten ansehen | Vercel → Storage → Neon → **Open in Neon Console** → Tables. |
| Demo-Daten entfernen | App → Settings → Demo data → Remove. |
| Backup | Neon Console → Branches / Restore (Point-in-Time im Free-Plan begrenzt). |

Kosten: Vercel Hobby und Neon Free sind für eine persönliche App kostenlos.

---

## 4. Lokale Entwicklung

Voraussetzungen: Node.js ≥ 20.9, Docker (oder eigene PostgreSQL-Instanz).

```bash
cp .env.example .env
npm install          # generiert den Prisma Client
npm run setup        # Postgres (Docker) starten + Migrationen + Seed
npm run dev          # http://localhost:3000
```

| Befehl | Zweck |
| --- | --- |
| `npm run dev` / `dev:lan` | Dev-Server (lan = im WLAN erreichbar) |
| `npm run build` / `start` | Production-Build lokal |
| `npm run vercel-build` | Kompletter Cloud-Build (Env-Check, Migrationen, Seed, Build) |
| `npm run typecheck` / `lint` | Qualitätschecks |
| `npm run db:up` / `db:down` | PostgreSQL via Docker |
| `npm run db:migrate` | Migrationen anwenden |
| `npm run db:migrate:dev` | Neue Migration nach Schema-Änderung erzeugen |
| `npm run db:seed` | Katalog + Demo-Dives (Demo nur beim ersten Lauf) |
| `npm run db:clear-demo` | Demo-Dives löschen |
| `npm run db:studio` | Prisma Studio |
| `node scripts/smoke-test.mjs <url>` | API-End-to-End-Test (mit `APP_PASSWORD=…` auch gegen Vercel) |

---

## 5. Warum PostgreSQL statt SQLite?

SQLite speichert alles in einer Datei. Auf Vercel laufen Next.js-Routen als **Serverless Functions ohne dauerhaftes Dateisystem**: Jede Instanz hätte ihre eigene, flüchtige Kopie, und Daten gingen bei jedem Deployment oder Kaltstart verloren. SQLite ist dort also **nicht sinnvoll**.

Stattdessen: **Neon Postgres (Free)**, direkt in Vercel integriert. Vorteile:
- Daten bleiben dauerhaft erhalten und sind von allen Instanzen aus erreichbar.
- Lokal (Docker) und in der Cloud läuft **dieselbe Datenbank-Engine**, eine spätere Migration entfällt.
- Prisma-Schema und Migrationen bleiben unverändert.

---

## 6. Architektur

```
prisma/            schema.prisma, migrations/, seed.ts, seed-data.ts, clear-demo.ts
src/app/           Seiten (App Router) + api/ (REST) + login/
src/proxy.ts       Passwortschutz (nur aktiv, wenn APP_PASSWORD gesetzt)
src/components/    ui/ (shadcn-Stil) · layout/ · common/ · dives/ · species/ · settings/
src/services/      Business-Logik (dive, diveSite, species, sighting, stats, import, photo, settings, demoData)
src/importers/     Import-Abstraktion: DiveImporter, ImportedDive, jsonImporter, ssiImporter (Platzhalter)
src/lib/           db, Validierung (Zod), Auth, Formatierung, Kategorien, API-Client
public/            Icons, Service Worker (sw.js), offline.html
vercel.json        Build-Command, Region fra1, Header für sw.js/Manifest
```

**Datenmodell:** `DiveSite 1─n Dive 1─n Sighting n─1 Species`, dazu `DivePhoto`, `ImportRun`, `AppSettings`.
- Life List = Species mit ≥ 1 Sighting. Eine Art existiert einmal, Sichtungen beliebig oft. Pro Dive ist eine Art eindeutig.
- Wissenschaftlicher Name ist eindeutig (case-insensitive, sonst HTTP 409).
- Dive löschen → Sightings & Fotos werden mitgelöscht, die Species bleibt im Katalog.
- Externe Herkunft über `source` + `externalId` (unique), `lastSyncedAt`, `manuallyEditedFields` (werden beim Sync nicht überschrieben).

**Datenbankverbindungen:** Die App nutzt zur Laufzeit `DATABASE_URL` (gepoolt, für Serverless). Migrationen und Seed nutzen `DATABASE_URL_UNPOOLED` (direkt), falls vorhanden.

**API:**
```
GET/POST        /api/dives                 GET/PUT/DELETE /api/dives/:id
PATCH           /api/dives/:id/favorite    POST /api/dives/:id/photos · DELETE /api/photos/:id
GET/POST        /api/species               GET/PUT/DELETE /api/species/:id
GET/POST        /api/sightings             PUT/DELETE /api/sightings/:id
GET             /api/stats                 GET/PUT /api/settings
POST            /api/import/json           DELETE /api/demo-data
POST            /api/auth/login · /api/auth/logout
```

**SSI später:** `SSIImporter.importDives()` in `src/importers/ssiImporter.ts` implementieren (Rohdaten → `ImportedDive`). Abgleich, Create/Update und Schutz manueller Änderungen übernimmt bereits `runImport()`.

---

## 7. Fehlerbehebung

| Problem | Lösung |
| --- | --- |
| Build: „DATABASE_URL ist nicht gesetzt“ | Storage → Neon mit dem Projekt verbinden (Schritt 3), dann Redeploy. |
| Build: `P1001 Can't reach database` | Neon-Datenbank pausiert oder gelöscht → in der Neon Console prüfen, Redeploy. |
| App zeigt „Database not reachable“ | Wie oben. Außerdem prüfen, ob `DATABASE_URL` für **Production** gesetzt ist. |
| Endlos Login auf dem Home-Bildschirm | App vom Home-Bildschirm löschen, in Safari neu einloggen, erneut hinzufügen. |
| Icon/Name auf dem Home-Bildschirm veraltet | Icon löschen und erneut „Zum Home-Bildschirm“ (iOS cacht das Manifest). |
| „Use current location“ geht nicht | iPhone-Einstellungen → Datenschutz → Ortungsdienste → Safari-Websites erlauben. |
