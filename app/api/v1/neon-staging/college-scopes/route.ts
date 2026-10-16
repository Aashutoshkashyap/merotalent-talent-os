import { NextResponse } from "next/server";
import { getBackendMode } from "@/lib/server/backend-mode";
import { queryRows } from "@/lib/server/db";
import { NeonAuthorizationError } from "@/lib/server/neon-authorization";
import { NeonCollegeScopes, type ScopeInput } from "@/lib/server/neon-college-scopes";
import { getAuthenticatedApplicationUser, NeonSessionUnavailable, requireSameOrigin } from "@/lib/server/neon-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const service = new NeonCollegeScopes();
const staging = () => { try { return getBackendMode() === "neon-staging"; } catch { return false; } };
const reply = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
const failure = (error: unknown) => error instanceof NeonAuthorizationError
  ? reply({ error: error.code }, error.status)
  : reply({ error: error instanceof NeonSessionUnavailable ? "AUTH_UNAVAILABLE" : "COLLEGE_SCOPE_UNAVAILABLE" }, 503);

export async function GET(request: Request): Promise<Response> {
  if (!staging()) return new Response(null, { status: 404 });
  try {
    const actor = await getAuthenticatedApplicationUser(request);
    const admin = new URL(request.url).searchParams.get("admin") === "true";
    if (admin && !actor.platformAdmin) throw new NeonAuthorizationError(403, "ADMIN_REQUIRED", "Super Admin access required.");
    const rows = await queryRows<Record<string, unknown>>(`
      SELECT r.id,r.user_id,r.module_key,r.entity_type,r.entity_id,r.request_kind,r.request_data,
        r.reason,r.status,r.payment_status,r.decision_note,r.created_at,r.assignment_id,
        p.full_name AS applicant_name,p.email AS applicant_email,
        COALESCE(i.name,r.request_data->>'name','College name unavailable') AS college_name
      FROM public.entity_scope_requests r
      JOIN public.profiles p ON p.user_id=r.user_id
      LEFT JOIN public.institutes i ON i.id=COALESCE(r.entity_id,
        CASE WHEN r.request_data->>'approved_college_id' ~ '^[0-9a-f-]{36}$'
          THEN (r.request_data->>'approved_college_id')::uuid ELSE NULL END)
      WHERE r.module_key='college' AND r.entity_type='college'
        AND ($1::boolean OR r.user_id=$2::uuid)
      ORDER BY r.created_at DESC LIMIT 500`, [admin, actor.userId]);
    return reply({ data: rows });
  } catch (error) { return failure(error); }
}

export async function POST(request: Request): Promise<Response> {
  if (!staging()) return new Response(null, { status: 404 });
  try {
    requireSameOrigin(request);
    const actor = await getAuthenticatedApplicationUser(request);
    const body: unknown = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) return reply({ error: "INVALID_REQUEST" }, 400);
    const value = body as Record<string, unknown>;
    if (Object.keys(value).some(key => !["kind", "collegeId", "name", "phone", "email", "location", "description", "reason"].includes(key)) ||
      !["claim", "create"].includes(String(value.kind)) || typeof value.reason !== "string" ||
      ["collegeId", "name", "phone", "email", "location", "description"].some(key => value[key] !== undefined && typeof value[key] !== "string")) {
      return reply({ error: "INVALID_REQUEST" }, 400);
    }
    const row = await service.submit(actor, value as ScopeInput);
    return reply({ data: row }, 201);
  } catch (error) { return failure(error); }
}

export async function PATCH(request: Request): Promise<Response> {
  if (!staging()) return new Response(null, { status: 404 });
  try {
    requireSameOrigin(request);
    const actor = await getAuthenticatedApplicationUser(request);
    if (!actor.platformAdmin) throw new NeonAuthorizationError(403, "ADMIN_REQUIRED", "Super Admin access required.");
    const body: unknown = await request.json().catch(() => null);
    const value = body && typeof body === "object" && !Array.isArray(body) ? body as Record<string, unknown> : {};
    if (Object.keys(value).some(key => !["requestId", "approve", "note"].includes(key)) ||
      typeof value.requestId !== "string" || !uuid.test(value.requestId) || typeof value.approve !== "boolean" ||
      (value.note !== undefined && typeof value.note !== "string")) return reply({ error: "INVALID_DECISION" }, 400);
    const row = await service.decide(actor, value.requestId, value.approve, value.note as string | undefined);
    return reply({ data: row });
  } catch (error) { return failure(error); }
}
