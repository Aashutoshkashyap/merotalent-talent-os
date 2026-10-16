import { NextResponse } from "next/server";
import { getBackendMode } from "@/lib/server/backend-mode";
import { getAuthenticatedApplicationUser, NeonSessionUnavailable } from "@/lib/server/neon-session";
import { NeonAuthorizationError } from "@/lib/server/neon-authorization";
import { getNeonProviderStatus, providerHealth } from "@/lib/server/neon-provider-config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  if (getBackendMode() !== "neon-staging") return new Response(null, { status: 404 });
  try {
    const actor = await getAuthenticatedApplicationUser(request);
    const [payment, email, ai] = await Promise.all([
      getNeonProviderStatus(actor, "payment"), getNeonProviderStatus(actor, "email"),
      getNeonProviderStatus(actor, "ai"),
    ]);
    return NextResponse.json({ data: {
      payment: providerHealth(payment, "esewa"),
      email: providerHealth(email, "resend"),
      ai: providerHealth(ai, "openai-compatible"),
    } }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof NeonAuthorizationError) return NextResponse.json({ error: error.code }, { status: error.status });
    if (error instanceof NeonSessionUnavailable) return NextResponse.json({ error: "AUTH_UNAVAILABLE" }, { status: 503 });
    return NextResponse.json({ error: "PROVIDER_STATUS_UNAVAILABLE" }, { status: 503 });
  }
}
