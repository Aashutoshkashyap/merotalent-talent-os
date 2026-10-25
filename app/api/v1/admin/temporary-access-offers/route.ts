import { NextResponse } from "next/server";
import { getBackendMode } from "@/lib/server/backend-mode";
import { NeonAuthorizationError } from "@/lib/server/neon-authorization";
import { getAuthenticatedApplicationUser, requireSameOrigin } from "@/lib/server/neon-session";
import { configureTemporaryAccessOffers } from "@/lib/server/neon-test-access-offers";
import { scheduleNeonEmailDelivery } from "@/lib/server/neon-email-dispatch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  if (getBackendMode() === "legacy") return new Response(null, { status: 404 });
  try {
    requireSameOrigin(request);
    const actor = await getAuthenticatedApplicationUser(request);
    const data = await configureTemporaryAccessOffers(actor);
    scheduleNeonEmailDelivery();
    return NextResponse.json({ data }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const known = error instanceof NeonAuthorizationError;
    return NextResponse.json({ error: known ? error.code : "CONFIGURATION_UNAVAILABLE",
      message: known ? error.message : "Temporary offers could not be configured." }, { status: known ? error.status : 503 });
  }
}
