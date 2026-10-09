import { beforeAll, afterAll, describe, expect, it } from "vitest";
import dotenv from "dotenv";
import { S3Client, GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { createHash, randomUUID } from "node:crypto";
import { getPool, queryRows, withTransaction } from "@/lib/server/db";
import {
  requireAuthenticatedUser,
  requireEntityAccess,
  requireSuperAdmin,
  type NeonActor,
  type NeonQueryExecutor,
} from "@/lib/server/neon-authorization";
import { NeonRepositories } from "@/lib/server/neon-repositories";
import { getAuthenticatedApplicationUser } from "@/lib/server/neon-session";
import { appendNotificationEvent, listApplicationEvents, requireConversationMembership } from "@/lib/server/neon-application-events";
import { listOwnNotifications, markOwnNotificationsRead } from "@/lib/server/neon-notifications";
import { submitCollegeAdmission } from "@/lib/server/neon-college-admissions";
import { listOwnSavedJobs } from "@/lib/server/neon-saved-jobs";
import { getNeonDatabaseConfig, NEON_MIGRATION_STAGING_BRANCH_ID } from "@/lib/neon/neon-config";
import {
  deleteInstituteMedia, managedInstituteMediaSignedUrl,
  privateDownloadUrl, publicObjectUrl, uploadBytes,
} from "@/lib/server/application-storage";
import { deleteObject, headObject } from "@/lib/server/storage";
import { GET as getInstituteRoute, PATCH as patchInstituteRoute } from "../../app/api/v1/institutes/[id]/route";

function localStagingConfig(): Record<string, string> {
  return dotenv.config({ path: ".migration.env", quiet: true }).parsed ?? {};
}

async function stagingObject(bucket: string) {
  const s3 = new S3Client({ endpoint: process.env.AWS_ENDPOINT_URL_S3,
    region: process.env.AWS_REGION, forcePathStyle: true,
    credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID!, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY! } });
  const listing = await s3.send(new ListObjectsV2Command({ Bucket: bucket }));
  const key = listing.Contents?.find(item => item.Key && (item.Size ?? 0) > 0)?.Key;
  if (!key) throw new Error(`No imported object in ${bucket}.`);
  const response = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const bytes = Buffer.from(await response.Body!.transformToByteArray());
  return { bucket, key, bytes, sha256: createHash("sha256").update(bytes).digest("hex") };
}

interface IdentityRow { user_id: string; roles: string[] }
interface ScopeRow { user_id: string; entity_id: string }

function policyActor(row: IdentityRow): NeonActor {
  // Policy integration only: this is NOT a Neon Managed Auth session.
  return {
    userId: row.user_id,
    neonAuthUserId: "UNVERIFIED_POLICY_TEST_ONLY",
    roles: row.roles,
    permissions: [],
    platformAdmin: row.roles.includes("admin") || row.roles.includes("super_admin"),
  };
}

describe("real Neon staging data and authorization policy", () => {
  beforeAll(() => {
    const config = localStagingConfig();
    process.env.MEROTALENT_BACKEND_MODE = "neon-staging";
    for (const name of ["NEON_STAGING_DATABASE_URL", "AWS_ENDPOINT_URL_S3", "AWS_REGION", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"]) {
      if (!config[name]) throw new Error(`Staging configuration ${name} is missing.`);
      process.env[name] = config[name];
    }
    process.env.NEON_STAGING_BRANCH_ID = NEON_MIGRATION_STAGING_BRANCH_ID;
    // Never let a mislabeled local URL run these integration tests against the
    // Neon production branch, even if its copied data passes all assertions.
    getNeonDatabaseConfig();
  });

  afterAll(async () => { await getPool().end(); });

  it("reads migrated profiles, institutions, jobs, and notifications", async () => {
    const [counts] = await queryRows<{ profiles: number; synthetic_profiles: number; institutes: number; jobs: number; notifications: number }>(`
      SELECT (SELECT count(*)::int FROM public.profiles) AS profiles,
             (SELECT count(*)::int FROM public.profiles
              WHERE email LIKE 'neon-migration-uat-%@example.com') AS synthetic_profiles,
             (SELECT count(*)::int FROM public.institutes) AS institutes,
             (SELECT count(*)::int FROM public.jobs) AS jobs,
             (SELECT count(*)::int FROM public.notifications) AS notifications`);
    expect(counts.synthetic_profiles).toBe(1);
    expect(counts.profiles - counts.synthetic_profiles).toBe(103);
    expect(counts.institutes).toBe(295);
    expect(counts.jobs).toBeGreaterThan(0);
    expect(counts.notifications).toBeGreaterThan(0);
  });

  it("persists recipient-isolated event cursors and replays missed events after reconnect", async () => {
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      const users = (await client.query<{ user_id: string }>(`
        SELECT user_id FROM public.profiles WHERE account_status='active' AND deleted_at IS NULL
        ORDER BY user_id LIMIT 2`)).rows;
      expect(users).toHaveLength(2);
      const [baseline] = (await client.query<{ id: string }>(`
        SELECT COALESCE(max(id), 0)::text AS id FROM public.neon_application_events`)).rows;
      const first = (await client.query<{ id: string }>(`
        INSERT INTO public.notifications(recipient_id,title,message)
        VALUES ($1,'Staging event test','Isolated and rolled back') RETURNING id`, [users[0].user_id])).rows[0];
      const second = (await client.query<{ id: string }>(`
        INSERT INTO public.notifications(recipient_id,title,message)
        VALUES ($1,'Staging event test','Isolated and rolled back') RETURNING id`, [users[1].user_id])).rows[0];
      await appendNotificationEvent(client, users[0].user_id, first.id);
      await appendNotificationEvent(client, users[1].user_id, second.id);
      const txReader = { query: async <T extends import("pg").QueryResultRow>(sql: string, params: readonly unknown[]) =>
        (await client.query<T>(sql, [...params])).rows };
      const actorOne: NeonActor = {
        userId: users[0].user_id, neonAuthUserId: "POLICY_ONLY", roles: [], permissions: [], platformAdmin: false,
      };
      const actorTwo: NeonActor = { ...actorOne, userId: users[1].user_id };
      const one = await listApplicationEvents(actorOne, baseline.id, null, txReader);
      const two = await listApplicationEvents(actorTwo, baseline.id, null, txReader);
      expect(one.map(event => event.source_id)).toEqual([first.id]);
      expect(two.map(event => event.source_id)).toEqual([second.id]);
      expect(await listApplicationEvents(actorOne, one[0].id, null, txReader)).toEqual([]);
      expect((await listApplicationEvents(actorOne, baseline.id, null, txReader))[0].id).toBe(one[0].id);
    } finally {
      await client.query("ROLLBACK").catch(() => undefined);
      client.release();
    }
  });

  it("denies a nonmember subscription to an unknown conversation", async () => {
    const [profile] = await queryRows<{ user_id: string }>(`
      SELECT user_id FROM public.profiles WHERE account_status='active' LIMIT 1`);
    const actor: NeonActor = {
      userId: profile.user_id, neonAuthUserId: randomUUID(), roles: [], permissions: [], platformAdmin: false,
    };
    await expect(requireConversationMembership(actor, randomUUID()))
      .rejects.toMatchObject({ status: 403, code: "CONVERSATION_FORBIDDEN" });
  });

  it("reads and marks only the linked recipient's notification in one staging transaction", async () => {
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      const [identity] = (await client.query<{ legacy_user_id: string; neon_auth_user_id: string }>(`
        SELECT a.legacy_user_id, l.neon_auth_user_id
        FROM public.neon_identity_links l
        JOIN public.neon_application_accounts a ON a.id = l.application_account_id
        WHERE a.status='active' AND l.status='verified' LIMIT 1`)).rows;
      expect(identity).toBeDefined();
      const [notification] = (await client.query<{ id: string }>(`
        INSERT INTO public.notifications(recipient_id,title,message)
        VALUES ($1,'Staging notification test','Temporary, rolled back') RETURNING id`, [identity.legacy_user_id])).rows;
      const actor: NeonActor = {
        userId: identity.legacy_user_id, neonAuthUserId: identity.neon_auth_user_id,
        roles: [], permissions: [], platformAdmin: false,
      };
      const txReader = { query: async <T extends import("pg").QueryResultRow>(sql: string, params: readonly unknown[]) =>
        (await client.query<T>(sql, [...params])).rows };
      const before = await listOwnNotifications(actor, txReader);
      expect(before.notifications.some(item => item.id === notification.id)).toBe(true);
      expect(before.unreadCount).toBeGreaterThan(0);
      expect(await markOwnNotificationsRead(actor, notification.id, txReader)).toBe(1);
      expect(await markOwnNotificationsRead({ ...actor, userId: randomUUID() }, notification.id, txReader)).toBe(0);
      const after = await listOwnNotifications(actor, txReader);
      expect(after.notifications.find(item => item.id === notification.id)?.is_read).toBe(true);
    } finally {
      await client.query("ROLLBACK").catch(() => undefined);
      client.release();
    }
  });

  it("executes the saved-jobs query against the actual staging schema", async () => {
    const [profile] = await queryRows<{ user_id: string }>(`
      SELECT user_id FROM public.profiles WHERE account_status='active' LIMIT 1`);
    const actor: NeonActor = {
      userId: profile.user_id, neonAuthUserId: randomUUID(), roles: [], permissions: [], platformAdmin: false,
    };
    const rows = await listOwnSavedJobs(actor, 20, 0);
    expect(Array.isArray(rows)).toBe(true);
  });

  it("inserts a college application through the linked profile and rolls back", async () => {
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      const [identity] = (await client.query<{ legacy_user_id: string; neon_auth_user_id: string }>(`
        SELECT a.legacy_user_id, l.neon_auth_user_id
        FROM public.neon_identity_links l
        JOIN public.neon_application_accounts a ON a.id = l.application_account_id
        WHERE a.status='active' AND l.status='verified' LIMIT 1`)).rows;
      expect(identity).toBeDefined();
      await client.query(`UPDATE public.profiles
        SET full_name='Staging College UAT', phone='9800000000', whatsapp_number='9800000000',
            location='Kathmandu', education='Bachelor'
        WHERE user_id=$1::uuid`, [identity.legacy_user_id]);
      const [institute] = (await client.query<{ id: string }>(`
        SELECT id FROM public.institutes WHERE status='approved' AND deleted_at IS NULL
        ORDER BY id LIMIT 1`)).rows;
      expect(institute).toBeDefined();
      await client.query(`UPDATE public.institutes
        SET applications_enabled=true, admission_status='open',
            admission_deadline=now()+interval '1 day'
        WHERE id=$1::uuid`, [institute.id]);
      const actor: NeonActor = {
        userId: identity.legacy_user_id, neonAuthUserId: identity.neon_auth_user_id,
        roles: ["talent"], permissions: [], platformAdmin: false,
      };
      const txReader = { query: async <T extends import("pg").QueryResultRow>(sql: string, params: readonly unknown[]) =>
        (await client.query<T>(sql, [...params])).rows };
      const result = await submitCollegeAdmission(actor, institute.id,
        { programInterest: "Staging integration UAT" }, txReader);
      expect(result?.id).toBeTruthy();
      const [saved] = (await client.query<{ applicant_id: string; institute_id: string }>(`
        SELECT applicant_id, institute_id FROM public.college_applications WHERE id=$1::uuid`, [result?.id])).rows;
      expect(saved).toEqual({ applicant_id: actor.userId, institute_id: institute.id });
      await expect(submitCollegeAdmission({ ...actor, neonAuthUserId: randomUUID() },
        institute.id, { programInterest: "Must not be saved" }, txReader))
        .rejects.toMatchObject({ status: 403, code: "IDENTITY_NOT_LINKED" });
      const [count] = (await client.query<{ count: number }>(`
        SELECT count(*)::int AS count FROM public.college_applications
        WHERE institute_id=$1::uuid AND applicant_id=$2::uuid
          AND program_interest IN ('Staging integration UAT','Must not be saved')`,
        [institute.id, actor.userId])).rows;
      expect(count.count).toBe(1);
    } finally {
      await client.query("ROLLBACK").catch(() => undefined);
      client.release();
    }
  });

  it("queries both restored public views and confirms their visibility filters", async () => {
    const [directory] = await queryRows<{ id: string; status: string; payment_verified: boolean }>(
      "SELECT id,status,payment_verified FROM public.institute_directory LIMIT 1",
    );
    expect(directory?.status).toBe("approved");
    expect(typeof directory.payment_verified).toBe("boolean");
    const [profile] = await queryRows<{ user_id: string; full_name: string }>(
      "SELECT user_id,full_name FROM public.public_profile_directory LIMIT 1",
    );
    expect(profile?.user_id).toBeTruthy();
  });

  it("exercises retained timestamp and advertisement-derived triggers without committing", async () => {
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      const [section] = (await client.query<{ id: string }>("SELECT id FROM public.page_sections LIMIT 1")).rows;
      expect(section).toBeDefined();
      const [updated] = (await client.query<{ updated_at: Date }>(
        "UPDATE public.page_sections SET updated_at='2000-01-01' WHERE id=$1::uuid RETURNING updated_at",
        [section.id],
      )).rows;
      expect(updated.updated_at.getTime()).toBeGreaterThan(Date.parse("2026-01-01"));
      const [advertisement] = (await client.query<{ is_active: boolean }>(`
        INSERT INTO public.advertisements(title,placement,start_date,end_date,status)
        VALUES ('Staging rollback ad','homepage',now()-interval '1 day',now()+interval '1 day','active')
        RETURNING is_active`)).rows;
      expect(advertisement.is_active).toBe(true);
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }
  });

  it("creates a lead from a college application and rolls back the entire submission", async () => {
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      const [application] = (await client.query<{ id: string }>(`
        INSERT INTO public.college_applications(
          institute_id,applicant_id,full_name,email,phone,program_interest,intake,message,attachments,form_data,status)
        SELECT institute_id,applicant_id,full_name,email,phone,program_interest,intake,message,attachments,form_data,status
        FROM public.college_applications LIMIT 1 RETURNING id`)).rows;
      expect(application).toBeDefined();
      const [lead] = (await client.query<{ n: number }>(`
        SELECT count(*)::int AS n FROM public.leads WHERE source_type='college_application' AND source_id=$1::uuid`,
        [application.id],
      )).rows;
      expect(lead.n).toBe(1);
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }
  });

  it("propagates a payment status change and rejects invalid subscription entity state", async () => {
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      const [payment] = (await client.query<{ id: string }>(`
        UPDATE public.payments SET status=CASE WHEN status='failed' THEN 'success' ELSE 'failed' END
        WHERE id=(SELECT id FROM public.payments LIMIT 1) RETURNING id`)).rows;
      expect(payment).toBeDefined();
      const [notice] = (await client.query<{ n: number }>(`
        SELECT count(*)::int AS n FROM public.notifications
        WHERE entity_type='payment' AND entity_id=$1::uuid`, [payment.id])).rows;
      expect(notice.n).toBeGreaterThan(0);
      await client.query("SAVEPOINT invalid_subscription");
      const [subscription] = (await client.query<{ id: string }>("SELECT id FROM public.subscriptions LIMIT 1")).rows;
      expect(subscription).toBeDefined();
      await expect(client.query(`UPDATE public.subscriptions SET entity_type='user', entity_id=gen_random_uuid()
        WHERE id=$1::uuid`, [subscription.id])).rejects.toMatchObject({ code: "22023" });
      await client.query("ROLLBACK TO SAVEPOINT invalid_subscription");
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }
  });

  it("does not permit deleting the final active Super Admin role", async () => {
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      const [adminCount] = (await client.query<{ n: number }>(`
        SELECT count(*)::int AS n FROM public.user_roles ur JOIN public.profiles p ON p.user_id=ur.user_id
        WHERE ur.role='admin' AND p.account_status='active' AND p.deleted_at IS NULL`)).rows;
      expect(adminCount.n).toBe(1);
      await expect(client.query(`DELETE FROM public.user_roles
        WHERE id=(SELECT ur.id FROM public.user_roles ur WHERE ur.role='admin' LIMIT 1)`))
        .rejects.toMatchObject({ code: "P0001" });
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }
  });

  it("fails closed when a Managed Auth subject has no verified identity link", async () => {
    const [status] = await queryRows<{ mapping_table: string | null }>(
      "SELECT to_regclass('public.neon_identity_links')::text AS mapping_table",
    );
    expect(status.mapping_table).toBe("neon_identity_links");
    const syntheticId = randomUUID();
    const syntheticSessionOnly = { verify: async () => ({
      user: { id: syntheticId, emailVerified: true },
      session: { userId: syntheticId, expiresAt: new Date(Date.now() + 60_000).toISOString() },
    }) };
    await expect(getAuthenticatedApplicationUser(
      new Request("https://staging.test/protected"), syntheticSessionOnly,
    )).rejects.toMatchObject({ status: 403, code: "IDENTITY_NOT_LINKED" });
  });

  it("rejects unauthenticated access and a student performing admin operations", async () => {
    await expect(requireAuthenticatedUser(null)).rejects.toMatchObject({ status: 401 });
    const [student] = await queryRows<IdentityRow>(`
      SELECT p.user_id, array_agg(ur.role::text) AS roles FROM public.profiles p
      JOIN public.user_roles ur ON ur.user_id = p.user_id
      WHERE p.account_status = 'active' AND p.deleted_at IS NULL AND ur.role = 'talent'
        AND NOT EXISTS (SELECT 1 FROM public.user_roles a WHERE a.user_id=p.user_id AND a.role IN ('admin','super_admin'))
      GROUP BY p.user_id LIMIT 1`);
    expect(student).toBeDefined();
    expect(() => requireSuperAdmin(policyActor(student))).toThrow();
    const resolved = await requireAuthenticatedUser({
      legacyUserId: student.user_id,
      neonAuthUserId: "UNVERIFIED_POLICY_TEST_ONLY",
      linkVerified: true,
    });
    expect(resolved.userId).toBe(student.user_id);
    expect(() => requireSuperAdmin(resolved)).toThrow();
    const [admin] = await queryRows<IdentityRow>(`
      SELECT p.user_id, array_agg(ur.role::text) AS roles FROM public.profiles p
      JOIN public.user_roles ur ON ur.user_id=p.user_id
      WHERE p.account_status='active' AND p.deleted_at IS NULL
        AND ur.role IN ('admin','super_admin') GROUP BY p.user_id LIMIT 1`);
    expect(admin).toBeDefined();
    const resolvedAdmin = await requireAuthenticatedUser({
      legacyUserId: admin.user_id,
      neonAuthUserId: "UNVERIFIED_POLICY_TEST_ONLY",
      linkVerified: true,
    });
    expect(() => requireSuperAdmin(resolvedAdmin)).not.toThrow();
  });

  it("limits profile and notification reads to the actor", async () => {
    const users = await queryRows<IdentityRow>(`
      SELECT p.user_id, array_agg(ur.role::text) AS roles FROM public.profiles p
      JOIN public.user_roles ur ON ur.user_id = p.user_id
      WHERE p.account_status='active' AND p.deleted_at IS NULL
        AND NOT EXISTS (SELECT 1 FROM public.user_roles a WHERE a.user_id=p.user_id AND a.role IN ('admin','super_admin'))
      GROUP BY p.user_id ORDER BY p.user_id LIMIT 2`);
    expect(users).toHaveLength(2);
    const actor = policyActor(users[0]);
    const repo = new NeonRepositories();
    expect((await repo.getProfile(actor))?.user_id).toBe(actor.userId);
    await expect(repo.getProfile(actor, users[1].user_id)).rejects.toMatchObject({ code: "USER_SCOPE_REQUIRED" });
    expect((await repo.getNotifications(actor)).every((item) => item.recipient_id === actor.userId)).toBe(true);
  });

  it("permits the actually entitled college assignment and denies another college", async () => {
    const [scope] = await queryRows<ScopeRow>(`
      SELECT ea.user_id, ea.entity_id FROM public.entity_admin_assignments ea
      JOIN public.module_entitlements e ON e.user_id=ea.user_id AND e.entity_type=ea.entity_type AND e.entity_id=ea.entity_id
      WHERE ea.entity_type='college' AND ea.status='active' AND e.status='active'
        AND e.start_at<=now() AND (e.expires_at IS NULL OR e.expires_at>now())
        AND e.features ->> 'profile_editing' = 'true' LIMIT 1`);
    expect(scope).toBeDefined();
    const [identity] = await queryRows<IdentityRow>(`
      SELECT p.user_id, array_agg(ur.role::text) AS roles FROM public.profiles p
      JOIN public.user_roles ur ON ur.user_id=p.user_id
      WHERE p.user_id=$1::uuid AND p.account_status='active' AND p.deleted_at IS NULL
      GROUP BY p.user_id`, [scope.user_id]);
    const actor = policyActor(identity);
    await expect(requireEntityAccess(actor, "college", "college", scope.entity_id, "profile_editing"))
      .resolves.toBeUndefined();
    const [other] = await queryRows<{ id: string }>(`
      SELECT id FROM public.institutes WHERE id<>$1::uuid AND status='approved' LIMIT 1`, [scope.entity_id]);
    await expect(requireEntityAccess(actor, "college", "college", other.id, "profile_editing"))
      .rejects.toMatchObject({ code: "ENTITY_ACCESS_REQUIRED" });
    expect((await new NeonRepositories().getManagedInstitute(actor, scope.entity_id))?.id).toBe(scope.entity_id);
  });

  it("reads a public job but denies management without a jobs entitlement", async () => {
    const [published] = await queryRows<{ id: string }>(`
      SELECT id FROM public.jobs WHERE status='published' AND approval_status='approved'
        AND is_active=true AND deleted_at IS NULL AND (expires_at IS NULL OR expires_at>now()) LIMIT 1`);
    expect(published).toBeDefined();
    expect((await new NeonRepositories().getPublicJob(published.id))?.id).toBe(published.id);
    const [student] = await queryRows<IdentityRow>(`
      SELECT p.user_id, array_agg(ur.role::text) AS roles FROM public.profiles p
      JOIN public.user_roles ur ON ur.user_id=p.user_id
      WHERE p.account_status='active' AND p.deleted_at IS NULL
        AND NOT EXISTS (SELECT 1 FROM public.user_roles a WHERE a.user_id=p.user_id AND a.role IN ('admin','super_admin'))
      GROUP BY p.user_id LIMIT 1`);
    await expect(new NeonRepositories().updateJobDescription(policyActor(student), published.id, "Denied edit"))
      .rejects.toMatchObject({ status: 403 });
  });

  it("returns only the applicant's own job applications and denies poster data to a student", async () => {
    const [application] = await queryRows<{ job_id: string; user_id: string }>(`
      SELECT job_id,user_id FROM public.job_applications WHERE deleted_at IS NULL LIMIT 1`);
    expect(application).toBeDefined();
    const [identity] = await queryRows<IdentityRow>(`
      SELECT p.user_id, COALESCE(array_agg(ur.role::text) FILTER (WHERE ur.role IS NOT NULL), ARRAY[]::text[]) AS roles
      FROM public.profiles p LEFT JOIN public.user_roles ur ON ur.user_id=p.user_id
      WHERE p.user_id=$1::uuid GROUP BY p.user_id`, [application.user_id]);
    expect(identity).toBeDefined();
    const actor = policyActor(identity);
    const own = await new NeonRepositories().getOwnJobApplications(actor);
    expect(own.some(item => item.job_id === application.job_id)).toBe(true);
    expect(own.every(item => item.user_id === actor.userId)).toBe(true);
    if (!actor.platformAdmin) {
      await expect(new NeonRepositories().getJobApplications(actor, application.job_id))
        .rejects.toMatchObject({ status: 403 });
    }
  });

  it("updates a real profile and institute only inside a rolled-back staging transaction", async () => {
    const [scope] = await queryRows<ScopeRow>(`
      SELECT ea.user_id, ea.entity_id FROM public.entity_admin_assignments ea
      JOIN public.module_entitlements e ON e.user_id=ea.user_id AND e.entity_type=ea.entity_type AND e.entity_id=ea.entity_id
      WHERE ea.entity_type='college' AND ea.status='active' AND e.status='active'
        AND e.start_at<=now() AND (e.expires_at IS NULL OR e.expires_at>now())
        AND e.features ->> 'profile_editing' = 'true' LIMIT 1`);
    const [identity] = await queryRows<IdentityRow>(`
      SELECT p.user_id, array_agg(ur.role::text) AS roles FROM public.profiles p
      JOIN public.user_roles ur ON ur.user_id=p.user_id WHERE p.user_id=$1::uuid
      GROUP BY p.user_id`, [scope.user_id]);
    const actor = policyActor(identity);
    const beforeProfile = await new NeonRepositories().getProfile(actor);
    const beforeInstitute = await new NeonRepositories().getManagedInstitute(actor, scope.entity_id);
    const sentinel = new Error("intentional rollback");
    await expect(withTransaction(async (client) => {
      const db: NeonQueryExecutor = { query: async <T extends import("pg").QueryResultRow>(sql: string, params: readonly unknown[]) =>
        (await client.query<T>(sql, [...params])).rows };
      const repo = new NeonRepositories(db);
      expect((await repo.updateProfile(actor, { fullName: "Staging rollback check" }))?.full_name)
        .toBe("Staging rollback check");
      expect((await repo.updateInstituteDescription(actor, scope.entity_id, "Staging rollback check"))?.description)
        .toBe("Staging rollback check");
      throw sentinel;
    })).rejects.toMatchObject({ name: "NeonDatabaseError" });
    expect((await new NeonRepositories().getProfile(actor))?.full_name).toBe(beforeProfile?.full_name);
    expect((await new NeonRepositories().getManagedInstitute(actor, scope.entity_id))?.description)
      .toBe(beforeInstitute?.description);
  });

  it("rejects a real unauthorized institute update without changing the row", async () => {
    const [institute] = await queryRows<{ id: string; description: string | null }>(`
      SELECT id, description FROM public.institutes WHERE status='approved' AND deleted_at IS NULL LIMIT 1`);
    const [student] = await queryRows<IdentityRow>(`
      SELECT p.user_id, array_agg(ur.role::text) AS roles FROM public.profiles p
      JOIN public.user_roles ur ON ur.user_id=p.user_id
      WHERE p.account_status='active' AND p.deleted_at IS NULL
        AND NOT EXISTS (SELECT 1 FROM public.user_roles a WHERE a.user_id=p.user_id AND a.role IN ('admin','super_admin'))
      GROUP BY p.user_id LIMIT 1`);
    await expect(new NeonRepositories().updateInstituteDescription(
      policyActor(student), institute.id, "Unauthorized staging write",
    )).rejects.toMatchObject({ status: 403, code: "ENTITY_ACCESS_REQUIRED" });
    const [after] = await queryRows<{ description: string | null }>(
      "SELECT description FROM public.institutes WHERE id=$1::uuid", [institute.id],
    );
    expect(after.description).toBe(institute.description);
  });

  it("serves public institute HTTP reads and rejects missing or malformed IDs", async () => {
    const [institute] = await queryRows<{ id: string }>(
      "SELECT id FROM public.institutes WHERE status='approved' AND deleted_at IS NULL LIMIT 1",
    );
    expect((await getInstituteRoute(new Request(`https://staging.test/api/v1/institutes/${institute.id}`),
      { params: Promise.resolve({ id: institute.id }) })).status).toBe(200);
    const missingId = randomUUID();
    expect((await getInstituteRoute(new Request(`https://staging.test/api/v1/institutes/${missingId}`),
      { params: Promise.resolve({ id: missingId }) })).status).toBe(404);
    expect((await getInstituteRoute(new Request("https://staging.test/api/v1/institutes/not-uuid"),
      { params: Promise.resolve({ id: "not-uuid" }) })).status).toBe(400);
  });

  it("enforces HTTP session and field validation before institute mutation", async () => {
    const [institute] = await queryRows<{ id: string }>(
      "SELECT id FROM public.institutes WHERE status='approved' AND deleted_at IS NULL LIMIT 1",
    );
    const context = { params: Promise.resolve({ id: institute.id }) };
    expect((await getInstituteRoute(new Request(`https://staging.test/api/v1/institutes/${institute.id}?view=managed`),
      context)).status).toBe(401);
    expect((await patchInstituteRoute(new Request(`https://staging.test/api/v1/institutes/${institute.id}`,
      { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ description: "Denied" }) }),
      context)).status).toBe(401);
    expect((await patchInstituteRoute(new Request(`https://staging.test/api/v1/institutes/${institute.id}`,
      { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ description: "" }) }),
      context)).status).toBe(400);
  });

  it("reads a migrated public media object with binary checksum parity", async () => {
    const object = await stagingObject("college-media");
    const response = await fetch(await publicObjectUrl("college_cover", object.key));
    expect(response.status).toBe(200);
    const bytes = Buffer.from(await response.arrayBuffer());
    expect(bytes.byteLength).toBe(object.bytes.length);
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(object.sha256);
  });

  it("denies foreign private media and verifies a signed migrated resume read", async () => {
    const object = await stagingObject("resumes");
    const ownerId = object.key.split("/")[0];
    const owner: NeonActor = { userId: ownerId, neonAuthUserId: "UNVERIFIED_POLICY_TEST_ONLY", roles: ["talent"], permissions: [], platformAdmin: false };
    const foreign: NeonActor = { ...owner, userId: randomUUID() };
    await expect(privateDownloadUrl(foreign, { module: "resume", path: object.key }))
      .rejects.toMatchObject({ status: 403 });
    const signed = await privateDownloadUrl(owner, { module: "resume", path: object.key });
    const response = await fetch(signed);
    expect(response.status).toBe(200);
    expect(createHash("sha256").update(Buffer.from(await response.arrayBuffer())).digest("hex"))
      .toBe(object.sha256);
  });

  it("uploads, reads, and cleans up only a newly created staging media object", async () => {
    const [profile] = await queryRows<{ user_id: string }>(`
      SELECT user_id FROM public.profiles WHERE account_status='active' AND deleted_at IS NULL LIMIT 1`);
    const actor: NeonActor = { userId: profile.user_id, neonAuthUserId: "UNVERIFIED_POLICY_TEST_ONLY", roles: ["talent"], permissions: [], platformAdmin: false };
    const bytes = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/tXcAAAAASUVORK5CYII=", "base64");
    const path = `${actor.userId}/profile_avatar/self/${randomUUID()}.png`;
    try {
      const result = await uploadBytes(actor, { module: "profile_avatar", fileName: "staging-test.png", contentType: "image/png", bytes, path });
      expect(result).toEqual({ bucket: "profile-media", path });
      expect((await headObject(result.bucket, path))?.contentLength).toBe(bytes.length);
      const response = await fetch(await publicObjectUrl("profile_avatar", path));
      expect(response.status).toBe(200);
      expect(Buffer.from(await response.arrayBuffer()).equals(bytes)).toBe(true);
    } finally {
      // The key is a fresh UUID generated in this test; no migrated object is touched.
      await deleteObject("profile-media", path);
    }
  });

  it("enforces managed institute media signing, upload, and deletion scope", async () => {
    const [admin] = await queryRows<IdentityRow>(`
      SELECT p.user_id, array_agg(ur.role::text) AS roles FROM public.profiles p
      JOIN public.user_roles ur ON ur.user_id=p.user_id
      WHERE p.account_status='active' AND p.deleted_at IS NULL
        AND ur.role IN ('admin','super_admin') GROUP BY p.user_id LIMIT 1`);
    const [institute] = await queryRows<{ id: string }>(`
      SELECT id FROM public.institutes WHERE status='approved' AND deleted_at IS NULL LIMIT 1`);
    const owner = policyActor(admin);
    const foreign: NeonActor = { userId: randomUUID(), neonAuthUserId: "UNVERIFIED_POLICY_TEST_ONLY", roles: ["talent"], permissions: [], platformAdmin: false };
    const bytes = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/tXcAAAAASUVORK5CYII=", "base64");
    const path = `${owner.userId}/college_logo/${institute.id}/${randomUUID()}.png`;
    const intent = { module: "college_logo" as const, instituteId: institute.id, path };
    try {
      await expect(uploadBytes(foreign, {
        module: "college_logo", resourceId: institute.id, fileName: "test.png", contentType: "image/png", bytes, path,
      })).rejects.toMatchObject({ status: 403 });
      await uploadBytes(owner, {
        module: "college_logo", resourceId: institute.id, fileName: "test.png", contentType: "image/png", bytes, path,
      });
      await expect(managedInstituteMediaSignedUrl(foreign, intent)).rejects.toMatchObject({ status: 403 });
      const response = await fetch(await managedInstituteMediaSignedUrl(owner, intent));
      expect(response.status).toBe(200);
      expect(Buffer.from(await response.arrayBuffer()).equals(bytes)).toBe(true);
      await expect(deleteInstituteMedia(foreign, intent)).rejects.toMatchObject({ status: 403 });
      expect(await headObject("college-media", path)).not.toBeNull();
      await deleteInstituteMedia(owner, intent);
      expect(await headObject("college-media", path)).toBeNull();
    } finally {
      // Only this freshly generated staging object can be cleaned up.
      if (await headObject("college-media", path)) await deleteObject("college-media", path);
    }
  });
});
