import { NextResponse } from "next/server";
import { errorResponse, withErrors } from "@/lib/http";
import { safeEqual } from "@/lib/auth";
import { syncSsiForAdmin } from "@/services/ssiSyncService";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Täglicher Sync des Admin-Kontos durch Vercel Cron (siehe vercel.json).
 * Vercel sendet automatisch "Authorization: Bearer $CRON_SECRET", wenn CRON_SECRET gesetzt ist.
 */
export const GET = withErrors(async (request: Request) => {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization") ?? "";
  if (!secret || !safeEqual(auth, `Bearer ${secret}`)) {
    return errorResponse(401, "unauthorized", "Invalid or missing CRON_SECRET.");
  }
  const result = await syncSsiForAdmin();
  return NextResponse.json(result ?? { skipped: true, reason: "SSI_EMAIL / SSI_PASSWORD not set" });
});
