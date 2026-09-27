import { NextResponse } from "next/server";
import { readJson, withErrors } from "@/lib/http";
import { settingsInputSchema } from "@/lib/validation/misc";
import { getSettings, updateSettings } from "@/services/settingsService";

export const dynamic = "force-dynamic";

export const GET = withErrors(async () => NextResponse.json(await getSettings()));

export const PUT = withErrors(async (request: Request) => {
  const input = settingsInputSchema.parse(await readJson(request));
  return NextResponse.json(await updateSettings(input));
});
