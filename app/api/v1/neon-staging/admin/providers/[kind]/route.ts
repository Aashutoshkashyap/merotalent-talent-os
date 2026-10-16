import { NextResponse } from "next/server";
import { getBackendMode } from "@/lib/server/backend-mode";
import { getAuthenticatedApplicationUser, NeonSessionUnavailable, requireSameOrigin } from "@/lib/server/neon-session";
import { NeonAuthorizationError } from "@/lib/server/neon-authorization";
import { getNeonProviderStatus, parseProviderKind, saveNeonProviderConfiguration } from "@/lib/server/neon-provider-config";
import { ServerConfigurationError } from "@/lib/server/server-configuration-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type Context = { params: Promise<{ kind: string }> };
const active = () => getBackendMode() === "neon-staging";

function failure(error: unknown) {
  if (error instanceof NeonAuthorizationError) return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: error.status });
  if (error instanceof NeonSessionUnavailable) return NextResponse.json({ error: { code: "AUTH_UNAVAILABLE" } }, { status: 503 });
  if (error instanceof ServerConfigurationError) return NextResponse.json({ error: { code: "PROVIDER_SECRET_STORAGE_UNAVAILABLE" } }, { status: 503 });
  return NextResponse.json({ error: { code: "PROVIDER_CONFIGURATION_UNAVAILABLE" } }, { status: 503 });
}

export async function GET(request: Request, context: Context): Promise<Response> {
  if (!active()) return new Response(null, { status: 404 });
  try {
    const actor = await getAuthenticatedApplicationUser(request);
    const status = await getNeonProviderStatus(actor, parseProviderKind((await context.params).kind));
    return NextResponse.json({ data: status }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return failure(error); }
}

export async function PUT(request: Request, context: Context): Promise<Response> {
  if (!active()) return new Response(null, { status: 404 });
  try {
    requireSameOrigin(request);
    const actor = await getAuthenticatedApplicationUser(request);
    const body: unknown = await request.json().catch(() => null);
    const status = await saveNeonProviderConfiguration(actor, parseProviderKind((await context.params).kind), body);
    return NextResponse.json({ data: status }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return failure(error); }
}
