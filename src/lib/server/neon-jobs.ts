/**
 * Neon staging Jobs repository and service.
 * Enforces active profiles, verified identity links, entity scope, and atomic state transitions.
 */
import type { PoolClient, QueryResultRow } from "pg";
import { queryRows, withTransaction } from "./db";
import {
  NeonAuthorizationError,
  neonQueryExecutor,
  requireEntityAccess,
  type NeonActor,
  type NeonQueryExecutor,
} from "./neon-authorization";
import { appendNotificationEvent } from "./neon-application-events";

export interface PublicJobRow extends QueryResultRow {
  id: string;
  company_id: string | null;
  title: string;
  description: string | null;
  status: string | null;
  approval_status: string | null;
  location: string | null;
  job_type: string | null;
  experience_level: string | null;
  category: string | null;
  is_active: boolean | null;
  application_deadline: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface JobApplicationDetailRow extends QueryResultRow {
  id: string;
  job_id: string;
  user_id: string;
  status: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  cover_letter: string | null;
  portfolio_url: string | null;
  resume_url: string | null;
  skills_match_score: number | null;
  form_data: unknown;
  applied_at: Date;
  interview_at: Date | null;
  interview_location: string | null;
  interview_duration_minutes: number | null;
}

export interface SubmitApplicationInput {
  jobId: string;
  fullName: string;
  email: string;
  phone: string;
  coverLetter?: string;
  portfolioUrl?: string;
  resumeUrl?: string;
  skills?: string[];
  education?: Array<Record<string, unknown>>;
  experience?: Array<Record<string, unknown>>;
  certifications?: Array<Record<string, unknown>>;
}

export class NeonJobsRepository {
  constructor(private readonly db: NeonQueryExecutor = neonQueryExecutor) {}

  async listPublicJobs(params: {
    search?: string;
    location?: string;
    jobType?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<PublicJobRow[]> {
    const limit = Math.min(100, Math.max(1, params.limit ?? 50));
    const offset = Math.max(0, params.offset ?? 0);
    const searchFilter = params.search?.trim() ? `%${params.search.trim().toLowerCase()}%` : null;
    const locationFilter = params.location?.trim() ? `%${params.location.trim().toLowerCase()}%` : null;
    const typeFilter = params.jobType?.trim() || null;

    return this.db.query<PublicJobRow>(`
      SELECT id, company_id, title, description, status, approval_status,
             location, job_type, experience_level, is_active,
             application_deadline, created_at, updated_at
      FROM public.jobs
      WHERE status = 'published' AND approval_status = 'approved' AND is_active = true
        AND deleted_at IS NULL AND (expires_at IS NULL OR expires_at > now())
        AND ($1::text IS NULL OR lower(title) LIKE $1 OR lower(description) LIKE $1)
        AND ($2::text IS NULL OR lower(location) LIKE $2)
        AND ($3::text IS NULL OR job_type = $3)
      ORDER BY created_at DESC
      LIMIT $4 OFFSET $5`, [searchFilter, locationFilter, typeFilter, limit, offset]);
  }

  async getPublicJob(id: string): Promise<PublicJobRow | null> {
    const rows = await this.db.query<PublicJobRow>(`
      SELECT id, company_id, title, description, status, approval_status,
             location, job_type, experience_level, is_active,
             application_deadline, created_at, updated_at
      FROM public.jobs
      WHERE id = $1::uuid AND status = 'published' AND approval_status = 'approved'
        AND is_active = true AND deleted_at IS NULL
        AND (expires_at IS NULL OR expires_at > now())
      LIMIT 1`, [id]);
    return rows[0] ?? null;
  }

  async submitJobApplication(
    actor: NeonActor,
    input: SubmitApplicationInput,
    transactionClient?: Pick<PoolClient, "query">,
  ): Promise<JobApplicationDetailRow> {
    const runWith = async (client: Pick<PoolClient, "query">) => {
      // 1. Verify Job is active and open
      const jobRows = await client.query<{
        id: string;
        title: string;
        company_id: string | null;
        status: string;
        approval_status: string;
        is_active: boolean;
        application_deadline: Date | null;
      }>(`
        SELECT id, title, company_id, status, approval_status, is_active, application_deadline
        FROM public.jobs
        WHERE id = $1::uuid AND deleted_at IS NULL FOR UPDATE`, [input.jobId]);

      const job = jobRows.rows[0];
      if (!job || !job.is_active || job.status !== "published" || job.approval_status !== "approved") {
        throw new NeonAuthorizationError(403, "JOB_NOT_ACCEPTING_APPLICATIONS", "This job is not accepting applications.");
      }
      if (job.application_deadline && new Date(job.application_deadline).getTime() < Date.now()) {
        throw new NeonAuthorizationError(403, "DEADLINE_PASSED", "The deadline for this job has passed.");
      }

      // 2. Check for duplicate application
      const existing = await client.query<{ id: string }>(`
        SELECT id FROM public.job_applications
        WHERE job_id = $1::uuid AND user_id = $2::uuid AND deleted_at IS NULL
        LIMIT 1`, [input.jobId, actor.userId]);

      if (existing.rows.length > 0) {
        throw new NeonAuthorizationError(403, "ALREADY_APPLIED", "You have already applied for this position.");
      }

      // 3. Store snapshot
      const formData = {
        fullName: input.fullName.trim(),
        email: input.email.trim(),
        phone: input.phone.trim(),
        coverLetter: input.coverLetter?.trim() ?? null,
        portfolioUrl: input.portfolioUrl?.trim() ?? null,
        skills: input.skills ?? [],
        education: input.education ?? [],
        experience: input.experience ?? [],
        certifications: input.certifications ?? [],
        appliedAt: new Date().toISOString(),
      };

      const inserted = await client.query<JobApplicationDetailRow>(`
        INSERT INTO public.job_applications (
          job_id, user_id, status, full_name, email, phone,
          cover_letter, portfolio_url, resume_url, form_data, applied_at
        ) VALUES (
          $1::uuid, $2::uuid, 'submitted', $3, $4, $5,
          $6, $7, $8, $9::jsonb, now()
        ) RETURNING id, job_id, user_id, status, full_name, email, phone,
                    cover_letter, portfolio_url, resume_url, skills_match_score,
                    form_data, applied_at, interview_at, interview_location,
                    interview_duration_minutes`, [
        input.jobId,
        actor.userId,
        input.fullName.trim().slice(0, 180),
        input.email.trim().slice(0, 255),
        input.phone.trim().slice(0, 50),
        input.coverLetter?.trim().slice(0, 5000) ?? null,
        input.portfolioUrl?.trim().slice(0, 500) ?? null,
        input.resumeUrl?.trim().slice(0, 500) ?? null,
        JSON.stringify(formData),
      ]);

      const appRow = inserted.rows[0];

      // 4. Create notification for applicant and durable event
      const notif = await client.query<{ id: string }>(`
        INSERT INTO public.notifications (recipient_id, title, message, type, is_read)
        VALUES ($1::uuid, $2, $3, 'job_application', false)
        RETURNING id`, [
        actor.userId,
        `Application Submitted: ${job.title}`,
        `Your application for "${job.title}" has been successfully submitted.`,
      ]);

      await appendNotificationEvent(client, actor.userId, notif.rows[0].id);

      return appRow;
    };

    if (transactionClient) return runWith(transactionClient);
    return withTransaction(runWith);
  }

  async listOwnApplications(actor: NeonActor): Promise<JobApplicationDetailRow[]> {
    return this.db.query<JobApplicationDetailRow>(`
      SELECT a.id, a.job_id, a.user_id, a.status, a.full_name, a.email, a.phone,
             a.cover_letter, a.portfolio_url, a.resume_url, a.skills_match_score,
             a.form_data, a.applied_at, a.interview_at, a.interview_location,
             a.interview_duration_minutes
      FROM public.job_applications a
      WHERE a.user_id = $1::uuid AND a.deleted_at IS NULL
      ORDER BY a.applied_at DESC
      LIMIT 100`, [actor.userId]);
  }

  async listRecruiterApplications(actor: NeonActor, jobId: string): Promise<JobApplicationDetailRow[]> {
    const jobRows = await this.db.query<{ id: string; company_id: string | null }>(`
      SELECT id, company_id FROM public.jobs
      WHERE id = $1::uuid AND deleted_at IS NULL LIMIT 1`, [jobId]);

    const job = jobRows[0];
    if (!job) throw new NeonAuthorizationError(404, "JOB_NOT_FOUND", "Job not found.");

    if (job.company_id) {
      await requireEntityAccess(actor, "jobs", "company", job.company_id, "job_applications", this.db);
    } else {
      await requireEntityAccess(actor, "jobs", "job", jobId, "job_applications", this.db);
    }

    return this.db.query<JobApplicationDetailRow>(`
      SELECT a.id, a.job_id, a.user_id, a.status, a.full_name, a.email, a.phone,
             a.cover_letter, a.portfolio_url, a.resume_url, a.skills_match_score,
             a.form_data, a.applied_at, a.interview_at, a.interview_location,
             a.interview_duration_minutes
      FROM public.job_applications a
      WHERE a.job_id = $1::uuid AND a.deleted_at IS NULL
      ORDER BY a.applied_at DESC
      LIMIT 100`, [jobId]);
  }

  async scheduleInterview(
    actor: NeonActor,
    applicationId: string,
    params: {
      interviewAt: string; // ISO date string
      interviewLocation: string;
      interviewDurationMinutes?: number;
    },
    transactionClient?: Pick<PoolClient, "query">,
  ): Promise<JobApplicationDetailRow> {
    const runWith = async (client: Pick<PoolClient, "query">) => {
      const appRows = await client.query<{
        id: string;
        job_id: string;
        user_id: string;
        full_name: string | null;
        company_id: string | null;
        job_title: string;
      }>(`
        SELECT a.id, a.job_id, a.user_id, a.full_name, j.company_id, j.title AS job_title
        FROM public.job_applications a
        JOIN public.jobs j ON j.id = a.job_id
        WHERE a.id = $1::uuid AND a.deleted_at IS NULL FOR UPDATE`, [applicationId]);

      const app = appRows.rows[0];
      if (!app) throw new NeonAuthorizationError(404, "APPLICATION_NOT_FOUND", "Application not found.");

      if (app.company_id) {
        await requireEntityAccess(actor, "jobs", "company", app.company_id, "job_applications", { query: (sql, p) => client.query(sql, [...p]).then(r => r.rows) });
      } else {
        await requireEntityAccess(actor, "jobs", "job", app.job_id, "job_applications", { query: (sql, p) => client.query(sql, [...p]).then(r => r.rows) });
      }

      const updated = await client.query<JobApplicationDetailRow>(`
        UPDATE public.job_applications
        SET status = 'interview_scheduled',
            interview_at = $2::timestamptz,
            interview_location = $3,
            interview_duration_minutes = $4,
            updated_at = now()
        WHERE id = $1::uuid
        RETURNING id, job_id, user_id, status, full_name, email, phone,
                  cover_letter, portfolio_url, resume_url, skills_match_score,
                  form_data, applied_at, interview_at, interview_location,
                  interview_duration_minutes`, [
        applicationId,
        params.interviewAt,
        params.interviewLocation.trim().slice(0, 500),
        params.interviewDurationMinutes ?? 45,
      ]);

      // Notify candidate
      const notif = await client.query<{ id: string }>(`
        INSERT INTO public.notifications (recipient_id, title, message, type, is_read)
        VALUES ($1::uuid, $2, $3, 'interview_scheduled', false)
        RETURNING id`, [
        app.user_id,
        `Interview Scheduled: ${app.job_title}`,
        `Your interview for ${app.job_title} has been scheduled for ${new Date(params.interviewAt).toLocaleString()}. Location: ${params.interviewLocation}`,
      ]);

      await appendNotificationEvent(client, app.user_id, notif.rows[0].id);

      return updated.rows[0];
    };

    if (transactionClient) return runWith(transactionClient);
    return withTransaction(runWith);
  }
}
