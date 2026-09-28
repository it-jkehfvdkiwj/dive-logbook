import { db } from "@/lib/db";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { OWNER_ID } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import type { Prisma } from "@/generated/prisma/client";

export interface UserSummary {
  id: string;
  name: string;
  isAdmin: boolean;
  syncOverwriteManualEdits: boolean;
  speciesNameLang: "en" | "de";
  hasPassword: boolean;
  createdAt: Date;
  diveCount?: number;
}

type UserRow = Prisma.UserGetPayload<object>;

const toSummary = (u: UserRow, diveCount?: number): UserSummary => ({
  id: u.id,
  name: u.name,
  isAdmin: u.isAdmin,
  syncOverwriteManualEdits: u.syncOverwriteManualEdits,
  speciesNameLang: u.speciesNameLang === "de" ? "de" : "en",
  hasPassword: u.passwordHash != null,
  createdAt: u.createdAt,
  diveCount,
});

export async function getUser(id: string): Promise<UserSummary | null> {
  const u = await db.user.findUnique({ where: { id } });
  return u ? toSummary(u) : null;
}

/** Owner-Konto (Admin) sicherstellen – z. B. lokal ohne Login oder nach frischer Installation. */
export async function ensureOwner(name = process.env.SEED_DISPLAY_NAME || "Diver"): Promise<UserSummary> {
  const u = await db.user.upsert({
    where: { id: OWNER_ID },
    update: {},
    create: { id: OWNER_ID, name, isAdmin: true },
  });
  return toSummary(u);
}

/**
 * Login: Passwort → Benutzer.
 * Sonderfall: Der Owner hat anfangs kein Passwort und beansprucht sein Konto mit APP_PASSWORD.
 */
export async function authenticate(password: string): Promise<UserSummary | null> {
  const hash = hashPassword(password);
  const user = await db.user.findUnique({ where: { passwordHash: hash } });
  if (user) return toSummary(user);

  const appPassword = process.env.APP_PASSWORD;
  if (appPassword && password === appPassword) {
    const owner = await ensureOwner();
    if (!owner.hasPassword) {
      const claimed = await db.user.update({ where: { id: owner.id }, data: { passwordHash: hash } });
      return toSummary(claimed);
    }
  }
  return null;
}

async function assertPasswordFree(hash: string, exceptUserId?: string) {
  const other = await db.user.findUnique({ where: { passwordHash: hash }, select: { id: true } });
  if (other && other.id !== exceptUserId) {
    throw new ConflictError("This password is already in use. Please choose a different one.", { field: "password" });
  }
}

export async function listUsers(): Promise<UserSummary[]> {
  const users = await db.user.findMany({
    orderBy: [{ isAdmin: "desc" }, { createdAt: "asc" }],
    include: { _count: { select: { dives: true } } },
  });
  return users.map((u) => toSummary(u, u._count.dives));
}

export async function createUser(input: { name: string; password: string }): Promise<UserSummary> {
  const hash = hashPassword(input.password);
  if (process.env.APP_PASSWORD && input.password === process.env.APP_PASSWORD) {
    throw new ConflictError("This password is reserved. Please choose a different one.", { field: "password" });
  }
  await assertPasswordFree(hash);
  const u = await db.user.create({ data: { name: input.name, passwordHash: hash } });
  return toSummary(u);
}

export async function deleteUser(actorId: string, id: string): Promise<void> {
  if (id === actorId) throw new ValidationError("You cannot delete your own account.");
  const u = await db.user.findUnique({ where: { id }, select: { isAdmin: true } });
  if (!u) throw new NotFoundError("User");
  if (u.isAdmin) throw new ValidationError("Admin accounts cannot be deleted.");
  // Dives, Sites, Imports werden per Cascade gelöscht; der Artenkatalog bleibt.
  await db.user.delete({ where: { id } });
}

export async function updateProfile(
  userId: string,
  input: { name?: string; syncOverwriteManualEdits?: boolean; speciesNameLang?: "en" | "de" },
): Promise<UserSummary> {
  const u = await db.user.update({ where: { id: userId }, data: input });
  return toSummary(u);
}

export async function changePassword(userId: string, password: string): Promise<void> {
  const hash = hashPassword(password);
  await assertPasswordFree(hash, userId);
  await db.user.update({ where: { id: userId }, data: { passwordHash: hash } });
}
