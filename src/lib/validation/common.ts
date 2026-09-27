import { z } from "zod";

/** Optionaler Text: trimmt, leere Strings → null */
export const optionalText = (max = 200) =>
  z
    .string()
    .trim()
    .max(max, `Max. ${max} characters`)
    .nullish()
    .transform((v) => (v ? v : null));

/** Optionale Zahl (null/undefined erlaubt) */
export const optionalNumber = (opts: { min?: number; max?: number; int?: boolean; label: string }) => {
  let schema = z.number({ error: `${opts.label} must be a number` });
  if (opts.int) schema = schema.int(`${opts.label} must be a whole number`);
  if (opts.min !== undefined)
    schema = schema.min(opts.min, opts.min === 0 ? `${opts.label} cannot be negative` : `${opts.label} must be ≥ ${opts.min}`);
  if (opts.max !== undefined) schema = schema.max(opts.max, `${opts.label} must be ≤ ${opts.max}`);
  return schema.nullish().transform((v) => (v ?? null));
};

export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
  .refine((v) => {
    const d = new Date(`${v}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
  }, "Invalid date");

export const timeOfDay = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must be HH:mm");

export type FieldErrors = Record<string, string[] | undefined>;

export function fieldErrorsOf(error: z.ZodError): FieldErrors {
  return z.flattenError(error).fieldErrors as FieldErrors;
}
