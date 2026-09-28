import { NextResponse } from "next/server";
import { readJson, withErrors } from "@/lib/http";
import { requireUser } from "@/lib/current-user";
import { diveInputSchema } from "@/lib/validation/dive";
import { deleteDive, getDiveOrThrow, updateDive } from "@/services/diveService";

type Ctx = RouteContext<"/api/dives/[id]">;

export const GET = withErrors(async (_req: Request, ctx: Ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  return NextResponse.json(await getDiveOrThrow(user.id, id));
});

export const PUT = withErrors(async (request: Request, ctx: Ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const input = diveInputSchema.parse(await readJson(request));
  return NextResponse.json(await updateDive(user.id, id, input));
});

export const DELETE = withErrors(async (_req: Request, ctx: Ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  return NextResponse.json(await deleteDive(user.id, id));
});
