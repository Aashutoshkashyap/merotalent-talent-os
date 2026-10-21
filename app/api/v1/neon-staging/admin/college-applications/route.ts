import { NextResponse } from "next/server";
import { getBackendMode } from "@/lib/server/backend-mode";
import { queryRows, withTransaction } from "@/lib/server/db";
import { NeonAuthorizationError, requireSuperAdmin } from "@/lib/server/neon-authorization";
import { getAuthenticatedApplicationUser, NeonSessionUnavailable, requireSameOrigin } from "@/lib/server/neon-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const statuses = new Set(["submitted", "reviewing", "contacted", "accepted", "rejected", "withdrawn"]);
const headers = { "Cache-Control": "private, no-store" };
const reply = (data: unknown, status = 200) => NextResponse.json(data, { status, headers });
const fail = (cause: unknown) => cause instanceof NeonAuthorizationError ? reply({ error: cause.code }, cause.status)
  : reply({ error: cause instanceof NeonSessionUnavailable ? "AUTH_UNAVAILABLE" : "APPLICATIONS_UNAVAILABLE" }, 503);

export async function GET(request: Request) {
  if (getBackendMode() === "legacy") return new Response(null, { status: 404 });
  try {
    const actor = await getAuthenticatedApplicationUser(request);
    requireSuperAdmin(actor);
    const rows = await queryRows(`SELECT a.id,a.institute_id,a.applicant_id,a.full_name,a.email,a.phone,
      a.whatsapp_number,a.guest_email_verified_at,a.guest_whatsapp_verified_at,
      a.program_interest,a.intake,a.status,a.submitted_at,a.message,a.form_data,
      jsonb_build_object('name',i.name) AS institutes
      FROM public.college_applications a
      JOIN public.institutes i ON i.id=a.institute_id
      WHERE a.deleted_at IS NULL AND EXISTS (
        SELECT 1 FROM public.profiles p JOIN public.user_roles ur ON ur.user_id=p.user_id
        WHERE p.user_id=$1::uuid AND p.account_status='active' AND p.deleted_at IS NULL
          AND ur.role IN ('admin','super_admin'))
      ORDER BY a.submitted_at DESC LIMIT 1000`, [actor.userId]);
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
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return reply({ error: "INVALID_APPLICATION_UPDATE" }, 400);
    const value = raw as Record<string, unknown>;
    if (Object.keys(value).length !== 2 || typeof value.id !== "string" || !uuid.test(value.id) ||
        typeof value.status !== "string" || !statuses.has(value.status))
      return reply({ error: "INVALID_APPLICATION_UPDATE" }, 400);
    const updated = await withTransaction(async client => {
      const row = (await client.query<{ id: string; status: string }>(`
        UPDATE public.college_applications SET status=$3,updated_at=now()
        WHERE id=$2::uuid AND deleted_at IS NULL AND EXISTS (
          SELECT 1 FROM public.profiles p JOIN public.user_roles ur ON ur.user_id=p.user_id
          WHERE p.user_id=$1::uuid AND p.account_status='active' AND p.deleted_at IS NULL
            AND ur.role IN ('admin','super_admin')) RETURNING id,status`,
      [actor.userId, value.id, value.status])).rows[0];
      if (!row) throw new NeonAuthorizationError(404, "APPLICATION_NOT_FOUND_OR_DENIED", "Application unavailable.");
      await client.query(`INSERT INTO public.audit_logs(actor_user_id,action,entity_type,entity_id,metadata)
        VALUES ($1::uuid,'UPDATE_COLLEGE_APPLICATION_STATUS','college_applications',$2::text,jsonb_build_object('status',$3::text))`,
      [actor.userId, row.id, row.status]);
      return row;
    });
    return reply({ data: updated });
  } catch (cause) { return fail(cause); }
}
