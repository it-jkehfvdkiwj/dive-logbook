import { NextResponse } from "next/server";
import { readJson, searchParamsObject, withErrors } from "@/lib/http";
import { requireUser } from "@/lib/current-user";
import { sightingCreateSchema } from "@/lib/validation/sighting";
import { addSighting, listSightings } from "@/services/sightingService";

export const GET = withErrors(async (request: Request) => {
  const user = await requireUser();
  const { diveId, speciesId } = searchParamsObject(request);
  return NextResponse.json({ sightings: await listSightings(user.id, { diveId, speciesId }) });
});

export const POST = withErrors(async (request: Request) => {
  const user = await requireUser();
  const input = sightingCreateSchema.parse(await readJson(request));
  const { sighting, created } = await addSighting(user.id, input);
  return NextResponse.json({ ...sighting, created }, { status: created ? 201 : 200 });
});
