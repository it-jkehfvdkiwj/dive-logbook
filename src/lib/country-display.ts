// Client-sichere Helfer für die Länderanzeige (ohne Grenz-Daten).

/** "MZ" → 🇲🇿 */
export function flagEmoji(code: string | null | undefined): string {
  if (!code || !/^[A-Za-z]{2}$/.test(code)) return "";
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

/** Land mit Flagge, z. B. "🇲🇿 Mozambique" */
export function countryLabel(country: string | null | undefined, code?: string | null): string {
  if (!country) return "";
  const flag = flagEmoji(code);
  return flag ? `${flag} ${country}` : country;
}
