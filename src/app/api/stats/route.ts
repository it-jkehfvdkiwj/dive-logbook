import { NextResponse } from "next/server";
import { withErrors } from "@/lib/http";
import { requireUser } from "@/lib/current-user";
import { getOverviewStats } from "@/services/statsService";

export const dynamic = "force-dynamic";

export const GET = withErrors(async () => {
  const user = await requireUser();
  return NextResponse.json(await getOverviewStats(user.id));
});
