import type { QueryResultRow } from "pg";
import { neonQueryExecutor, type NeonActor, type NeonQueryExecutor } from "./neon-authorization";

interface SavedJobRow extends QueryResultRow {
  id: string;
  title: string;
  location: string | null;
  job_type: string | null;
  application_deadline: string | null;
  company_name: string | null;
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
    SELECT j.id, j.title, j.location, j.job_type, j.application_deadline,
      c.name AS company_name, s.created_at AS saved_at
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
