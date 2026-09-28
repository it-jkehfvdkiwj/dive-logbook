import { NextResponse } from "next/server";
import { withErrors } from "@/lib/http";
import { requireUser } from "@/lib/current-user";
import { countryCodeFromCoords, countryNameFor } from "@/lib/countries";

/** Land zu GPS-Koordinaten (offline, inkl. Küstengewässer) – für die Standortwahl. */
export const GET = withErrors(async (request: Request) => {
  await requireUser();
  const url = new URL(request.url);
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));
  const code = countryCodeFromCoords(lat, lng);
  return NextResponse.json({ countryCode: code, country: code ? countryNameFor(code) : null });
});
