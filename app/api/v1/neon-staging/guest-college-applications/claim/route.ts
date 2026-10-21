import { NextResponse } from "next/server";
import { getBackendMode } from "@/lib/server/backend-mode";
import { GuestVerificationError } from "@/lib/server/guest-college-verification";
import { NeonAuthorizationError } from "@/lib/server/neon-authorization";
import { claimNeonGuestCollegeApplications } from "@/lib/server/neon-guest-college-verification";
import { getAuthenticatedApplicationUser, managedSessionVerifier, requireSameOrigin } from "@/lib/server/neon-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const reply = (value: unknown, status = 200) => NextResponse.json(value, { status,
  headers: { "Cache-Control": "private, no-store" } });

export async function POST(request: Request) {
  if (getBackendMode() === "legacy") return new Response(null, { status: 404 });
  try {
    requireSameOrigin(request);
    const raw = await request.text();
    if (Buffer.byteLength(raw, "utf8") > 1024) return reply({ error: "PAYLOAD_TOO_LARGE" }, 413);
    const body: unknown = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body) ||
        Object.keys(body).some(key => key !== "guestToken") || typeof (body as { guestToken?: unknown }).guestToken !== "string") {
      return reply({ error: "INVALID_GUEST_TOKEN" }, 422);
    }
    const session = await managedSessionVerifier.verify(request);
    const user = session?.user as { email?: unknown; emailVerified?: unknown } | undefined;
    if (!session || user?.emailVerified !== true || typeof user.email !== "string") {
      return reply({ error: "VERIFIED_EMAIL_REQUIRED" }, 403);
    }
    const actor = await getAuthenticatedApplicationUser(request, { verify: async () => session });
    const claimed = await claimNeonGuestCollegeApplications(actor, (body as { guestToken: string }).guestToken, user.email);
    return reply({ data: claimed });
  } catch (error) {
    if (error instanceof NeonAuthorizationError || error instanceof GuestVerificationError) return reply({ error: error.code }, error.status);
    if (error instanceof SyntaxError) return reply({ error: "INVALID_JSON" }, 400);
    return reply({ error: "GUEST_APPLICATION_CLAIM_UNAVAILABLE" }, 503);
  }
}
