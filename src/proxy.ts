import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, isAuthEnabled, verifySession } from "@/lib/auth";

// Öffentliche Pfade: Login, PWA-Dateien (Safari lädt Manifest/Icons ohne Cookie),
// Cron-Route (prüft selbst CRON_SECRET)
const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/import/ssi/cron", "/manifest.webmanifest", "/sw.js", "/offline.html"];

export async function proxy(request: NextRequest) {
  if (!isAuthEnabled()) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next();

  const cookie = request.cookies.get(SESSION_COOKIE)?.value;
  if (await verifySession(cookie)) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: { code: "unauthorized", message: "Please log in." } }, { status: 401 });
  }
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = pathname !== "/" ? `?next=${encodeURIComponent(pathname + search)}` : "";
  return NextResponse.redirect(url);
}

export const config = {
  // Statische Assets und Icons nie blockieren
  matcher: ["/((?!_next/static|_next/image|icons/|favicon.ico).*)"],
};
