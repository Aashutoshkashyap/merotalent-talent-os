import dotenv from "dotenv";
import { describe, expect, it } from "vitest";
import type { PoolClient, QueryResultRow } from "pg";
import { getPool } from "@/lib/server/db";
import { getNeonDatabaseConfig, NEON_MIGRATION_STAGING_BRANCH_ID } from "@/lib/neon/neon-config";
import type { NeonActor } from "@/lib/server/neon-authorization";
import { getNeonProviderStatus, providerHealth, saveNeonProviderConfiguration } from "@/lib/server/neon-provider-config";

describe("isolated Neon platform provider configuration", () => {
  it("authorizes and atomically persists encrypted settings plus audit, then rolls back", async () => {
    const parsed = dotenv.config({ path: ".migration.env", quiet: true }).parsed ?? {};
    if (!parsed.NEON_STAGING_DATABASE_URL) throw new Error("Isolated Neon staging credentials are required.");
    const previousKey = process.env.PROVIDER_CONFIG_ENCRYPTION_KEY;
    Object.assign(process.env, parsed, { MEROTALENT_BACKEND_MODE: "neon-staging",
      NEON_STAGING_BRANCH_ID: NEON_MIGRATION_STAGING_BRANCH_ID,
      PROVIDER_CONFIG_ENCRYPTION_KEY: Buffer.alloc(32, 8).toString("base64") });
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
      const ordinary: NeonActor = { userId: identity.legacy_user_id,
        neonAuthUserId: identity.neon_auth_user_id, roles: [], permissions: [], platformAdmin: false };
      const query = <T extends QueryResultRow>(sql: string, values: readonly unknown[]) =>
        client.query<T>(sql, [...values]).then(result => result.rows);
      await expect(getNeonProviderStatus(ordinary, "ai", query)).rejects.toMatchObject({ code: "ADMIN_REQUIRED" });
      await expect(saveNeonProviderConfiguration(ordinary, "ai", {
        providerName: "openai-compatible", enabled: false, publicConfig: { model: "test" }, secret: "test-secret",
      })).rejects.toMatchObject({ code: "ADMIN_REQUIRED" });
      await client.query(`INSERT INTO public.user_roles(user_id,role)
        SELECT $1::uuid,'super_admin' WHERE NOT EXISTS (
          SELECT 1 FROM public.user_roles WHERE user_id=$1::uuid AND role='super_admin')`, [ordinary.userId]);
      const admin: NeonActor = { ...ordinary, roles: ["super_admin"], platformAdmin: true };
      const run = <T>(operation: (connection: PoolClient) => Promise<T>) => operation(client);
      const disabled = await saveNeonProviderConfiguration(admin, "ai", {
        providerName: "openai-compatible", enabled: false,
        publicConfig: { model: "staging-test-model" }, secret: "staging-test-secret",
      }, run);
      expect(disabled).toMatchObject({ configured: true, enabled: false });
      expect(providerHealth(disabled, "openai-compatible")).toMatchObject({ status: "configured_disabled", deliveryAvailable: false });
      const enabled = await saveNeonProviderConfiguration(admin, "ai", {
        providerName: "openai-compatible", enabled: true,
        publicConfig: { model: "staging-test-model" },
      }, run);
      expect(providerHealth(enabled, "openai-compatible")).toMatchObject({ status: "configured_active", deliveryAvailable: true });
      expect(await getNeonProviderStatus(admin, "ai", query)).toMatchObject({ configured: true, enabled: true });
      const stored = (await client.query<{ secret_ciphertext: string; secret_iv: string; secret_tag: string }>(`
        SELECT secret_ciphertext,secret_iv,secret_tag FROM public.provider_configurations
        WHERE provider_kind='ai'`)).rows[0];
      expect(stored.secret_ciphertext).not.toContain("staging-test-secret");
      expect(stored.secret_iv).toBeTruthy();
      expect(stored.secret_tag).toBeTruthy();
      expect(JSON.stringify(enabled)).not.toContain(stored.secret_ciphertext);
      const audit = await client.query(`SELECT id FROM public.audit_logs
        WHERE actor_user_id=$1::uuid AND action='admin_save_provider_configuration'
          AND entity_type='provider_configuration' AND entity_id='ai'`, [admin.userId]);
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
