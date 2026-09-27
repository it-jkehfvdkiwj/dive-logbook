import { NextResponse } from "next/server";
import { readJson, searchParamsObject, withErrors } from "@/lib/http";
import { diveFiltersSchema, diveInputSchema } from "@/lib/validation/dive";
import { createDive, listDives } from "@/services/diveService";

export const GET = withErrors(async (request: Request) => {
  const filters = diveFiltersSchema.parse(searchParamsObject(request));
  return NextResponse.json({ dives: await listDives(filters) });
});

export const POST = withErrors(async (request: Request) => {
  const input = diveInputSchema.parse(await readJson(request));
  const dive = await createDive(input);
  return NextResponse.json(dive, { status: 201 });
});
