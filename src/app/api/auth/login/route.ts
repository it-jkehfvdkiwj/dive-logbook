import { NextResponse } from "next/server";
import { z } from "zod";
import { SESSION_COOKIE, SESSION_MAX_AGE, isAuthEnabled, safeEqual, sessionToken } from "@/lib/auth";
import { errorResponse, readJson, withErrors } from "@/lib/http";

const bodySchema = z.object({ password: z.string().min(1, "Password is required") });

export const POST = withErrors(async (request: Request) => {
  if (!isAuthEnabled()) return NextResponse.json({ ok: true });
  const { password } = bodySchema.parse(await readJson(request));

  const [given, expected] = await Promise.all([sessionToken(password), sessionToken()]);
  if (!safeEqual(given, expected)) {
    await new Promise((r) => setTimeout(r, 600)); // Brute-Force bremsen
    return errorResponse(401, "invalid_password", "Wrong password.");
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, expected, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
});
