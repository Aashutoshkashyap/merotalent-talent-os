import dotenv from "dotenv";
import { describe, expect, it } from "vitest";
import type { PoolClient } from "pg";
import { getPool } from "@/lib/server/db";
import { getNeonDatabaseConfig, NEON_MIGRATION_STAGING_BRANCH_ID } from "@/lib/neon/neon-config";
import type { NeonActor } from "@/lib/server/neon-authorization";
import { setNeonUserStatus } from "@/lib/server/neon-admin-users";

describe("isolated Neon People retirement", () => {
  it("deactivates and reactivates a non-admin profile with audit, then rolls back", async () => {
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
      expect(target).toBeDefined();
      const run = <T>(operation: (connection: PoolClient) => Promise<T>) => operation(client);
      await expect(setNeonUserStatus(actor, target.user_id, "deactivated", run))
        .resolves.toMatchObject({ account_status: "deactivated" });
      await expect(setNeonUserStatus(actor, target.user_id, "active", run))
        .resolves.toMatchObject({ account_status: "active" });
      const audit = await client.query(`SELECT action FROM public.audit_logs
        WHERE actor_user_id=$1::uuid AND entity_id=$2::text AND action='UPDATE_USER_STATUS'`,
      [actor.userId, target.user_id]);
      expect(audit.rowCount).toBeGreaterThanOrEqual(2);
    } finally {
      await client.query("ROLLBACK").catch(() => undefined);
      client.release();
      await getPool().end();
    }
  }, 60_000);
});
