import { NextResponse } from "next/server";
import { getBackendMode } from "@/lib/server/backend-mode";
import { getAuthenticatedApplicationUser, NeonSessionUnavailable } from "@/lib/server/neon-session";
import { NeonAuthorizationError } from "@/lib/server/neon-authorization";
import { getNeonProviderStatus, providerHealth } from "@/lib/server/neon-provider-config";
import { getNeonPaymentAvailability } from "@/lib/server/neon-payment-availability";
import { resolveNeonEmailProvider } from "@/lib/server/neon-email-queue";
import { neonEmailPolicy } from "@/lib/server/neon-delivery-policy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  if (getBackendMode() === "legacy") return new Response(null, { status: 404 });
  try {
    const actor = await getAuthenticatedApplicationUser(request);
    const [payment, email, ai] = await Promise.all([
      getNeonProviderStatus(actor, "payment"), getNeonProviderStatus(actor, "email"),
      getNeonProviderStatus(actor, "ai"),
    ]);
    const checkout = await getNeonPaymentAvailability(actor.userId);
    const emailProvider = await resolveNeonEmailProvider();
    const emailPolicy = neonEmailPolicy();
    return NextResponse.json({ data: {
      payment: providerHealth(payment, "esewa"),
      checkout,
      email: providerHealth(email, "resend"),
      emailDelivery: { configured: Boolean(emailProvider), enabled: emailPolicy.enabled,
        source: email.configured ? "provider_center" : emailProvider ? "server_environment" : "unconfigured",
        notBefore: emailPolicy.notBefore },
      ai: providerHealth(ai, "openai-compatible"),
    } }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof NeonAuthorizationError) return NextResponse.json({ error: error.code }, { status: error.status });
    if (error instanceof NeonSessionUnavailable) return NextResponse.json({ error: "AUTH_UNAVAILABLE" }, { status: 503 });
    return NextResponse.json({ error: "PROVIDER_STATUS_UNAVAILABLE" }, { status: 503 });
  }
}
