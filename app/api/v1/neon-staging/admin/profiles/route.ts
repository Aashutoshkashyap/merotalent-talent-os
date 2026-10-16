import { NextResponse } from "next/server";
import { getBackendMode } from "@/lib/server/backend-mode";
import { loadNeonDirectoryProfiles } from "@/lib/server/neon-admin-directory";
import { NeonAuthorizationError } from "@/lib/server/neon-authorization";
import { getAuthenticatedApplicationUser, requireSameOrigin } from "@/lib/server/neon-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (getBackendMode() !== "neon-staging") return new Response(null, { status: 404 });
  const headers = { "Cache-Control": "private, no-store" };
  try {
    requireSameOrigin(request);
    const actor = await getAuthenticatedApplicationUser(request);
    const body: unknown = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).length !== 1 || !("ids" in body)) {
      throw new NeonAuthorizationError(400, "INVALID_PROFILE_IDS", "Provide only the requested profile IDs.");
    }
    return NextResponse.json({ data: await loadNeonDirectoryProfiles(actor, body.ids) }, { headers });
  } catch (error) { return NextResponse.json({ error: error instanceof NeonAuthorizationError ? error.code : "DIRECTORY_UNAVAILABLE" },
    { status: error instanceof NeonAuthorizationError ? error.status : 503, headers }); }
}
