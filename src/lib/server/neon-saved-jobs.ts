import type { QueryResultRow } from "pg";
import { neonQueryExecutor, type NeonActor, type NeonQueryExecutor } from "./neon-authorization";

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
  await db.query(`
    INSERT INTO public.saved_jobs (user_id, job_id, created_at)
    VALUES ($1::uuid, $2::uuid, now())
    ON CONFLICT (user_id, job_id)
    DO UPDATE SET deleted_at = NULL, created_at = now()`, [actor.userId, jobId]);

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
    WHERE user_id = $1::uuid AND job_id = $2::uuid`, [actor.userId, jobId]);

  return { saved: false, jobId };
}
