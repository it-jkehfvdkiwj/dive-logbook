import { z } from "zod";
import { isoDate, optionalNumber, optionalText, timeOfDay } from "./common";

export const diveInputSchema = z
  .object({
    date: isoDate,
    startTime: timeOfDay.nullish().transform((v) => v ?? null),
    diveNumber: optionalNumber({ min: 1, max: 100000, int: true, label: "Dive number" }),

    siteName: z.string().trim().min(1, "Dive site is required").max(120),
    location: optionalText(120),
    country: optionalText(80),
    latitude: optionalNumber({ min: -90, max: 90, label: "Latitude" }),
    longitude: optionalNumber({ min: -180, max: 180, label: "Longitude" }),

    maxDepth: optionalNumber({ min: 0, max: 350, label: "Max depth" }),
    avgDepth: optionalNumber({ min: 0, max: 350, label: "Average depth" }),
    duration: optionalNumber({ min: 0, max: 1440, int: true, label: "Duration" }),
    waterTemperature: optionalNumber({ min: -5, max: 45, label: "Water temperature" }),
    visibility: optionalNumber({ min: 0, max: 100, label: "Visibility" }),
    conditions: optionalText(80),
    current: optionalText(80),
    weather: optionalText(80),
    entryType: optionalText(80),
    diveType: optionalText(80),

    buddy: optionalText(120),
    diveCenter: optionalText(120),

    notes: optionalText(5000),
    favorite: z.boolean().default(false),
  })
  .superRefine((v, ctx) => {
    if (v.avgDepth != null && v.maxDepth != null && v.avgDepth > v.maxDepth) {
      ctx.addIssue({ code: "custom", path: ["avgDepth"], message: "Average depth cannot exceed max depth" });
    }
    if ((v.latitude == null) !== (v.longitude == null)) {
      const path = v.latitude == null ? "latitude" : "longitude";
      ctx.addIssue({ code: "custom", path: [path], message: "Provide both latitude and longitude" });
    }
  });

export type DiveInput = z.output<typeof diveInputSchema>;
export type DiveInputRaw = z.input<typeof diveInputSchema>;

export const favoriteSchema = z.object({ favorite: z.boolean() });

export const DIVE_SORTS = ["date_desc", "date_asc", "depth_desc", "duration_desc", "number_desc"] as const;
export type DiveSort = (typeof DIVE_SORTS)[number];

const qp = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined));

const qpNumber = z
  .string()
  .optional()
  .transform((v) => {
    if (!v) return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  });

/** Filter aus URL-Suchparametern (tolerant: ungültige Werte werden ignoriert). */
export const diveFiltersSchema = z.object({
  q: qp,
  favorite: z
    .string()
    .optional()
    .transform((v) => v === "1" || v === "true"),
  country: qp,
  location: qp,
  diveType: qp,
  from: z
    .string()
    .optional()
    .transform((v) => (v && isoDate.safeParse(v).success ? v : undefined)),
  to: z
    .string()
    .optional()
    .transform((v) => (v && isoDate.safeParse(v).success ? v : undefined)),
  minDepth: qpNumber,
  maxDepth: qpNumber,
  sort: z
    .string()
    .optional()
    .transform((v): DiveSort => (DIVE_SORTS as readonly string[]).includes(v ?? "") ? (v as DiveSort) : "date_desc"),
});

export type DiveFilters = z.output<typeof diveFiltersSchema>;
