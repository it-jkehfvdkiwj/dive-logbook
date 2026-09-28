export type SpeciesLang = "en" | "de";

interface Named {
  commonName: string;
  commonNameDe?: string | null;
}

/** Hauptname in der gewählten Sprache + der andere Name als Zusatz (falls vorhanden und verschieden). */
export function speciesNames(s: Named, lang: SpeciesLang): { primary: string; secondary: string | null } {
  const de = s.commonNameDe?.trim() || null;
  if (lang === "de" && de) {
    return { primary: de, secondary: de.toLowerCase() !== s.commonName.toLowerCase() ? s.commonName : null };
  }
  return { primary: s.commonName, secondary: de && de.toLowerCase() !== s.commonName.toLowerCase() ? de : null };
}
