import { z } from "zod";
import { optionalText } from "./common";

export const photoInputSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1, "URL is required")
    .max(1000)
    .regex(/^https?:\/\/\S+$/i, "URL must start with http:// or https://"),
  caption: optionalText(300),
  speciesId: z.string().nullish().transform((v) => v ?? null),
});
export type PhotoInput = z.output<typeof photoInputSchema>;

export const settingsInputSchema = z.object({
  displayName: z.string().trim().min(1, "Name is required").max(60),
  syncOverwriteManualEdits: z.boolean(),
});
export type SettingsInput = z.output<typeof settingsInputSchema>;
