import { NextResponse } from "next/server";
import { z } from "zod";
import { readJson, withErrors } from "@/lib/http";
import { requireUser } from "@/lib/current-user";
import { importSsiCsv } from "@/services/ssiSyncService";

export const maxDuration = 300;

const bodySchema = z.object({ csv: z.string().min(1, "The file is empty").max(5_000_000, "File too large") });

/** POST /api/import/ssi-csv – { csv: "<Inhalt des MySSI-CSV-Exports>" } */
export const POST = withErrors(async (request: Request) => {
  const user = await requireUser();
  const { csv } = bodySchema.parse(await readJson(request));
  return NextResponse.json(await importSsiCsv(user.id, csv));
});
