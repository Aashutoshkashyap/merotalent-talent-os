import { NextResponse } from "next/server";
import { getBackendMode } from "@/lib/server/backend-mode";
import { NeonAuthorizationError } from "@/lib/server/neon-authorization";
import { NeonCheckoutService } from "@/lib/server/neon-checkout";
import { getAuthenticatedApplicationUser, NeonSessionUnavailable, requireSameOrigin } from "@/lib/server/neon-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const headers = { "cache-control": "private, no-store" };

async function hasPayload(request: Request) {
  // Next's HTTP adapter can expose an empty stream for a bodyless POST.
  // Inspect at most eight chunks, reject at the first byte, never buffer input.
  const reader = request.body?.getReader();
  if (!reader) return false;
  try {
    for (let i = 0; i < 8; i++) {
      const chunk = await reader.read();
      if (chunk.done) return false;
      if (chunk.value.byteLength) return true;
    }
    return true;
  } finally { await reader.cancel(); }
}

/** Explicit payer-initiated status recovery; GET/history never settles money. */
export async function POST(request: Request, context: { params: Promise<{ reference: string }> }) {
  if (getBackendMode() === "legacy") return new Response(null, { status: 404 });
  try {
    requireSameOrigin(request);
    const actor = await getAuthenticatedApplicationUser(request);
    const { reference } = await context.params;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(reference) || await hasPayload(request))
      return NextResponse.json({ error: "INVALID_VERIFICATION" }, { status: 422, headers });
    const result = await new NeonCheckoutService().recheckOwnPayment(actor, reference);
    return NextResponse.json({ data: result }, { headers });
  } catch (error) {
    if (error instanceof NeonAuthorizationError) return NextResponse.json({ error: error.code }, { status: error.status, headers });
    if (error instanceof NeonSessionUnavailable) return NextResponse.json({ error: "AUTH_UNAVAILABLE" }, { status: 503, headers });
    return NextResponse.json({ error: "VERIFICATION_UNAVAILABLE" }, { status: 503, headers });
  }
}
