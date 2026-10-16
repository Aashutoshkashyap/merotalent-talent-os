import { NextResponse } from "next/server";
import { getBackendMode } from "@/lib/server/backend-mode";
import { NeonAuthorizationError } from "@/lib/server/neon-authorization";
import { NeonCheckoutService } from "@/lib/server/neon-checkout";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** eSewa's redirect may reach this endpoint without a browser session. */
export async function GET(request: Request) {
  if (getBackendMode() !== "neon-staging") return new Response(null, { status: 404 });
  const url = new URL(request.url);
  const encoded = url.searchParams.get("data");
  let payload: Record<string, unknown> | null = null;
  if (encoded) {
    if (encoded.length > 4096) return NextResponse.json({ error: "INVALID_PROVIDER_PAYLOAD" }, { status: 400 });
    try {
      const decoded = JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
      if (!decoded || typeof decoded !== "object" || Array.isArray(decoded)) throw new Error("Invalid payload");
      payload = decoded as Record<string, unknown>;
    } catch { return NextResponse.json({ error: "INVALID_PROVIDER_PAYLOAD" }, { status: 400 }); }
  }
  const reference = payload?.transaction_uuid ?? url.searchParams.get("reference");
  if (typeof reference !== "string" || !/^[0-9a-f-]{36}$/i.test(reference)) {
    return NextResponse.json({ error: "INVALID_REFERENCE" }, { status: 400 });
  }
  try {
    await new NeonCheckoutService().verifyReturn({ reference, signedPayload: payload });
    // The dashboard queries its authenticated payment overview; this URL does
    // not assert success and cannot by itself grant access.
    return NextResponse.redirect(new URL(`/dashboard/payments?checkout=${encodeURIComponent(reference)}`, url.origin), {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    if (error instanceof NeonAuthorizationError) {
      return NextResponse.json({ error: error.code }, { status: error.status, headers: { "cache-control": "no-store" } });
    }
    return NextResponse.json({ error: "VERIFICATION_UNAVAILABLE" }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
