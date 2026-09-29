import type { DiveImporter, ImportedDive } from "./types";
import { ssiAuthenticate, ssiGetDivelog, ssiTryCall } from "./ssi/client";
import { findCatalogList, mapSsiLogbook, parseIdList } from "./ssi/mapper";
import { parseProfile } from "@/lib/profile";

/** Kandidaten für einen Profil-Endpunkt pro Tauchgang (nicht dokumentiert → ausprobieren). */
const PROFILE_ENDPOINTS = [
  "get_dive_profile",
  "get_divelog_profile",
  "get_log_profile",
  "get_profile",
  "get_profiles",
  "get_dive_samples",
  "get_samples",
  "get_divecomputer_data",
  "get_dc_data",
  "get_log",
  "get_dive",
  "get_log_details",
  "get_divelog_details",
  "get_divelog_entry",
];
const PROFILE_ID_PARAMS = ["log_id", "id", "odin_user_log_id", "user_log_id"];

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
    /** SSI-Log-IDs, deren Profil schon gespeichert ist (spart Abrufe) */
    private readonly haveProfile: Set<string> = new Set(),
  ) {}

  async importDives(): Promise<ImportedDive[]> {
    const token = await ssiAuthenticate(this.email, this.password);
    const raw = await ssiGetDivelog(token);
    const probeLog: string[] = [];
    const catalog = await this.findAnimalCatalog(token, raw, probeLog);
    const { dives, diagnostics } = mapSsiLogbook(raw, catalog);
    await this.fetchProfiles(token, dives, probeLog);
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
    // Laut SSI hängt die Tierliste vom Wassertyp bzw. Tauchplatz ab → auch mit Parametern probieren
    const sites = Array.isArray(raw.logbook_sites) ? (raw.logbook_sites as Record<string, unknown>[]) : [];
    const siteId = String(sites.find((x) => x?.odin_dive_sites_id != null)?.odin_dive_sites_id ?? "");
    const variants: { what: string; extra: Record<string, string> }[] = endpoints.map((what) => ({ what, extra: {} }));
    if (!process.env.SSI_ANIMAL_ENDPOINT) {
      for (const what of ["get_animals", "get_wildlife", "get_fish", "get_site_animals", "get_dive_site_animals"]) {
        variants.push({ what, extra: { lang: "en" } });
        variants.push({ what, extra: { watertype: "1" } });
        variants.push({ what, extra: { watertype_id: "1", lang: "en" } });
        if (siteId) variants.push({ what, extra: { dive_sites_id: siteId, site_id: siteId } });
      }
    }
    for (const { what, extra } of variants) {
      const data = await ssiTryCall(token, what, extra);
      const list = findCatalogList(data);
      const shape =
        data === null
          ? "error"
          : Array.isArray(data)
            ? `array(${data.length})`
            : typeof data === "object"
              ? `keys: ${Object.keys(data as object).slice(0, 10).join(", ") || "none"}`
              : typeof data;
      const label = Object.keys(extra).length ? `${what}?${new URLSearchParams(extra)}` : what;
      if (!list && data === null && Object.keys(extra).length) continue; // Varianten-Fehler nicht einzeln protokollieren
      log.push(`animal catalog probe "${label}": ${list ? `${list.length} entries (fields: ${Object.keys(list[0]).join(", ")})` : `no list (${shape})`}`);
      if (list) return list;
    }
    return null;
  }

  /**
   * Stehen die Profile nicht im Logbuch selbst, wird ein Endpunkt pro Dive gesucht
   * (parallel, kurzer Timeout) und – falls gefunden – für alle Dives ohne Profil genutzt.
   */
  private async fetchProfiles(token: string, dives: ImportedDive[], log: string[]) {
    if (!dives.length || dives.some((d) => d.profile?.length)) return;
    const probeDive = dives.find((d) => /^\d+$/.test(d.externalId) && d.maxDepth && d.duration);
    if (!probeDive) return;
    const hintFor = (d: ImportedDive) => ({ maxDepth: d.maxDepth ?? null, durationMin: d.duration ?? null });

    const override = process.env.SSI_PROFILE_ENDPOINT; // z. B. "get_dive_profile:log_id"
    const combos = override
      ? [{ what: override.split(":")[0], param: override.split(":")[1] ?? "log_id" }]
      : PROFILE_ENDPOINTS.flatMap((what) => PROFILE_ID_PARAMS.slice(0, 2).map((param) => ({ what, param })));

    const results = await Promise.all(
      combos.map(async (c) => {
        const data = await ssiTryCall(token, c.what, { [c.param]: probeDive.externalId }, 8000);
        return { ...c, data, samples: data ? parseProfile(data, hintFor(probeDive)) : null };
      }),
    );
    const hit = results.find((r) => r.samples);
    const answered = results.filter((r) => r.data != null && !(typeof r.data === "object" && r.data && "error" in r.data));
    log.push(
      `profile probe (dive ${probeDive.externalId}): ${
        hit
          ? `found via ${hit.what}?${hit.param}= (${hit.samples!.length} points)`
          : `nothing found; answers: ${answered.map((r) => `${r.what}?${r.param}→${JSON.stringify(r.data)?.slice(0, 80)}`).join(" | ") || "none"}`
      }`,
    );
    if (!hit) return;

    const todo = dives.filter((d) => /^\d+$/.test(d.externalId) && !this.haveProfile.has(d.externalId)).slice(0, 150);
    let found = 0;
    for (let i = 0; i < todo.length; i += 6) {
      await Promise.all(
        todo.slice(i, i + 6).map(async (d) => {
          const data = d === probeDive ? hit.data : await ssiTryCall(token, hit.what, { [hit.param]: d.externalId }, 10000);
          const samples = data ? parseProfile(data, hintFor(d)) : null;
          if (samples) {
            d.profile = samples;
            found++;
          }
        }),
      );
    }
    log.push(`profiles downloaded: ${found} of ${todo.length}`);
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
