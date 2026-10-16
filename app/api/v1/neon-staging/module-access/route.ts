import { NextResponse } from "next/server";
import { getBackendMode } from "@/lib/server/backend-mode";
import { NeonAuthorizationError } from "@/lib/server/neon-authorization";
import { NeonModuleAccess, type ModuleAccessInput } from "@/lib/server/neon-module-access";
import { getAuthenticatedApplicationUser, requireSameOrigin } from "@/lib/server/neon-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const service = new NeonModuleAccess();
const reply = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
const failure = (error: unknown) => error instanceof NeonAuthorizationError
  ? reply({ error: error.code, message: error.message }, error.status) : reply({ error: "MODULE_ACCESS_UNAVAILABLE" }, 503);
const enabled = () => getBackendMode() === "neon-staging";

export async function GET(request: Request) {
  if (!enabled()) return new Response(null, { status: 404 });
  try {
    const actor = await getAuthenticatedApplicationUser(request);
    const params = new URL(request.url).searchParams;
    const data = params.get("catalog") === "true" ? await service.catalog(actor)
      : await service.history(actor, params.get("admin") === "true");
    return reply({ data });
  } catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  if (!enabled()) return new Response(null, { status: 404 });
  try {
    requireSameOrigin(request);
    const actor = await getAuthenticatedApplicationUser(request);
    const body: unknown = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some(key =>
      !["draftId", "modules", "packageId", "collegeId", "reason", "organization", "proofs"].includes(key)))
      return reply({ error: "INVALID_REQUEST" }, 400);
    return reply({ data: await service.submit(actor, body as ModuleAccessInput) }, 201);
  } catch (error) { return failure(error); }
}

export async function PATCH(request: Request) {
  if (!enabled()) return new Response(null, { status: 404 });
  try {
    requireSameOrigin(request);
    const actor = await getAuthenticatedApplicationUser(request);
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body) || typeof body.requestId !== "string" ||
      typeof body.approve !== "boolean" || (body.note !== undefined && typeof body.note !== "string") ||
      Object.keys(body).some(key => !["requestId", "approve", "note"].includes(key))) return reply({ error: "INVALID_DECISION" }, 400);
    return reply({ data: await service.decide(actor, body.requestId, body.approve, body.note) });
  } catch (error) { return failure(error); }
}

export async function DELETE(request: Request) {
  if (!enabled()) return new Response(null, { status: 404 });
  try {
    requireSameOrigin(request);
    const actor = await getAuthenticatedApplicationUser(request);
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body) || typeof body.requestId !== "string" ||
      Object.keys(body).some(key => key !== "requestId")) return reply({ error: "INVALID_REQUEST" }, 400);
    return reply({ data: await service.cancel(actor, body.requestId) });
  } catch (error) { return failure(error); }
}
