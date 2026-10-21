import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getBackendMode } from "@/lib/server/backend-mode";
import { NeonAuthorizationError } from "@/lib/server/neon-authorization";
import { getAuthenticatedApplicationUser, requireSameOrigin } from "@/lib/server/neon-session";
import { NeonRoleWorkspaces } from "@/lib/server/neon-role-workspaces";
import { AdminResourceValidationError } from "@/lib/admin/admin-resource-service";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const service = new NeonRoleWorkspaces();
const reply = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
const failure = (error: unknown) => error instanceof NeonAuthorizationError
  ? reply({ error: error.code, message: error.message }, error.status)
  : error instanceof AdminResourceValidationError || error instanceof ZodError
    ? reply({ error: "INVALID_FIELDS", message: "Review the workspace form fields." }, 400)
    : reply({ error: "WORKSPACE_UNAVAILABLE" }, 503);

export async function GET(request: Request) {
  if (getBackendMode() === "legacy") return new Response(null, { status: 404 });
  try {
    const actor = await getAuthenticatedApplicationUser(request), params = new URL(request.url).searchParams;
    const role = params.get("role");
    if (role === "events") return reply({ data: await service.events(actor, params.get("entityId") ?? undefined) });
    if (role !== "company" && role !== "mentor") return reply({ error: "INVALID_WORKSPACE" }, 400);
    if (params.get("operation") === "applicants") {
      if (role !== "company") return reply({ error: "INVALID_WORKSPACE" }, 400);
      return reply({ data: await service.applicants(actor, params.get("entityId") ?? "", Number(params.get("offset") || "0")) });
    }
    return reply({ data: await service.snapshot(actor, role, params.get("entityId") ?? undefined) });
  } catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  if (getBackendMode() === "legacy") return new Response(null, { status: 404 });
  try {
    requireSameOrigin(request); const actor = await getAuthenticatedApplicationUser(request);
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body) || !["job", "event", "mentor", "company", "mentor-service"].includes(body.resource) ||
      (body.id !== undefined && typeof body.id !== "string") || Object.keys(body).some(key => !["resource", "id", "payload"].includes(key)))
      return reply({ error: "INVALID_RESOURCE" }, 400);
    return reply({ data: await service.save(actor, body.resource, body.payload, body.id) });
  } catch (error) { return failure(error); }
}
export async function PATCH(request: Request) {
  if (getBackendMode() === "legacy") return new Response(null, { status: 404 });
  try {
    requireSameOrigin(request); const actor = await getAuthenticatedApplicationUser(request);
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body) || !["event_registration", "mentor_booking"].includes(body.workflow) ||
      typeof body.id !== "string" || typeof body.status !== "string" || Object.keys(body).some(key => !["workflow", "id", "status"].includes(key)))
      return reply({ error: "INVALID_WORKFLOW" }, 400);
    return reply({ data: await service.transition(actor, body.workflow, body.id, body.status) });
  } catch (error) { return failure(error); }
}
