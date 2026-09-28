import { NextResponse } from "next/server";
import { z } from "zod";
import { readJson, searchParamsObject, withErrors } from "@/lib/http";
import { requireUser } from "@/lib/current-user";
import { listUnmappedExternalSpecies, mapExternalSpecies } from "@/services/externalSpeciesService";

export const dynamic = "force-dynamic";

/** GET /api/external-species?source=ssi – unbekannte Tier-IDs in meinen Tauchgängen */
export const GET = withErrors(async (request: Request) => {
  const user = await requireUser();
  const { source = "ssi" } = searchParamsObject(request);
  return NextResponse.json({ items: await listUnmappedExternalSpecies(user.id, source) });
});

const bodySchema = z.object({
  source: z.string().min(1).default("ssi"),
  externalId: z.string().min(1),
  speciesId: z.string().min(1),
});

/** POST – Tier-ID einer Art zuordnen (wirkt sofort auf alle betroffenen Tauchgänge und künftige Syncs) */
export const POST = withErrors(async (request: Request) => {
  await requireUser();
  const { source, externalId, speciesId } = bodySchema.parse(await readJson(request));
  return NextResponse.json(await mapExternalSpecies(source, externalId, speciesId));
});
