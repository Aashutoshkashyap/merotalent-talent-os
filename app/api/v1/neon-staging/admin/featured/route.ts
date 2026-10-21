import { NextResponse } from "next/server";
import { getBackendMode } from "@/lib/server/backend-mode";
import { NeonAuthorizationError } from "@/lib/server/neon-authorization";
import { getAuthenticatedApplicationUser, NeonSessionUnavailable, requireSameOrigin } from "@/lib/server/neon-session";
import { listFeaturedAdmin, listFeaturedOptions, removeFeaturedAdmin, saveFeaturedAdmin } from "@/lib/server/neon-featured-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };
const fail = (error: unknown) => {
  const status = error instanceof NeonAuthorizationError ? error.status : 503;
  const code = error instanceof NeonAuthorizationError ? error.code
    : error instanceof NeonSessionUnavailable ? "AUTH_UNAVAILABLE" : "FEATURED_UNAVAILABLE";
  return NextResponse.json({ error: code }, { status, headers });
};

export async function GET(request: Request): Promise<Response> {
  if (getBackendMode() === "legacy") return new Response(null, { status: 404 });
  try {
    const actor = await getAuthenticatedApplicationUser(request);
    const options = new URL(request.url).searchParams.get("options");
    return NextResponse.json({ data: options === null
      ? await listFeaturedAdmin(actor) : await listFeaturedOptions(actor, options) }, { headers });
  } catch (error) { return fail(error); }
}

export async function POST(request: Request): Promise<Response> {
  if (getBackendMode() === "legacy") return new Response(null, { status: 404 });
  try {
    requireSameOrigin(request);
    const actor = await getAuthenticatedApplicationUser(request);
    const body: unknown = await request.json().catch(() => null);
    return NextResponse.json({ data: await saveFeaturedAdmin(actor, body) }, { status: 201, headers });
  } catch (error) { return fail(error); }
}

export async function DELETE(request: Request): Promise<Response> {
  if (getBackendMode() === "legacy") return new Response(null, { status: 404 });
  try {
    requireSameOrigin(request);
    const actor = await getAuthenticatedApplicationUser(request);
    const id = new URL(request.url).searchParams.get("id") ?? "";
    return NextResponse.json({ data: await removeFeaturedAdmin(actor, id) }, { headers });
  } catch (error) { return fail(error); }
}
