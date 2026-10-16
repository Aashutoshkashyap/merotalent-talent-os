/**
 * Neon staging Jobs repository and service.
 * Enforces active profiles, verified identity links, entity scope, and atomic state transitions.
 */
import type { PoolClient, QueryResultRow } from "pg";
import { withTransaction } from "./db";
import {
  NeonAuthorizationError,
  neonQueryExecutor,
  requireEntityAccess,
  type NeonActor,
  type NeonQueryExecutor,
} from "./neon-authorization";
import { appendNotificationEvent } from "./neon-application-events";
import { calculateJobMatch, type JobPreferences } from "../jobs/job-matching";
import { assertMediaObjectPath } from "./media-policy";
import { headObject } from "./storage";
import { requireRoleWorkspaceAccess } from "./neon-role-workspaces";

export async function requireApplicationRead(actor: NeonActor, type: "company" | "job", id: string, db: NeonQueryExecutor = neonQueryExecutor) {
  for (const feature of ["job_applications", "application_management", "lead_viewing"]) {
    try { await requireEntityAccess(actor, "jobs", type, id, feature, db); return; }
    catch (error) { if (!(error instanceof NeonAuthorizationError && error.code === "ENTITY_ACCESS_REQUIRED")) throw error; }
  }
  throw new NeonAuthorizationError(403, "ENTITY_ACCESS_REQUIRED", "Active application access is required.");
}

const currentLinkedProfile = `EXISTS (
  SELECT 1 FROM public.profiles p
  JOIN public.neon_application_accounts account ON account.legacy_user_id = p.user_id
    AND account.status = 'active'
  JOIN public.neon_identity_links link ON link.application_account_id = account.id
    AND link.neon_auth_user_id = $2::uuid AND link.status = 'verified'
  WHERE p.user_id = $1::uuid AND p.account_status = 'active' AND p.deleted_at IS NULL
)`;

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
  experienceLetterUrl?: string;
  trainingDocumentUrl?: string;
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

const allowedJobTransitions: Record<string, readonly string[]> = {
  submitted: ["screening", "follow_up", "shortlisted", "interview", "interview_scheduled", "offered", "rejected", "withdrawn"],
  screening: ["follow_up", "shortlisted", "interview", "interview_scheduled", "offered", "rejected"],
  follow_up: ["screening", "shortlisted", "interview", "interview_scheduled", "offered", "rejected"],
  shortlisted: ["follow_up", "interview", "interview_scheduled", "offered", "rejected"],
  interview: ["interview_scheduled", "offered", "rejected", "follow_up"],
  interview_scheduled: ["interview", "offered", "rejected", "follow_up"],
  offered: ["confirmed", "rejected"],
  confirmed: [], rejected: [], withdrawn: [],
};

export function canTransitionJobApplication(current: string, next: string): boolean {
  return current === next || !!allowedJobTransitions[current]?.includes(next);
}

export class NeonJobsRepository {
  constructor(private readonly db: NeonQueryExecutor = neonQueryExecutor) {}

  async listPublicJobs(params: {
    search?: string;
    location?: string;
    jobType?: string;
    category?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<PublicJobRow[]> {
    const limit = Math.min(100, Math.max(1, params.limit ?? 50));
    const offset = Math.max(0, params.offset ?? 0);
    const searchFilter = params.search?.trim() ? `%${params.search.trim().toLowerCase()}%` : null;
    const locationFilter = params.location?.trim() ? `%${params.location.trim().toLowerCase()}%` : null;
    const typeFilter = params.jobType?.trim() || null;
    const categoryFilter = params.category?.trim() || null;

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
        AND ($6::text IS NULL OR j.category = $6)
      ORDER BY j.created_at DESC
      LIMIT $4 OFFSET $5`, [searchFilter, locationFilter, typeFilter, limit, offset, categoryFilter]);

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
        expires_at: Date | null;
      }>(`
        SELECT id, title, company_id, location, job_type, experience_level,
               category, industry, skills_required, is_remote,
               status, approval_status, is_active, application_deadline, expires_at
        FROM public.jobs
        WHERE id = $1::uuid AND deleted_at IS NULL FOR UPDATE`, [input.jobId]);

      const job = jobRows.rows[0];
      if (!job || !job.is_active || job.status !== "published" || job.approval_status !== "approved") {
        throw new NeonAuthorizationError(403, "JOB_NOT_ACCEPTING_APPLICATIONS", "This job is not accepting applications.");
      }
      if (job.application_deadline && new Date(job.application_deadline).getTime() < Date.now()) {
        throw new NeonAuthorizationError(403, "DEADLINE_PASSED", "The deadline for this job has passed.");
      }
      if (job.expires_at && new Date(job.expires_at).getTime() <= Date.now()) {
        throw new NeonAuthorizationError(403, "JOB_EXPIRED", "This job has expired.");
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
        SELECT p.id, p.full_name, p.email, p.phone, p.location, p.bio, p.skills,
               p.experience_level, p.job_preferences, p.education_history,
               p.experience_history, p.certifications, p.resume_url
        FROM public.profiles p
        JOIN public.neon_application_accounts account ON account.legacy_user_id = p.user_id
          AND account.status = 'active'
        JOIN public.neon_identity_links link ON link.application_account_id = account.id
          AND link.neon_auth_user_id = $2::uuid AND link.status = 'verified'
        WHERE p.user_id = $1::uuid AND p.account_status = 'active' AND p.deleted_at IS NULL
        LIMIT 1 FOR SHARE OF p, account, link`, [actor.userId, actor.neonAuthUserId]);

      const profile = profileRows.rows[0];
      if (!profile) {
        throw new NeonAuthorizationError(403, "IDENTITY_NOT_LINKED", "A current verified profile is required to apply.");
      }
      if (!profile.full_name?.trim() || !profile.email?.trim() || !profile.phone?.trim()) {
        throw new NeonAuthorizationError(403, "PROFILE_INCOMPLETE", "Complete your profile before applying.");
      }

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

      // A browser-supplied URL could point at another applicant's private CV.
      const resumeUrlSnapshot = profile.resume_url || null;
      const submittedDocuments = [
        { path: input.experienceLetterUrl, kind: "experience" },
        { path: input.trainingDocumentUrl, kind: "training" },
      ].filter((item): item is { path: string; kind: string } => Boolean(item.path));
      if (new Set(submittedDocuments.map(item => item.path)).size !== submittedDocuments.length) {
        throw new NeonAuthorizationError(400, "APPLICATION_DOCUMENT_DUPLICATE", "Upload each document separately.");
      }
      for (const { path, kind } of submittedDocuments) {
        if (!path) continue;
        assertMediaObjectPath({ module: "job_attachment", resourceId: job.id, path }, actor.userId);
        // This lock serializes submission with explicit deletion and aged-draft
        // cleanup. An object key alone is never proof of an authorized draft.
        const draft = await client.query<{ path: string }>(`SELECT path FROM public.neon_job_document_drafts
          WHERE path=$1 AND job_id=$2::uuid AND user_id=$3::uuid
            AND kind=$4 AND state='draft' FOR UPDATE`, [path, job.id, actor.userId, kind]);
        if (!draft.rows[0]) {
          throw new NeonAuthorizationError(400, "APPLICATION_DOCUMENT_NOT_DRAFT", "Upload the document again.");
        }
        if (!await headObject("job-files", path)) {
          throw new NeonAuthorizationError(400, "APPLICATION_DOCUMENT_MISSING", "An application document is missing. Upload it again.");
        }
      }

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
        fullName: profile.full_name.trim(),
        email: profile.email.trim(),
        phone: profile.phone.trim(),
        coverLetter: input.coverLetter?.trim() ?? null,
        portfolioUrl: input.portfolioUrl?.trim() ?? null,
        resumeUrl: resumeUrlSnapshot,
        experienceLetterUrl: input.experienceLetterUrl ?? null,
        trainingDocumentUrl: input.trainingDocumentUrl ?? null,
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

      for (const { path } of submittedDocuments) {
        await client.query(`UPDATE public.neon_job_document_drafts
          SET state='submitted', application_id=$2::uuid WHERE path=$1 AND state='draft'`,
        [path, appRow.id]);
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
        AND ${currentLinkedProfile}
      ORDER BY a.applied_at DESC
      LIMIT 100`, [actor.userId, actor.neonAuthUserId]);

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
        await requireApplicationRead(actor, "company", job.company_id, this.db);
      } else {
        await requireApplicationRead(actor, "job", jobId, this.db);
      }

      return this.db.query<JobApplicationDetailRow>(`
        SELECT a.id, a.job_id, j.title AS job_title, a.user_id, a.status, a.full_name, a.email, a.phone,
               a.cover_letter, a.portfolio_url, a.resume_url, a.skills_match_score,
               a.form_data, a.notes, a.applied_at, a.updated_at, a.interview_at, a.interview_location,
               a.interview_duration_minutes
        FROM public.job_applications a
        JOIN public.jobs j ON j.id=a.job_id AND j.deleted_at IS NULL
        WHERE a.job_id = $3::uuid AND a.deleted_at IS NULL
          AND ${currentLinkedProfile}
        ORDER BY a.applied_at DESC
        LIMIT 100 OFFSET $4::integer`, [actor.userId, actor.neonAuthUserId, jobId, offset]);
    }

    return this.db.query<JobApplicationDetailRow>(`
      SELECT a.id, a.job_id, j.title AS job_title, a.user_id, a.status, a.full_name, a.email, a.phone,
             a.cover_letter, a.portfolio_url, a.resume_url, a.skills_match_score,
             a.form_data, a.notes, a.applied_at, a.updated_at, a.interview_at, a.interview_location,
             a.interview_duration_minutes
      FROM public.job_applications a
      JOIN public.jobs j ON j.id=a.job_id AND j.deleted_at IS NULL
      WHERE a.deleted_at IS NULL AND ${currentLinkedProfile}
        AND (
          EXISTS (SELECT 1 FROM public.user_roles ur
                  WHERE ur.user_id=$1::uuid AND ur.role IN ('admin','super_admin'))
          OR (
            EXISTS (
              SELECT 1 FROM public.entity_admin_assignments ea
              JOIN public.user_module_capabilities umc ON umc.id=ea.user_capability_id
              JOIN public.module_capabilities mc ON mc.id=umc.capability_id
              WHERE ea.user_id=$1::uuid AND ea.status='active'
                AND umc.status='active' AND mc.is_active AND mc.module_key='jobs'
                AND (umc.expires_at IS NULL OR umc.expires_at>now())
                AND ((j.company_id IS NOT NULL AND ea.entity_type='company' AND ea.entity_id=j.company_id)
                  OR (j.company_id IS NULL AND ea.entity_type='job' AND ea.entity_id=j.id))
            )
            AND EXISTS (
              SELECT 1 FROM public.module_entitlements e
              LEFT JOIN public.packages p ON p.id=e.package_id
              WHERE e.user_id=$1::uuid AND e.module_key='jobs' AND e.status='active'
                AND e.start_at<=now() AND (e.expires_at IS NULL OR e.expires_at>now())
                AND ((j.company_id IS NOT NULL AND e.entity_type='company' AND e.entity_id=j.company_id)
                  OR (j.company_id IS NULL AND e.entity_type='job' AND e.entity_id=j.id))
                AND (e.features->>'job_applications'='true' OR p.features->>'job_applications'='true'
                  OR e.features->>'application_management'='true' OR p.features->>'application_management'='true'
                  OR e.features->>'lead_viewing'='true' OR p.features->>'lead_viewing'='true'
                  OR EXISTS (SELECT 1 FROM public.entity_feature_grants g
                    WHERE g.user_id=$1::uuid AND g.module_key='jobs' AND g.feature_key IN ('job_applications','application_management','lead_viewing')
                      AND g.status='active' AND g.entity_type=e.entity_type AND g.entity_id=e.entity_id))
            )
          )
        )
      ORDER BY a.applied_at DESC
      LIMIT 100 OFFSET $3::integer`, [actor.userId, actor.neonAuthUserId, offset]);
  }

  async reviewApplication(
    actor: NeonActor,
    input: ReviewApplicationInput,
    transactionClient?: Pick<PoolClient, "query">,
  ): Promise<JobApplicationDetailRow> {
    const runWith = async (client: Pick<PoolClient, "query">) => {
      const liveActor = await client.query<{ is_admin: boolean }>(`
        SELECT EXISTS (SELECT 1 FROM public.user_roles ur
                       WHERE ur.user_id = p.user_id AND ur.role IN ('admin','super_admin')) AS is_admin
        FROM public.profiles p
        JOIN public.neon_application_accounts account ON account.legacy_user_id = p.user_id
          AND account.status = 'active'
        JOIN public.neon_identity_links link ON link.application_account_id = account.id
          AND link.neon_auth_user_id = $2::uuid AND link.status = 'verified'
        WHERE p.user_id = $1::uuid AND p.account_status = 'active' AND p.deleted_at IS NULL
        LIMIT 1 FOR SHARE OF p, account, link`, [actor.userId, actor.neonAuthUserId]);
      if (!liveActor.rows[0]) {
        throw new NeonAuthorizationError(403, "IDENTITY_NOT_LINKED", "A current verified account is required.");
      }
      if (actor.platformAdmin && !liveActor.rows[0].is_admin) {
        throw new NeonAuthorizationError(403, "ADMIN_ACCESS_REVOKED", "Administrative access is no longer active.");
      }
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

      await requireRoleWorkspaceAccess(client, actor, "jobs", app.company_id ? "company" : "job",
        app.company_id || app.job_id, "application_management");

      const normalizedStatus = input.status === "applied" ? "submitted" : input.status === "selected" ? "offered" : input.status;
      if (!canTransitionJobApplication(app.status, normalizedStatus)) {
        throw new NeonAuthorizationError(403, "INVALID_APPLICATION_TRANSITION", "This application status cannot be changed that way.");
      }
      if (input.interviewAt && (!Number.isFinite(Date.parse(input.interviewAt)) || Date.parse(input.interviewAt) <= Date.now())) {
        throw new NeonAuthorizationError(403, "INVALID_INTERVIEW_TIME", "Schedule an interview for a future time.");
      }
      if (normalizedStatus === "interview_scheduled" && !input.interviewAt) {
        throw new NeonAuthorizationError(403, "INTERVIEW_TIME_REQUIRED", "An interview time is required.");
      }
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
        AND ${currentLinkedProfile}
      ORDER BY a.interview_at ASC`, [actor.userId, actor.neonAuthUserId]);

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
        AND ${currentLinkedProfile}
      LIMIT 1`, [actor.userId, actor.neonAuthUserId]);

    if (!rows[0]) throw new NeonAuthorizationError(403, "IDENTITY_NOT_LINKED", "A linked profile is required.");
    return rows[0].job_preferences ?? {};
  }

  async updateStudentJobPreferences(actor: NeonActor, prefs: JobPreferences): Promise<JobPreferences> {
    const rows = await this.db.query<{ job_preferences: JobPreferences }>(`
      UPDATE public.profiles
      SET job_preferences = $3::jsonb,
          updated_at = now()
      WHERE user_id = $1::uuid AND account_status = 'active' AND deleted_at IS NULL
        AND ${currentLinkedProfile}
      RETURNING job_preferences`, [actor.userId, actor.neonAuthUserId, JSON.stringify(prefs)]);

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
        AND ${currentLinkedProfile}
      LIMIT 1`, [actor.userId, actor.neonAuthUserId]);

    const profile = profileRows[0];
    if (!profile) throw new NeonAuthorizationError(403, "IDENTITY_NOT_LINKED", "A linked profile is required.");

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
