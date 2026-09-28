import { NextResponse } from "next/server";
import { withErrors } from "@/lib/http";
import { requireUser } from "@/lib/current-user";
import { deletePhoto } from "@/services/photoService";

export const DELETE = withErrors(async (_req: Request, ctx: RouteContext<"/api/photos/[id]">) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  await deletePhoto(user.id, id);
  return NextResponse.json({ ok: true });
});
