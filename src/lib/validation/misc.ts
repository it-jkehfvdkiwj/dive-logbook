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

export const profileInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60).optional(),
  syncOverwriteManualEdits: z.boolean().optional(),
  speciesNameLang: z.enum(["en", "de"]).optional(),
});
export type ProfileInput = z.output<typeof profileInputSchema>;

export const passwordSchema = z.string().min(4, "Password must be at least 4 characters").max(200);

export const newUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60),
  password: passwordSchema,
});

export const changePasswordSchema = z.object({ password: passwordSchema });
