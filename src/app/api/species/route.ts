import { NextResponse } from "next/server";
import { readJson, searchParamsObject, withErrors } from "@/lib/http";
import { requireUser } from "@/lib/current-user";
import { speciesFiltersSchema, speciesInputSchema } from "@/lib/validation/species";
import { createSpecies, getSpecies, listSpecies, searchSpecies } from "@/services/speciesService";
import { tryEnrichQuickly } from "@/services/speciesEnrichmentService";

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
  const user = await requireUser();
  const input = speciesInputSchema.parse(await readJson(request));
  const created = await createSpecies(input);
  // Foto + deutschen Namen direkt versuchen (max. ~6 s), sonst später über "Fetch photos"
  if (!input.imageUrl || !input.commonNameDe) await tryEnrichQuickly(created.id);
  const full = await getSpecies(user.id, created.id);
  return NextResponse.json(full ?? created, { status: 201 });
});
