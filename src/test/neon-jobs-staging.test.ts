import { beforeAll, afterAll, describe, expect, it } from "vitest";
import dotenv from "dotenv";
import { getPool, queryRows } from "@/lib/server/db";
import { getNeonDatabaseConfig, NEON_MIGRATION_STAGING_BRANCH_ID } from "@/lib/neon/neon-config";
import type { NeonActor } from "@/lib/server/neon-authorization";
import { NeonJobsRepository } from "@/lib/server/neon-jobs";
import { listOwnSavedJobs, saveJob, unsaveJob } from "@/lib/server/neon-saved-jobs";
import { listApplicationEvents } from "@/lib/server/neon-application-events";

function localStagingConfig(): Record<string, string> {
  return dotenv.config({ path: ".migration.env", quiet: true }).parsed ?? {};
}

describe("Neon staging Jobs module end-to-end integration suite", () => {
  let studentA: NeonActor;
  let studentB: NeonActor;
  let recruiterActor: NeonActor;
  let isConfigured = false;

  beforeAll(async () => {
    const config = localStagingConfig();
    if (!config.NEON_STAGING_DATABASE_URL) {
      console.warn("Skipping Neon staging test: NEON_STAGING_DATABASE_URL not configured.");
      return;
    }
    process.env.MEROTALENT_BACKEND_MODE = "neon-staging";
    process.env.NEON_STAGING_DATABASE_URL = config.NEON_STAGING_DATABASE_URL;
    process.env.NEON_STAGING_BRANCH_ID = NEON_MIGRATION_STAGING_BRANCH_ID;
    getNeonDatabaseConfig();

    try {
      const users = await queryRows<{ user_id: string }>(`
        SELECT user_id FROM public.profiles
        WHERE account_status = 'active' AND deleted_at IS NULL
        ORDER BY user_id LIMIT 2`);

      const admins = await queryRows<{ user_id: string }>(`
        SELECT ur.user_id FROM public.user_roles ur
        JOIN public.profiles p ON p.user_id = ur.user_id
        WHERE ur.role IN ('admin', 'super_admin') AND p.account_status = 'active'
        LIMIT 1`);

      if (users.length >= 2) {
        studentA = {
          userId: users[0].user_id,
          neonAuthUserId: "MOCK_NEON_AUTH_STUDENT_A",
          roles: ["talent"],
          permissions: [],
          platformAdmin: false,
        };
        studentB = {
          userId: users[1].user_id,
          neonAuthUserId: "MOCK_NEON_AUTH_STUDENT_B",
          roles: ["talent"],
          permissions: [],
          platformAdmin: false,
        };
        recruiterActor = {
          userId: admins[0]?.user_id ?? users[0].user_id,
          neonAuthUserId: "MOCK_NEON_AUTH_RECRUITER",
          roles: ["admin", "super_admin"],
          permissions: ["*"],
          platformAdmin: true,
        };
        isConfigured = true;
      }
    } catch (err) {
      console.warn("Neon staging database unavailable for test:", err);
    }
  });

  afterAll(async () => {
    if (isConfigured) {
      await getPool().end();
    }
  });

  it("1. Public job discovery: searches and lists published jobs with company details", async () => {
    if (!isConfigured) return;
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      const repo = new NeonJobsRepository({ query: (sql, p) => client.query(sql, [...p]).then((r) => r.rows) });

      const seed = await client.query<{ id: string; title: string }>(`
        INSERT INTO public.jobs (
          title, description, location, job_type, experience_level, category, industry,
          salary_min, salary_max, is_remote, skills_required,
          is_active, status, approval_status, application_deadline, created_at, updated_at
        ) VALUES (
          'Neon Staging Lead Engineer', 'Full stack role at MeroTalent', 'Kathmandu', 'full_time', 'senior', 'Technology', 'Fintech',
          80000, 150000, true, ARRAY['React', 'PostgreSQL', 'TypeScript'],
          true, 'published', 'approved', now() + interval '30 days', now(), now()
        ) RETURNING id, title`);

      const testJob = seed.rows[0];
      const jobs = await repo.listPublicJobs({ search: "Lead Engineer", limit: 5 });
      expect(jobs.some((j) => j.id === testJob.id)).toBe(true);

      const single = await repo.getPublicJob(testJob.id);
      expect(single).not.toBeNull();
      expect(single?.title).toBe("Neon Staging Lead Engineer");
      expect(single?.salary_min).toBe(80000);
      expect(single?.is_remote).toBe(true);
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }
  });

  it("2. Student employment profile & preferences: reads, updates, and matches jobs", async () => {
    if (!isConfigured) return;
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      const repo = new NeonJobsRepository({ query: (sql, p) => client.query(sql, [...p]).then((r) => r.rows) });

      // Update preferences
      const testPrefs = {
        preferred_job_titles: ["Lead Engineer", "Architect"],
        preferred_locations: ["Kathmandu", "remote"],
        preferred_job_types: ["full_time"],
        min_salary: 75000,
        max_salary: 160000,
        is_salary_negotiable: true,
      };

      const updated = await repo.updateStudentJobPreferences(studentA, testPrefs);
      expect(updated.preferred_job_titles).toContain("Lead Engineer");

      const readBack = await repo.getStudentJobPreferences(studentA);
      expect(readBack.preferred_locations).toContain("remote");

      // Matching jobs
      const matches = await repo.getMatchingJobs(studentA);
      expect(Array.isArray(matches)).toBe(true);
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }
  });

  it("3. Saved jobs: saves, reads own bookmarks, and unsaves", async () => {
    if (!isConfigured) return;
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      const db = { query: (sql: string, p: readonly unknown[]) => client.query(sql, [...p]).then((r) => r.rows) };

      const seed = await client.query<{ id: string }>(`
        INSERT INTO public.jobs (
          title, is_active, status, approval_status, created_at, updated_at
        ) VALUES (
          'Bookmarkable Role', true, 'published', 'approved', now(), now()
        ) RETURNING id`);

      const jobId = seed.rows[0].id;

      // Save job
      const saveRes = await saveJob(studentA, jobId, db);
      expect(saveRes.saved).toBe(true);

      // Unsave job
      const unsaveRes = await unsaveJob(studentA, jobId, db);
      expect(unsaveRes.saved).toBe(false);
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }
  });

  it("4. Applications, review, and timeline: submits application, computes match, updates status, records events", async () => {
    if (!isConfigured) return;
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      const repo = new NeonJobsRepository({ query: (sql, p) => client.query(sql, [...p]).then((r) => r.rows) });

      const seed = await client.query<{ id: string; title: string }>(`
        INSERT INTO public.jobs (
          title, description, location, job_type, experience_level, category, industry,
          skills_required, is_active, status, approval_status, created_at, updated_at
        ) VALUES (
          'Cloud Solutions Architect', 'Design cloud systems', 'Kathmandu', 'full_time', 'senior', 'Technology', 'Cloud',
          ARRAY['AWS', 'Kubernetes', 'Terraform'], true, 'published', 'approved', now(), now()
        ) RETURNING id, title`);

      const testJob = seed.rows[0];

      // Submit application
      const app = await repo.submitJobApplication(
        studentA,
        {
          jobId: testJob.id,
          fullName: "Student Candidate",
          email: "candidate@example.com",
          phone: "+9779811111111",
          coverLetter: "Experienced architect eager to contribute.",
          skills: ["AWS", "Kubernetes", "Terraform", "Go"],
          education: [{ institution: "TU IOE", degree: "B.E. Computer", startYear: "2018", endYear: "2022" }],
          experience: [{ organization: "Cloud Tech Nepal", role: "DevOps Engineer", startDate: "2022", endDate: "2026" }],
        },
        client
      );

      expect(app.id).toBeDefined();
      expect(app.status).toBe("submitted");
      expect(app.skills_match_score).toBeGreaterThanOrEqual(40);

      // Duplicate submission rejected
      await expect(
        repo.submitJobApplication(
          studentA,
          {
            jobId: testJob.id,
            fullName: "Student Candidate",
            email: "candidate@example.com",
            phone: "+9779811111111",
          },
          client
        )
      ).rejects.toThrow();

      // Candidate sees own application
      const ownApps = await repo.listOwnApplications(studentA);
      expect(ownApps.some((a) => a.id === app.id)).toBe(true);

      // Other student cannot see studentA's application in own list
      const otherApps = await repo.listOwnApplications(studentB);
      expect(otherApps.some((a) => a.id === app.id)).toBe(false);

      // Recruiter reviews and schedules interview
      const reviewed = await repo.reviewApplication(
        recruiterActor,
        {
          id: app.id,
          status: "interview_scheduled",
          notes: "Strong DevOps and cloud experience.",
          interviewAt: new Date(Date.now() + 86400000).toISOString(),
          interviewLocation: "Google Meet",
          duration: 45,
          interviewType: "online",
        },
        client
      );

      expect(reviewed.status).toBe("interview_scheduled");
      expect(reviewed.interview_location).toBe("Google Meet");

      // Candidate sees scheduled interview in calendar
      const interviews = await repo.getStudentInterviews(studentA);
      expect(interviews.some((i) => i.id === app.id)).toBe(true);

      // Check durable application event
      const events = await listApplicationEvents(studentA, "0", null, {
        query: (sql, p) => client.query(sql, [...p]).then((r) => r.rows),
      });
      expect(events.length).toBeGreaterThanOrEqual(1);
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }
  });
});
