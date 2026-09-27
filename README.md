# Dive Log – Logbook & Marine Life Tracker

Persönliches, mobile-first Tauch-Logbuch als PWA. Next.js 16 · TypeScript · Tailwind CSS 4 · shadcn/ui-Komponenten · PostgreSQL · Prisma 7 · Zod · lucide-react.

## Schnellstart

Voraussetzungen: Node.js ≥ 20.9 und Docker (oder eine eigene PostgreSQL-Instanz).

```bash
cp .env.example .env
npm install          # generiert auch den Prisma Client
npm run setup        # Postgres starten + Migrationen + Seed-Daten
npm run dev          # http://localhost:3000
```

Einzelne Schritte:

| Befehl | Zweck |
| --- | --- |
| `npm run db:up` / `db:down` | PostgreSQL via Docker starten/stoppen |
| `npm run db:migrate` | Migrationen anwenden |
| `npm run db:migrate:dev` | Neue Migration nach Schema-Änderung erzeugen |
| `npm run db:seed` | Arten-Katalog + Demo-Tauchgänge (nur wenn DB leer) |
| `npm run db:clear-demo` | Demo-Tauchgänge löschen (auch in Settings möglich) |
| `npm run db:studio` | Prisma Studio |
| `npm run typecheck` / `lint` / `build` | Qualitätschecks |
| `node scripts/smoke-test.mjs` | API-End-to-End-Test gegen laufenden Server (44 Checks) |

Ohne Docker: eigene Postgres-Datenbank anlegen und `DATABASE_URL` in `.env` anpassen.

## Auf dem iPhone nutzen

1. `npm run dev:lan` (lauscht auf allen Interfaces) – oder für echtes App-Gefühl `npm run build && npm start -- -H 0.0.0.0`.
2. Im Safari `http://<IP-deines-Rechners>:3000` öffnen → Teilen → **Zum Home-Bildschirm**.
3. Die App startet danach im Standalone-Modus ohne Browser-UI.

Hinweise: Next.js blockt im Dev-Modus Anfragen von fremden Hosts – ggf. `allowedDevOrigins: ["192.168.x.x"]` in `next.config.ts` eintragen. Der Service Worker (Offline-Seite, Asset-Cache) läuft nur im Production-Modus. „Use current location“ braucht auf iOS HTTPS (oder localhost).

## Struktur

```
prisma/            schema.prisma, migrations/, seed.ts, seed-data.ts, clear-demo.ts
src/app/           Seiten (App Router) + api/ (REST-Routen)
src/components/    ui/ (shadcn-Stil) · layout/ · common/ · dives/ · species/ · settings/
src/services/      Business-Logik: dive, diveSite, species, sighting, stats, import, photo, settings, demoData
src/importers/     Import-Abstraktion: types.ts (DiveImporter, ImportedDive), jsonImporter, ssiImporter (Platzhalter), registry
src/lib/           db, Validierung (Zod), Formatierung, Kategorien, API-Client
src/types/         View-Modelle (DTOs)
public/            Icons, Service Worker, Offline-Seite
```

## Datenmodell

`DiveSite 1─n Dive 1─n Sighting n─1 Species`, dazu `DivePhoto`, `ImportRun`, `AppSettings`.

- **Life List** = alle Species mit ≥ 1 Sighting. Eine Art existiert genau einmal, Sichtungen beliebig oft. Pro Dive ist eine Art eindeutig (`@@unique([diveId, speciesId])`); erneutes Hinzufügen aktualisiert Anzahl/Notiz.
- **Wissenschaftlicher Name** ist eindeutig (DB-Unique + case-insensitive Prüfung im Service → HTTP 409).
- **Dive löschen** → Sightings & Fotos werden per Cascade gelöscht, die Species bleibt im Katalog.
- **Species löschen** → UI warnt bei vorhandenen Sightings, danach Cascade.
- **Externe Herkunft**: `source`, `externalId`, `lastSyncedAt` auf Dive (sowie Site, Species, Sighting, Photo); `@@unique([source, externalId])` verhindert Doppelimporte.
- `manuallyEditedFields` merkt sich, welche Felder bei importierten Dives manuell geändert wurden → ein Sync überschreibt sie nicht (außer in Settings aktiviert).

## API

```
GET/POST        /api/dives                 (?q, favorite, country, location, diveType, from, to, minDepth, maxDepth, sort)
GET/PUT/DELETE  /api/dives/:id
PATCH           /api/dives/:id/favorite    { favorite: boolean }
POST            /api/dives/:id/photos      DELETE /api/photos/:id
GET/POST        /api/species               (?search=… oder ?view=seen|all, q, category, country, sort)
GET/PUT/DELETE  /api/species/:id
GET/POST        /api/sightings             PUT/DELETE /api/sightings/:id
GET             /api/stats                 GET/PUT /api/settings
POST            /api/import/json           DELETE /api/demo-data
```

## Import / SSI vorbereiten

Jede Quelle implementiert `DiveImporter` (`src/importers/types.ts`) und liefert `ImportedDive[]` im neutralen Format. `runImport()` in `src/services/importService.ts` übernimmt Validierung, Abgleich über `externalId`, Anlegen/Aktualisieren, Artenzuordnung (externe ID → wissenschaftlicher Name → Name → neu) und protokolliert einen `ImportRun`. Der `JsonImporter` ist ein funktionierendes Referenzbeispiel (Settings → Import JSON file).

Für SSI muss nur `SSIImporter.importDives()` die Rohdaten holen und auf `ImportedDive` mappen – Datenbank und UI bleiben unverändert.
