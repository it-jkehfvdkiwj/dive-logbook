import { NextResponse } from "next/server";
import { readJson, withErrors } from "@/lib/http";
import { requireUser } from "@/lib/current-user";
import { favoriteSchema } from "@/lib/validation/dive";
import { setFavorite } from "@/services/diveService";

export const PATCH = withErrors(async (request: Request, ctx: RouteContext<"/api/dives/[id]/favorite">) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const { favorite } = favoriteSchema.parse(await readJson(request));
  return NextResponse.json(await setFavorite(user.id, id, favorite));
});
