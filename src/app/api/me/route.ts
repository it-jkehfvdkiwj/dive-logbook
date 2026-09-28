import { NextResponse } from "next/server";
import { readJson, withErrors } from "@/lib/http";
import { requireUser } from "@/lib/current-user";
import { profileInputSchema } from "@/lib/validation/misc";
import { updateProfile } from "@/services/userService";

export const dynamic = "force-dynamic";

/** Eigenes Profil (Name, Sync-Einstellung). */
export const GET = withErrors(async () => NextResponse.json(await requireUser()));

export const PUT = withErrors(async (request: Request) => {
  const user = await requireUser();
  const input = profileInputSchema.parse(await readJson(request));
  return NextResponse.json(await updateProfile(user.id, input));
});
