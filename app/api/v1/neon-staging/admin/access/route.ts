import { NextResponse } from "next/server";
import { getBackendMode } from "@/lib/server/backend-mode";
import { assignNeonModuleAccess, listNeonAssignableEntities, listNeonUserAccess,
  revokeNeonAccess, type AssignmentInput, type ManagedModule } from "@/lib/server/neon-admin-access";
import { NeonAuthorizationError } from "@/lib/server/neon-authorization";
import { getAuthenticatedApplicationUser, NeonSessionUnavailable, requireSameOrigin } from "@/lib/server/neon-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };
const modules = new Set(["college", "jobs", "mentor", "events"]);
const unavailable = () => new Response(null, { status: 404 });
const errorResponse = (error: unknown) => NextResponse.json({ error:
  error instanceof NeonAuthorizationError ? error.code
    : error instanceof NeonSessionUnavailable ? "AUTH_UNAVAILABLE" : "ACCESS_UNAVAILABLE" },
{ status: error instanceof NeonAuthorizationError ? error.status : 503, headers });

export async function GET(request: Request) {
  if (getBackendMode() === "legacy") return unavailable();
  try {
    const actor = await getAuthenticatedApplicationUser(request);
    const url = new URL(request.url);
    const mode = url.searchParams.get("mode");
    if (mode === "entities") {
      const moduleKey = url.searchParams.get("module");
      if (!moduleKey || !modules.has(moduleKey)) return NextResponse.json({ error: "INVALID_MODULE" }, { status: 400, headers });
      const data = await listNeonAssignableEntities(actor, moduleKey as ManagedModule,
        url.searchParams.get("search") ?? "");
      return NextResponse.json({ data }, { headers });
    }
    if (mode === "user") {
      const userId = url.searchParams.get("userId") ?? "";
      return NextResponse.json({ data: await listNeonUserAccess(actor, userId) }, { headers });
    }
    return NextResponse.json({ error: "INVALID_ACCESS_QUERY" }, { status: 400, headers });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  if (getBackendMode() === "legacy") return unavailable();
  try {
    requireSameOrigin(request);
    const actor = await getAuthenticatedApplicationUser(request);
    const body: unknown = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body) ||
      Object.keys(body).some(key => !["userId","module","entityId","startAt","expiresAt",
        "amount","transactionReference","note","idempotencyKey"].includes(key))) {
      return NextResponse.json({ error: "INVALID_ASSIGNMENT" }, { status: 400, headers });
    }
    const input = body as Record<string, unknown>;
    if (typeof input.userId !== "string" || typeof input.module !== "string" ||
      typeof input.entityId !== "string" || typeof input.startAt !== "string" ||
      typeof input.expiresAt !== "string" || typeof input.amount !== "number" ||
      typeof input.idempotencyKey !== "string" ||
      (input.note !== undefined && typeof input.note !== "string") ||
      (input.transactionReference !== undefined && typeof input.transactionReference !== "string")) {
      return NextResponse.json({ error: "INVALID_ASSIGNMENT" }, { status: 400, headers });
    }
    const data = await assignNeonModuleAccess(actor, input as unknown as AssignmentInput);
    return NextResponse.json({ data }, { status: data.duplicate ? 200 : 201, headers });
  } catch (error) { return errorResponse(error); }
}

export async function DELETE(request: Request) {
  if (getBackendMode() === "legacy") return unavailable();
  try {
    requireSameOrigin(request);
    const actor = await getAuthenticatedApplicationUser(request);
    const body: unknown = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body) ||
      Object.keys(body).length !== 3 || !("userId" in body) || !("kind" in body) || !("id" in body) ||
      typeof body.userId !== "string" || typeof body.id !== "string" ||
      (body.kind !== "scope" && body.kind !== "capability")) {
      return NextResponse.json({ error: "INVALID_REVOCATION" }, { status: 400, headers });
    }
    const data = await revokeNeonAccess(actor, { userId: body.userId, kind: body.kind, id: body.id });
    return NextResponse.json({ data }, { headers });
  } catch (error) { return errorResponse(error); }
}
