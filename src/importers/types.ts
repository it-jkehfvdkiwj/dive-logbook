import { z } from "zod";

// ============================================================================
// Import-Abstraktion
// ----------------------------------------------------------------------------
// Jede externe Quelle (SSI, Suunto, Garmin, Datei-Import, …) implementiert
// `DiveImporter` und liefert Tauchgänge im neutralen `ImportedDive`-Format.
// Der ImportService (src/services/importService.ts) übersetzt diese dann in
// das interne Datenmodell – inkl. Dublettenerkennung über source + externalId.
//
// Wichtig: Kein Importer schreibt direkt in die Datenbank, und kein Teil des
// internen Modells kennt quell-spezifische Feldnamen (z. B. "ssiDiveId").
// ============================================================================

export const importedSiteSchema = z.object({
  externalId: z.string().nullish(),
  name: z.string().trim().min(1),
  location: z.string().trim().nullish(),
  country: z.string().trim().nullish(),
  latitude: z.number().min(-90).max(90).nullish(),
  longitude: z.number().min(-180).max(180).nullish(),
});

export const importedSightingSchema = z.object({
  /** ID der Art in der Quelle (z. B. SSI-Wildlife-ID) */
  speciesExternalId: z.string().nullish(),
  commonName: z.string().trim().min(1),
  scientificName: z.string().trim().nullish(),
  category: z.string().trim().nullish(),
  count: z.number().int().min(1).nullish(),
  notes: z.string().nullish(),
});

export const importedPhotoSchema = z.object({
  externalId: z.string().nullish(),
  url: z.url(),
  caption: z.string().nullish(),
});

export const importedDiveSchema = z.object({
  /** Stabile ID in der Quelle – Pflicht, damit ein Re-Sync keine Duplikate erzeugt. */
  externalId: z.string().min(1),
  /** YYYY-MM-DD (Ortszeit am Tauchplatz) */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .nullish(),
  diveNumber: z.number().int().min(1).nullish(),
  site: importedSiteSchema,
  maxDepth: z.number().min(0).nullish(),
  avgDepth: z.number().min(0).nullish(),
  /** Minuten */
  duration: z.number().int().min(0).nullish(),
  waterTemperature: z.number().nullish(),
  visibility: z.number().min(0).nullish(),
  conditions: z.string().nullish(),
  current: z.string().nullish(),
  weather: z.string().nullish(),
  entryType: z.string().nullish(),
  diveType: z.string().nullish(),
  buddy: z.string().nullish(),
  diveCenter: z.string().nullish(),
  notes: z.string().nullish(),
  sightings: z.array(importedSightingSchema).optional(),
  /** Tier-IDs der Quelle ohne bekannten Namen – werden über ExternalSpeciesMap aufgelöst */
  pendingSpeciesIds: z.array(z.string()).optional(),
  photos: z.array(importedPhotoSchema).optional(),
});

export type ImportedSite = z.infer<typeof importedSiteSchema>;
export type ImportedSighting = z.infer<typeof importedSightingSchema>;
export type ImportedPhoto = z.infer<typeof importedPhotoSchema>;
export type ImportedDive = z.infer<typeof importedDiveSchema>;

export interface DiveImporter {
  /** Wird als `source` an Dives/Sites/Species gespeichert, z. B. "ssi" */
  readonly source: string;
  /** Anzeigename in der UI */
  readonly label: string;
  importDives(): Promise<ImportedDive[]>;
  /** Optionale Diagnosezeilen (z. B. gefundene Feldnamen) – werden im ImportRun gespeichert. */
  diagnostics?(): string[];
}

export interface ImportResult {
  runId: string;
  source: string;
  created: number;
  updated: number;
  skipped: number;
  errors: { externalId?: string; message: string }[];
  log?: string[];
}
