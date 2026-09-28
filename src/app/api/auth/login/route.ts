import { NextResponse } from "next/server";
import { z } from "zod";
import { SESSION_COOKIE, SESSION_MAX_AGE, isAuthEnabled, signSession } from "@/lib/auth";
import { errorResponse, readJson, withErrors } from "@/lib/http";
import { authenticate } from "@/services/userService";

const bodySchema = z.object({ password: z.string().min(1, "Password is required") });

/** Login nur mit Passwort – das Passwort bestimmt das Konto. */
export const POST = withErrors(async (request: Request) => {
  if (!isAuthEnabled()) return NextResponse.json({ ok: true });
  const { password } = bodySchema.parse(await readJson(request));

  const user = await authenticate(password);
  if (!user) {
    await new Promise((r) => setTimeout(r, 600)); // Brute-Force bremsen
    return errorResponse(401, "invalid_password", "Wrong password.");
  }

  const res = NextResponse.json({ ok: true, name: user.name });
  res.cookies.set(SESSION_COOKIE, await signSession(user.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
});
