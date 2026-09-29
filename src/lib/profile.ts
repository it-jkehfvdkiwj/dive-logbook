// Tauchprofil: Normalisierung beliebiger Rohdaten (SSI, Dateien) in ein einheitliches Format.
// Kein DB-/Framework-Code – läuft auf Server und im Browser.

export interface ProfileSample {
  /** Sekunden seit Abtauchen */
  t: number;
  /** Tiefe in Metern (positiv) */
  d: number;
  /** Wassertemperatur °C */
  temp?: number;
  /** Flaschendruck bar */
  p?: number;
}

type Raw = Record<string, unknown>;
const isRecord = (v: unknown): v is Raw => !!v && typeof v === "object" && !Array.isArray(v);

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && /^-?\d+([.,]\d+)?(e-?\d+)?$/i.test(v.trim())) return Number(v.trim().replace(",", "."));
  return null;
}

const TIME_KEY = /^(t|time|sec|secs|seconds|runtime|run_?time|divetime|dive_?time|elapsed|timestamp|ts|min|minute|minutes|x)$|time|sec/i;
const DEPTH_KEY = /^(d|depth|dpt|y|z|m|meters?)$|depth|tiefe/i;
const TEMP_KEY = /temp|°c|celsius|wassertemp/i;
const PRESS_KEY = /press|bar|tank|psi/i;

function pickKey(keys: string[], re: RegExp, exclude: (string | undefined)[] = []): string | undefined {
  return keys.find((k) => re.test(k) && !exclude.includes(k));
}

interface RawPoint {
  t: number | null;
  d: number;
  temp?: number;
  p?: number;
}

/** Wandelt eine Liste (Objekte, Tupel oder Zahlen) in Rohpunkte um. */
function toRawPoints(list: unknown[]): RawPoint[] | null {
  if (list.length < 5) return null;
  const first = list.find((x) => x != null);
  if (isRecord(first)) {
    const keys = Object.keys(first);
    const depthKey = pickKey(keys, DEPTH_KEY, []);
    if (!depthKey) return null;
    const timeKey = pickKey(keys, TIME_KEY, [depthKey]);
    const tempKey = pickKey(keys, TEMP_KEY, [depthKey, timeKey]);
    const pressKey = pickKey(keys, PRESS_KEY, [depthKey, timeKey, tempKey]);
    const out: RawPoint[] = [];
    for (const item of list) {
      if (!isRecord(item)) continue;
      const d = num(item[depthKey]);
      if (d == null) continue;
      const temp = tempKey ? num(item[tempKey]) : null;
      const p = pressKey ? num(item[pressKey]) : null;
      out.push({ t: timeKey ? num(item[timeKey]) : null, d, ...(temp != null ? { temp } : {}), ...(p != null ? { p } : {}) });
    }
    return out.length >= 5 ? out : null;
  }
  if (Array.isArray(first)) {
    // [t, d, temp?] oder [d]
    const out: RawPoint[] = [];
    for (const item of list) {
      if (!Array.isArray(item)) continue;
      const nums = item.map(num);
      if (nums.length >= 2 && nums[0] != null && nums[1] != null) {
        out.push({ t: nums[0], d: nums[1], ...(nums[2] != null ? { temp: nums[2] } : {}) });
      } else if (nums[0] != null) out.push({ t: null, d: nums[0] });
    }
    return out.length >= 5 ? out : null;
  }
  const nums = list.map(num);
  if (nums.filter((x) => x != null).length < 5) return null;
  return nums.filter((x): x is number => x != null).map((d) => ({ t: null, d }));
}

/** Findet in beliebigen Daten (JSON-String, Objekt, Liste) eine Profil-Liste. */
export function extractRawPoints(value: unknown, depth = 0): RawPoint[] | null {
  if (value == null || depth > 4) return null;
  if (typeof value === "string") {
    const s = value.trim();
    if (s.length < 10) return null;
    if (s.startsWith("[") || s.startsWith("{")) {
      try {
        return extractRawPoints(JSON.parse(s), depth + 1);
      } catch {
        /* weiter als Text */
      }
    }
    // "0:0.0;10:1.2;…" oder "0,0.0|10,1.2|…"
    const pairs = s.split(/[;|\n]+/).map((x) => x.split(/[:,\s]+/).filter(Boolean));
    if (pairs.length >= 5 && pairs.every((p) => p.length >= 2 && p.length <= 4)) return toRawPoints(pairs);
    // "0.0,1.2,3.4,…" – nur Tiefen
    const flat = s.split(/[,;\s|]+/).filter(Boolean);
    if (flat.length >= 5 && flat.every((x) => /^-?\d+([.]\d+)?(e-?\d+)?$/i.test(x))) return toRawPoints(flat);
    return null;
  }
  if (Array.isArray(value)) return toRawPoints(value) ?? null;
  if (isRecord(value)) {
    // Bevorzugt Felder mit sprechenden Namen
    const entries = Object.entries(value).sort(([a], [b]) => Number(/sample|profile|point|data|wp/i.test(b)) - Number(/sample|profile|point|data|wp/i.test(a)));
    for (const [, v] of entries) {
      const hit = extractRawPoints(v, depth + 1);
      if (hit) return hit;
    }
  }
  return null;
}

/**
 * Rohpunkte → sauberes Profil in Metern/Sekunden.
 * Einheiten werden über die bekannte Maximaltiefe/Dauer des Dives erkannt
 * (cm, dm, Fuß; Millisekunden, Minuten).
 */
export function normalizeProfile(
  points: RawPoint[],
  hint: { maxDepth?: number | null; durationMin?: number | null; intervalSec?: number | null } = {},
): ProfileSample[] | null {
  if (points.length < 5) return null;
  let depths = points.map((p) => Math.abs(p.d));
  const rawMax = Math.max(...depths);
  if (rawMax <= 0) return null;

  // Tiefe: Einheit anhand der Maximaltiefe erkennen
  let depthFactor = 1;
  if (hint.maxDepth && hint.maxDepth > 0) {
    const ratio = rawMax / hint.maxDepth;
    for (const [f, r] of [
      [0.01, 100],
      [0.1, 10],
      [0.3048, 3.28084],
      [0.001, 1000],
    ] as const) {
      if (Math.abs(ratio - r) / r < 0.2) depthFactor = f;
    }
  } else if (rawMax > 400) depthFactor = rawMax > 4000 ? 0.001 : 0.01;
  depths = depths.map((d) => Math.round(d * depthFactor * 10) / 10);
  if (Math.max(...depths) > 350) return null;

  // Zeit
  const durationSec = hint.durationMin ? hint.durationMin * 60 : null;
  let times: number[];
  const withTime = points.every((p) => p.t != null);
  if (withTime) {
    const t0 = points[0].t!;
    times = points.map((p) => p.t! - t0);
    const last = times[times.length - 1];
    if (durationSec && last > 0) {
      const ratio = last / durationSec;
      if (ratio > 500) times = times.map((t) => t / 1000); // ms
      else if (ratio < 0.05) times = times.map((t) => t * 60); // Minuten
    } else if (last > 0 && last < 300 && points.length > 30) {
      times = times.map((t) => t * 60); // vermutlich Minuten
    }
  } else {
    const interval =
      hint.intervalSec ?? (durationSec ? durationSec / Math.max(1, points.length - 1) : 10);
    times = points.map((_, i) => i * interval);
  }

  const samples: ProfileSample[] = points.map((p, i) => ({
    t: Math.round(times[i]),
    d: depths[i],
    ...(p.temp != null && p.temp > -3 && p.temp < 45 ? { temp: Math.round(p.temp * 10) / 10 } : {}),
    ...(p.p != null && p.p > 0 && p.p < 400 ? { p: Math.round(p.p) } : {}),
  }));
  // Zeit muss aufsteigen
  for (let i = 1; i < samples.length; i++) if (samples[i].t < samples[i - 1].t) return null;
  return downsample(samples, 1500);
}

/** Begrenzt die Punktzahl (sehr dichte Profile), erhält Maximaltiefe. */
export function downsample(samples: ProfileSample[], max: number): ProfileSample[] {
  if (samples.length <= max) return samples;
  const step = samples.length / max;
  const out: ProfileSample[] = [];
  for (let i = 0; i < max; i++) {
    const chunk = samples.slice(Math.floor(i * step), Math.floor((i + 1) * step));
    out.push(chunk.reduce((a, b) => (b.d > a.d ? b : a), chunk[0]));
  }
  out[out.length - 1] = samples[samples.length - 1];
  return out;
}

/** Passt ein Profil zu den bekannten Eckdaten des Dives? Schützt vor Fehlerkennungen. */
export function isPlausibleProfile(samples: ProfileSample[], hint: { maxDepth?: number | null; durationMin?: number | null } = {}): boolean {
  if (samples.length < 5) return false;
  const max = Math.max(...samples.map((s) => s.d));
  if (max < 0.5) return false;
  if (hint.maxDepth && hint.maxDepth > 0) {
    const r = max / hint.maxDepth;
    if (r < 0.6 || r > 1.4) return false;
  }
  if (hint.durationMin && hint.durationMin > 0) {
    const r = samples[samples.length - 1].t / (hint.durationMin * 60);
    if (r < 0.4 || r > 1.8) return false;
  }
  return true;
}

export function parseProfile(value: unknown, hint?: Parameters<typeof normalizeProfile>[1]): ProfileSample[] | null {
  const raw = extractRawPoints(value);
  const samples = raw ? normalizeProfile(raw, hint) : null;
  return samples && isPlausibleProfile(samples, hint ?? {}) ? samples : null;
}
