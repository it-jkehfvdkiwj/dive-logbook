import { NextResponse } from "next/server";
import { readJson, withErrors } from "@/lib/http";
import { requireAdmin } from "@/lib/current-user";
import { newUserSchema } from "@/lib/validation/misc";
import { createUser, listUsers } from "@/services/userService";

export const dynamic = "force-dynamic";

export const GET = withErrors(async () => {
  await requireAdmin();
  return NextResponse.json({ users: await listUsers() });
});

/** Admin legt einen Benutzer an. Der Benutzer loggt sich danach nur mit seinem Passwort ein. */
export const POST = withErrors(async (request: Request) => {
  await requireAdmin();
  const input = newUserSchema.parse(await readJson(request));
  return NextResponse.json(await createUser(input), { status: 201 });
});
