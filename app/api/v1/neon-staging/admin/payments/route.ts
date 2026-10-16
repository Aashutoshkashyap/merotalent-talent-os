import { NextResponse } from "next/server";
import { getBackendMode } from "@/lib/server/backend-mode";
import { listNeonAdminPayments, reconcileNeonAdminPayment, recordNeonMentorPayout,
  reviewNeonAdminPaymentProof } from "@/lib/server/neon-admin-payments";
import { NeonAuthorizationError, requireSuperAdmin } from "@/lib/server/neon-authorization";
import { getAuthenticatedApplicationUser, NeonSessionUnavailable, requireSameOrigin } from "@/lib/server/neon-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };
const failure = (error: unknown) => NextResponse.json({ error: error instanceof NeonAuthorizationError
  ? error.code : error instanceof NeonSessionUnavailable ? "AUTH_UNAVAILABLE" : "BILLING_UNAVAILABLE",
  message: error instanceof NeonAuthorizationError ? error.message : "Billing records are temporarily unavailable." },
{ status: error instanceof NeonAuthorizationError ? error.status : 503, headers });
const invalid = () => NextResponse.json({ error: "INVALID_BILLING_ACTION" }, { status: 400, headers });

export async function GET(request: Request) {
  if (getBackendMode() !== "neon-staging") return new Response(null, { status: 404 });
  try {
    const actor = await getAuthenticatedApplicationUser(request);
    requireSuperAdmin(actor);
    return NextResponse.json({ data: await listNeonAdminPayments(actor, new URL(request.url).searchParams) }, { headers });
  } catch (error) { return failure(error); }
}

export async function PATCH(request: Request) {
  if (getBackendMode() !== "neon-staging") return new Response(null, { status: 404 });
  try {
    requireSameOrigin(request);
    const actor = await getAuthenticatedApplicationUser(request);
    requireSuperAdmin(actor);
    const body: unknown = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) return invalid();
    const input = body as Record<string, unknown>;
    const allowed = input.action === "proof" ? ["action", "id", "paymentId", "status", "note"]
      : input.action === "reconcile" ? ["action", "id", "status", "reconciliation", "note"]
        : input.action === "payout" ? ["action", "id", "amount", "commission", "reference", "note"] : [];
    if (!allowed.length || Object.keys(input).some(key => !allowed.includes(key)) ||
      typeof input.id !== "string" || typeof input.note !== "string") return invalid();
    if (input.action === "proof") {
      if (typeof input.paymentId !== "string" || (input.status !== "accepted" && input.status !== "rejected")) return invalid();
      return NextResponse.json({ data: await reviewNeonAdminPaymentProof(actor, { id: input.id,
        paymentId: input.paymentId, status: input.status, note: input.note }) }, { headers });
    }
    if (input.action === "reconcile") {
      if (typeof input.status !== "string" || typeof input.reconciliation !== "string") return invalid();
      return NextResponse.json({ data: await reconcileNeonAdminPayment(actor, { id: input.id,
        status: input.status, reconciliation: input.reconciliation, note: input.note }) }, { headers });
    }
    if (typeof input.amount !== "number" || typeof input.commission !== "number" || typeof input.reference !== "string") return invalid();
    return NextResponse.json({ data: await recordNeonMentorPayout(actor, { id: input.id,
      amount: input.amount, commission: input.commission, reference: input.reference, note: input.note }) }, { headers });
  } catch (error) { return failure(error); }
}
