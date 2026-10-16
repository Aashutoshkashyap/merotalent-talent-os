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
  : reply({ error: cause instanceof NeonSessionUnavailable ? "AUTH_UNAVAILABLE" : "BOOKINGS_UNAVAILABLE" }, 503);

export async function GET(request: Request) {
  if (getBackendMode() !== "neon-staging") return new Response(null, { status: 404 });
  try {
    const actor = await getAuthenticatedApplicationUser(request);
    requireSuperAdmin(actor);
    const rows = await queryRows(`SELECT b.id,b.mentor_id,b.student_id,b.scheduled_start,b.scheduled_end,
      b.status,b.payment_status,b.amount::float AS amount,b.currency,b.created_at,
      jsonb_build_object('profiles',jsonb_build_object('full_name',mp.full_name)) AS mentors,
      jsonb_build_object('email',sp.email,'full_name',sp.full_name) AS students
      FROM public.mentor_bookings b JOIN public.mentors m ON m.id=b.mentor_id
      LEFT JOIN public.profiles mp ON mp.user_id=m.user_id
      LEFT JOIN public.profiles sp ON sp.user_id=b.student_id
      WHERE b.deleted_at IS NULL AND EXISTS (
        SELECT 1 FROM public.profiles p JOIN public.user_roles ur ON ur.user_id=p.user_id
        WHERE p.user_id=$1::uuid AND p.account_status='active' AND p.deleted_at IS NULL
          AND ur.role IN ('admin','super_admin'))
      ORDER BY b.scheduled_start DESC LIMIT 1000`, [actor.userId]);
    return reply({ data: rows });
  } catch (cause) { return fail(cause); }
}

export async function PATCH(request: Request) {
  if (getBackendMode() !== "neon-staging") return new Response(null, { status: 404 });
  try {
    requireSameOrigin(request);
    const actor = await getAuthenticatedApplicationUser(request);
    requireSuperAdmin(actor);
    const raw: unknown = await request.json().catch(() => null);
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return reply({ error: "INVALID_BOOKING_UPDATE" }, 400);
    const value = raw as Record<string, unknown>;
    if (Object.keys(value).length !== 2 || typeof value.id !== "string" || !uuid.test(value.id) ||
        typeof value.status !== "string" || !["declined", "cancelled", "completed", "no_show"].includes(value.status))
      return reply({ error: "INVALID_BOOKING_UPDATE" }, 400);
    const updated = await withTransaction(async client => {
      const row = (await client.query<{ id: string; status: string }>(`
        UPDATE public.mentor_bookings b SET status=$3,updated_at=now()
        WHERE b.id=$2::uuid AND b.deleted_at IS NULL AND EXISTS (
          SELECT 1 FROM public.profiles p JOIN public.user_roles ur ON ur.user_id=p.user_id
          WHERE p.user_id=$1::uuid AND p.account_status='active' AND p.deleted_at IS NULL
            AND ur.role IN ('admin','super_admin'))
          AND (($3='declined' AND b.status='pending' AND b.payment_status IN ('pending','failed'))
            OR ($3='cancelled' AND b.status IN ('pending','confirmed') AND b.payment_status IN ('pending','failed','not_required'))
            OR ($3='completed' AND b.status='confirmed' AND b.scheduled_end<=now()
              AND b.payment_status IN ('success','not_required'))
            OR ($3='no_show' AND b.status='confirmed' AND b.scheduled_end<=now()
              AND b.payment_status IN ('success','not_required')))
        RETURNING b.id,b.status`, [actor.userId, value.id, value.status])).rows[0];
      if (!row) throw new NeonAuthorizationError(409, "BOOKING_TRANSITION_DENIED", "Booking transition unavailable.");
      await client.query(`INSERT INTO public.audit_logs(actor_user_id,action,entity_type,entity_id,metadata)
        VALUES ($1::uuid,'UPDATE_MENTOR_BOOKING_STATUS','mentor_bookings',$2::text,jsonb_build_object('status',$3::text))`,
      [actor.userId, row.id, row.status]);
      return row;
    });
    return reply({ data: updated });
  } catch (cause) { return fail(cause); }
}
