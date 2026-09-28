import { NextResponse } from "next/server";
import { readJson, withErrors } from "@/lib/http";
import { requireUser } from "@/lib/current-user";
import { changePasswordSchema } from "@/lib/validation/misc";
import { changePassword } from "@/services/userService";

export const PUT = withErrors(async (request: Request) => {
  const user = await requireUser();
  const { password } = changePasswordSchema.parse(await readJson(request));
  await changePassword(user.id, password);
  return NextResponse.json({ ok: true });
});
