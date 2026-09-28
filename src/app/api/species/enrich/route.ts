import { NextResponse } from "next/server";
import { withErrors } from "@/lib/http";
import { requireUser } from "@/lib/current-user";
import { enrichMissingSpecies } from "@/services/speciesEnrichmentService";

export const maxDuration = 60;

/** Holt Fotos + deutsche Namen für alle noch nicht angereicherten Arten (in Etappen, max. ~45 s). */
export const POST = withErrors(async () => {
  await requireUser();
  return NextResponse.json(await enrichMissingSpecies(45_000));
});
