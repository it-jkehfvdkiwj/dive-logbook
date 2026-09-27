import { NextResponse } from "next/server";
import { withErrors } from "@/lib/http";
import { deletePhoto } from "@/services/photoService";

export const DELETE = withErrors(async (_req: Request, ctx: RouteContext<"/api/photos/[id]">) => {
  const { id } = await ctx.params;
  await deletePhoto(id);
  return NextResponse.json({ ok: true });
});
