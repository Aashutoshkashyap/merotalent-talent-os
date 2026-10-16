import { randomUUID } from "node:crypto";
import dotenv from "dotenv";
import { describe, expect, it } from "vitest";
import type { PoolClient } from "pg";
import { getPool } from "@/lib/server/db";
import { getNeonDatabaseConfig, NEON_MIGRATION_STAGING_BRANCH_ID } from "@/lib/neon/neon-config";
import { requireEntityAccess, type NeonActor } from "@/lib/server/neon-authorization";
import { getNeonAIStatus, saveNeonAISecret } from "@/lib/server/neon-ai";

describe("isolated Neon entity AI credential boundary", () => {
  it("stores only encrypted credentials for a currently entitled college and rolls back", async () => {
    const parsed = dotenv.config({ path: ".migration.env", quiet: true }).parsed ?? {};
    if (!parsed.NEON_STAGING_DATABASE_URL) throw new Error("Isolated Neon staging credentials are required.");
    const previousKey = process.env.PROVIDER_CONFIG_ENCRYPTION_KEY;
    Object.assign(process.env, parsed, { MEROTALENT_BACKEND_MODE: "neon-staging",
      NEON_STAGING_BRANCH_ID: NEON_MIGRATION_STAGING_BRANCH_ID,
      PROVIDER_CONFIG_ENCRYPTION_KEY: Buffer.alloc(32, 9).toString("base64") });
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
      const actor: NeonActor = { userId: identity.legacy_user_id, neonAuthUserId: identity.neon_auth_user_id,
        roles: [], permissions: [], platformAdmin: false };
      const college = (await client.query<{ id: string }>(`
        SELECT id FROM public.institutes WHERE status='approved' AND deleted_at IS NULL ORDER BY id LIMIT 1`)).rows[0];
      expect(college).toBeDefined();
      const capability = (await client.query<{ id: string }>(`
        INSERT INTO public.user_module_capabilities(user_id,capability_id,status)
        SELECT $1::uuid,id,'active' FROM public.module_capabilities
        WHERE module_key='college' AND is_active LIMIT 1
        ON CONFLICT(user_id,capability_id) DO UPDATE SET status='active' RETURNING id`,
      [actor.userId])).rows[0];
      expect(capability).toBeDefined();
      await client.query(`INSERT INTO public.entity_admin_assignments
        (user_id,user_capability_id,entity_type,entity_id,status,scopes)
        VALUES ($1::uuid,$2::uuid,'college',$3::uuid,'active','{}'::jsonb)
        ON CONFLICT(user_capability_id,entity_type,entity_id) DO UPDATE SET status='active'`,
      [actor.userId, capability.id, college.id]);
      await client.query(`INSERT INTO public.module_entitlements
        (user_id,module_key,entity_type,entity_id,source,status,features,reason)
        VALUES ($1::uuid,'college','college',$2::uuid,'ADMIN_MANUAL','active',
          '{"ai.description.generate":true}'::jsonb,'Isolated rollback-only AI test')`,
      [actor.userId, college.id]);
      const db = { query: async <T extends import("pg").QueryResultRow>(sql: string, values: readonly unknown[]) =>
        (await client.query<T>(sql, [...values])).rows };
      const scope = { module: "college" as const, entityType: "college" as const, entityId: college.id };
      await expect(requireEntityAccess(actor, "college", "college", randomUUID(),
        "ai.description.generate", db)).rejects.toMatchObject({ code: "ENTITY_ACCESS_REQUIRED" });
      await expect(requireEntityAccess(actor, "college", "college", college.id,
        "ai.description.generate", db)).resolves.toBeUndefined();
      const run = async <T>(operation: (connection: PoolClient) => Promise<T>) => operation(client);
      const saved = await saveNeonAISecret(actor, scope,
        { providerName: "openai-compatible", secret: "test-only-key" }, run);
      expect(saved).toMatchObject({ configured: true, enabled: true });
      expect(await getNeonAIStatus(actor, scope, db)).toMatchObject({ configured: true, enabled: true });
      const persisted = (await client.query<{ secret_ciphertext: string; secret_iv: string; secret_tag: string }>(`
        SELECT secret_ciphertext,secret_iv,secret_tag FROM public.module_ai_credentials
        WHERE user_id=$1::uuid AND module_key='college' AND entity_type='college' AND entity_id=$2::uuid`,
      [actor.userId, college.id])).rows[0];
      expect(persisted.secret_ciphertext).not.toContain("test-only-key");
      expect(persisted.secret_iv).toBeTruthy();
      expect(persisted.secret_tag).toBeTruthy();
      const audit = await client.query(`SELECT id FROM public.audit_logs
        WHERE actor_user_id=$1::uuid AND action='configure_module_ai_byok'
          AND entity_id=$2::text`, [actor.userId, college.id]);
      expect(audit.rowCount).toBeGreaterThan(0);
    } finally {
      await client.query("ROLLBACK").catch(() => undefined);
      client.release();
      await getPool().end();
      if (previousKey === undefined) delete process.env.PROVIDER_CONFIG_ENCRYPTION_KEY;
      else process.env.PROVIDER_CONFIG_ENCRYPTION_KEY = previousKey;
    }
  }, 60_000);
});
