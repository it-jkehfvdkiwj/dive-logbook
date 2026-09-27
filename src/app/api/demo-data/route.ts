import { NextResponse } from "next/server";
import { withErrors } from "@/lib/http";
import { deleteDemoData } from "@/services/demoDataService";

export const DELETE = withErrors(async () => NextResponse.json(await deleteDemoData()));
