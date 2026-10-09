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
import { calculateJobMatch, type JobPreferences } from "../jobs/job-matching";

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
  industry: string | null;
  salary_min: number | null;
  salary_max: number | null;
  is_remote: boolean | null;
  requirements: unknown;
  skills_required: string[] | null;
  is_active: boolean | null;
  application_deadline: Date | null;
  created_at: Date;
  updated_at: Date;
  company_name?: string | null;
  company_logo_url?: string | null;
  companies?: {
    name: string | null;
    logo_url: string | null;
  } | null;
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
  notes?: string | null;
  applied_at: Date;
  updated_at?: Date;
  interview_at: Date | null;
  interview_location: string | null;
  interview_duration_minutes: number | null;
  interview_type?: string | null;
  interview_status?: string | null;
  interview_notes?: string | null;
  timeline?: unknown;
  job?: {
    id: string;
    title: string;
    location: string | null;
    job_type: string | null;
    experience_level: string | null;
    salary_min: number | null;
    salary_max: number | null;
    is_remote: boolean | null;
    company: {
      id: string | null;
      name: string | null;
      logo_url: string | null;
    } | null;
  } | null;
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
  expectedSalary?: number;
  answers?: Record<string, unknown>;
  education?: Array<Record<string, unknown>>;
  experience?: Array<Record<string, unknown>>;
  certifications?: Array<Record<string, unknown>>;
}

export interface ReviewApplicationInput {
  id: string;
  status: "submitted" | "applied" | "screening" | "follow_up" | "shortlisted" | "interview" | "interview_scheduled" | "offered" | "selected" | "confirmed" | "rejected" | "withdrawn";
  notes?: string;
  interviewAt?: string | null;
  interviewLocation?: string;
  duration?: number;
  interviewType?: "in_person" | "online" | "phone" | "other";
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

    const rows = await this.db.query<PublicJobRow>(`
      SELECT j.id, j.company_id, j.title, j.description, j.status, j.approval_status,
             j.location, j.job_type, j.experience_level, j.category, j.industry,
             j.salary_min, j.salary_max, j.is_remote, j.requirements, j.skills_required,
             j.is_active, j.application_deadline, j.created_at, j.updated_at,
             c.name AS company_name, c.logo_url AS company_logo_url
      FROM public.jobs j
      LEFT JOIN public.companies c ON c.id = j.company_id
      WHERE j.status = 'published' AND j.approval_status = 'approved' AND j.is_active = true
        AND j.deleted_at IS NULL AND (j.expires_at IS NULL OR j.expires_at > now())
        AND ($1::text IS NULL OR lower(j.title) LIKE $1 OR lower(coalesce(j.description, '')) LIKE $1)
        AND ($2::text IS NULL OR lower(coalesce(j.location, '')) LIKE $2)
        AND ($3::text IS NULL OR j.job_type = $3)
      ORDER BY j.created_at DESC
      LIMIT $4 OFFSET $5`, [searchFilter, locationFilter, typeFilter, limit, offset]);

    return rows.map((row) => ({
      ...row,
      salary_min: row.salary_min != null ? Number(row.salary_min) : null,
      salary_max: row.salary_max != null ? Number(row.salary_max) : null,
      companies: row.company_name ? { name: row.company_name, logo_url: row.company_logo_url ?? null } : null,
    }));
  }

  async getPublicJob(id: string): Promise<PublicJobRow | null> {
    const rows = await this.db.query<PublicJobRow>(`
      SELECT j.id, j.company_id, j.title, j.description, j.status, j.approval_status,
             j.location, j.job_type, j.experience_level, j.category, j.industry,
             j.salary_min, j.salary_max, j.is_remote, j.requirements, j.skills_required,
             j.is_active, j.application_deadline, j.created_at, j.updated_at,
             c.name AS company_name, c.logo_url AS company_logo_url
      FROM public.jobs j
      LEFT JOIN public.companies c ON c.id = j.company_id
      WHERE j.id = $1::uuid AND j.status = 'published' AND j.approval_status = 'approved'
        AND j.is_active = true AND j.deleted_at IS NULL
        AND (j.expires_at IS NULL OR j.expires_at > now())
      LIMIT 1`, [id]);

    const job = rows[0] ?? null;
    if (!job) return null;
    return {
      ...job,
      salary_min: job.salary_min != null ? Number(job.salary_min) : null,
      salary_max: job.salary_max != null ? Number(job.salary_max) : null,
      companies: job.company_name ? { name: job.company_name, logo_url: job.company_logo_url ?? null } : null,
    };
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
        location: string | null;
        job_type: string | null;
        experience_level: string | null;
        category: string | null;
        industry: string | null;
        skills_required: string[] | null;
        is_remote: boolean | null;
        status: string;
        approval_status: string;
        is_active: boolean;
        application_deadline: Date | null;
      }>(`
        SELECT id, title, company_id, location, job_type, experience_level,
               category, industry, skills_required, is_remote,
               status, approval_status, is_active, application_deadline
        FROM public.jobs
        WHERE id = $1::uuid AND deleted_at IS NULL FOR UPDATE`, [input.jobId]);

      const job = jobRows.rows[0];
      if (!job || !job.is_active || job.status !== "published" || job.approval_status !== "approved") {
        throw new NeonAuthorizationError(403, "JOB_NOT_ACCEPTING_APPLICATIONS", "This job is not accepting applications.");
      }
      if (job.application_deadline && new Date(job.application_deadline).getTime() < Date.now()) {
        throw new NeonAuthorizationError(403, "DEADLINE_PASSED", "The deadline for this job has passed.");
      }

      // 2. Check for existing active application
      const existing = await client.query<{ id: string; status: string }>(`
        SELECT id, status FROM public.job_applications
        WHERE job_id = $1::uuid AND user_id = $2::uuid AND deleted_at IS NULL
        LIMIT 1`, [input.jobId, actor.userId]);

      if (existing.rows.length > 0 && existing.rows[0].status !== "withdrawn") {
        throw new NeonAuthorizationError(403, "ALREADY_APPLIED", "You have already applied for this position.");
      }

      // 3. Fetch candidate profile for baseline snapshot & match score
      const profileRows = await client.query<{
        id: string;
        full_name: string | null;
        email: string | null;
        phone: string | null;
        location: string | null;
        bio: string | null;
        skills: string[] | null;
        experience_level: string | null;
        job_preferences: JobPreferences | null;
        education_history: unknown;
        experience_history: unknown;
        certifications: unknown;
        resume_url: string | null;
      }>(`
        SELECT id, full_name, email, phone, location, bio, skills,
               experience_level, job_preferences, education_history,
               experience_history, certifications, resume_url
        FROM public.profiles
        WHERE user_id = $1::uuid AND account_status = 'active' AND deleted_at IS NULL
        LIMIT 1`, [actor.userId]);

      const profile = profileRows.rows[0];

      const skillsSnapshot = input.skills && input.skills.length > 0
        ? input.skills
        : (Array.isArray(profile?.skills) ? profile.skills : []);

      const educationSnapshot = input.education && input.education.length > 0
        ? input.education
        : (Array.isArray(profile?.education_history) ? profile.education_history : []);

      const experienceSnapshot = input.experience && input.experience.length > 0
        ? input.experience
        : (Array.isArray(profile?.experience_history) ? profile.experience_history : []);

      const trainingSnapshot = input.certifications && input.certifications.length > 0
        ? input.certifications
        : (Array.isArray(profile?.certifications) ? profile.certifications : []);

      const resumeUrlSnapshot = input.resumeUrl || profile?.resume_url || null;

      // Calculate deterministic skills match score
      const matchResult = calculateJobMatch(
        {
          skills: skillsSnapshot,
          location: profile?.location,
          experience_level: profile?.experience_level,
          job_preferences: profile?.job_preferences,
        },
        job
      );

      const timeline = [
        {
          status: "applied",
          timestamp: new Date().toISOString(),
          note: "Application submitted by candidate.",
        },
      ];

      const formData = {
        fullName: input.fullName.trim() || profile?.full_name || "Applicant",
        email: input.email.trim() || profile?.email || "",
        phone: input.phone.trim() || profile?.phone || "",
        coverLetter: input.coverLetter?.trim() ?? null,
        portfolioUrl: input.portfolioUrl?.trim() ?? null,
        resumeUrl: resumeUrlSnapshot,
        expectedSalary: input.expectedSalary ?? null,
        answers: input.answers ?? {},
        skills: skillsSnapshot,
        education: educationSnapshot,
        experience: experienceSnapshot,
        certifications: trainingSnapshot,
        timeline,
        appliedAt: new Date().toISOString(),
      };

      let appRow: JobApplicationDetailRow;

      if (existing.rows.length > 0) {
        const updated = await client.query<JobApplicationDetailRow>(`
          UPDATE public.job_applications
          SET status = 'submitted',
              full_name = $3,
              email = $4,
              phone = $5,
              cover_letter = $6,
              portfolio_url = $7,
              resume_url = $8,
              skills_match_score = $9,
              form_data = $10::jsonb,
              applied_at = now(),
              updated_at = now()
          WHERE id = $1::uuid
          RETURNING id, job_id, user_id, status, full_name, email, phone,
                    cover_letter, portfolio_url, resume_url, skills_match_score,
                    form_data, notes, applied_at, updated_at, interview_at, interview_location,
                    interview_duration_minutes`, [
          existing.rows[0].id,
          actor.userId,
          formData.fullName.slice(0, 180),
          formData.email.slice(0, 255),
          formData.phone.slice(0, 50),
          formData.coverLetter?.slice(0, 5000) ?? null,
          formData.portfolioUrl?.slice(0, 500) ?? null,
          formData.resumeUrl?.slice(0, 500) ?? null,
          matchResult.matchScore,
          JSON.stringify(formData),
        ]);
        appRow = updated.rows[0];
      } else {
        const inserted = await client.query<JobApplicationDetailRow>(`
          INSERT INTO public.job_applications (
            job_id, user_id, status, full_name, email, phone,
            cover_letter, portfolio_url, resume_url, skills_match_score,
            form_data, applied_at, updated_at
          ) VALUES (
            $1::uuid, $2::uuid, 'submitted', $3, $4, $5,
            $6, $7, $8, $9,
            $10::jsonb, now(), now()
          ) RETURNING id, job_id, user_id, status, full_name, email, phone,
                      cover_letter, portfolio_url, resume_url, skills_match_score,
                      form_data, notes, applied_at, updated_at, interview_at, interview_location,
                      interview_duration_minutes`, [
          input.jobId,
          actor.userId,
          formData.fullName.slice(0, 180),
          formData.email.slice(0, 255),
          formData.phone.slice(0, 50),
          formData.coverLetter?.slice(0, 5000) ?? null,
          formData.portfolioUrl?.slice(0, 500) ?? null,
          formData.resumeUrl?.slice(0, 500) ?? null,
          matchResult.matchScore,
          JSON.stringify(formData),
        ]);
        appRow = inserted.rows[0];
      }

      // 4. Create in-app notification & durable event for candidate
      const notif = await client.query<{ id: string }>(`
        INSERT INTO public.notifications (recipient_id, title, message, type, is_read, entity_type, entity_id, action_url)
        VALUES ($1::uuid, $2, $3, 'job_application', false, 'job_application', $4::uuid, '/dashboard/jobs')
        RETURNING id`, [
        actor.userId,
        `Application Submitted: ${job.title}`,
        `Your application for "${job.title}" has been successfully submitted. You can track your status on your dashboard.`,
        appRow.id,
      ]);

      await appendNotificationEvent(client, actor.userId, notif.rows[0].id);

      return appRow;
    };

    if (transactionClient) return runWith(transactionClient);
    return withTransaction(runWith);
  }

  async listOwnApplications(actor: NeonActor): Promise<JobApplicationDetailRow[]> {
    const rows = await this.db.query<any>(`
      SELECT a.id, a.job_id, a.user_id, a.status, a.full_name, a.email, a.phone,
             a.cover_letter, a.portfolio_url, a.resume_url, a.skills_match_score,
             a.form_data, a.notes, a.applied_at, a.updated_at, a.interview_at, a.interview_location,
             a.interview_duration_minutes,
             j.id AS j_id, j.title AS j_title, j.location AS j_location,
             j.job_type AS j_job_type, j.experience_level AS j_experience_level,
             j.salary_min AS j_salary_min, j.salary_max AS j_salary_max,
             j.is_remote AS j_is_remote,
             c.id AS c_id, c.name AS c_name, c.logo_url AS c_logo_url
      FROM public.job_applications a
      JOIN public.jobs j ON j.id = a.job_id
      LEFT JOIN public.companies c ON c.id = j.company_id
      WHERE a.user_id = $1::uuid AND a.deleted_at IS NULL
      ORDER BY a.applied_at DESC
      LIMIT 100`, [actor.userId]);

    return rows.map((row) => {
      const formData = typeof row.form_data === "object" && row.form_data !== null ? row.form_data : {};
      return {
        id: row.id,
        job_id: row.job_id,
        user_id: row.user_id,
        status: row.status,
        full_name: row.full_name,
        email: row.email,
        phone: row.phone,
        cover_letter: row.cover_letter,
        portfolio_url: row.portfolio_url,
        resume_url: row.resume_url,
        skills_match_score: row.skills_match_score,
        form_data: row.form_data,
        notes: row.notes,
        applied_at: row.applied_at,
        updated_at: row.updated_at,
        interview_at: row.interview_at,
        interview_location: row.interview_location,
        interview_duration_minutes: row.interview_duration_minutes,
        interview_type: formData.interviewType ?? "online",
        interview_status: formData.interviewStatus ?? (row.interview_at ? "scheduled" : "none"),
        interview_notes: formData.interviewNotes ?? row.notes,
        timeline: formData.timeline ?? [],
        job: row.j_id ? {
          id: row.j_id,
          title: row.j_title,
          location: row.j_location,
          job_type: row.j_job_type,
          experience_level: row.j_experience_level,
          salary_min: row.j_salary_min,
          salary_max: row.j_salary_max,
          is_remote: row.j_is_remote,
          company: row.c_id ? {
            id: row.c_id,
            name: row.c_name,
            logo_url: row.c_logo_url,
          } : null,
        } : null,
      };
    });
  }

  async listRecruiterApplications(actor: NeonActor, jobId?: string, offset = 0): Promise<JobApplicationDetailRow[]> {
    if (jobId) {
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
               a.form_data, a.notes, a.applied_at, a.updated_at, a.interview_at, a.interview_location,
               a.interview_duration_minutes
        FROM public.job_applications a
        WHERE a.job_id = $1::uuid AND a.deleted_at IS NULL
        ORDER BY a.applied_at DESC
        LIMIT 100 OFFSET $2::integer`, [jobId, offset]);
    }

    // Platform admin listing across jobs
    if (!actor.platformAdmin && !actor.roles.includes("admin") && !actor.roles.includes("super_admin")) {
      throw new NeonAuthorizationError(403, "FORBIDDEN", "Insufficient privileges to list all candidate applications.");
    }

    return this.db.query<JobApplicationDetailRow>(`
      SELECT a.id, a.job_id, a.user_id, a.status, a.full_name, a.email, a.phone,
             a.cover_letter, a.portfolio_url, a.resume_url, a.skills_match_score,
             a.form_data, a.notes, a.applied_at, a.updated_at, a.interview_at, a.interview_location,
             a.interview_duration_minutes
      FROM public.job_applications a
      WHERE a.deleted_at IS NULL
      ORDER BY a.applied_at DESC
      LIMIT 100 OFFSET $1::integer`, [offset]);
  }

  async reviewApplication(
    actor: NeonActor,
    input: ReviewApplicationInput,
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
        status: string;
        form_data: unknown;
        notes: string | null;
      }>(`
        SELECT a.id, a.job_id, a.user_id, a.full_name, a.status, a.form_data, a.notes,
               j.company_id, j.title AS job_title
        FROM public.job_applications a
        JOIN public.jobs j ON j.id = a.job_id
        WHERE a.id = $1::uuid AND a.deleted_at IS NULL FOR UPDATE`, [input.id]);

      const app = appRows.rows[0];
      if (!app) throw new NeonAuthorizationError(404, "APPLICATION_NOT_FOUND", "Application not found.");

      if (app.company_id) {
        await requireEntityAccess(actor, "jobs", "company", app.company_id, "job_applications", {
          query: (sql, p) => client.query(sql, [...p]).then((r) => r.rows),
        });
      } else {
        await requireEntityAccess(actor, "jobs", "job", app.job_id, "job_applications", {
          query: (sql, p) => client.query(sql, [...p]).then((r) => r.rows),
        });
      }

      const normalizedStatus = input.status === "applied" ? "submitted" : input.status === "selected" ? "offered" : input.status;
      const currentFormData = typeof app.form_data === "object" && app.form_data !== null ? (app.form_data as Record<string, unknown>) : {};
      const currentTimeline = Array.isArray(currentFormData.timeline) ? currentFormData.timeline : [];
      const updatedTimeline = [
        ...currentTimeline,
        {
          status: normalizedStatus,
          timestamp: new Date().toISOString(),
          note: input.notes?.trim() || `Status updated to ${normalizedStatus}`,
        },
      ];

      const interviewStatus = input.interviewAt ? "scheduled" : (normalizedStatus === "interview" || normalizedStatus === "interview_scheduled" ? "scheduled" : "none");

      const updatedFormData = {
        ...currentFormData,
        timeline: updatedTimeline,
        interviewType: input.interviewType ?? "online",
        interviewStatus,
        interviewNotes: input.notes?.trim() || "",
      };

      const updated = await client.query<JobApplicationDetailRow>(`
        UPDATE public.job_applications
        SET status = $2,
            interview_at = COALESCE($3::timestamptz, interview_at),
            interview_location = CASE WHEN $4 != '' THEN $4 ELSE interview_location END,
            interview_duration_minutes = COALESCE($5, interview_duration_minutes),
            notes = CASE WHEN $6 != '' THEN $6 ELSE notes END,
            form_data = $7::jsonb,
            updated_at = now()
        WHERE id = $1::uuid
        RETURNING id, job_id, user_id, status, full_name, email, phone,
                  cover_letter, portfolio_url, resume_url, skills_match_score,
                  form_data, notes, applied_at, updated_at, interview_at, interview_location,
                  interview_duration_minutes`, [
        input.id,
        normalizedStatus,
        input.interviewAt || null,
        input.interviewLocation?.trim().slice(0, 500) || "",
        input.duration ?? null,
        input.notes?.trim().slice(0, 2000) || "",
        JSON.stringify(updatedFormData),
      ]);

      // Notify candidate of status update
      const notif = await client.query<{ id: string }>(`
        INSERT INTO public.notifications (recipient_id, title, message, type, is_read, entity_type, entity_id, action_url)
        VALUES ($1::uuid, $2, $3, 'job_application_update', false, 'job_application', $4::uuid, '/dashboard/jobs')
        RETURNING id`, [
        app.user_id,
        `Application Status Update: ${app.job_title}`,
        input.interviewAt
          ? `Interview scheduled for ${app.job_title} on ${new Date(input.interviewAt).toLocaleString()}. Location: ${input.interviewLocation || "Online"}`
          : `Your application status for "${app.job_title}" is now "${normalizedStatus.replace(/_/g, " ")}".`,
        app.id,
      ]);

      await appendNotificationEvent(client, app.user_id, notif.rows[0].id);

      return updated.rows[0];
    };

    if (transactionClient) return runWith(transactionClient);
    return withTransaction(runWith);
  }

  async scheduleInterview(
    actor: NeonActor,
    applicationId: string,
    params: {
      interviewAt: string;
      interviewLocation: string;
      interviewDurationMinutes?: number;
      interviewType?: "in_person" | "online" | "phone" | "other";
    },
    transactionClient?: Pick<PoolClient, "query">,
  ): Promise<JobApplicationDetailRow> {
    return this.reviewApplication(
      actor,
      {
        id: applicationId,
        status: "interview_scheduled",
        interviewAt: params.interviewAt,
        interviewLocation: params.interviewLocation,
        duration: params.interviewDurationMinutes ?? 45,
        interviewType: params.interviewType ?? "online",
      },
      transactionClient
    );
  }

  async getStudentInterviews(actor: NeonActor): Promise<any[]> {
    const rows = await this.db.query<any>(`
      SELECT a.id, a.job_id, a.status, a.interview_at, a.interview_location,
             a.interview_duration_minutes, a.notes, a.form_data,
             j.id AS j_id, j.title AS j_title, j.location AS j_location,
             c.id AS c_id, c.name AS c_name, c.logo_url AS c_logo_url
      FROM public.job_applications a
      JOIN public.jobs j ON j.id = a.job_id
      LEFT JOIN public.companies c ON c.id = j.company_id
      WHERE a.user_id = $1::uuid
        AND a.interview_at IS NOT NULL
        AND a.deleted_at IS NULL
      ORDER BY a.interview_at ASC`, [actor.userId]);

    return rows.map((row) => {
      const formData = typeof row.form_data === "object" && row.form_data !== null ? row.form_data : {};
      return {
        id: row.id,
        job_id: row.job_id,
        status: row.status,
        interview_at: row.interview_at,
        interview_location: row.interview_location,
        interview_duration_minutes: row.interview_duration_minutes,
        interview_type: formData.interviewType ?? "online",
        interview_notes: formData.interviewNotes ?? row.notes,
        interview_status: formData.interviewStatus ?? "scheduled",
        job: row.j_id ? {
          id: row.j_id,
          title: row.j_title,
          location: row.j_location,
          company: row.c_id ? {
            id: row.c_id,
            name: row.c_name,
            logo_url: row.c_logo_url,
          } : null,
        } : null,
      };
    });
  }

  async getStudentJobPreferences(actor: NeonActor): Promise<JobPreferences> {
    const rows = await this.db.query<{ job_preferences: JobPreferences }>(`
      SELECT job_preferences
      FROM public.profiles
      WHERE user_id = $1::uuid AND account_status = 'active' AND deleted_at IS NULL
      LIMIT 1`, [actor.userId]);

    return rows[0]?.job_preferences ?? {};
  }

  async updateStudentJobPreferences(actor: NeonActor, prefs: JobPreferences): Promise<JobPreferences> {
    const rows = await this.db.query<{ job_preferences: JobPreferences }>(`
      UPDATE public.profiles
      SET job_preferences = $2::jsonb,
          updated_at = now()
      WHERE user_id = $1::uuid AND account_status = 'active' AND deleted_at IS NULL
      RETURNING job_preferences`, [actor.userId, JSON.stringify(prefs)]);

    if (!rows[0]) throw new NeonAuthorizationError(404, "PROFILE_NOT_FOUND", "Profile not found.");
    return rows[0].job_preferences;
  }

  async getMatchingJobs(actor: NeonActor): Promise<any[]> {
    const profileRows = await this.db.query<{
      skills: string[] | null;
      location: string | null;
      experience_level: string | null;
      job_preferences: JobPreferences | null;
    }>(`
      SELECT skills, location, experience_level, job_preferences
      FROM public.profiles
      WHERE user_id = $1::uuid AND account_status = 'active' AND deleted_at IS NULL
      LIMIT 1`, [actor.userId]);

    const profile = profileRows[0] ?? {
      skills: [],
      location: null,
      experience_level: null,
      job_preferences: null,
    };

    const jobs = await this.listPublicJobs({ limit: 50 });

    const scoredJobs = jobs.map((job) => {
      const match = calculateJobMatch(
        {
          skills: profile.skills || [],
          location: profile.location,
          experience_level: profile.experience_level,
          job_preferences: profile.job_preferences,
        },
        job
      );
      return {
        ...job,
        matchScore: match.matchScore,
        matchReasons: match.matchReasons,
      };
    });

    scoredJobs.sort((a, b) => b.matchScore - a.matchScore);
    return scoredJobs;
  }
}
