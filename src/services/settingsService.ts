import { db } from "@/lib/db";
import type { SettingsInput } from "@/lib/validation/misc";

const SETTINGS_ID = 1;

export async function getSettings() {
  return db.appSettings.upsert({
    where: { id: SETTINGS_ID },
    update: {},
    create: { id: SETTINGS_ID },
  });
}

export async function updateSettings(input: SettingsInput) {
  return db.appSettings.upsert({
    where: { id: SETTINGS_ID },
    update: input,
    create: { id: SETTINGS_ID, ...input },
  });
}
