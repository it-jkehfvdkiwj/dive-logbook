import type { DiveImporter, ImportedDive } from "./types";

/**
 * Platzhalter für den späteren SSI-Import. Bewusst NICHT implementiert.
 *
 * Geplanter Ablauf:
 *  1. Rohdaten von SSI beziehen (offizieller Export / API – kein Scraping, kein Login-Nachbau).
 *  2. Jeden SSI-Datensatz in ein `ImportedDive` übersetzen, z. B.:
 *       SSI dive id      → externalId
 *       dive date/time   → date ("YYYY-MM-DD") + startTime ("HH:mm")
 *       max depth        → maxDepth (m)
 *       bottom time      → duration (min)
 *       dive site (+id)  → site { name, location, country, latitude, longitude, externalId }
 *       wildlife entries → sightings [{ commonName, scientificName, speciesExternalId, count }]
 *  3. Der ImportService erledigt Dublettenprüfung (source="ssi" + externalId),
 *     Create/Update und den Schutz manuell geänderter Felder.
 *
 * Dadurch hängt die interne Datenbank nie vom SSI-Format ab.
 */
export class SSIImporter implements DiveImporter {
  readonly source = "ssi";
  readonly label = "SSI";

  async importDives(): Promise<ImportedDive[]> {
    throw new Error("SSI import is not implemented yet.");
  }
}
