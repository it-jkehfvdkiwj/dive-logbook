import { NextResponse } from "next/server";
import { readJson, searchParamsObject, withErrors } from "@/lib/http";
import { sightingCreateSchema } from "@/lib/validation/sighting";
import { addSighting, listSightings } from "@/services/sightingService";

export const GET = withErrors(async (request: Request) => {
  const { diveId, speciesId } = searchParamsObject(request);
  return NextResponse.json({ sightings: await listSightings({ diveId, speciesId }) });
});

export const POST = withErrors(async (request: Request) => {
  const input = sightingCreateSchema.parse(await readJson(request));
  const { sighting, created } = await addSighting(input);
  return NextResponse.json({ ...sighting, created }, { status: created ? 201 : 200 });
});
