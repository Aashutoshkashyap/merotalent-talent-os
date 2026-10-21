import { NextResponse } from "next/server";
import { getBackendMode } from "@/lib/server/backend-mode";
import { queryRows } from "@/lib/server/db";
import { NeonAuthorizationError, requireSuperAdmin } from "@/lib/server/neon-authorization";
import { getAuthenticatedApplicationUser, NeonSessionUnavailable, requireSameOrigin } from "@/lib/server/neon-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fields = "id,name,email,subject,message,status,assigned_to,response,responded_at,created_at";

function stagingOnly(): boolean {
  try { return getBackendMode() !== "legacy"; } catch { return false; }
}
function failure(error: unknown): Response {
  if (error instanceof NeonAuthorizationError) return NextResponse.json({ error: error.code }, { status: error.status });
  if (error instanceof NeonSessionUnavailable) return NextResponse.json({ error: "AUTH_UNAVAILABLE" }, { status: 503 });
  return NextResponse.json({ error: "QUERIES_UNAVAILABLE" }, { status: 503 });
}

export async function GET(request: Request): Promise<Response> {
  if (!stagingOnly()) return new Response(null, { status: 404 });
  try {
    const actor = await getAuthenticatedApplicationUser(request);
    requireSuperAdmin(actor);
    const rows = await queryRows<Record<string, unknown>>(`
      SELECT ${fields} FROM public.contact_queries
      ORDER BY created_at DESC, id DESC LIMIT 1000`);
    return NextResponse.json({ data: rows }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return failure(error); }
}

export async function PATCH(request: Request): Promise<Response> {
  if (!stagingOnly()) return new Response(null, { status: 404 });
  try {
    requireSameOrigin(request);
    const actor = await getAuthenticatedApplicationUser(request);
    requireSuperAdmin(actor);
    const body: unknown = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "INVALID_QUERY_UPDATE" }, { status: 400 });
    }
    const value = body as Record<string, unknown>;
    const id = typeof value.id === "string" ? value.id : "";
    const reply = typeof value.response === "string" ? value.response.trim() : "";
    if (Object.keys(value).some((key) => !["id", "response", "status"].includes(key)) ||
        !uuid.test(id) || !reply || reply.length > 10_000 || !["resolved", "in_progress"].includes(String(value.status))) {
      return NextResponse.json({ error: "INVALID_QUERY_UPDATE" }, { status: 400 });
    }
    const rows = await queryRows<Record<string, unknown>>(`
      UPDATE public.contact_queries SET response = $3, status = $4, responded_at = now()
      WHERE id = $2::uuid AND EXISTS (
        SELECT 1 FROM public.profiles p JOIN public.user_roles ur ON ur.user_id = p.user_id
        WHERE p.user_id = $1::uuid AND p.account_status = 'active' AND p.deleted_at IS NULL
          AND ur.role IN ('admin','super_admin')
      ) RETURNING ${fields}`, [actor.userId, id, reply, value.status]);
    return rows[0] ? NextResponse.json({ data: rows[0] }, { headers: { "Cache-Control": "private, no-store" } })
      : NextResponse.json({ error: "QUERY_NOT_FOUND_OR_ACCESS_DENIED" }, { status: 404 });
  } catch (error) { return failure(error); }
}

export async function DELETE(request: Request): Promise<Response> {
  if (!stagingOnly()) return new Response(null, { status: 404 });
  try {
    requireSameOrigin(request);
    const actor = await getAuthenticatedApplicationUser(request);
    requireSuperAdmin(actor);
    const body: unknown = await request.json().catch(() => null);
    const value = body && typeof body === "object" && !Array.isArray(body) ? body as Record<string, unknown> : {};
    const id = typeof value.id === "string" ? value.id : "";
    if (Object.keys(value).length !== 1 || !uuid.test(id)) {
      return NextResponse.json({ error: "INVALID_QUERY_DELETE" }, { status: 400 });
    }
    const rows = await queryRows<{ id: string }>(`
      DELETE FROM public.contact_queries WHERE id = $2::uuid AND EXISTS (
        SELECT 1 FROM public.profiles p JOIN public.user_roles ur ON ur.user_id = p.user_id
        WHERE p.user_id = $1::uuid AND p.account_status = 'active' AND p.deleted_at IS NULL
          AND ur.role IN ('admin','super_admin')
      ) RETURNING id`, [actor.userId, id]);
    return rows[0] ? NextResponse.json({ data: rows[0] }, { headers: { "Cache-Control": "private, no-store" } })
      : NextResponse.json({ error: "QUERY_NOT_FOUND_OR_ACCESS_DENIED" }, { status: 404 });
  } catch (error) { return failure(error); }
}
