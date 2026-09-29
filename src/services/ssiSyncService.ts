import { AppError, ValidationError } from "@/lib/errors";
import { SsiApiError } from "@/importers/ssi/client";
import { SSIImporter, ssiCredentialsFromEnv } from "@/importers/ssiImporter";
import { SSICsvImporter } from "@/importers/ssiCsvImporter";
import { db } from "@/lib/db";
import { runImport } from "./importService";

interface Actor {
  id: string;
  isAdmin: boolean;
}

/** SSI_EMAIL/SSI_PASSWORD (Vercel) gehören zum Admin-Konto. */
export function isSsiConfiguredFor(user: Actor): boolean {
  return user.isAdmin && ssiCredentialsFromEnv() !== null;
}

/** Download aller SSI-Dives für den Benutzer. Ohne Zugangsdaten: SSI_EMAIL/SSI_PASSWORD (nur Admin). */
export async function syncSsi(user: Actor, credentials?: { email?: string | null; password?: string | null }) {
  const creds =
    credentials?.email && credentials?.password
      ? { email: credentials.email.trim(), password: credentials.password }
      : user.isAdmin
        ? ssiCredentialsFromEnv()
        : null;
  if (!creds) {
    throw new ValidationError("Please enter your SSI e-mail and password.");
  }
  try {
    const withProfile = await db.dive.findMany({
      where: { userId: user.id, source: "ssi", externalId: { not: null }, profile: { isNot: null } },
      select: { externalId: true },
    });
    const have = new Set(withProfile.map((d) => d.externalId!));
    return await runImport(new SSIImporter(creds.email, creds.password, have), user.id);
  } catch (err) {
    if (err instanceof SsiApiError) {
      throw new AppError(err.message, err.kind === "auth" ? 400 : 502, `ssi_${err.kind}`);
    }
    throw err;
  }
}

/** Nächtlicher Cron: synchronisiert das Admin-Konto mit den Vercel-Zugangsdaten. */
export async function syncSsiForAdmin() {
  const admin = await db.user.findFirst({ where: { isAdmin: true }, orderBy: { createdAt: "asc" } });
  if (!admin || !ssiCredentialsFromEnv()) return null;
  return syncSsi({ id: admin.id, isAdmin: true });
}

export async function importSsiCsv(userId: string, csv: string) {
  try {
    return await runImport(new SSICsvImporter(csv), userId);
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new ValidationError(err instanceof Error ? err.message : "Could not read this CSV file.");
  }
}
