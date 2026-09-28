import { NextResponse } from "next/server";
import { readJson, withErrors } from "@/lib/http";
import { requireUser } from "@/lib/current-user";
import { JsonImporter } from "@/importers/jsonImporter";
import { runImport } from "@/services/importService";

export const maxDuration = 300;

/** POST /api/import/json – Body: ImportedDive[] oder { dives: ImportedDive[] } */
export const POST = withErrors(async (request: Request) => {
  const user = await requireUser();
  const payload = await readJson(request);
  return NextResponse.json(await runImport(new JsonImporter(payload), user.id));
});
