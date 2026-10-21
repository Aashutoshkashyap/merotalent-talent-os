import { NextResponse } from "next/server";
import { getBackendMode } from "@/lib/server/backend-mode";
import { getAuthenticatedApplicationUser, NeonSessionUnavailable, requireSameOrigin } from "@/lib/server/neon-session";
import { NeonAuthorizationError } from "@/lib/server/neon-authorization";
import { readAdminSiteSettings, saveAdminSiteSettings } from "@/lib/server/neon-cms";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const active = () => getBackendMode() !== "legacy";
const failure = (error: unknown) => error instanceof NeonAuthorizationError
  ? NextResponse.json({ error: error.code }, { status: error.status })
  : error instanceof NeonSessionUnavailable
    ? NextResponse.json({ error: "AUTH_UNAVAILABLE" }, { status: 503 })
    : NextResponse.json({ error: "SITE_SETTINGS_UNAVAILABLE" }, { status: 503 });

export async function GET(request: Request): Promise<Response> {
  if (!active()) return new Response(null, { status: 404 });
  try {
    const actor = await getAuthenticatedApplicationUser(request);
    return NextResponse.json({ data: await readAdminSiteSettings(actor) },
      { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return failure(error); }
}

export async function PUT(request: Request): Promise<Response> {
  if (!active()) return new Response(null, { status: 404 });
  try {
    requireSameOrigin(request);
    const actor = await getAuthenticatedApplicationUser(request);
    const body: unknown = await request.json().catch(() => null);
    return NextResponse.json({ data: await saveAdminSiteSettings(actor, body) },
      { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return failure(error); }
}
