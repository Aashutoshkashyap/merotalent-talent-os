import { NextResponse } from "next/server";
import { getBackendMode } from "@/lib/server/backend-mode";
import { queryRows } from "@/lib/server/db";
import { NeonAuthorizationError } from "@/lib/server/neon-authorization";
import { getAuthenticatedApplicationUser, NeonSessionUnavailable } from "@/lib/server/neon-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  try {
    if (getBackendMode() === "legacy") return new Response(null, { status: 404 });
    const actor = await getAuthenticatedApplicationUser(request);
    const [capability] = await queryRows<{ allowed: boolean }>(`
      SELECT EXISTS (SELECT 1 FROM public.user_module_capabilities umc
        JOIN public.module_capabilities mc ON mc.id=umc.capability_id
        WHERE umc.user_id=$1::uuid AND umc.status='active' AND mc.module_key='college' AND mc.is_active
          AND (umc.expires_at IS NULL OR umc.expires_at>now())) AS allowed`, [actor.userId]);
    const workspaces = await queryRows<Record<string, unknown>>(`
      SELECT i.id,i.name,i.short_name,i.description,i.location,i.map_location,i.website,
        i.contact_email,i.contact_phone,i.youtube_url,i.logo_url,i.cover_image_url,i.type,
        i.owner_user_id,i.slug,i.status,i.courses_offered,i.total_seats,i.available_seats,i.admission_status,
        i.chairperson_name,i.chairperson_designation,i.chairperson_message,
        i.principal_name,i.principal_designation,i.principal_message,
        CASE WHEN effective.active AND NOT COALESCE(current_plan.active,false) THEN 'active'
          ELSE s.status END AS subscription_status,
        CASE WHEN effective.active AND NOT COALESCE(current_plan.active,false) THEN 'manual_grant'
          ELSE s.payment_status END AS payment_status,
        CASE WHEN effective.active AND NOT COALESCE(current_plan.active,false) THEN 'Granted access'
          ELSE p.name END AS package_name,
        CASE WHEN effective.applications THEN 'full' ELSE 'none' END AS lead_access_mode,
        CASE WHEN effective.active AND NOT COALESCE(current_plan.active,false) THEN effective.expiry_date
          ELSE s.expiry_date END AS expiry_date,effective.applications AS can_view_applications,
        EXISTS (SELECT 1 FROM public.module_entitlements e
          WHERE e.user_id=$1::uuid AND e.module_key='college' AND e.entity_type='college'
            AND e.entity_id=i.id AND e.status='active' AND e.start_at<=now()
            AND (e.expires_at IS NULL OR e.expires_at>now())) AS subscription_active,
        EXISTS (SELECT 1 FROM public.subscriptions verified
          JOIN public.packages plan ON plan.id=verified.package_id
          WHERE verified.entity_type='college' AND verified.entity_id=i.id
            AND verified.deleted_at IS NULL AND verified.status IN ('active','trialing')
            AND verified.payment_status IN ('success','not_required')
            AND verified.start_date<=now() AND verified.expiry_date>now()
            AND plan.is_active AND plan.deleted_at IS NULL) AS effectively_verified
      FROM public.institutes i
      JOIN public.entity_admin_assignments a ON a.entity_id=i.id AND a.entity_type='college'
        AND a.user_id=$1::uuid AND a.status='active'
      JOIN public.user_module_capabilities umc ON umc.id=a.user_capability_id
        AND umc.user_id=$1::uuid AND umc.status='active'
        AND (umc.expires_at IS NULL OR umc.expires_at>now())
      JOIN public.module_capabilities mc ON mc.id=umc.capability_id AND mc.module_key='college' AND mc.is_active
      LEFT JOIN LATERAL (SELECT * FROM public.subscriptions s
        WHERE s.entity_type='college' AND s.entity_id=i.id AND s.deleted_at IS NULL
        ORDER BY (s.status IN ('active','trialing') AND s.start_date<=now() AND s.expiry_date>now()) DESC,
          s.expiry_date DESC NULLS LAST LIMIT 1) s ON true
      LEFT JOIN public.packages p ON p.id=s.package_id
      LEFT JOIN LATERAL (SELECT s.status IN ('active','trialing')
        AND s.payment_status IN ('success','not_required') AND s.start_date<=now()
        AND s.expiry_date>now() AND p.is_active AND p.deleted_at IS NULL AS active) current_plan ON true
      LEFT JOIN LATERAL (
        SELECT count(*)>0 AS active,CASE WHEN bool_or(e.expires_at IS NULL) THEN NULL
          ELSE max(e.expires_at) END AS expiry_date,COALESCE(bool_or(
          e.features->>'college_applications'='true'
          OR plan.features->>'college_applications'='true'
          OR EXISTS (SELECT 1 FROM public.entity_feature_grants g
            WHERE g.user_id=$1::uuid AND g.module_key='college' AND g.entity_type='college'
              AND g.entity_id=i.id AND g.feature_key='college_applications' AND g.status='active')
        ),false) AS applications
        FROM public.module_entitlements e LEFT JOIN public.packages plan ON plan.id=e.package_id
        WHERE e.user_id=$1::uuid AND e.module_key='college' AND e.entity_type='college'
          AND e.entity_id=i.id AND e.status='active' AND e.start_at<=now()
          AND (e.expires_at IS NULL OR e.expires_at>now())
      ) effective ON true
      WHERE i.deleted_at IS NULL ORDER BY i.name`, [actor.userId]);
    const requests = await queryRows<Record<string, unknown>>(`
      SELECT id,request_kind,status,entity_id,request_data,created_at FROM public.entity_scope_requests
      WHERE user_id=$1::uuid AND module_key='college' ORDER BY created_at DESC LIMIT 10`, [actor.userId]);
    return NextResponse.json({ data: { capability: actor.platformAdmin || !!capability?.allowed, workspaces, requests } },
      { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const status = error instanceof NeonAuthorizationError ? error.status : 503;
    return NextResponse.json({ error: error instanceof NeonAuthorizationError ? error.code
      : error instanceof NeonSessionUnavailable ? "AUTH_UNAVAILABLE" : "WORKSPACE_UNAVAILABLE" }, { status });
  }
}
