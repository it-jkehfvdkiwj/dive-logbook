import type { DiveImporter, ImportedDive } from "./types";

/**
 * Referenz-Importer: nimmt ein JSON-Array im `ImportedDive`-Format entgegen.
 * Dient als funktionierendes Beispiel für die Import-Pipeline und als
 * Fallback, falls Daten aus einer anderen App exportiert wurden.
 *
 * Die Validierung übernimmt der ImportService – ungültige Einträge werden
 * übersprungen und im Ergebnis gemeldet.
 */
export class JsonImporter implements DiveImporter {
  readonly label = "JSON file";

  constructor(
    private readonly payload: unknown,
    readonly source: string = "json",
  ) {}

  async importDives(): Promise<ImportedDive[]> {
    const data = this.payload;
    const list = Array.isArray(data)
      ? data
      : data && typeof data === "object" && Array.isArray((data as { dives?: unknown }).dives)
        ? (data as { dives: unknown[] }).dives
        : null;
    if (!list) throw new Error('Expected a JSON array of dives or an object with a "dives" array.');
    return list as ImportedDive[];
  }
}
