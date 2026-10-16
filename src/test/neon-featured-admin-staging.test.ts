import dotenv from "dotenv";
import { describe, expect, it } from "vitest";
import type { PoolClient, QueryResultRow } from "pg";
import { getPool } from "@/lib/server/db";
import { getNeonDatabaseConfig, NEON_MIGRATION_STAGING_BRANCH_ID } from "@/lib/neon/neon-config";
import type { NeonActor } from "@/lib/server/neon-authorization";
import { listFeaturedAdmin, listFeaturedOptions, removeFeaturedAdmin,
  saveFeaturedAdmin } from "@/lib/server/neon-featured-admin";

describe("isolated Neon featured authoring", () => {
  it("lists, writes, reactivates and removes one synthetic College feature with rollback", async () => {
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
      const college = (await client.query<{ id: string }>(`
        INSERT INTO public.institutes(name,slug,status,owner_user_id)
        VALUES ('AAA Neon Featured Rollback Fixture',$1,'approved',$2::uuid) RETURNING id`,
      [`neon-featured-rollback-${crypto.randomUUID()}`, actor.userId])).rows[0];
      const query = <T extends QueryResultRow>(sql: string, params: readonly unknown[]) =>
        client.query<T>(sql, [...params]).then(result => result.rows);
      const run = <T>(operation: (connection: PoolClient) => Promise<T>) => operation(client);
      const options = await listFeaturedOptions(actor, "college", { query });
      expect(options.some(option => option.id === college.id)).toBe(true);
      const input = { entity_type: "college", entity_id: college.id, title: "Rollback Fixture",
        placement: "homepage", priority: 1, is_active: true };
      const created = await saveFeaturedAdmin(actor, input, run);
      expect((await listFeaturedAdmin(actor, { query })).some(item => item.id === created.id)).toBe(true);
      const retried = await saveFeaturedAdmin(actor, input, run);
      expect(retried.id).toBe(created.id);
      expect(await removeFeaturedAdmin(actor, created.id, run)).toMatchObject({ id: created.id });
      expect((await listFeaturedAdmin(actor, { query })).some(item => item.id === created.id)).toBe(false);
      const revived = await saveFeaturedAdmin(actor, input, run);
      expect(revived.id).toBe(created.id);
      expect((await client.query(`SELECT id FROM public.audit_logs WHERE entity_id=$1::text
        AND action IN ('UPSERT_FEATURED_ITEM','REMOVE_FEATURED_ITEM')`, [created.id])).rowCount).toBeGreaterThan(1);
    } finally {
      await client.query("ROLLBACK").catch(() => undefined);
      client.release();
      await getPool().end();
    }
  }, 60_000);
});
