import { NextResponse } from "next/server";
import { readJson, searchParamsObject, withErrors } from "@/lib/http";
import { speciesFiltersSchema, speciesInputSchema } from "@/lib/validation/species";
import { createSpecies, listSpecies, searchSpecies } from "@/services/speciesService";

/**
 * GET /api/species?search=hammer   → schnelle Suche im gesamten Katalog
 * GET /api/species?view=seen|all&q=&category=&country=&sort=  → Life List / Katalog
 */
export const GET = withErrors(async (request: Request) => {
  const params = searchParamsObject(request);
  if (params.search !== undefined) {
    return NextResponse.json({ species: await searchSpecies(params.search) });
  }
  const filters = speciesFiltersSchema.parse(params);
  return NextResponse.json({ species: await listSpecies(filters) });
});

export const POST = withErrors(async (request: Request) => {
  const input = speciesInputSchema.parse(await readJson(request));
  return NextResponse.json(await createSpecies(input), { status: 201 });
});
