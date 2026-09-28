import { NextResponse } from "next/server";
import { withErrors } from "@/lib/http";
import { requireUser } from "@/lib/current-user";
import { enrichSpecies } from "@/services/speciesEnrichmentService";

/** Foto + deutschen Namen dieser Art (neu) von iNaturalist holen. */
export const POST = withErrors(async (_req: Request, ctx: RouteContext<"/api/species/[id]/enrich">) => {
  await requireUser();
  const { id } = await ctx.params;
  const found = await enrichSpecies(id, { force: true });
  return NextResponse.json({ found });
});
