import { NextResponse } from "next/server";
import { readJson, withErrors } from "@/lib/http";
import { requireUser } from "@/lib/current-user";
import { siteLocationSchema } from "@/lib/validation/misc";
import { updateSiteLocation } from "@/services/diveSiteService";

type Ctx = RouteContext<"/api/sites/[id]">;

/** Position (und optional Land) eines Tauchplatzes korrigieren – gilt für alle Dives dort. */
export const PATCH = withErrors(async (request: Request, ctx: Ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const input = siteLocationSchema.parse(await readJson(request));
  return NextResponse.json(await updateSiteLocation(user.id, id, input));
});
