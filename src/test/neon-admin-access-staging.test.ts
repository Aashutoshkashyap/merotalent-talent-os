import dotenv from "dotenv";
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { PoolClient, QueryResultRow } from "pg";
import { getPool } from "@/lib/server/db";
import { getNeonDatabaseConfig, NEON_MIGRATION_STAGING_BRANCH_ID } from "@/lib/neon/neon-config";
import { requireEntityAccess, type NeonActor } from "@/lib/server/neon-authorization";
import { assignNeonModuleAccess, listNeonAssignableEntities, listNeonManualPayments, listNeonUserAccess,
  reviewNeonManualPayment, revokeNeonAccess } from "@/lib/server/neon-admin-access";

describe("isolated Neon Super Admin access ledger", () => {
  it("holds paid access pending review, settles once, and revokes scope atomically", async () => {
    const parsed = dotenv.config({ path: ".migration.env", quiet: true }).parsed ?? {};
    if (!parsed.NEON_STAGING_DATABASE_URL) throw new Error("Isolated Neon staging credentials are required.");
    Object.assign(process.env, parsed, { MEROTALENT_BACKEND_MODE: "neon-staging",
      NEON_STAGING_BRANCH_ID: NEON_MIGRATION_STAGING_BRANCH_ID });
    getNeonDatabaseConfig();
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      const identity = (await client.query<{ legacy_user_id: string; neon_auth_user_id: string }>(`
        SELECT a.legacy_user_id,l.neon_auth_user_id FROM public.neon_identity_links l
        JOIN public.neon_application_accounts a ON a.id=l.application_account_id
        JOIN public.profiles p ON p.user_id=a.legacy_user_id
        WHERE l.status='verified' AND a.status='active' AND p.account_status='active'
          AND p.deleted_at IS NULL LIMIT 1`)).rows[0];
      expect(identity).toBeDefined();
      const actor: NeonActor = { userId: identity.legacy_user_id,
        neonAuthUserId: identity.neon_auth_user_id, roles: ["super_admin"],
        permissions: [], platformAdmin: true };
      await client.query(`INSERT INTO public.user_roles(user_id,role)
        SELECT $1::uuid,'super_admin' WHERE NOT EXISTS (
          SELECT 1 FROM public.user_roles WHERE user_id=$1::uuid AND role='super_admin')`, [actor.userId]);
      const target = (await client.query<{ user_id: string }>(`
        SELECT p.user_id FROM public.profiles p WHERE p.user_id<>$1::uuid
          AND p.account_status='active' AND p.deleted_at IS NULL
          AND NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id=p.user_id
            AND r.role IN ('admin','super_admin')) LIMIT 1`, [actor.userId])).rows[0];
      const college = (await client.query<{ id: string }>(`
        SELECT id FROM public.institutes WHERE deleted_at IS NULL LIMIT 1`)).rows[0];
      expect(target).toBeDefined();
      expect(college).toBeDefined();
      const run = <T>(operation: (connection: PoolClient) => Promise<T>) => operation(client);
      const db = { query: async <T extends QueryResultRow>(sql: string, params: readonly unknown[]) =>
        (await client.query<T>(sql, [...params])).rows };
      for (const moduleKey of ["college", "jobs", "mentor", "events"] as const) {
        await expect(listNeonAssignableEntities(actor, moduleKey, "", db)).resolves.toBeInstanceOf(Array);
      }
      const key = randomUUID();
      const startAt = new Date(Date.now() - 60_000).toISOString();
      const expiresAt = new Date(Date.now() + 30 * 86_400_000).toISOString();
      const input = { userId: target.user_id, module: "college" as const,
        entityId: college.id, startAt, expiresAt, amount: 1200,
        transactionReference: `STAGING-${key}`, idempotencyKey: key };
      await expect(assignNeonModuleAccess({ ...actor, platformAdmin: false }, input, run))
        .rejects.toMatchObject({ code: "ADMIN_REQUIRED" });
      const assignment = await assignNeonModuleAccess(actor, input, run);
      expect(assignment).toMatchObject({ paymentStatus: "pending", entitlementId: null });
      expect(assignment.paymentId).toBeTruthy();
      expect(await assignNeonModuleAccess(actor, input, run)).toMatchObject({ duplicate: true,
        paymentId: assignment.paymentId });
      await expect(assignNeonModuleAccess(actor, { ...input, amount: 999 }, run))
        .rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
      const access = await listNeonUserAccess(actor, target.user_id, db);
      expect(access.some(row => row.assignmentId === assignment.assignmentId)).toBe(true);
      const payments = await listNeonManualPayments(actor, target.user_id, db);
      expect(payments).toContainEqual(expect.objectContaining({ id: assignment.paymentId, status: "pending" }));
      const before = await client.query(`SELECT id FROM public.module_entitlements WHERE payment_id=$1::uuid`,
        [assignment.paymentId]);
      expect(before.rowCount).toBe(0);
      const settled = await reviewNeonManualPayment(actor, assignment.paymentId!, "confirm",
        "Verified staging receipt", run);
      expect(settled).toMatchObject({ status: "success", duplicate: false });
      expect(await reviewNeonManualPayment(actor, assignment.paymentId!, "confirm",
        "Verified staging receipt", run)).toMatchObject({ duplicate: true });
      await revokeNeonAccess(actor, { userId: target.user_id,
        kind: "scope", id: assignment.assignmentId }, run);
      const after = await client.query<{ status: string }>(`
        SELECT status FROM public.module_entitlements WHERE payment_id=$1::uuid`, [assignment.paymentId]);
      expect(after.rows).toContainEqual({ status: "revoked" });
      const second = await assignNeonModuleAccess(actor, { ...input,
        idempotencyKey: randomUUID(), transactionReference: `STAGING-${randomUUID()}` }, run);
      await revokeNeonAccess(actor, { userId: target.user_id,
        kind: "capability", id: second.capabilityId }, run);
      const cancelled = await client.query<{ status: string }>(`
        SELECT status FROM public.payments WHERE id=$1::uuid`, [second.paymentId]);
      expect(cancelled.rows[0]?.status).toBe("failed");
      await expect(reviewNeonManualPayment(actor, second.paymentId!, "confirm",
        "Verified staging receipt", run)).rejects.toMatchObject({ code: "PAYMENT_ALREADY_REVIEWED" });
      const free = await assignNeonModuleAccess(actor, { ...input, amount: 0,
        transactionReference: "", idempotencyKey: randomUUID() }, run);
      expect(free).toMatchObject({ paymentStatus: "not_required", paymentId: null });
      const recipient: NeonActor = { userId: target.user_id, neonAuthUserId: randomUUID(),
        roles: ["talent"], permissions: [], platformAdmin: false };
      const freeState = await client.query<{ status: string; start_at: Date; expires_at: Date;
        features: Record<string, boolean> }>(`SELECT status,start_at,expires_at,features
        FROM public.module_entitlements WHERE id=$1::uuid`, [free.entitlementId]);
      expect(freeState.rows[0]).toMatchObject({ status: "active",
        features: expect.objectContaining({ profile_editing: true }) });
      const scopeState = await client.query<{ status: string }>(`
        SELECT status FROM public.entity_admin_assignments WHERE id=$1::uuid`, [free.assignmentId]);
      expect(scopeState.rows[0]?.status).toBe("active");
      const checks = await client.query<{ time_ok: boolean; scope_ok: boolean; cap_ok: boolean;
        db_now: Date; start_at: Date; expires_at: Date }>(`
        SELECT e.start_at<=now() AND e.expires_at>now() AS time_ok,now() AS db_now,
          e.start_at,e.expires_at,
          EXISTS(SELECT 1 FROM public.entity_admin_assignments a WHERE a.id=$2::uuid
            AND a.user_id=e.user_id AND a.entity_id=e.entity_id AND a.status='active') AS scope_ok,
          EXISTS(SELECT 1 FROM public.user_module_capabilities umc
            JOIN public.module_capabilities mc ON mc.id=umc.capability_id
            WHERE umc.user_id=e.user_id AND umc.status='active' AND mc.module_key=e.module_key) AS cap_ok
        FROM public.module_entitlements e WHERE e.id=$1::uuid`, [free.entitlementId,free.assignmentId]);
      expect(checks.rows[0]).toMatchObject({ time_ok: true, scope_ok: true, cap_ok: true });
      await expect(requireEntityAccess(recipient, "college", "college", college.id,
        "profile_editing", db)).resolves.toBeUndefined();
      const otherCollege = (await client.query<{ id: string }>(`
        SELECT id FROM public.institutes WHERE id<>$1::uuid AND deleted_at IS NULL LIMIT 1`,
      [college.id])).rows[0];
      if (otherCollege) await expect(requireEntityAccess(recipient, "college", "college",
        otherCollege.id, "profile_editing", db)).rejects.toMatchObject({ code: "ENTITY_ACCESS_REQUIRED" });
    } finally {
      await client.query("ROLLBACK").catch(() => undefined);
      client.release();
      await getPool().end();
    }
  }, 60_000);
});
