import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, isAuthEnabled, verifySession } from "./auth";
import { AppError } from "./errors";
import { ensureOwner, getUser, type UserSummary } from "@/services/userService";

/** Aktueller Benutzer aus dem Session-Cookie (lokal ohne APP_PASSWORD: Owner). */
export async function getCurrentUser(): Promise<UserSummary | null> {
  if (!isAuthEnabled()) return ensureOwner();
  const store = await cookies();
  const userId = await verifySession(store.get(SESSION_COOKIE)?.value);
  return userId ? getUser(userId) : null;
}

/** Für API-Routen: wirft 401, wenn niemand eingeloggt ist. */
export async function requireUser(): Promise<UserSummary> {
  const user = await getCurrentUser();
  if (!user) throw new AppError("Please log in.", 401, "unauthorized");
  return user;
}

export async function requireAdmin(): Promise<UserSummary> {
  const user = await requireUser();
  if (!user.isAdmin) throw new AppError("Only the admin can do this.", 403, "forbidden");
  return user;
}

/** Für Seiten: leitet zum Login um (z. B. wenn ein Konto gelöscht wurde). */
export async function requirePageUser(): Promise<UserSummary> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
