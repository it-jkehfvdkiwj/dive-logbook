// Nachschlagen von Arten bei iNaturalist (https://www.inaturalist.org):
// liefert ein frei lizenziertes Foto (inkl. Bildnachweis) und den deutschen Namen.
// Keine Abhängigkeiten → nutzbar in App (Server) und Seed-Skript.
// iNaturalist bittet um ≤ 1 Anfrage/Sekunde – Aufrufer müssen drosseln.

const API = process.env.INAT_API_URL || "https://api.inaturalist.org/v1/taxa";
const USER_AGENT = "DiveLog/1.0 (personal dive logbook)";

export interface InatTaxonInfo {
  taxonId: number;
  scientificName: string;
  nameDe: string | null;
  nameEn: string | null;
  photoUrl: string | null;
  attribution: string | null;
}

interface InatPhoto {
  medium_url?: string | null;
  url?: string | null;
  attribution?: string | null;
}
interface InatTaxon {
  id: number;
  name: string;
  rank?: string;
  preferred_common_name?: string | null;
  english_common_name?: string | null;
  default_photo?: InatPhoto | null;
}

async function search(query: string, locale: string, signal?: AbortSignal): Promise<InatTaxon[]> {
  const url = `${API}?q=${encodeURIComponent(query)}&locale=${locale}&per_page=5&is_active=true`;
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": USER_AGENT },
    signal: signal ?? AbortSignal.timeout(8000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`iNaturalist HTTP ${res.status}`);
  const data = (await res.json()) as { results?: InatTaxon[] };
  return Array.isArray(data.results) ? data.results : [];
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

/**
 * Sucht eine Art über den wissenschaftlichen Namen (bevorzugt) oder den englischen Namen.
 * Gibt null zurück, wenn nichts eindeutig passt.
 */
export async function lookupInatTaxon(
  scientificName: string | null,
  commonName: string,
  signal?: AbortSignal,
): Promise<InatTaxonInfo | null> {
  const query = scientificName?.trim() || commonName.trim();
  if (!query) return null;
  const results = await search(query, "de", signal);
  if (!results.length) return null;

  // Exakter wissenschaftlicher Name gewinnt; sonst erster Treffer auf Art-Ebene; sonst erster Treffer
  const target = scientificName ? norm(scientificName) : null;
  // (iNaturalist löst auch Synonyme auf, daher sonst erster Treffer auf Art-Ebene)
  const best =
    (target && results.find((r) => norm(r.name) === target)) ||
    results.find((r) => r.rank === "species" || r.rank === "subspecies") ||
    (target ? null : results[0]);
  if (!best) return null;

  const photo = best.default_photo;
  const photoUrl = photo?.medium_url || photo?.url?.replace("/square.", "/medium.") || null;
  const nameDe = best.preferred_common_name?.trim() || null;
  const nameEn = best.english_common_name?.trim() || null;
  return {
    taxonId: best.id,
    scientificName: best.name,
    // Wenn iNaturalist keinen deutschen Namen kennt, liefert es oft den englischen – dann nicht übernehmen
    nameDe: nameDe && (!nameEn || norm(nameDe) !== norm(nameEn)) ? capitalize(nameDe) : null,
    nameEn,
    photoUrl,
    attribution: photo?.attribution ?? null,
  };
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
