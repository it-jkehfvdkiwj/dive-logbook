import { z } from "zod";
import { optionalText } from "./common";

export const speciesInputSchema = z.object({
  commonName: z.string().trim().min(1, "Common name is required").max(120),
  scientificName: optionalText(160),
  // Freier String → Kategorien bleiben erweiterbar; unbekannte Werte werden als "Other" angezeigt.
  category: z.string().trim().min(1, "Category is required").max(40).default("Other"),
  description: optionalText(4000),
  imageUrl: optionalText(1000).refine(
    (v) => v == null || /^https?:\/\/\S+$/i.test(v),
    "Image URL must start with http:// or https://",
  ),
});

export type SpeciesInput = z.output<typeof speciesInputSchema>;

export const SPECIES_SORTS = ["recent", "most_seen", "first_seen", "name"] as const;
export type SpeciesSort = (typeof SPECIES_SORTS)[number];

const qp = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined));

export const speciesFiltersSchema = z.object({
  q: qp,
  category: qp,
  country: qp,
  /** "seen" = Life List (Standard), "all" = kompletter Katalog */
  view: z
    .string()
    .optional()
    .transform((v): "seen" | "all" => (v === "all" ? "all" : "seen")),
  sort: z
    .string()
    .optional()
    .transform((v): SpeciesSort => ((SPECIES_SORTS as readonly string[]).includes(v ?? "") ? (v as SpeciesSort) : "recent")),
});

export type SpeciesFilters = z.output<typeof speciesFiltersSchema>;
