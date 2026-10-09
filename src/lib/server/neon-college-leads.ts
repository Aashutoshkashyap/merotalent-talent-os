/** Staging-only college lead read. The access predicate and data read share one SQL snapshot. */
import type { QueryResultRow } from "pg";
import {
  NeonAuthorizationError,
  neonQueryExecutor,
  type NeonActor,
  type NeonQueryExecutor,
} from "./neon-authorization";

export interface NeonCollegeLead {
  id: string;
  institute_id: string;
  applicant_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  program_interest: string | null;
  intake: string | null;
  message: string | null;
  attachments: unknown;
  form_data: unknown;
  status: string;
  submitted_at: string;
  updated_at: string;
}

interface LeadResult extends QueryResultRow {
  exists: boolean;
  allowed: boolean;
  applications: NeonCollegeLead[];
}

/**
 * A copied table's old Supabase RLS does not authenticate a Neon session.
 * Authorize the actor inside the SELECT, so a changed entitlement cannot race
 * a separate application query. A platform admin bypasses the package gate,
 * but not the active-account check.
 */
export async function listManagedCollegeLeads(
  actor: NeonActor,
  instituteId: string,
  db: NeonQueryExecutor = neonQueryExecutor,
): Promise<NeonCollegeLead[] | null> {
  const [result] = await db.query<LeadResult>(`
    WITH target AS (
      SELECT id FROM public.institutes
      WHERE id = $2::uuid AND deleted_at IS NULL
    ), access AS (
      SELECT i.id, EXISTS (
        SELECT 1 FROM public.profiles actor
        WHERE actor.user_id = $1::uuid AND actor.account_status = 'active'
          AND actor.deleted_at IS NULL
          AND EXISTS (
            SELECT 1 FROM public.neon_application_accounts account
            JOIN public.neon_identity_links link ON link.application_account_id = account.id
            WHERE account.legacy_user_id = actor.user_id AND account.status = 'active'
              AND link.neon_auth_user_id = $3::uuid AND link.status = 'verified'
          )
          AND (
            EXISTS (
              SELECT 1 FROM public.user_roles ur
              WHERE ur.user_id = actor.user_id AND ur.role IN ('admin', 'super_admin')
            )
            OR (
              EXISTS (
                SELECT 1 FROM public.user_module_capabilities umc
                JOIN public.module_capabilities mc ON mc.id = umc.capability_id
                WHERE umc.user_id = actor.user_id AND mc.module_key = 'college'
                  AND mc.is_active AND umc.status = 'active'
                  AND (umc.expires_at IS NULL OR umc.expires_at > now())
              )
              AND EXISTS (
                SELECT 1 FROM public.entity_admin_assignments ea
                JOIN public.user_module_capabilities umc ON umc.id = ea.user_capability_id
                JOIN public.module_capabilities mc ON mc.id = umc.capability_id
                WHERE ea.user_id = actor.user_id AND ea.entity_type = 'college'
                  AND ea.entity_id = i.id AND ea.status = 'active'
                  AND umc.user_id = actor.user_id AND umc.status = 'active'
                  AND (umc.expires_at IS NULL OR umc.expires_at > now())
                  AND mc.module_key = 'college' AND mc.is_active
              )
              AND EXISTS (
                SELECT 1 FROM public.module_entitlements e
                LEFT JOIN public.packages p ON p.id = e.package_id
                WHERE e.user_id = actor.user_id AND e.module_key = 'college'
                  AND e.entity_type = 'college' AND e.entity_id = i.id
                  AND e.status = 'active' AND e.start_at <= now()
                  AND (e.expires_at IS NULL OR e.expires_at > now())
                  AND (
                    e.features ->> 'college_applications' = 'true'
                    OR p.features ->> 'college_applications' = 'true'
                    OR EXISTS (
                      SELECT 1 FROM public.entity_feature_grants g
                      WHERE g.user_id = actor.user_id AND g.module_key = 'college'
                        AND g.entity_type = 'college' AND g.entity_id = i.id
                        AND g.feature_key = 'college_applications' AND g.status = 'active'
                    )
                  )
              )
            )
          )
      ) AS allowed FROM target i
    ), selected AS (
      SELECT ca.id, ca.institute_id, ca.applicant_id, ca.full_name, ca.email,
             ca.phone, ca.program_interest, ca.intake, ca.message,
             ca.attachments, ca.form_data, ca.status, ca.submitted_at, ca.updated_at
      FROM public.college_applications ca
      JOIN access a ON a.id = ca.institute_id AND a.allowed
      WHERE ca.deleted_at IS NULL
      ORDER BY ca.submitted_at DESC, ca.id DESC LIMIT 100
    )
    SELECT EXISTS (SELECT 1 FROM target) AS exists,
           COALESCE((SELECT allowed FROM access), false) AS allowed,
           COALESCE((SELECT jsonb_agg(to_jsonb(s) ORDER BY s.submitted_at DESC, s.id DESC)
                     FROM selected s), '[]'::jsonb) AS applications`, [actor.userId, instituteId, actor.neonAuthUserId]);
  if (!result?.exists) return null;
  if (!result.allowed) {
    throw new NeonAuthorizationError(403, "ENTITY_ACCESS_REQUIRED", "You cannot view these applications.");
  }
  return result.applications;
}
