import { NextResponse } from "next/server";
import { getBackendMode } from "@/lib/server/backend-mode";
import { NeonAuthorizationError } from "@/lib/server/neon-authorization";
import { getAuthenticatedApplicationUser, NeonSessionUnavailable } from "@/lib/server/neon-session";
import { NeonPaymentsRepository, type CreatePaymentInput } from "@/lib/server/neon-payments";

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
    const actor = await getAuthenticatedApplicationUser(request);
    const body: unknown = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
    }

    const payload = body as Partial<CreatePaymentInput & { action?: string; paymentId?: string; gatewayTransactionId?: string; status?: "completed" | "failed" }>;
    const repo = new NeonPaymentsRepository();

    if (payload.action === "verify" && payload.paymentId && payload.gatewayTransactionId) {
      const verified = await repo.verifyPaymentCallback(actor, payload.paymentId, {
        gatewayTransactionId: payload.gatewayTransactionId,
        status: payload.status ?? "completed",
      });
      return NextResponse.json({ data: verified });
    }

    if (!payload.paymentType || typeof payload.amount !== "number") {
      return NextResponse.json({ error: "MISSING_PAYMENT_FIELDS" }, { status: 400 });
    }

    const created = await repo.createPayment(actor, {
      paymentType: payload.paymentType,
      referenceId: payload.referenceId,
      amount: payload.amount,
      currency: payload.currency,
      paymentMethod: payload.paymentMethod,
      gateway: payload.gateway,
      metadata: payload.metadata,
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    return failure(error);
  }
}
