// Login & Sessions. Läuft in Proxy und Route Handlers → nur Web Crypto verwenden.
//
// Modell: Jedes Passwort gehört zu genau einem Benutzer (Login ohne Benutzernamen).
// Das Session-Cookie enthält "<userId>.<HMAC(userId)>" – signiert, nicht verschlüsselt.
// Aktiv, sobald APP_PASSWORD gesetzt ist. Ohne APP_PASSWORD (lokal) läuft alles als Owner.

export const SESSION_COOKIE = "divelog_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 365; // 1 Jahr
export const OWNER_ID = "owner";

export function isAuthEnabled(): boolean {
  return Boolean(process.env.APP_PASSWORD);
}

function secret(): string {
  return process.env.AUTH_SECRET || process.env.APP_PASSWORD || "divelog-local-dev";
}

async function hmac(value: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(`divelog-session-v2:${value}`));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function signSession(userId: string): Promise<string> {
  return `${userId}.${await hmac(userId)}`;
}

/** Gibt die userId zurück, wenn das Cookie gültig signiert ist. */
export async function verifySession(token: string | undefined | null): Promise<string | null> {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const userId = token.slice(0, dot);
  return safeEqual(token.slice(dot + 1), await hmac(userId)) ? userId : null;
}

/** Zeitkonstanter Vergleich */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
