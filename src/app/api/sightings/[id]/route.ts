import { NextResponse } from "next/server";
import { readJson, withErrors } from "@/lib/http";
import { sightingUpdateSchema } from "@/lib/validation/sighting";
import { deleteSighting, updateSighting } from "@/services/sightingService";

type Ctx = RouteContext<"/api/sightings/[id]">;

export const PUT = withErrors(async (request: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const input = sightingUpdateSchema.parse(await readJson(request));
  return NextResponse.json(await updateSighting(id, input));
});

export const DELETE = withErrors(async (_req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  await deleteSighting(id);
  return NextResponse.json({ ok: true });
});
