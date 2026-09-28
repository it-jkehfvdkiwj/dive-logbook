import { NextResponse } from "next/server";
import { z } from "zod";
import { readJson, withErrors } from "@/lib/http";
import { requireUser } from "@/lib/current-user";
import { syncSsi } from "@/services/ssiSyncService";

export const maxDuration = 300;

const bodySchema = z.object({
  email: z.string().trim().optional(),
  password: z.string().optional(),
});

/** POST /api/import/ssi – { email?, password? }. Admin ohne Body: Zugangsdaten aus den Umgebungsvariablen. */
export const POST = withErrors(async (request: Request) => {
  const user = await requireUser();
  const body = bodySchema.parse(await readJson(request));
  return NextResponse.json(await syncSsi(user, body));
});
