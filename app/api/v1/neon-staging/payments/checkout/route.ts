import { NextResponse } from "next/server";
import { getBackendMode } from "@/lib/server/backend-mode";
import { NeonAuthorizationError } from "@/lib/server/neon-authorization";
import { NeonCheckoutService } from "@/lib/server/neon-checkout";
import { getAuthenticatedApplicationUser, NeonSessionUnavailable } from "@/lib/server/neon-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const headers = { "cache-control": "private, no-store" };

export async function POST(request: Request) {
  if (getBackendMode() !== "neon-staging") return new Response(null, { status: 404 });
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "INVALID_ORIGIN" }, { status: 403, headers });
  }
  try {
    const actor = await getAuthenticatedApplicationUser(request);
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body) ||
        !["mentor_booking", "event_registration", "college_scope_request", "module_access_request"].includes(body.kind) ||
        typeof body.targetId !== "string" || !/^[0-9a-f-]{36}$/i.test(body.targetId) ||
        Object.keys(body).some((key) => !["kind", "targetId", "packageId", "renewal"].includes(key)) ||
        (["college_scope_request","module_access_request"].includes(body.kind)
          ? typeof body.packageId !== "string" || !/^[0-9a-f-]{36}$/i.test(body.packageId) ||
            (body.kind === "college_scope_request" ? body.renewal !== undefined && typeof body.renewal !== "boolean" : body.renewal !== undefined)
          : body.packageId !== undefined || body.renewal !== undefined)) {
      return NextResponse.json({ error: "INVALID_CHECKOUT" }, { status: 422, headers });
    }
    const data = await new NeonCheckoutService().initiate(actor, body.kind, body.targetId, origin, undefined,
      body.packageId, body.renewal === true);
    return NextResponse.json({ data }, { status: data.reused ? 200 : 201, headers });
  } catch (error) {
    if (error instanceof NeonAuthorizationError) return NextResponse.json({ error: error.code }, { status: error.status, headers });
    if (error instanceof NeonSessionUnavailable) return NextResponse.json({ error: "AUTH_UNAVAILABLE" }, { status: 503, headers });
    return NextResponse.json({ error: "CHECKOUT_UNAVAILABLE" }, { status: 503, headers });
  }
}
