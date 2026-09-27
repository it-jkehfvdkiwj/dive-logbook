import { NextResponse } from "next/server";
import { readJson, withErrors } from "@/lib/http";
import { JsonImporter } from "@/importers/jsonImporter";
import { runImport } from "@/services/importService";

/** POST /api/import/json – Body: ImportedDive[] oder { dives: ImportedDive[] } */
export const POST = withErrors(async (request: Request) => {
  const payload = await readJson(request);
  const result = await runImport(new JsonImporter(payload));
  return NextResponse.json(result);
});
