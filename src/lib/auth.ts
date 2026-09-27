// Einfacher Passwortschutz für die öffentlich erreichbare Cloud-Version.
// Aktiv nur, wenn die Umgebungsvariable APP_PASSWORD gesetzt ist.
// Läuft in Proxy (Edge/Node) und Route Handlers → nur Web Crypto verwenden.

export const SESSION_COOKIE = "divelog_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 365; // 1 Jahr

export function isAuthEnabled(): boolean {
  return Boolean(process.env.APP_PASSWORD);
}

/** Token = HMAC-SHA256(APP_PASSWORD, "divelog-session-v1"). Ändert man das Passwort, sind alle Sessions ungültig. */
export async function sessionToken(password = process.env.APP_PASSWORD ?? ""): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(password), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode("divelog-session-v1"));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Zeitkonstanter Vergleich */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
