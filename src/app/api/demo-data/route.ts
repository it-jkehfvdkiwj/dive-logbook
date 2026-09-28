import { NextResponse } from "next/server";
import { withErrors } from "@/lib/http";
import { requireUser } from "@/lib/current-user";
import { deleteDemoData } from "@/services/demoDataService";

export const DELETE = withErrors(async () => {
  const user = await requireUser();
  return NextResponse.json(await deleteDemoData(user.id));
});
