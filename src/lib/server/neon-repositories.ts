/** Narrow, authorized Neon staging repositories. No caller-controlled table names. */
import type { QueryResultRow } from "pg";
import {
  NeonAuthorizationError,
  neonQueryExecutor,
  requireEntityAccess,
  requireOwnUserOrAdmin,
  type NeonActor,
  type NeonQueryExecutor,
} from "./neon-authorization";

export interface ProfileRow extends QueryResultRow {
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  whatsapp_number: string | null;
  bio: string | null;
  location: string | null;
  avatar_url: string | null;
}

export interface InstituteRow extends QueryResultRow {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  status: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  updated_at: Date;
}

export interface JobRow extends QueryResultRow {
  id: string;
  company_id: string | null;
  title: string;
  description: string | null;
  status: string | null;
  approval_status: string | null;
  updated_at: Date;
}

export interface JobApplicationRow extends QueryResultRow {
  id: string;
  job_id: string;
  user_id: string;
  status: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  form_data: unknown;
  applied_at: Date;
}

export interface NotificationRow extends QueryResultRow {
  id: string;
  recipient_id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: Date;
}

function cleanText(value: string, max: number): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > max) throw new Error("Invalid text length.");
  return trimmed;
}

export class NeonRepositories {
  constructor(private readonly db: NeonQueryExecutor = neonQueryExecutor) {}

  async getProfile(actor: NeonActor, userId = actor.userId): Promise<ProfileRow | null> {
    requireOwnUserOrAdmin(actor, userId);
    const rows = await this.db.query<ProfileRow>(`
      SELECT user_id, full_name, email, phone, whatsapp_number, bio, location, avatar_url
      FROM public.profiles WHERE user_id = $1::uuid AND deleted_at IS NULL LIMIT 1`, [userId]);
    return rows[0] ?? null;
  }

  async updateProfile(
    actor: NeonActor,
    patch: { fullName: string; bio?: string | null; location?: string | null },
  ): Promise<ProfileRow | null> {
    const fullName = cleanText(patch.fullName, 180);
    const bio = patch.bio?.trim().slice(0, 2000) ?? null;
    const location = patch.location?.trim().slice(0, 250) ?? null;
    const rows = await this.db.query<ProfileRow>(`
      UPDATE public.profiles SET full_name = $2, bio = $3, location = $4, updated_at = now()
      WHERE user_id = $1::uuid AND account_status = 'active' AND deleted_at IS NULL
      RETURNING user_id, full_name, email, phone, whatsapp_number, bio, location, avatar_url`,
    [actor.userId, fullName, bio, location]);
    return rows[0] ?? null;
  }

  async getPublicInstitute(id: string): Promise<InstituteRow | null> {
    const rows = await this.db.query<InstituteRow>(`
      SELECT id, name, description, location, status, logo_url, cover_image_url, updated_at
      FROM public.institutes
      WHERE id = $1::uuid AND status = 'approved' AND deleted_at IS NULL LIMIT 1`, [id]);
    return rows[0] ?? null;
  }

  async getManagedInstitute(actor: NeonActor, id: string): Promise<InstituteRow | null> {
    await requireEntityAccess(actor, "college", "college", id, "profile_editing", this.db);
    const rows = await this.db.query<InstituteRow>(`
      SELECT id, name, description, location, status, logo_url, cover_image_url, updated_at
      FROM public.institutes WHERE id = $1::uuid AND deleted_at IS NULL LIMIT 1`, [id]);
    return rows[0] ?? null;
  }

  async updateInstituteDescription(actor: NeonActor, id: string, description: string): Promise<InstituteRow | null> {
    // One PostgreSQL statement observes authorization and performs the write
    // under the same statement snapshot. Never trust only a prior JS check.
    const rows = await this.db.query<InstituteRow>(`
      UPDATE public.institutes i SET description = $3, updated_at = now()
      WHERE i.id = $2::uuid AND i.deleted_at IS NULL
        AND EXISTS (
          SELECT 1 FROM public.profiles actor
          WHERE actor.user_id = $1::uuid AND actor.account_status = 'active'
            AND actor.deleted_at IS NULL
        )
        AND (
          EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = $1::uuid AND ur.role IN ('admin', 'super_admin')
          )
          OR (
            EXISTS (
              SELECT 1 FROM public.user_module_capabilities umc
              JOIN public.module_capabilities mc ON mc.id = umc.capability_id
              WHERE umc.user_id = $1::uuid AND mc.module_key = 'college' AND mc.is_active
                AND umc.status = 'active'
                AND (umc.expires_at IS NULL OR umc.expires_at > now())
            )
            AND EXISTS (
              SELECT 1 FROM public.entity_admin_assignments ea
              JOIN public.user_module_capabilities umc ON umc.id = ea.user_capability_id
              JOIN public.module_capabilities mc ON mc.id = umc.capability_id
              WHERE ea.user_id = $1::uuid AND ea.entity_type = 'college'
                AND ea.entity_id = i.id AND ea.status = 'active'
                AND umc.status = 'active' AND mc.is_active AND mc.module_key = 'college'
                AND (umc.expires_at IS NULL OR umc.expires_at > now())
            )
            AND EXISTS (
              SELECT 1 FROM public.module_entitlements e
              WHERE e.user_id = $1::uuid AND e.module_key = 'college'
                AND e.entity_type = 'college' AND e.entity_id = i.id
                AND e.status = 'active' AND e.start_at <= now()
                AND (e.expires_at IS NULL OR e.expires_at > now())
            )
            AND (
              EXISTS (
                SELECT 1 FROM public.entity_feature_grants g
                WHERE g.user_id = $1::uuid AND g.module_key = 'college'
                  AND g.entity_type = 'college' AND g.entity_id = i.id
                  AND g.feature_key = 'profile_editing' AND g.status = 'active'
              )
              OR EXISTS (
                SELECT 1 FROM public.module_entitlements e
                LEFT JOIN public.packages p ON p.id = e.package_id
                WHERE e.user_id = $1::uuid AND e.module_key = 'college'
                  AND e.entity_type = 'college' AND e.entity_id = i.id
                  AND e.status = 'active' AND e.start_at <= now()
                  AND (e.expires_at IS NULL OR e.expires_at > now())
                  AND (e.features ->> 'profile_editing' = 'true'
                       OR p.features ->> 'profile_editing' = 'true')
              )
            )
          )
        )
      RETURNING id, name, description, location, status, logo_url, cover_image_url, updated_at`,
    [actor.userId, id, cleanText(description, 10_000)]);
    if (rows[0]) return rows[0];
    const exists = await this.db.query<{ id: string }>(
      "SELECT id FROM public.institutes WHERE id = $1::uuid AND deleted_at IS NULL LIMIT 1", [id],
    );
    if (!exists[0]) return null;
    throw new NeonAuthorizationError(403, "ENTITY_ACCESS_REQUIRED", "You cannot edit this institution.");
  }

  async getPublicJob(id: string): Promise<JobRow | null> {
    const rows = await this.db.query<JobRow>(`
      SELECT id, company_id, title, description, status, approval_status, updated_at
      FROM public.jobs WHERE id = $1::uuid AND status = 'published'
        AND approval_status = 'approved' AND is_active = true AND deleted_at IS NULL
        AND (expires_at IS NULL OR expires_at > now()) LIMIT 1`, [id]);
    return rows[0] ?? null;
  }

  async updateJobDescription(actor: NeonActor, id: string, description: string): Promise<JobRow | null> {
    const [job] = await this.db.query<JobRow>(`
      SELECT id, company_id, title, description, status, approval_status, updated_at
      FROM public.jobs WHERE id = $1::uuid AND deleted_at IS NULL LIMIT 1`, [id]);
    if (!job) return null;
    if (job.company_id) {
      await requireEntityAccess(actor, "jobs", "company", job.company_id, "job_management", this.db);
    } else {
      await requireEntityAccess(actor, "jobs", "job", id, "job_management", this.db);
    }
    // Editing cannot self-publish or bypass the existing approval lifecycle.
    const rows = await this.db.query<JobRow>(`
      UPDATE public.jobs SET description = $2, updated_at = now()
      WHERE id = $1::uuid AND deleted_at IS NULL
      RETURNING id, company_id, title, description, status, approval_status, updated_at`,
    [id, cleanText(description, 10_000)]);
    return rows[0] ?? null;
  }

  async getJobApplications(actor: NeonActor, jobId: string): Promise<JobApplicationRow[]> {
    const [job] = await this.db.query<JobRow>(`
      SELECT id, company_id, title, description, status, approval_status, updated_at
      FROM public.jobs WHERE id = $1::uuid AND deleted_at IS NULL LIMIT 1`, [jobId]);
    if (!job) return [];
    if (!job.company_id) {
      await requireEntityAccess(actor, "jobs", "job", jobId, "job_applications", this.db);
    } else {
      await requireEntityAccess(actor, "jobs", "company", job.company_id, "job_applications", this.db);
    }
    return this.db.query<JobApplicationRow>(`
      SELECT id, job_id, user_id, status, full_name, email, phone, form_data, applied_at
      FROM public.job_applications
      WHERE job_id = $1::uuid AND deleted_at IS NULL ORDER BY applied_at DESC LIMIT 100`, [jobId]);
  }

  async getOwnJobApplications(actor: NeonActor): Promise<JobApplicationRow[]> {
    return this.db.query<JobApplicationRow>(`
      SELECT id, job_id, user_id, status, full_name, email, phone, form_data, applied_at
      FROM public.job_applications WHERE user_id = $1::uuid AND deleted_at IS NULL
      ORDER BY applied_at DESC LIMIT 100`, [actor.userId]);
  }

  async getNotifications(actor: NeonActor): Promise<NotificationRow[]> {
    return this.db.query<NotificationRow>(`
      SELECT id, recipient_id, title, message, is_read, created_at
      FROM public.notifications WHERE recipient_id = $1::uuid AND deleted_at IS NULL
      ORDER BY created_at DESC LIMIT 100`, [actor.userId]);
  }
}
