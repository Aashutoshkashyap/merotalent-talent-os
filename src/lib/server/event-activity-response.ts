import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AdminRequestError } from "@/lib/admin/admin-route-utils";
import { NeonAuthorizationError } from "./neon-authorization";

export function eventActivityResponse(data: unknown) {
  return NextResponse.json({ data }, { headers: { "Cache-Control": "private, no-store" } });
}
export function eventActivityError(error: unknown) {
  const known = error instanceof NeonAuthorizationError || error instanceof AdminRequestError;
  if (!known && !(error instanceof ZodError)) {
    const code = typeof error === "object" && error && "code" in error && typeof error.code === "string" && /^[A-Z0-9_]{1,50}$/.test(error.code) ? error.code : "UNEXPECTED";
    // Never log raw database/provider errors: they can contain query values and credentials.
    console.error(JSON.stringify({ event: "event_activity_operation_failed", code }));
  }
  return NextResponse.json({ error: known ? error.code : error instanceof ZodError ? "INVALID_ACTIVITY_INPUT" : "ACTIVITY_UNAVAILABLE",
    message: known ? error.message : error instanceof ZodError ? error.issues[0]?.message : "The activity operation is unavailable. Please retry." },
  { status: known ? error.status : error instanceof ZodError ? 400 : 503, headers: { "Cache-Control": "private, no-store" } });
}
