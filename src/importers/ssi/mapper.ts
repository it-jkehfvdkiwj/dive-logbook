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

/**
 * Land eines SSI-Tauchplatzes. Die Feldnamen variieren ("odin_countries_name",
 * "country", verschachtelte Objekte …) – englische Varianten werden bevorzugt.
 * Die Vereinheitlichung (GPS/Aliase) passiert später in resolveSite().
 */
function siteCountry(s: Raw): string | null {
  const entries = Object.entries(s).filter(([k]) => /countr(y|ies)/i.test(k) && !/_id$/i.test(k));
  const valueText = (v: unknown): string | null => {
    if (isRecord(v)) return nameOf(v, [/(^|_)(name_?)?en$/i, /name$/i]) ?? null;
    return text(v);
  };
  const ordered = [
    ...entries.filter(([k]) => /(_en|name_?en|english)$/i.test(k)),
    ...entries.filter(([k]) => /countr(y|ies)(_name)?$/i.test(k)),
    ...entries,
  ];
  for (const [, v] of ordered) {
    const t = valueText(v);
    if (t) return t;
  }
  return null;
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
      country: siteCountry(s),
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

// ---------------------------------------------------------------------------
// Buddy & Tiere – SSI liefert diese je nach Version als eigene Listen (verknüpft
// über die Log-ID) oder verschachtelt im Log-Eintrag. Beides wird unterstützt.
// ---------------------------------------------------------------------------

const WILDLIFE_KEY = /(fish|animal|wildlife|marine|species|creature|sighting|critter|fauna)/i;
const BUDDY_KEY = /(buddy|buddies|dive_?partner|divers?_?with|companion)/i;
const LOG_REF_KEY = /(user_?log_?id|log_?id|logs?_id|dive_?log_?id)$/i;

function nameOf(o: Raw, prefer: RegExp[]): string | null {
  for (const re of prefer) {
    for (const [k, v] of Object.entries(o)) if (re.test(k) && text(v)) return text(v);
  }
  return null;
}

interface RawSighting {
  commonName: string;
  scientificName: string | null;
  speciesExternalId: string | null;
  count: number | null;
}

function toSighting(o: unknown): RawSighting | null {
  if (typeof o === "string") return text(o) ? { commonName: o.trim(), scientificName: null, speciesExternalId: null, count: null } : null;
  if (!isRecord(o)) return null;
  const commonName = nameOf(o, [/(common|english|en)_?name$/i, /(^|_)name(_en)?$/i, /title$/i]);
  if (!commonName) return null;
  const scientificName = nameOf(o, [/(scientific|latin)(_?name)?$/i, /species_?name$/i]);
  const idKey = Object.keys(o).find((k) => /(fish|animal|species|wildlife|creature)s?_id$/i.test(k));
  const count = num(pick(o, ["count", "quantity", "amount", "number"], /(count|quantity|amount)$/i));
  return {
    commonName,
    scientificName: scientificName && scientificName !== commonName ? scientificName : null,
    speciesExternalId: idKey && o[idKey] != null ? String(o[idKey]) : null,
    count: count != null && count >= 1 ? Math.round(count) : null,
  };
}

function toBuddyName(o: unknown): string | null {
  if (typeof o === "string") return text(o);
  if (!isRecord(o)) return null;
  const first = nameOf(o, [/first_?name$/i]);
  const last = nameOf(o, [/last_?name$/i]);
  if (first || last) return [first, last].filter(Boolean).join(" ");
  return nameOf(o, [/(buddy|user|diver|display|full)_?name$/i, /(^|_)name$/i]);
}

/** Top-Level-Listen (z. B. "logbook_fish") nach Log-ID gruppieren. */
function groupByLog(raw: Raw, keyPattern: RegExp, diagnostics: string[], label: string): Map<string, unknown[]> {
  const map = new Map<string, unknown[]>();
  for (const [key, value] of Object.entries(raw)) {
    if (!keyPattern.test(key) || !Array.isArray(value)) continue;
    let linked = 0;
    for (const item of value) {
      if (!isRecord(item)) continue;
      const refKey = Object.keys(item).find((k) => LOG_REF_KEY.test(k));
      if (!refKey || item[refKey] == null) continue;
      const ref = String(item[refKey]);
      map.set(ref, [...(map.get(ref) ?? []), item]);
      linked++;
    }
    diagnostics.push(`${label} list "${key}": ${value.length} items, ${linked} linked to dives`);
  }
  return map;
}

/** Verschachtelte Listen/Texte direkt im Log-Eintrag. */
function nestedValues(d: Raw, keyPattern: RegExp): unknown[] {
  const out: unknown[] = [];
  for (const [k, v] of Object.entries(d)) {
    if (!keyPattern.test(k)) continue;
    if (Array.isArray(v)) out.push(...v);
    else if (isRecord(v)) out.push(...Object.values(v));
    else if (typeof v === "string" && /[a-z]/i.test(v) && !/_id$/i.test(k)) out.push(...v.split(/[,;\n]/));
  }
  return out;
}

/** "12,34" · "12;34" · "[12,34]" · [12, 34] · 12 → ["12","34"] */
export function parseIdList(v: unknown): string[] {
  if (v == null || v === "" || v === 0 || v === "0") return [];
  if (Array.isArray(v)) return v.flatMap(parseIdList);
  if (typeof v === "number") return [String(v)];
  if (isRecord(v)) return Object.values(v).flatMap(parseIdList);
  if (typeof v === "string") {
    const t = v.trim();
    if (t.startsWith("[") || t.startsWith("{")) {
      try {
        return parseIdList(JSON.parse(t));
      } catch {
        /* weiter mit Split */
      }
    }
    return t
      .split(/[,;|\s]+/)
      .map((x) => x.trim())
      .filter((x) => x && x !== "0");
  }
  return [];
}

/** Index "beliebige ID eines Eintrags" → Eintrag (für Buddy- und Tierlisten). */
function indexById<T>(items: unknown[], toValue: (o: Raw) => T | null): Map<string, T> {
  const map = new Map<string, T>();
  for (const item of items) {
    if (!isRecord(item)) continue;
    const value = toValue(item);
    if (value == null) continue;
    for (const [k, v] of Object.entries(item)) {
      if (!/(^|_)id$/i.test(k) || LOG_REF_KEY.test(k)) continue;
      if (typeof v === "number" || (typeof v === "string" && v.trim())) map.set(String(v).trim(), value);
    }
  }
  return map;
}

/** Findet in einer beliebigen JSON-Antwort die erste Liste von Einträgen mit ID und Namen. */
export function findCatalogList(data: unknown): Raw[] | null {
  const candidates: unknown[] = Array.isArray(data) ? [data] : isRecord(data) ? Object.values(data) : [];
  for (const c of candidates) {
    if (!Array.isArray(c) || !c.length) continue;
    const item = c.find(isRecord);
    if (item && Object.keys(item).some((k) => /(^|_)id$/i.test(k)) && toSighting(item)) return c.filter(isRecord);
  }
  return null;
}

function sample(details: unknown[], key: string): string {
  const d = details.find((x) => isRecord(x) && x[key] != null && x[key] !== "" && x[key] !== "0") as Raw | undefined;
  if (!d) return "(always empty)";
  const v = d[key];
  const shown = typeof v === "string" ? JSON.stringify(v.slice(0, 40)) : JSON.stringify(v)?.slice(0, 40);
  return `${Array.isArray(v) ? "array" : typeof v} ${shown}`;
}

export interface SsiMapResult {
  dives: ImportedDive[];
  diagnostics: string[];
}

export function mapSsiLogbook(raw: Raw, animalCatalog: Raw[] | null = null): SsiMapResult {
  const diagnostics: string[] = [];
  diagnostics.push(`response keys: ${Object.keys(raw).join(", ") || "(none)"}`);

  const details = raw.logbook_details ?? raw.logbook ?? raw.dives;
  if (!Array.isArray(details)) {
    diagnostics.push("no logbook_details array found");
    return { dives: [], diagnostics };
  }
  const sites = mapSites(raw.logbook_sites ?? raw.sites);
  diagnostics.push(`logbook entries: ${details.length}, sites: ${sites.size}`);
  for (const [key, value] of Object.entries(raw)) {
    if (key === "logbook_details") continue;
    if (Array.isArray(value)) {
      const item = value.find(isRecord);
      diagnostics.push(`list "${key}" (${value.length})${item ? `: ${Object.keys(item).join(", ")}` : ""}`);
    } else if (isRecord(value)) {
      diagnostics.push(`object "${key}": ${Object.keys(value).slice(0, 30).join(", ")}`);
    }
  }
  for (const key of [
    "odin_user_log_buddy_ids",
    "odin_user_log_animal_ids",
    "odin_user_log_dive_type",
    "odin_user_log_deleted",
    "odin_user_log_vis_m",
  ]) {
    diagnostics.push(`sample ${key}: ${sample(details, key)}`);
  }
  const rawSiteList = Array.isArray(raw.logbook_sites) ? raw.logbook_sites.filter(isRecord) : [];
  const countryKeys = [...new Set(rawSiteList.flatMap((x) => Object.keys(x).filter((k) => /countr/i.test(k))))];
  diagnostics.push(
    `site country fields: ${countryKeys.map((k) => `${k}=${JSON.stringify(rawSiteList.find((x) => x[k] != null)?.[k] ?? null)?.slice(0, 40)}`).join("; ") || "(none)"}`,
  );
  diagnostics.push(`sites with GPS: ${[...sites.values()].filter((x) => x.latitude != null).length}/${sites.size}`);
  const wildlifeByLog = groupByLog(raw, WILDLIFE_KEY, diagnostics, "wildlife");
  const buddiesByLog = groupByLog(raw, BUDDY_KEY, diagnostics, "buddy");

  // Buddy-/Tier-IDs → Namen (SSI speichert pro Dive nur IDs)
  const buddyLists = Object.entries(raw).filter(([k, v]) => BUDDY_KEY.test(k) && Array.isArray(v));
  const buddyIndex = indexById(buddyLists.flatMap(([, v]) => v as unknown[]), toBuddyName);
  const animalLists = [
    ...Object.entries(raw)
      .filter(([k, v]) => WILDLIFE_KEY.test(k) && Array.isArray(v))
      .flatMap(([, v]) => v as unknown[]),
    ...(animalCatalog ?? []),
  ];
  // Rohe Katalog-Einträge speichern (toSighting läuft später einmal pro Dive)
  const animalIndex = indexById(animalLists, (o) => (toSighting(o) ? o : null));
  diagnostics.push(`buddy names known: ${buddyIndex.size}, animal names known: ${animalIndex.size}`);
  let unresolvedAnimals = 0;
  let unresolvedBuddies = 0;
  let deleted = 0;
  let withSightings = 0;
  let withBuddy = 0;

  const dives: ImportedDive[] = [];
  let skipped = 0;

  for (const d of details) {
    if (!isRecord(d)) continue;
    const del = d.odin_user_log_deleted;
    if (del === true || del === 1 || del === "1") {
      deleted++;
      continue;
    }
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

    // Tiere: eigene Liste (über Log-ID) + verschachtelt im Eintrag
    const logRef = idRaw != null ? String(idRaw) : null;
    const sightingMap = new Map<string, RawSighting>();
    const pendingSpeciesIds: string[] = [];
    const animalIdItems = parseIdList(d.odin_user_log_animal_ids).map((id) => {
      const hit = animalIndex.get(id);
      if (!hit) {
        unresolvedAnimals++;
        pendingSpeciesIds.push(id);
      }
      return hit ?? null;
    });
    for (const item of [
      ...(logRef ? wildlifeByLog.get(logRef) ?? [] : []),
      ...nestedValues(d, WILDLIFE_KEY).filter((v) => typeof v !== "string" || /[a-z]/i.test(v)),
      ...animalIdItems.filter(Boolean),
    ]) {
      const sgt = toSighting(item);
      if (!sgt) continue;
      const key = (sgt.scientificName ?? sgt.commonName).toLowerCase();
      const prev = sightingMap.get(key);
      sightingMap.set(key, prev ? { ...prev, count: (prev.count ?? 0) + (sgt.count ?? 0) || null } : sgt);
    }
    const sightings = [...sightingMap.values()];
    if (sightings.length) withSightings++;

    // Buddy: eigenes Feld, eigene Liste oder verschachtelt
    const buddyIdNames = parseIdList(d.odin_user_log_buddy_ids).map((id) => {
      const name = buddyIndex.get(id);
      if (!name) unresolvedBuddies++;
      return name ?? null;
    });
    const buddyNames = [
      ...buddyIdNames,
      text(d.odin_user_log_buddy_confirmed_name),
      ...[text(pick(d, ["odin_user_log_buddy", "buddy", "buddy_name"], /buddy(_name|_names)?$/, /_id$/))],
      ...(logRef ? buddiesByLog.get(logRef) ?? [] : []).map(toBuddyName),
      ...nestedValues(d, BUDDY_KEY).map(toBuddyName),
    ].filter((n): n is string => !!n);
    const buddy = [...new Set(buddyNames.map((n) => n.trim()))].join(", ") || null;
    if (buddy) withBuddy++;

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
      visibility: positive(num(pick(d, ["odin_user_log_vis_m", "odin_user_log_visibility_m", "visibility_m"], /visib/, /_id$/))),
      buddy,
      diveCenter: text(pick(d, ["odin_user_log_divecenter_confirmed_name", "divecenter_name"], /divecenter.*name$/)),
      notes,
      sightings: sightings.length
        ? sightings.map((x) => ({
            commonName: x.commonName,
            scientificName: x.scientificName,
            speciesExternalId: x.speciesExternalId,
            count: x.count,
          }))
        : undefined,
      pendingSpeciesIds: [...new Set(pendingSpeciesIds)],
    });
  }

  if (skipped) diagnostics.push(`skipped ${skipped} entries without a valid date`);
  if (deleted) diagnostics.push(`skipped ${deleted} dives marked as deleted in SSI`);
  diagnostics.push(`dives with buddy: ${withBuddy}, with wildlife: ${withSightings}`);
  if (unresolvedBuddies || unresolvedAnimals) {
    diagnostics.push(`unresolved ids – buddies: ${unresolvedBuddies}, animals: ${unresolvedAnimals}`);
  }
  diagnostics.push(`mapped dives: ${dives.length}`);
  return { dives, diagnostics };
}
