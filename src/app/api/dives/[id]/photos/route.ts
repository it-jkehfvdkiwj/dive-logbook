import { NextResponse } from "next/server";
import { readJson, withErrors } from "@/lib/http";
import { photoInputSchema } from "@/lib/validation/misc";
import { addPhoto } from "@/services/photoService";

export const POST = withErrors(async (request: Request, ctx: RouteContext<"/api/dives/[id]/photos">) => {
  const { id } = await ctx.params;
  const input = photoInputSchema.parse(await readJson(request));
  return NextResponse.json(await addPhoto(id, input), { status: 201 });
});
