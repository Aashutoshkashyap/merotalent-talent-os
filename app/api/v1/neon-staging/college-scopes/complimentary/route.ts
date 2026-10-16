import { NextResponse } from "next/server";
import { getBackendMode } from "@/lib/server/backend-mode";
import { NeonAuthorizationError } from "@/lib/server/neon-authorization";
import { NeonCollegeScopes } from "@/lib/server/neon-college-scopes";
import { getAuthenticatedApplicationUser, NeonSessionUnavailable, requireSameOrigin } from "@/lib/server/neon-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const service = new NeonCollegeScopes();
const reply = (data: unknown, status = 200) => NextResponse.json(data, { status,
  headers: { "Cache-Control": "private, no-store" } });

export async function POST(request: Request) {
  if (getBackendMode() !== "neon-staging") return new Response(null, { status: 404 });
  try {
    requireSameOrigin(request);
    const actor = await getAuthenticatedApplicationUser(request);
    const raw: unknown = await request.json().catch(() => null);
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return reply({ error: "INVALID_GRANT" }, 400);
    const value = raw as Record<string, unknown>;
    if (Object.keys(value).some(key => !["requestId", "kind"].includes(key)) ||
      typeof value.requestId !== "string" || !["free", "trial"].includes(String(value.kind)))
      return reply({ error: "INVALID_GRANT" }, 400);
    return reply({ data: await service.grantComplimentary(actor, value.requestId, value.kind as "free" | "trial") });
  } catch (cause) {
    if (cause instanceof NeonAuthorizationError) return reply({ error: cause.code }, cause.status);
    return reply({ error: cause instanceof NeonSessionUnavailable ? "AUTH_UNAVAILABLE" : "COLLEGE_GRANT_UNAVAILABLE" }, 503);
  }
}
