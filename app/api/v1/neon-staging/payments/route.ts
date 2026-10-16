import { NextResponse } from "next/server";
import { getBackendMode } from "@/lib/server/backend-mode";
import { NeonAuthorizationError } from "@/lib/server/neon-authorization";
import { getAuthenticatedApplicationUser, NeonSessionUnavailable } from "@/lib/server/neon-session";
import { NeonPaymentsRepository } from "@/lib/server/neon-payments";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function stagingOnly() {
  try { return getBackendMode() === "neon-staging"; } catch { return false; }
}

function failure(error: unknown) {
  if (error instanceof NeonAuthorizationError) {
    return NextResponse.json({ error: error.code, message: error.message }, { status: error.status });
  }
  if (error instanceof NeonSessionUnavailable) {
    return NextResponse.json({ error: "AUTH_UNAVAILABLE", message: error.message }, { status: 503 });
  }
  return NextResponse.json({ error: "PAYMENT_UNAVAILABLE" }, { status: 503 });
}

export async function GET(request: Request) {
  if (!stagingOnly()) return new Response(null, { status: 404 });
  try {
    const actor = await getAuthenticatedApplicationUser(request);
    const repo = new NeonPaymentsRepository();
    const payments = await repo.listOwnPayments(actor);
    return NextResponse.json({ data: payments });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  if (!stagingOnly()) return new Response(null, { status: 404 });
  try {
    await getAuthenticatedApplicationUser(request);
    // No trusted staging checkout/return verifier is connected yet. Browser-supplied
    // amounts or statuses must never create or activate payment records.
    return NextResponse.json({ error: "VERIFIED_CHECKOUT_REQUIRED" }, { status: 503 });
  } catch (error) {
    return failure(error);
  }
}
