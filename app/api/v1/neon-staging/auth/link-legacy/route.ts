/** Isolated-staging proof of concept; never enabled in a production deployment. */
import { NextResponse } from "next/server";
import { getBackendMode } from "@/lib/server/backend-mode";
import { NeonAuthorizationError } from "@/lib/server/neon-authorization";
import { NeonSessionUnavailable, requireSameOrigin } from "@/lib/server/neon-session";
import { linkVerifiedLegacyIdentity } from "@/lib/server/neon-identity-link";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const headers = { "cache-control": "private, no-store" };

export async function POST(request: Request) {
  if (getBackendMode() === "legacy") return new Response(null, { status: 404 });
  try {
    requireSameOrigin(request);
    const length = Number(request.headers.get("content-length"));
    if (!Number.isSafeInteger(length) || length < 1 || length > 12_000) {
      return NextResponse.json({ error: "INVALID_PROOF_LENGTH" }, { status: 413, headers });
    }
    const body = await request.json().catch(() => null);
    if (!body || typeof body.sourceAccessToken !== "string" ||
        (body.dryRun !== undefined && typeof body.dryRun !== "boolean") ||
        Object.keys(body).some((key) => key !== "sourceAccessToken" && key !== "dryRun")) {
      return NextResponse.json({ error: "INVALID_PROOF" }, { status: 422, headers });
    }
    const result = await linkVerifiedLegacyIdentity(request, body.sourceAccessToken, body.dryRun === true);
    return NextResponse.json({ data: result }, { headers });
  } catch (error) {
    if (error instanceof NeonAuthorizationError) return NextResponse.json({ error: error.code }, { status: error.status, headers });
    if (error instanceof NeonSessionUnavailable) return NextResponse.json({ error: "AUTH_UNAVAILABLE" }, { status: 503, headers });
    return NextResponse.json({ error: "LINK_UNAVAILABLE" }, { status: 503, headers });
  }
}
