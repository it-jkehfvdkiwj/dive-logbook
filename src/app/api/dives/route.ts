import { NextResponse } from "next/server";
import { readJson, searchParamsObject, withErrors } from "@/lib/http";
import { requireUser } from "@/lib/current-user";
import { diveFiltersSchema, diveInputSchema } from "@/lib/validation/dive";
import { createDive, listDives } from "@/services/diveService";

export const GET = withErrors(async (request: Request) => {
  const user = await requireUser();
  const filters = diveFiltersSchema.parse(searchParamsObject(request));
  return NextResponse.json({ dives: await listDives(user.id, filters) });
});

export const POST = withErrors(async (request: Request) => {
  const user = await requireUser();
  const input = diveInputSchema.parse(await readJson(request));
  return NextResponse.json(await createDive(user.id, input), { status: 201 });
});
