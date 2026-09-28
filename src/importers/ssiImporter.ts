import type { DiveImporter, ImportedDive } from "./types";
import { ssiAuthenticate, ssiGetDivelog } from "./ssi/client";
import { mapSsiLogbook } from "./ssi/mapper";

/**
 * SSI-Import über die (inoffizielle) MySSI-App-API.
 * Zugangsdaten werden nur für diesen Abruf verwendet und nie gespeichert.
 * Abgleich, Create/Update und Schutz manueller Änderungen übernimmt runImport().
 */
export class SSIImporter implements DiveImporter {
  readonly source = "ssi";
  readonly label = "SSI";
  private log: string[] = [];

  constructor(
    private readonly email: string,
    private readonly password: string,
  ) {}

  async importDives(): Promise<ImportedDive[]> {
    const token = await ssiAuthenticate(this.email, this.password);
    const raw = await ssiGetDivelog(token);
    const { dives, diagnostics } = mapSsiLogbook(raw);
    this.log = diagnostics;
    return dives;
  }

  diagnostics(): string[] {
    return this.log;
  }
}

/** Zugangsdaten aus den Umgebungsvariablen (für "Sync now" ohne Eingabe und den täglichen Cron). */
export function ssiCredentialsFromEnv(): { email: string; password: string } | null {
  const email = process.env.SSI_EMAIL?.trim();
  const password = process.env.SSI_PASSWORD;
  return email && password ? { email, password } : null;
}
