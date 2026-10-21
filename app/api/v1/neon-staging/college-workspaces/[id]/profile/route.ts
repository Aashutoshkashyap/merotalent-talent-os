import { NextResponse } from "next/server";
import { getBackendMode } from "@/lib/server/backend-mode";
import { withTransaction } from "@/lib/server/db";
import { NeonAuthorizationError } from "@/lib/server/neon-authorization";
import { getAuthenticatedApplicationUser, NeonSessionUnavailable, requireSameOrigin } from "@/lib/server/neon-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fields = ["name", "short_name", "type", "location", "map_location", "website", "description",
  "contact_email", "contact_phone", "youtube_url", "admission_status", "chairperson_name",
  "chairperson_designation", "chairperson_message", "principal_name", "principal_designation", "principal_message"] as const;
const noStore = { "Cache-Control": "private, no-store" };
const error = (code: string, status: number) => NextResponse.json({ error: code }, { status, headers: noStore });

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    if (getBackendMode() === "legacy") return new Response(null, { status: 404 });
    requireSameOrigin(request);
    const actor = await getAuthenticatedApplicationUser(request);
    const { id } = await context.params;
    if (!uuid.test(id)) return error("INVALID_COLLEGE", 400);
    const body: unknown = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) return error("INVALID_PROFILE", 400);
    const input = body as Record<string, unknown>;
    if (Object.keys(input).some(key => !fields.includes(key as typeof fields[number])) ||
        fields.some(key => input[key] !== undefined && input[key] !== null && typeof input[key] !== "string")) return error("INVALID_PROFILE", 400);
    const values = Object.fromEntries(fields.map(key => [key, typeof input[key] === "string" ? input[key].trim() : null]));
    const name = values.name as string | null;
    if (!name || name.length < 2 || name.length > 180 ||
        fields.some(key => typeof values[key] === "string" && (values[key] as string).length >
          (["description", "chairperson_message", "principal_message"].includes(key) ? 10_000 : 500))) return error("INVALID_PROFILE", 400);
    if (values.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.contact_email as string)) return error("INVALID_EMAIL", 400);
    for (const key of ["youtube_url", "website", "map_location"] as const) {
      const value = values[key] as string | null;
      if (!value) continue;
      try {
        const url = new URL(value);
        if (!["https:", "http:"].includes(url.protocol)) return error("INVALID_URL", 400);
        if (key === "youtube_url" && !["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "youtube-nocookie.com", "www.youtube-nocookie.com"].includes(url.hostname.toLowerCase())) return error("INVALID_YOUTUBE_URL", 400);
      } catch { return error("INVALID_URL", 400); }
    }
    if (values.admission_status && !["open", "closed", "upcoming"].includes(values.admission_status as string)) return error("INVALID_ADMISSION_STATUS", 400);
    const saved = await withTransaction(async client => {
      const result = await client.query<{ id: string; updated_at: string }>(`
        UPDATE public.institutes i SET
          name=$4,short_name=NULLIF($5,''),type=NULLIF($6,''),location=NULLIF($7,''),
          map_location=NULLIF($8,''),website=NULLIF($9,''),description=NULLIF($10,''),
          contact_email=NULLIF($11,''),contact_phone=NULLIF($12,''),youtube_url=NULLIF($13,''),
          admission_status=COALESCE(NULLIF($14,''),i.admission_status),
          chairperson_name=NULLIF($15,''),chairperson_designation=NULLIF($16,''),chairperson_message=NULLIF($17,''),
          principal_name=NULLIF($18,''),principal_designation=NULLIF($19,''),principal_message=NULLIF($20,''),updated_at=now()
        WHERE i.id=$3::uuid AND i.deleted_at IS NULL AND EXISTS (
          SELECT 1 FROM public.profiles p
          JOIN public.neon_application_accounts account ON account.legacy_user_id=p.user_id AND account.status='active'
          JOIN public.neon_identity_links link ON link.application_account_id=account.id AND link.status='verified'
          WHERE p.user_id=$1::uuid AND p.account_status='active' AND p.deleted_at IS NULL
            AND link.neon_auth_user_id=$2::uuid
            AND (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id=p.user_id
              AND ur.role IN ('admin','super_admin')) OR (
              EXISTS (SELECT 1 FROM public.entity_admin_assignments a
                JOIN public.user_module_capabilities umc ON umc.id=a.user_capability_id
                JOIN public.module_capabilities mc ON mc.id=umc.capability_id
                WHERE a.user_id=p.user_id AND a.entity_type='college' AND a.entity_id=i.id
                  AND a.status='active' AND umc.status='active' AND mc.module_key='college' AND mc.is_active
                  AND (umc.expires_at IS NULL OR umc.expires_at>now()))
              AND EXISTS (SELECT 1 FROM public.module_entitlements e
                LEFT JOIN public.packages plan ON plan.id=e.package_id
                WHERE e.user_id=p.user_id AND e.module_key='college' AND e.entity_type='college'
                  AND e.entity_id=i.id AND e.status='active' AND e.start_at<=now()
                  AND (e.expires_at IS NULL OR e.expires_at>now())
                  AND (e.features->>'profile_editing'='true' OR plan.features->>'profile_editing'='true'
                    OR EXISTS (SELECT 1 FROM public.entity_feature_grants g
                      WHERE g.user_id=p.user_id AND g.module_key='college' AND g.entity_type='college'
                        AND g.entity_id=i.id AND g.feature_key='profile_editing' AND g.status='active')))
            ))
        ) RETURNING i.id,i.updated_at`, [actor.userId, actor.neonAuthUserId, id, ...fields.map(key => values[key])]);
      if (!result.rows[0]) throw new NeonAuthorizationError(403, "COLLEGE_EDIT_DENIED", "College edit access is unavailable.");
      await client.query(`INSERT INTO public.audit_logs(actor_user_id,action,entity_type,entity_id,metadata)
        VALUES ($1::uuid,'update_college_profile','college',$2::text,jsonb_build_object('fields',$3::text[]))`,
      [actor.userId, id, Object.keys(input)]);
      return result.rows[0];
    });
    return NextResponse.json({ data: saved }, { headers: noStore });
  } catch (cause) {
    if (cause instanceof NeonAuthorizationError) return error(cause.code, cause.status);
    if (cause instanceof NeonSessionUnavailable) return error("AUTH_UNAVAILABLE", 503);
    return error("PROFILE_SAVE_FAILED", 503);
  }
}
