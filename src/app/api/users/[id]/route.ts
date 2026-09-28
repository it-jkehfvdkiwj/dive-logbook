import { NextResponse } from "next/server";
import { withErrors } from "@/lib/http";
import { requireAdmin } from "@/lib/current-user";
import { deleteUser } from "@/services/userService";

export const DELETE = withErrors(async (_req: Request, ctx: RouteContext<"/api/users/[id]">) => {
  const admin = await requireAdmin();
  const { id } = await ctx.params;
  await deleteUser(admin.id, id);
  return NextResponse.json({ ok: true });
});
