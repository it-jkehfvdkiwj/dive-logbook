import { AppError, ValidationError } from "@/lib/errors";
import { SsiApiError } from "@/importers/ssi/client";
import { SSIImporter, ssiCredentialsFromEnv } from "@/importers/ssiImporter";
import { SSICsvImporter } from "@/importers/ssiCsvImporter";
import { runImport } from "./importService";

export function isSsiConfigured(): boolean {
  return ssiCredentialsFromEnv() !== null;
}

/** Download aller SSI-Dives. Ohne übergebene Zugangsdaten werden SSI_EMAIL/SSI_PASSWORD genutzt. */
export async function syncSsi(credentials?: { email?: string | null; password?: string | null }) {
  const creds =
    credentials?.email && credentials?.password
      ? { email: credentials.email.trim(), password: credentials.password }
      : ssiCredentialsFromEnv();
  if (!creds) {
    throw new ValidationError("No SSI login configured. Enter your SSI e-mail and password, or set SSI_EMAIL and SSI_PASSWORD on Vercel.");
  }
  try {
    return await runImport(new SSIImporter(creds.email, creds.password));
  } catch (err) {
    if (err instanceof SsiApiError) {
      throw new AppError(err.message, err.kind === "auth" ? 400 : 502, `ssi_${err.kind}`);
    }
    throw err;
  }
}

export async function importSsiCsv(csv: string) {
  try {
    return await runImport(new SSICsvImporter(csv));
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new ValidationError(err instanceof Error ? err.message : "Could not read this CSV file.");
  }
}
