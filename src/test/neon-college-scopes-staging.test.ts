import { describe, expect, it } from "vitest";
import dotenv from "dotenv";
import { randomUUID } from "node:crypto";
import { getPool } from "@/lib/server/db";
import { getNeonDatabaseConfig, NEON_MIGRATION_STAGING_BRANCH_ID } from "@/lib/neon/neon-config";
import { NeonCollegeScopes } from "@/lib/server/neon-college-scopes";
import { requireEntityAccess, type NeonActor } from "@/lib/server/neon-authorization";

describe("isolated Neon College claim/add and assignment workflow", () => {
  it("enforces verified ownership, pending idempotency, decisions, multiple scopes, and revocation", async () => {
    const parsed = dotenv.config({ path: ".migration.env", quiet: true }).parsed ?? {};
    if (!parsed.NEON_STAGING_DATABASE_URL) throw new Error("Isolated Neon staging credentials are required.");
    Object.assign(process.env, parsed, { MEROTALENT_BACKEND_MODE: "neon-staging",
      NEON_STAGING_BRANCH_ID: NEON_MIGRATION_STAGING_BRANCH_ID });
    getNeonDatabaseConfig();
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      const identities = await client.query<{ legacy_user_id: string; neon_auth_user_id: string }>(`
        SELECT a.legacy_user_id,l.neon_auth_user_id FROM public.neon_identity_links l
        JOIN public.neon_application_accounts a ON a.id=l.application_account_id
        JOIN public.profiles p ON p.user_id=a.legacy_user_id
        WHERE l.status='verified' AND a.status='active' AND p.account_status='active'
          AND p.deleted_at IS NULL LIMIT 1`);
      expect(identities.rows).toHaveLength(1);
      const identity = identities.rows[0];
      const actor: NeonActor = { userId: identity.legacy_user_id,
        neonAuthUserId: identity.neon_auth_user_id, roles: [], permissions: [], platformAdmin: false };
      const fake: NeonActor = { ...actor, neonAuthUserId: randomUUID() };
      const capability = await client.query<{ id: string }>(`SELECT id FROM public.module_capabilities WHERE module_key='college' LIMIT 1`);
      expect(capability.rows).toHaveLength(1);
      await client.query(`INSERT INTO public.user_module_capabilities(user_id,capability_id,status)
        VALUES ($1::uuid,$2::uuid,'active') ON CONFLICT(user_id,capability_id) DO UPDATE SET status='active'`,
        [actor.userId, capability.rows[0].id]);
      const colleges = await client.query<{ id: string }>(`
        SELECT id FROM public.institutes WHERE status='approved' AND deleted_at IS NULL ORDER BY id LIMIT 2`);
      expect(colleges.rows.length).toBeGreaterThanOrEqual(2);
      const service = new NeonCollegeScopes(async operation => operation(client));
      const reason = "Verified staging-only college claim integration test";
      await expect(service.submit(fake, { kind: "claim", collegeId: colleges.rows[0].id, reason }))
        .rejects.toMatchObject({ code: "ACCESS_DENIED" });
      await expect(service.submit(actor, { kind: "claim", collegeId: randomUUID(), reason }))
        .rejects.toMatchObject({ code: "COLLEGE_NOT_FOUND" });
      const claimed = await service.submit(actor, { kind: "claim", collegeId: colleges.rows[0].id, reason });
      const duplicate = await service.submit(actor, { kind: "claim", collegeId: colleges.rows[0].id, reason });
      expect(duplicate.id).toBe(claimed.id);
      await expect(service.decide(actor, claimed.id, true)).rejects.toMatchObject({ code: "ACCESS_DENIED" });
      await expect(service.assign(actor, actor.userId, colleges.rows[1].id)).rejects.toMatchObject({ code: "ACCESS_DENIED" });
      const existingAdmin = await client.query(`SELECT 1 FROM public.user_roles WHERE user_id=$1::uuid AND role='admin' LIMIT 1`, [actor.userId]);
      if (!existingAdmin.rows[0]) await client.query(`INSERT INTO public.user_roles(user_id,role) VALUES ($1::uuid,'admin')`, [actor.userId]);
      const admin: NeonActor = { ...actor, platformAdmin: true, roles: ['admin'] };
      const approved = await service.decide(admin, claimed.id, true);
      expect(approved.college_id).toBe(colleges.rows[0].id);
      await expect(service.decide(admin, claimed.id, true)).rejects.toMatchObject({ code: "REQUEST_ALREADY_DECIDED" });
      await expect(service.submit(actor, { kind: "claim", collegeId: colleges.rows[0].id, reason }))
        .rejects.toMatchObject({ code: "ALREADY_ASSIGNED" });
      const second = await service.assign(admin, actor.userId, colleges.rows[1].id);
      expect(second.status).toBe('active');
      const again = await service.assign(admin, actor.userId, colleges.rows[1].id);
      expect(again.id).toBe(second.id);
      const scopeCount = await client.query<{ count: string }>(`SELECT count(*)::text AS count FROM public.entity_admin_assignments
        WHERE user_id=$1::uuid AND entity_type='college' AND status='active'
          AND entity_id=ANY($2::uuid[])`, [actor.userId, colleges.rows.map(item => item.id)]);
      expect(Number(scopeCount.rows[0].count)).toBe(2);
      await expect(service.assign(admin, actor.userId, randomUUID())).rejects.toMatchObject({ code: "COLLEGE_NOT_FOUND" });
      const revoked = await service.revoke(admin, second.id);
      expect(revoked.status).toBe('revoked');
      await expect(service.revoke(admin, second.id)).rejects.toMatchObject({ code: "SCOPE_NOT_ACTIVE" });

      const newName = `Neon scope test ${randomUUID()}`;
      const proposed = await service.submit(actor, { kind: 'create', name: newName, reason });
      const created = await service.decide(admin, proposed.id, true);
      expect(created.college_id).toBeTruthy();
      const createdCollege = await client.query<{ status: string; applications_enabled: boolean }>(`
        SELECT status,applications_enabled FROM public.institutes WHERE id=$1::uuid`, [created.college_id]);
      expect(createdCollege.rows[0]).toMatchObject({ status: 'pending', applications_enabled: false });
      const proposal = await client.query<{ entity_id: string | null }>(`
        SELECT entity_id FROM public.entity_scope_requests WHERE id=$1::uuid`, [proposed.id]);
      expect(proposal.rows[0].entity_id).toBe(created.college_id);
      await expect(service.grantComplimentary(fake, proposed.id, "trial"))
        .rejects.toMatchObject({ code: "ACCESS_DENIED" });
      const trial = await service.grantComplimentary(admin, proposed.id, "trial");
      expect(trial).toMatchObject({ activated: true, duplicate: false });
      expect(await service.grantComplimentary(admin, proposed.id, "trial"))
        .toMatchObject({ activated: true, duplicate: true });
      const trialSubscription = await client.query<{ status: string; payment_status: string }>(`
        SELECT status,payment_status FROM public.subscriptions WHERE id=$1::uuid`, [trial.subscriptionId]);
      expect(trialSubscription.rows[0]).toEqual({ status: "trialing", payment_status: "not_required" });
      expect((await client.query(`SELECT id FROM public.payments WHERE reference_id=$1::uuid`, [proposed.id])).rowCount).toBe(0);
      await client.query(`UPDATE public.module_entitlements SET status='expired' WHERE id=$1::uuid`, [trial.entitlementId]);
      await client.query(`UPDATE public.subscriptions SET status='expired' WHERE id=$1::uuid`, [trial.subscriptionId]);
      await expect(service.grantComplimentary(admin, proposed.id, "trial"))
        .rejects.toMatchObject({ code: "TRIAL_ALREADY_USED" });
      const free = await service.grantComplimentary(admin, proposed.id, "free");
      expect(free).toMatchObject({ activated: true, duplicate: false });
      expect(await service.grantComplimentary(admin, proposed.id, "free"))
        .toMatchObject({ activated: true, duplicate: true });
      const freeSubscription = await client.query<{ status: string; payment_status: string }>(`
        SELECT status,payment_status FROM public.subscriptions WHERE id=$1::uuid`, [free.subscriptionId]);
      expect(freeSubscription.rows[0]).toEqual({ status: "active", payment_status: "not_required" });
      const badgeBefore = await client.query<{ verified: boolean }>(`
        SELECT public.is_college_effectively_verified($1::uuid) AS verified`, [created.college_id]);
      expect(badgeBefore.rows[0].verified).toBe(false);
      await client.query(`UPDATE public.institutes SET status='approved' WHERE id=$1::uuid`, [created.college_id]);
      const badgeAfter = await client.query<{ verified: boolean }>(`
        SELECT public.is_college_effectively_verified($1::uuid) AS verified`, [created.college_id]);
      expect(badgeAfter.rows[0].verified).toBe(true);
      const scopedDb = { query: async <T extends import("pg").QueryResultRow>(sql: string, params: readonly unknown[]) =>
        (await client.query<T>(sql, [...params])).rows };
      await expect(requireEntityAccess(actor, "college", "college", created.college_id!, null, scopedDb)).resolves.toBeUndefined();
      await client.query(`UPDATE public.module_entitlements
        SET start_at=now()-interval '8 days',expires_at=now()-interval '1 day'
        WHERE id=$1::uuid`, [free.entitlementId]);
      await client.query(`UPDATE public.subscriptions
        SET start_date=now()-interval '8 days',expiry_date=now()-interval '1 day'
        WHERE id=$1::uuid`, [free.subscriptionId]);
      const badgeExpired = await client.query<{ verified: boolean }>(`
        SELECT public.is_college_effectively_verified($1::uuid) AS verified`, [created.college_id]);
      expect(badgeExpired.rows[0].verified).toBe(false);
      await expect(requireEntityAccess(actor, "college", "college", created.college_id!, null, scopedDb))
        .rejects.toMatchObject({ code: "ENTITY_ACCESS_REQUIRED" });
      await expect(service.submit(actor, { kind: 'create', name: newName, reason }))
        .rejects.toMatchObject({ code: "COLLEGE_EXISTS" });
      const rejected = await service.submit(actor, { kind: 'claim', collegeId: colleges.rows[1].id, reason });
      const decision = await service.decide(admin, rejected.id, false, 'Needs proof');
      expect(decision.status).toBe('rejected');
    } finally {
      await client.query("ROLLBACK").catch(() => undefined);
      client.release();
      await getPool().end();
    }
  }, 60_000);
});
