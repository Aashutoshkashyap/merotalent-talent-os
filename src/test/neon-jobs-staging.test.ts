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

  beforeAll(async () => {
    const config = localStagingConfig();
    if (!config.NEON_STAGING_DATABASE_URL) {
      throw new Error("NEON_STAGING_DATABASE_URL is required for staging Jobs tests.");
    }
    process.env.MEROTALENT_BACKEND_MODE = "neon-staging";
    process.env.NEON_STAGING_DATABASE_URL = config.NEON_STAGING_DATABASE_URL;
    process.env.NEON_STAGING_BRANCH_ID = NEON_MIGRATION_STAGING_BRANCH_ID;
    getNeonDatabaseConfig();

    const linked = await queryRows<{ legacy_user_id: string; neon_auth_user_id: string }>(`
      SELECT a.legacy_user_id, l.neon_auth_user_id
      FROM public.neon_identity_links l
      JOIN public.neon_application_accounts a ON a.id = l.application_account_id
      JOIN public.profiles p ON p.user_id = a.legacy_user_id
      WHERE l.status = 'verified' AND a.status = 'active'
        AND p.account_status = 'active' AND p.deleted_at IS NULL
      LIMIT 1`);
    if (!linked[0]) throw new Error("A verified synthetic staging identity is required.");
    const other = await queryRows<{ user_id: string }>(`
      SELECT user_id FROM public.profiles WHERE user_id <> $1::uuid
        AND account_status = 'active' AND deleted_at IS NULL LIMIT 1`, [linked[0].legacy_user_id]);
    if (!other[0]) throw new Error("A separate staging profile is required for isolation tests.");

    studentA = {
      userId: linked[0].legacy_user_id,
      neonAuthUserId: linked[0].neon_auth_user_id,
      roles: ["talent"], permissions: [], platformAdmin: false,
    };
    studentB = {
      userId: other[0].user_id,
      neonAuthUserId: "00000000-0000-4000-8000-000000000001",
      roles: ["talent"], permissions: [], platformAdmin: false,
    };
  });

  afterAll(async () => {
    await getPool().end();
  });

  it("1. Public job discovery: searches and lists published jobs with company details", async () => {
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
      await expect(saveJob(studentB, jobId, db))
        .rejects.toMatchObject({ code: "JOB_SAVE_DENIED" });
      const foreignBookmarks = await client.query<{ count: number }>(`
        SELECT count(*)::int AS count FROM public.saved_jobs
        WHERE user_id=$1::uuid AND job_id=$2::uuid`, [studentB.userId, jobId]);
      expect(foreignBookmarks.rows[0].count).toBe(0);

      // Unsave job
      const unsaveRes = await unsaveJob(studentA, jobId, db);
      expect(unsaveRes.saved).toBe(false);
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }
  });

  it("4. Applications, review, and timeline: submits application, computes match, updates status, records events", async () => {
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      await client.query(`UPDATE public.profiles SET full_name='Staging Jobs Candidate',
        email='neon-jobs-candidate@example.com', phone='9800000000'
        WHERE user_id=$1::uuid`, [studentA.userId]);
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

      await expect(repo.submitJobApplication(studentB, {
        jobId: testJob.id, fullName: "Forged", email: "forged@example.com", phone: "9800000000",
      }, client)).rejects.toMatchObject({ code: "IDENTITY_NOT_LINKED" });
      const applicationCount = await client.query<{ count: number }>(`
        SELECT count(*)::int AS count FROM public.job_applications WHERE job_id=$1::uuid`, [testJob.id]);
      expect(applicationCount.rows[0].count).toBe(1);

      await expect(repo.reviewApplication(studentB, {
        id: app.id, status: "offered", notes: "Unauthorized change",
      }, client)).rejects.toMatchObject({ status: 403 });
      const unchanged = await client.query<{ status: string }>(`
        SELECT status FROM public.job_applications WHERE id=$1::uuid`, [app.id]);
      expect(unchanged.rows[0].status).toBe("submitted");

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
      await client.query(`INSERT INTO public.user_roles(user_id,role)
        SELECT $1::uuid,'super_admin' WHERE NOT EXISTS (
          SELECT 1 FROM public.user_roles WHERE user_id=$1::uuid AND role='super_admin')`, [studentA.userId]);
      const temporaryAdmin: NeonActor = { ...studentA, roles: ["super_admin"], platformAdmin: true };
      const reviewed = await repo.reviewApplication(
        temporaryAdmin,
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
      await expect(repo.reviewApplication(temporaryAdmin, {
        id: app.id, status: "submitted",
      }, client)).rejects.toMatchObject({ code: "INVALID_APPLICATION_TRANSITION" });
      const [stillScheduled] = (await client.query<{ status: string }>(`
        SELECT status FROM public.job_applications WHERE id=$1::uuid`, [app.id])).rows;
      expect(stillScheduled.status).toBe("interview_scheduled");

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

  it("5. A scoped recruiter sees and changes only the assigned company's applications", async () => {
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      const [existingCompany] = (await client.query<{ id: string }>(`
        SELECT id FROM public.companies ORDER BY id LIMIT 1`)).rows;
      expect(existingCompany).toBeDefined();
      const [otherOwner] = (await client.query<{ user_id: string }>(`
        SELECT p.user_id FROM public.profiles p
        WHERE p.user_id <> $1::uuid
          AND NOT EXISTS (SELECT 1 FROM public.companies c WHERE c.user_id=p.user_id)
        LIMIT 1`, [studentA.userId])).rows;
      expect(otherOwner).toBeDefined();
      const [otherCompany] = (await client.query<{ id: string }>(`
        INSERT INTO public.companies(user_id,name)
        VALUES ($1::uuid,'Neon Jobs Isolation Company') RETURNING id`, [otherOwner.user_id])).rows;
      const [ownJob] = (await client.query<{ id: string }>(`
        INSERT INTO public.jobs(company_id,title,status,approval_status,is_active)
        VALUES ($1::uuid,'Scoped Jobs UAT','published','approved',true) RETURNING id`, [existingCompany.id])).rows;
      const [foreignJob] = (await client.query<{ id: string }>(`
        INSERT INTO public.jobs(company_id,title,status,approval_status,is_active)
        VALUES ($1::uuid,'Foreign Jobs UAT','published','approved',true) RETURNING id`, [otherCompany.id])).rows;
      const [ownApplication] = (await client.query<{ id: string }>(`
        INSERT INTO public.job_applications(job_id,user_id,status,full_name,email)
        VALUES ($1::uuid,$2::uuid,'submitted','Staging Candidate','candidate@example.com') RETURNING id`,
        [ownJob.id, studentB.userId])).rows;
      const [foreignApplication] = (await client.query<{ id: string }>(`
        INSERT INTO public.job_applications(job_id,user_id,status,full_name,email)
        VALUES ($1::uuid,$2::uuid,'submitted','Staging Candidate','candidate@example.com') RETURNING id`,
        [foreignJob.id, studentB.userId])).rows;
      const [capability] = (await client.query<{ id: string }>(`
        INSERT INTO public.user_module_capabilities(user_id,capability_id,status)
        SELECT $1::uuid,id,'active' FROM public.module_capabilities WHERE module_key='jobs'
        ON CONFLICT (user_id,capability_id) DO UPDATE SET status='active'
        RETURNING id`, [studentA.userId])).rows;
      await client.query(`INSERT INTO public.entity_admin_assignments
        (user_id,user_capability_id,entity_type,entity_id,status)
        VALUES ($1::uuid,$2::uuid,'company',$3::uuid,'active')
        ON CONFLICT (user_capability_id,entity_type,entity_id) DO UPDATE SET status='active'`,
        [studentA.userId, capability.id, existingCompany.id]);
      await client.query(`INSERT INTO public.module_entitlements
        (user_id,module_key,entity_type,entity_id,source,status,features)
        VALUES ($1::uuid,'jobs','company',$2::uuid,'ADMIN_MANUAL','active',
                '{"job_applications":true}'::jsonb)`, [studentA.userId, existingCompany.id]);
      const repo = new NeonJobsRepository({ query: (sql, p) => client.query(sql, [...p]).then(r => r.rows) });
      const own = await repo.listRecruiterApplications(studentA, ownJob.id);
      expect(own.some(item => item.id === ownApplication.id)).toBe(true);
      expect(own.some(item => item.id === foreignApplication.id)).toBe(false);
      await expect(repo.listRecruiterApplications(studentA, foreignJob.id))
        .rejects.toMatchObject({ status: 403 });
      await expect(repo.reviewApplication(studentA, {
        id: foreignApplication.id, status: 'screening',
      }, client)).rejects.toMatchObject({ status: 403 });
      const [unchanged] = (await client.query<{ status: string }>(`
        SELECT status FROM public.job_applications WHERE id=$1::uuid`, [foreignApplication.id])).rows;
      expect(unchanged.status).toBe('submitted');
      const reviewed = await repo.reviewApplication(studentA, {
        id: ownApplication.id, status: 'screening',
      }, client);
      expect(reviewed.status).toBe('screening');
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }
  });
});
