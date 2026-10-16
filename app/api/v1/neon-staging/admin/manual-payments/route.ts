import { NextResponse } from "next/server";
import { getBackendMode } from "@/lib/server/backend-mode";
import { listNeonManualPayments, reviewNeonManualPayment } from "@/lib/server/neon-admin-access";
import { NeonAuthorizationError } from "@/lib/server/neon-authorization";
import { getAuthenticatedApplicationUser, NeonSessionUnavailable, requireSameOrigin } from "@/lib/server/neon-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  if (getBackendMode() !== "neon-staging") return new Response(null, { status: 404 });
  try {
    const actor = await getAuthenticatedApplicationUser(request);
    const userId = new URL(request.url).searchParams.get("userId") ?? "";
    const data = await listNeonManualPayments(actor, userId);
    return NextResponse.json({ data }, { headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof NeonAuthorizationError ? error.code
      : error instanceof NeonSessionUnavailable ? "AUTH_UNAVAILABLE" : "PAYMENT_LIST_UNAVAILABLE" },
    { status: error instanceof NeonAuthorizationError ? error.status : 503, headers });
  }
}

export async function PATCH(request: Request) {
  if (getBackendMode() !== "neon-staging") return new Response(null, { status: 404 });
  try {
    requireSameOrigin(request);
    const actor = await getAuthenticatedApplicationUser(request);
    const body: unknown = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body) ||
      Object.keys(body).length !== 3 || !("paymentId" in body) || !("decision" in body) || !("note" in body) ||
      typeof body.paymentId !== "string" || typeof body.note !== "string" ||
      (body.decision !== "confirm" && body.decision !== "reject")) {
      return NextResponse.json({ error: "INVALID_PAYMENT_REVIEW" }, { status: 400, headers });
    }
    const data = await reviewNeonManualPayment(actor, body.paymentId, body.decision, body.note);
    return NextResponse.json({ data }, { headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof NeonAuthorizationError ? error.code
      : error instanceof NeonSessionUnavailable ? "AUTH_UNAVAILABLE" : "PAYMENT_REVIEW_UNAVAILABLE" },
    { status: error instanceof NeonAuthorizationError ? error.status : 503, headers });
  }
}
