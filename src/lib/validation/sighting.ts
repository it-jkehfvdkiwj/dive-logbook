import { z } from "zod";
import { optionalNumber, optionalText } from "./common";

export const sightingCreateSchema = z.object({
  diveId: z.string().min(1, "diveId is required"),
  speciesId: z.string().min(1, "speciesId is required"),
  count: optionalNumber({ min: 1, max: 100000, int: true, label: "Count" }),
  notes: optionalText(1000),
});

export const sightingUpdateSchema = z.object({
  count: optionalNumber({ min: 1, max: 100000, int: true, label: "Count" }),
  notes: optionalText(1000),
});

export type SightingCreateInput = z.output<typeof sightingCreateSchema>;
export type SightingUpdateInput = z.output<typeof sightingUpdateSchema>;
