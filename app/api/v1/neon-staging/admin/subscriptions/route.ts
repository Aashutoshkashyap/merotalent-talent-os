import { NextResponse } from "next/server";
import { getBackendMode } from "@/lib/server/backend-mode";
import { changeNeonDefaultFreeTier, listNeonAdminSubscriptions } from "@/lib/server/neon-admin-payments";
import { NeonAuthorizationError, requireSuperAdmin } from "@/lib/server/neon-authorization";
import { getAuthenticatedApplicationUser, NeonSessionUnavailable, requireSameOrigin } from "@/lib/server/neon-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };
const failure = (error: unknown) => NextResponse.json({ error: error instanceof NeonAuthorizationError
  ? error.code : error instanceof NeonSessionUnavailable ? "AUTH_UNAVAILABLE" : "SUBSCRIPTIONS_UNAVAILABLE",
  message: error instanceof NeonAuthorizationError ? error.message : "Subscriptions are temporarily unavailable." },
{ status: error instanceof NeonAuthorizationError ? error.status : 503, headers });

export async function GET(request: Request) {
  if (getBackendMode() !== "neon-staging") return new Response(null, { status: 404 });
  try {
    const actor = await getAuthenticatedApplicationUser(request);
    requireSuperAdmin(actor);
    return NextResponse.json({ data: await listNeonAdminSubscriptions(actor, new URL(request.url).searchParams) }, { headers });
  } catch (error) { return failure(error); }
}
async function change(request: Request, action: "grant" | "revoke") {
  if (getBackendMode() !== "neon-staging") return new Response(null, { status: 404 });
  try {
    requireSameOrigin(request);
    const actor = await getAuthenticatedApplicationUser(request);
    requireSuperAdmin(actor);
    const body: unknown = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new NeonAuthorizationError(400, "INVALID_FREE_SCOPE", "Select a valid subscription scope.");
    const input = body as Record<string, unknown>;
    if (Object.keys(input).some(key => !["userId", "module", "entityType", "entityId", "reason"].includes(key)) ||
      typeof input.userId !== "string" || typeof input.module !== "string" || typeof input.entityType !== "string" ||
      !(typeof input.entityId === "string" || input.entityId === null) ||
      (input.reason !== undefined && typeof input.reason !== "string")) {
      throw new NeonAuthorizationError(400, "INVALID_FREE_SCOPE", "Select a valid subscription scope.");
    }
    return NextResponse.json({ data: await changeNeonDefaultFreeTier(actor, { userId: input.userId,
      module: input.module, entityType: input.entityType, entityId: input.entityId as string | null,
      reason: input.reason as string | undefined }, action) }, { headers });
  } catch (error) { return failure(error); }
}
export const POST = (request: Request) => change(request, "grant");
export const DELETE = (request: Request) => change(request, "revoke");
