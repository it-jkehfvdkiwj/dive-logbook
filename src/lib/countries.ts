import { iso1A2Code } from "@rapideditor/country-coder";

// ============================================================================
// Länder vereinheitlichen
// ----------------------------------------------------------------------------
// SSI liefert Ländernamen in der Sprache, in der ein Tauchplatz angelegt wurde
// ("Cabo Verde", "cabo verde", "Cap-Vert") oder gar nicht. Deshalb wird jedes
// Land auf einen ISO-Code zurückgeführt:
//   1. aus den GPS-Koordinaten (Offline-Grenzen inkl. Küstengewässer), oder
//   2. aus dem Namen in einer von vielen Sprachen.
// Gespeichert wird dann immer derselbe englische Name + ISO-Code.
// ============================================================================

const NAME_LOCALES = ["en", "de", "fr", "es", "pt", "it", "nl", "id", "tr", "pl", "sv", "da", "no", "fi", "cs", "hr"];

const EXTRA_ALIASES: Record<string, string> = {
  usa: "US",
  us: "US",
  "united states of america": "US",
  america: "US",
  uk: "GB",
  england: "GB",
  scotland: "GB",
  wales: "GB",
  "great britain": "GB",
  holland: "NL",
  "cape verde islands": "CV",
  "ilhas de cabo verde": "CV",
  "republic of cabo verde": "CV",
  "czech republic": "CZ",
  burma: "MM",
  "ivory coast": "CI",
  swaziland: "SZ",
  "the bahamas": "BS",
  "the maldives": "MV",
  "the philippines": "PH",
  "turks and caicos": "TC",
  "bonaire": "BQ",
  "curacao": "CW",
  "sint maarten": "SX",
  "zanzibar": "TZ",
  "bali": "ID",
  "galapagos": "EC",
  "canary islands": "ES",
  "kanaren": "ES",
  "hawaii": "US",
  "red sea": "EG",
};

const normalizeName = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

let aliasMap: Map<string, string> | null = null;
const englishNames = new Intl.DisplayNames(["en"], { type: "region" });

function allRegionCodes(): string[] {
  const codes: string[] = [];
  for (let a = 65; a <= 90; a++) {
    for (let b = 65; b <= 90; b++) {
      const code = String.fromCharCode(a, b);
      try {
        const name = englishNames.of(code);
        if (name && name !== code && !/unknown/i.test(name)) codes.push(code);
      } catch {
        /* ungültiger Code */
      }
    }
  }
  return codes;
}

function aliases(): Map<string, string> {
  if (aliasMap) return aliasMap;
  const map = new Map<string, string>();
  const codes = allRegionCodes();
  for (const locale of NAME_LOCALES) {
    let dn: Intl.DisplayNames;
    try {
      dn = new Intl.DisplayNames([locale], { type: "region" });
    } catch {
      continue;
    }
    for (const code of codes) {
      const name = dn.of(code);
      if (!name || name === code) continue;
      const key = normalizeName(name);
      if (key && !map.has(key)) map.set(key, code);
      // "Korea, Republic of" / "Bonaire, Sint Eustatius and Saba" → auch ohne Zusatz
      const short = normalizeName(name.split(/[,(]/)[0]);
      if (short && !map.has(short)) map.set(short, code);
    }
  }
  for (const code of codes) if (!map.has(code.toLowerCase())) map.set(code.toLowerCase(), code);
  for (const [k, v] of Object.entries(EXTRA_ALIASES)) map.set(normalizeName(k), v);
  aliasMap = map;
  return map;
}

/** ISO-Code aus einem Ländernamen in (fast) beliebiger Sprache. */
export function countryCodeFromName(name: string | null | undefined): string | null {
  if (!name?.trim()) return null;
  const key = normalizeName(name);
  const map = aliases();
  if (map.has(key)) return map.get(key)!;
  // "Mozambique - Inhambane", "Egypt (Red Sea)"
  for (const part of name.split(/[-–,/()|]/)) {
    const k = normalizeName(part);
    if (k.length > 2 && map.has(k)) return map.get(k)!;
  }
  return null;
}

/** ISO-Code aus GPS-Koordinaten (inkl. Küstengewässer). */
export function countryCodeFromCoords(lat: number | null | undefined, lng: number | null | undefined): string | null {
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat === 0 && lng === 0) return null;
  try {
    const code = iso1A2Code([lng, lat]);
    return code && /^[A-Z]{2}$/.test(code) ? code : null;
  } catch {
    return null;
  }
}

export function countryNameFor(code: string): string {
  try {
    return englishNames.of(code) ?? code;
  } catch {
    return code;
  }
}

export interface NormalizedCountry {
  country: string | null;
  countryCode: string | null;
}

/**
 * Vereinheitlicht das Land eines Tauchplatzes.
 * preferCoords = true (Importe): GPS gewinnt, weil importierte Ländertexte oft
 * falsch/uneinheitlich sind. Bei manueller Eingabe gewinnt der eingegebene Name.
 */
export function normalizeCountry(
  input: { country?: string | null; latitude?: number | null; longitude?: number | null },
  preferCoords: boolean,
): NormalizedCountry {
  const fromCoords = countryCodeFromCoords(input.latitude, input.longitude);
  const fromName = countryCodeFromName(input.country);
  const code = preferCoords ? (fromCoords ?? fromName) : (fromName ?? fromCoords);
  if (code) return { country: countryNameFor(code), countryCode: code };
  const raw = input.country?.trim();
  return { country: raw ? raw : null, countryCode: null };
}
