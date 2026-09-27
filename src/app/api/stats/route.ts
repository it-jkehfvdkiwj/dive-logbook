import { NextResponse } from "next/server";
import { withErrors } from "@/lib/http";
import { getOverviewStats } from "@/services/statsService";

export const dynamic = "force-dynamic";

export const GET = withErrors(async () => NextResponse.json(await getOverviewStats()));
