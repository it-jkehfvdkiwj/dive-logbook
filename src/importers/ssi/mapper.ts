// Übersetzt die SSI-Logbuch-Rohdaten in das neutrale ImportedDive-Format.
// Bekannte Felder (aus divessi-export) werden direkt gelesen; für unbekannte
// Felder gibt es vorsichtige Heuristiken. Nichts hier hängt am internen DB-Modell.

import type { ImportedDive } from "../types";

type Raw = Record<string, unknown>;

const isRecord = (v: unknown): v is Raw => !!v && typeof v === "object" && !Array.isArray(v);

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v.trim().replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Text, der nicht nur eine Zahl/ID ist */
function text(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t || /^-?\d+(\.\d+)?$/.test(t) || t.toLowerCase() === "null") return null;
  return t;
}

/** Erstes Feld aus `keys`, sonst erstes Feld, dessen Name auf `pattern` passt. */
function pick(obj: Raw, keys: string[], pattern?: RegExp, exclude?: RegExp): unknown {
  for (const k of keys) if (obj[k] !== undefined && obj[k] !== null && obj[k] !== "") return obj[k];
  if (pattern) {
    for (const [k, v] of Object.entries(obj)) {
      if (pattern.test(k) && !(exclude && exclude.test(k)) && v !== null && v !== "") return v;
    }
  }
  return undefined;
}

function isoDate(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  const eu = v.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (eu) return `${eu[3]}-${eu[2].padStart(2, "0")}-${eu[1].padStart(2, "0")}`;
  return null;
}

function hhmm(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const m = v.match(/(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const h = Number(m[1]);
  if (h > 23) return null;
  return `${String(h).padStart(2, "0")}:${m[2]}`;
}

const positive = (n: number | null) => (n != null && n > 0 ? n : null);

interface SiteInfo {
  name: string;
  country: string | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
}

function mapSites(rawSites: unknown): Map<string, SiteInfo> {
  const map = new Map<string, SiteInfo>();
  if (!Array.isArray(rawSites)) return map;
  for (const s of rawSites) {
    if (!isRecord(s)) continue;
    const id = pick(s, ["odin_dive_sites_id", "id"], /sites?_id$/);
    const name = text(pick(s, ["odin_dive_sites_name", "name"], /name$/));
    if (id == null || !name) continue;
    const lat = num(pick(s, ["odin_dive_sites_lat", "lat", "latitude"], /(^|_)lat(itude)?$/));
    const lng = num(pick(s, ["odin_dive_sites_lng", "odin_dive_sites_lon", "lng", "lon", "longitude"], /(^|_)(lng|lon|long|longitude)$/));
    const validCoords = lat != null && lng != null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0);
    map.set(String(id), {
      name,
      country: text(pick(s, [], /country(_name)?$/, /_id$/)),
      location: text(pick(s, [], /(city|region|location|place|area)(_name)?$/, /_id$/)),
      latitude: validCoords ? lat : null,
      longitude: validCoords ? lng : null,
    });
  }
  return map;
}

function gearLine(d: Raw): string | null {
  const parts: string[] = [];
  const ean = d.odin_user_log_ean;
  const eanPct = num(d.odin_user_log_ean_percent);
  if (ean === true || ean === 1 || ean === "1") parts.push(`Nitrox ${eanPct ?? "?"}%`);
  const tank = num(d.odin_user_log_tank_vol_l);
  const tankType = { 19: "steel", 20: "alu" }[num(d.odin_user_log_var_tanktype_id) ?? 0];
  if (positive(tank)) parts.push(`${tank} l${tankType ? ` ${tankType}` : ""}`);
  const start = positive(num(d.odin_user_log_pressure_start_bar));
  const end = positive(num(d.odin_user_log_pressure_end_bar));
  if (start && end) parts.push(`${start}→${end} bar`);
  const weight = positive(num(d.odin_user_log_weight_kg));
  if (weight) parts.push(`${weight} kg`);
  const gear = text(d.odin_user_log_gear_details);
  if (gear) parts.push(gear);
  return parts.length ? `SSI: ${parts.join(" · ")}` : null;
}

export interface SsiMapResult {
  dives: ImportedDive[];
  diagnostics: string[];
}

export function mapSsiLogbook(raw: Raw): SsiMapResult {
  const diagnostics: string[] = [];
  diagnostics.push(`response keys: ${Object.keys(raw).join(", ") || "(none)"}`);

  const details = raw.logbook_details ?? raw.logbook ?? raw.dives;
  if (!Array.isArray(details)) {
    diagnostics.push("no logbook_details array found");
    return { dives: [], diagnostics };
  }
  const sites = mapSites(raw.logbook_sites ?? raw.sites);
  diagnostics.push(`logbook entries: ${details.length}, sites: ${sites.size}`);
  const first = details.find(isRecord);
  if (first) diagnostics.push(`entry fields: ${Object.keys(first).join(", ")}`);
  const firstSite = Array.isArray(raw.logbook_sites) ? raw.logbook_sites.find(isRecord) : undefined;
  if (firstSite) diagnostics.push(`site fields: ${Object.keys(firstSite).join(", ")}`);

  const dives: ImportedDive[] = [];
  let skipped = 0;

  for (const d of details) {
    if (!isRecord(d)) continue;
    const date = isoDate(pick(d, ["odin_user_log_date", "date"], /_date$/));
    if (!date) {
      skipped++;
      continue;
    }
    const diveNumber = num(pick(d, ["odin_user_log_nr", "nr", "dive_nr"]));
    const idRaw = pick(d, ["odin_user_log_id", "odin_user_logs_id", "user_log_id", "log_id", "id"]);
    // Stabile ID: echte SSI-ID, sonst Datum + Nummer (+ Uhrzeit)
    const time = hhmm(pick(d, ["odin_user_log_entry_time", "entry_time", "time"], /entry_time$/));
    const externalId =
      idRaw != null && String(idRaw).trim() ? String(idRaw) : `${date}#${diveNumber ?? "x"}#${time ?? ""}`;

    const siteId = pick(d, ["odin_user_log_dive_sites_id", "dive_sites_id", "site_id"], /sites?_id$/);
    const site = siteId != null ? sites.get(String(siteId)) : undefined;
    const siteName =
      site?.name ?? text(pick(d, ["odin_user_log_dive_site_name", "site_name"], /site_name$/)) ?? "Unknown site (SSI)";

    const comment = text(pick(d, ["odin_user_log_comment", "comment", "notes"]));
    const gear = gearLine(d);
    const notes = [comment, gear].filter(Boolean).join("\n\n") || null;

    const maxDepth = positive(num(pick(d, ["odin_user_log_depth_m", "depth_m", "max_depth"])));
    let avgDepth = positive(num(pick(d, ["odin_user_log_avg_depth_m", "avg_depth_m", "avg_depth"])));
    if (avgDepth != null && maxDepth != null && avgDepth > maxDepth) avgDepth = null;
    const temp = num(pick(d, ["odin_user_log_watertemp_c", "watertemp_c", "water_temp"]));

    dives.push({
      externalId,
      date,
      startTime: time,
      diveNumber: diveNumber != null && diveNumber >= 1 ? Math.round(diveNumber) : null,
      site: {
        externalId: siteId != null ? String(siteId) : null,
        name: siteName,
        country: site?.country ?? null,
        location: site?.location ?? null,
        latitude: site?.latitude ?? null,
        longitude: site?.longitude ?? null,
      },
      maxDepth,
      avgDepth,
      duration: (() => {
        const t = positive(num(pick(d, ["odin_user_log_divetime", "divetime", "duration"])));
        return t != null ? Math.round(t) : null;
      })(),
      waterTemperature: temp != null && temp > -3 && temp < 45 && temp !== 0 ? temp : null,
      visibility: positive(num(pick(d, ["odin_user_log_visibility_m", "visibility_m"], /visib/, /_id$/))),
      buddy: text(pick(d, ["odin_user_log_buddy", "buddy"], /buddy(_name)?$/, /_id$/)),
      diveCenter: text(pick(d, ["odin_user_log_divecenter_confirmed_name", "divecenter_name"], /divecenter.*name$/)),
      notes,
    });
  }

  if (skipped) diagnostics.push(`skipped ${skipped} entries without a valid date`);
  diagnostics.push(`mapped dives: ${dives.length}`);
  return { dives, diagnostics };
}
