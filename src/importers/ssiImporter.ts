import type { DiveImporter, ImportedDive } from "./types";
import { ssiAuthenticate, ssiGetDivelog, ssiTryCall } from "./ssi/client";
import { findCatalogList, mapSsiLogbook, parseIdList } from "./ssi/mapper";

/**
 * SSI-Import über die (inoffizielle) MySSI-App-API.
 * Zugangsdaten werden nur für diesen Abruf verwendet und nie gespeichert.
 * Abgleich, Create/Update und Schutz manueller Änderungen übernimmt runImport().
 */
export class SSIImporter implements DiveImporter {
  readonly source = "ssi";
  readonly label = "SSI";
  private log: string[] = [];

  constructor(
    private readonly email: string,
    private readonly password: string,
  ) {}

  async importDives(): Promise<ImportedDive[]> {
    const token = await ssiAuthenticate(this.email, this.password);
    const raw = await ssiGetDivelog(token);
    const probeLog: string[] = [];
    const catalog = await this.findAnimalCatalog(token, raw, probeLog);
    const { dives, diagnostics } = mapSsiLogbook(raw, catalog);
    this.log = [...diagnostics, ...probeLog];
    return dives;
  }

  /**
   * SSI liefert pro Dive nur Tier-IDs. Die Namen stehen in einem separaten Katalog,
   * dessen Endpunkt nicht dokumentiert ist – daher werden bekannte Kandidaten ausprobiert.
   * Nur wenn Tier-IDs vorhanden sind und die Logbuch-Antwort selbst keine Namen enthält.
   */
  private async findAnimalCatalog(token: string, raw: Record<string, unknown>, log: string[]) {
    const details = Array.isArray(raw.logbook_details) ? raw.logbook_details : [];
    const hasAnimalIds = details.some(
      (d) => d && typeof d === "object" && parseIdList((d as Record<string, unknown>).odin_user_log_animal_ids).length > 0,
    );
    if (!hasAnimalIds) return null;
    const inResponse = Object.entries(raw).some(([k, v]) => /animal|fish|wildlife/i.test(k) && Array.isArray(v) && v.length);
    if (inResponse) return null;

    const endpoints = process.env.SSI_ANIMAL_ENDPOINT
      ? [process.env.SSI_ANIMAL_ENDPOINT]
      : [
          "get_animals",
          "get_animal_list",
          "get_animals_list",
          "get_all_animals",
          "get_logbook_animals",
          "get_fish",
          "get_fishes",
          "get_marinelife",
          "get_marine_life",
          "get_wildlife",
          "get_species",
          "get_sealife",
          "get_creatures",
          "get_lookups",
          "get_var",
          "get_vars",
          "get_masterdata",
        ];
    for (const what of endpoints) {
      const data = await ssiTryCall(token, what);
      const list = findCatalogList(data);
      const shape =
        data === null
          ? "error"
          : Array.isArray(data)
            ? `array(${data.length})`
            : typeof data === "object"
              ? `keys: ${Object.keys(data as object).slice(0, 10).join(", ") || "none"}`
              : typeof data;
      log.push(`animal catalog probe "${what}": ${list ? `${list.length} entries (fields: ${Object.keys(list[0]).join(", ")})` : `no list (${shape})`}`);
      if (list) return list;
    }
    return null;
  }

  diagnostics(): string[] {
    return this.log;
  }
}

/** Zugangsdaten aus den Umgebungsvariablen (für "Sync now" ohne Eingabe und den täglichen Cron). */
export function ssiCredentialsFromEnv(): { email: string; password: string } | null {
  const email = process.env.SSI_EMAIL?.trim();
  const password = process.env.SSI_PASSWORD;
  return email && password ? { email, password } : null;
}
