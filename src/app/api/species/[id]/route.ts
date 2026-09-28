import { NextResponse } from "next/server";
import { NotFoundError } from "@/lib/errors";
import { readJson, withErrors } from "@/lib/http";
import { requireUser } from "@/lib/current-user";
import { speciesInputSchema } from "@/lib/validation/species";
import { deleteSpecies, getSpecies, updateSpecies } from "@/services/speciesService";

type Ctx = RouteContext<"/api/species/[id]">;

export const GET = withErrors(async (_req: Request, ctx: Ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const species = await getSpecies(user.id, id);
  if (!species) throw new NotFoundError("Species");
  return NextResponse.json(species);
});

export const PUT = withErrors(async (request: Request, ctx: Ctx) => {
  await requireUser();
  const { id } = await ctx.params;
  const input = speciesInputSchema.parse(await readJson(request));
  return NextResponse.json(await updateSpecies(id, input));
});

export const DELETE = withErrors(async (_req: Request, ctx: Ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  return NextResponse.json(await deleteSpecies(user.id, id));
});
