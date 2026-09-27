import { NextResponse } from "next/server";
import { z } from "zod";
import { AppError } from "./errors";
import { fieldErrorsOf } from "./validation/common";
import type { ApiErrorBody } from "@/types";

export function errorResponse(status: number, code: string, message: string, details?: unknown) {
  return NextResponse.json<ApiErrorBody>({ error: { code, message, details } }, { status });
}

/** Einheitliche Fehlerbehandlung für alle API-Routen. */
export function handleApiError(err: unknown) {
  if (err instanceof z.ZodError) {
    return errorResponse(400, "validation_error", "Please check the highlighted fields.", {
      fieldErrors: fieldErrorsOf(err),
    });
  }
  if (err instanceof AppError) {
    return errorResponse(err.status, err.code, err.message, err.details);
  }
  console.error(err);
  return errorResponse(500, "internal_error", "Something went wrong. Please try again.");
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new z.ZodError([{ code: "custom", path: [], message: "Invalid JSON body", input: undefined }]);
  }
}

/** Wrapper: fängt Fehler und wandelt sie in JSON-Antworten um. */
export function withErrors<Args extends unknown[]>(handler: (...args: Args) => Promise<Response>) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (err) {
      return handleApiError(err);
    }
  };
}

export function searchParamsObject(request: Request): Record<string, string> {
  return Object.fromEntries(new URL(request.url).searchParams.entries());
}
