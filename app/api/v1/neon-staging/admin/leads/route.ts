import { NextResponse } from "next/server";
import { getBackendMode } from "@/lib/server/backend-mode";
import { queryRows, withTransaction } from "@/lib/server/db";
import { NeonAuthorizationError, requireSuperAdmin } from "@/lib/server/neon-authorization";
import { getAuthenticatedApplicationUser, NeonSessionUnavailable, requireSameOrigin } from "@/lib/server/neon-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const headers = { "Cache-Control": "private, no-store" };
const reply = (data: unknown, status = 200) => NextResponse.json(data, { status, headers });
const fail = (cause: unknown) => cause instanceof NeonAuthorizationError ? reply({ error: cause.code }, cause.status)
  : reply({ error: cause instanceof NeonSessionUnavailable ? "AUTH_UNAVAILABLE" : "LEADS_UNAVAILABLE" }, 503);

export async function GET(request: Request) {
  if (getBackendMode() === "legacy") return new Response(null, { status: 404 });
  try {
    const actor = await getAuthenticatedApplicationUser(request);
    requireSuperAdmin(actor);
    const rows = await queryRows(`SELECT l.id,l.source_type,l.source_id,l.owner_user_id,l.organization_type,
      l.applicant_user_id,l.status,l.payload,l.created_at,p.email AS applicant_email,
      p.full_name AS applicant_name
      FROM public.leads l LEFT JOIN public.profiles p ON p.user_id=l.applicant_user_id
      WHERE l.deleted_at IS NULL AND EXISTS (
        SELECT 1 FROM public.profiles admin_profile
        JOIN public.user_roles ur ON ur.user_id=admin_profile.user_id
        WHERE admin_profile.user_id=$1::uuid AND admin_profile.account_status='active'
          AND admin_profile.deleted_at IS NULL AND ur.role IN ('admin','super_admin'))
      ORDER BY l.created_at DESC LIMIT 1000`, [actor.userId]);
    return reply({ data: rows });
  } catch (cause) { return fail(cause); }
}

export async function PATCH(request: Request) {
  if (getBackendMode() === "legacy") return new Response(null, { status: 404 });
  try {
    requireSameOrigin(request);
    const actor = await getAuthenticatedApplicationUser(request);
    requireSuperAdmin(actor);
    const raw: unknown = await request.json().catch(() => null);
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return reply({ error: "INVALID_LEAD_UPDATE" }, 400);
    const value = raw as Record<string, unknown>;
    if (Object.keys(value).length !== 2 || !Object.hasOwn(value, "id") || !Object.hasOwn(value, "status") ||
        typeof value.id !== "string" || !uuid.test(value.id) ||
        !["new", "viewed", "contacted", "qualified", "converted", "closed"].includes(String(value.status)))
      return reply({ error: "INVALID_LEAD_UPDATE" }, 400);
    const updated = await withTransaction(async client => {
      const row = (await client.query<{ id: string; status: string }>(`
        UPDATE public.leads SET status=$3,updated_at=now()
        WHERE id=$2::uuid AND deleted_at IS NULL AND EXISTS (
          SELECT 1 FROM public.profiles p JOIN public.user_roles ur ON ur.user_id=p.user_id
          WHERE p.user_id=$1::uuid AND p.account_status='active' AND p.deleted_at IS NULL
            AND ur.role IN ('admin','super_admin')) RETURNING id,status`,
      [actor.userId, value.id, value.status])).rows[0];
      if (!row) throw new NeonAuthorizationError(404, "LEAD_NOT_FOUND_OR_DENIED", "Lead unavailable.");
      await client.query(`INSERT INTO public.audit_logs(actor_user_id,action,entity_type,entity_id,metadata)
        VALUES ($1::uuid,'UPDATE_LEAD_STATUS','leads',$2::text,jsonb_build_object('status',$3::text))`,
      [actor.userId, row.id, row.status]);
      return row;
    });
    return reply({ data: updated });
  } catch (cause) { return fail(cause); }
}
