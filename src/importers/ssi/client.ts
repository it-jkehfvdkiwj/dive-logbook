// Client für die (inoffizielle) API, die auch die MySSI-App nutzt.
// Vorlage: https://github.com/gerardpuig/divessi-export (MIT)
//
// Achtung: Das ist keine offiziell dokumentierte Schnittstelle. SSI kann sie jederzeit
// ändern. Deshalb sind URL und App-Kennung per Umgebungsvariable überschreibbar und
// alle Fehler werden verständlich gemeldet.

export const SSI_API_URL = process.env.SSI_API_URL || "https://api.divessi.com/app/a21.php";
export const SSI_CLIENT_APP = process.env.SSI_CLIENT_APP || "0815_ADR";
const TIMEOUT_MS = 20_000;

export class SsiApiError extends Error {
  constructor(
    message: string,
    public readonly kind: "auth" | "network" | "format",
  ) {
    super(message);
    this.name = "SsiApiError";
  }
}

async function getJson(params: Record<string, string>): Promise<unknown> {
  const url = new URL(SSI_API_URL);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("ssiapp", SSI_CLIENT_APP);

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "DiveLog/1.0" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (err) {
    const reason = err instanceof Error && err.name === "TimeoutError" ? "timed out" : "could not be reached";
    throw new SsiApiError(`The SSI server ${reason}. Please try again later.`, "network");
  }
  if (!res.ok) throw new SsiApiError(`The SSI server answered with HTTP ${res.status}.`, "network");

  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new SsiApiError("The SSI server sent an unexpected response (no JSON). The API may have changed.", "format");
  }
}

/** Meldet sich an und liefert das Session-Token. */
export async function ssiAuthenticate(email: string, password: string): Promise<string> {
  const data = await getJson({ l: email, p: password, what: "authenticate" });
  const token = data && typeof data === "object" ? (data as Record<string, unknown>).token : undefined;
  // Der Endpunkt antwortet auch bei falschen Zugangsdaten mit HTTP 200 – nur ohne Token.
  if (typeof token !== "string" || !token) {
    throw new SsiApiError("SSI login failed. Please check your SSI e-mail and password.", "auth");
  }
  return token;
}

/** Holt das komplette Logbuch (Rohdaten). */
export async function ssiGetDivelog(token: string): Promise<Record<string, unknown>> {
  const data = await getJson({ what: "get_divelog", token });
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new SsiApiError("The SSI logbook response has an unexpected format.", "format");
  }
  return data as Record<string, unknown>;
}

/** Beliebigen Endpunkt abfragen (für das Suchen des Tier-Katalogs). Fehler → null. */
export async function ssiTryCall(token: string, what: string, extra: Record<string, string> = {}): Promise<unknown> {
  try {
    return await getJson({ what, token, ...extra });
  } catch {
    return null;
  }
}
