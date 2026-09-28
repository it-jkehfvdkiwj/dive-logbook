import { NextResponse } from "next/server";
import { z } from "zod";
import { readJson, withErrors } from "@/lib/http";
import { syncSsi } from "@/services/ssiSyncService";

export const maxDuration = 300;

const bodySchema = z.object({
  email: z.string().trim().email("Please enter a valid e-mail").optional().or(z.literal("")),
  password: z.string().optional(),
});

/** POST /api/import/ssi – { email?, password? }. Ohne Body: Zugangsdaten aus den Umgebungsvariablen. */
export const POST = withErrors(async (request: Request) => {
  const body = bodySchema.parse(await readJson(request));
  return NextResponse.json(await syncSsi(body));
});
