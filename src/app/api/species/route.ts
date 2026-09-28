import { NextResponse } from "next/server";
import { readJson, searchParamsObject, withErrors } from "@/lib/http";
import { requireUser } from "@/lib/current-user";
import { speciesFiltersSchema, speciesInputSchema } from "@/lib/validation/species";
import { createSpecies, listSpecies, searchSpecies } from "@/services/speciesService";

/**
 * GET /api/species?search=hammer   → schnelle Suche im gemeinsamen Katalog
 * GET /api/species?view=seen|all&q=&category=&country=&sort=  → eigene Life List / Katalog
 */
export const GET = withErrors(async (request: Request) => {
  const user = await requireUser();
  const params = searchParamsObject(request);
  if (params.search !== undefined) {
    return NextResponse.json({ species: await searchSpecies(user.id, params.search) });
  }
  const filters = speciesFiltersSchema.parse(params);
  return NextResponse.json({ species: await listSpecies(user.id, filters) });
});

export const POST = withErrors(async (request: Request) => {
  await requireUser();
  const input = speciesInputSchema.parse(await readJson(request));
  return NextResponse.json(await createSpecies(input), { status: 201 });
});
