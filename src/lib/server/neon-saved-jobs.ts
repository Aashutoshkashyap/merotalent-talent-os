import type { QueryResultRow } from "pg";
import { NeonAuthorizationError, neonQueryExecutor, type NeonActor, type NeonQueryExecutor } from "./neon-authorization";

export interface SavedJobRow extends QueryResultRow {
  id: string;
  title: string;
  location: string | null;
  job_type: string | null;
  experience_level?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  is_remote?: boolean | null;
  application_deadline: string | null;
  company_name: string | null;
  company_logo_url?: string | null;
  saved_at: string;
}

/** A student may read only their own bookmarks; job-admin scope is irrelevant here. */
export async function listOwnSavedJobs(
  actor: NeonActor,
  limit: number,
  offset: number,
  db: NeonQueryExecutor = neonQueryExecutor,
): Promise<SavedJobRow[]> {
  return db.query<SavedJobRow>(`
    SELECT j.id, j.title, j.location, j.job_type, j.experience_level,
      j.salary_min, j.salary_max, j.is_remote, j.application_deadline,
      c.name AS company_name, c.logo_url AS company_logo_url, s.created_at AS saved_at
    FROM public.saved_jobs s
    JOIN public.jobs j ON j.id = s.job_id
    JOIN public.profiles profile ON profile.user_id = s.user_id
      AND profile.account_status = 'active' AND profile.deleted_at IS NULL
    JOIN public.neon_application_accounts account ON account.legacy_user_id = profile.user_id
      AND account.status = 'active'
    JOIN public.neon_identity_links link ON link.application_account_id = account.id
      AND link.neon_auth_user_id = $2::uuid AND link.status = 'verified'
    LEFT JOIN public.companies c ON c.id = j.company_id
    WHERE s.user_id = $1::uuid AND s.deleted_at IS NULL
      AND j.deleted_at IS NULL AND j.status = 'published'
    ORDER BY s.created_at DESC, s.id DESC
    LIMIT $3::integer OFFSET $4::integer`, [actor.userId, actor.neonAuthUserId, limit, offset]);
}

export async function saveJob(
  actor: NeonActor,
  jobId: string,
  db: NeonQueryExecutor = neonQueryExecutor,
): Promise<{ saved: boolean; jobId: string }> {
  const rows = await db.query<{ job_id: string }>(`
    INSERT INTO public.saved_jobs (user_id, job_id, created_at)
    SELECT p.user_id, j.id, now()
    FROM public.profiles p
    JOIN public.neon_application_accounts account ON account.legacy_user_id = p.user_id
      AND account.status = 'active'
    JOIN public.neon_identity_links link ON link.application_account_id = account.id
      AND link.neon_auth_user_id = $3::uuid AND link.status = 'verified'
    JOIN public.jobs j ON j.id = $2::uuid
      AND j.status = 'published' AND j.approval_status = 'approved'
      AND j.is_active = true AND j.deleted_at IS NULL
      AND (j.expires_at IS NULL OR j.expires_at > now())
    WHERE p.user_id = $1::uuid AND p.account_status = 'active' AND p.deleted_at IS NULL
    ON CONFLICT (user_id, job_id)
    DO UPDATE SET deleted_at = NULL, created_at = now()
    RETURNING job_id`, [actor.userId, jobId, actor.neonAuthUserId]);
  if (rows.length === 0) {
    throw new NeonAuthorizationError(403, "JOB_SAVE_DENIED", "This job cannot be saved by this account.");
  }

  return { saved: true, jobId };
}

export async function unsaveJob(
  actor: NeonActor,
  jobId: string,
  db: NeonQueryExecutor = neonQueryExecutor,
): Promise<{ saved: boolean; jobId: string }> {
  await db.query(`
    UPDATE public.saved_jobs
    SET deleted_at = now()
    WHERE user_id = $1::uuid AND job_id = $2::uuid
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.neon_application_accounts account ON account.legacy_user_id = p.user_id
          AND account.status = 'active'
        JOIN public.neon_identity_links link ON link.application_account_id = account.id
          AND link.neon_auth_user_id = $3::uuid AND link.status = 'verified'
        WHERE p.user_id = $1::uuid AND p.account_status = 'active' AND p.deleted_at IS NULL
      )`, [actor.userId, jobId, actor.neonAuthUserId]);

  return { saved: false, jobId };
}
