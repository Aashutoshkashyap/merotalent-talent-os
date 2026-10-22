import { randomUUID } from "node:crypto";
import dotenv from "dotenv";
import { describe, expect, it } from "vitest";
import type { PoolClient, QueryResultRow } from "pg";
import { getPool } from "@/lib/server/db";
import { getNeonDatabaseConfig, NEON_MIGRATION_STAGING_BRANCH_ID } from "@/lib/neon/neon-config";
import type { NeonActor } from "@/lib/server/neon-authorization";
import { deleteAdminSection, readAdminCms, readAdminSiteSettings, readPublicCms,
  saveAdminSection, saveAdminSiteSettings } from "@/lib/server/neon-cms";

describe("isolated Neon CMS publication boundary", () => {
  it("keeps hidden content private while audited Admin edits reach public reads, then rolls back", async () => {
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
      const ordinary: NeonActor = { userId: identity.legacy_user_id,
        neonAuthUserId: identity.neon_auth_user_id, roles: [], permissions: [], platformAdmin: false };
      const query = <T extends QueryResultRow>(sql: string, values: readonly unknown[]) =>
        client.query<T>(sql, [...values]).then(result => result.rows);
      const run = <T>(operation: (connection: PoolClient) => Promise<T>) => operation(client);
      await expect(readAdminCms(ordinary, query)).rejects.toMatchObject({ code: "ADMIN_REQUIRED" });
      await expect(saveAdminSiteSettings(ordinary, { site_title: "Forbidden" }, run))
        .rejects.toMatchObject({ code: "ADMIN_REQUIRED" });
      await client.query(`INSERT INTO public.user_roles(user_id,role)
        SELECT $1::uuid,'super_admin' WHERE NOT EXISTS (
          SELECT 1 FROM public.user_roles WHERE user_id=$1::uuid AND role='super_admin')`, [ordinary.userId]);
      const admin: NeonActor = { ...ordinary, roles: ["super_admin"], platformAdmin: true };
      const key = `staging_${randomUUID().slice(0, 8)}`;
      const parent = await saveAdminSection(admin, { page: "home", section_key: key,
        title: "Hidden staging section", display_order: 9000, is_visible: false }, undefined, run);
      expect((await readAdminCms(admin, query)).some(row => row.id === parent.id)).toBe(true);
      let publicState = await readPublicCms("home", query);
      expect(publicState.sections.some(row => row.id === parent.id)).toBe(false);
      expect(publicState.sectionVisibility[key]?.is_visible).toBe(false);
      const child = await saveAdminSection(admin, { page: "home", section_key: `${key}_child`,
        title: "Hidden child", parent_id: parent.id, display_order: 9001, is_visible: true }, undefined, run);
      publicState = await readPublicCms("home", query);
      expect(publicState.sections.some(row => row.id === child.id)).toBe(false);
      await saveAdminSection(admin, { page: "home", section_key: key,
        title: "Visible staging section", display_order: 9000, is_visible: true }, parent.id, run);
      publicState = await readPublicCms("home", query);
      expect(publicState.sections.some(row => row.id === parent.id)).toBe(true);
      expect(publicState.sections.some(row => row.id === child.id)).toBe(true);
      await saveAdminSection(admin, { page: "home", section_key: `${key}_child`,
        title: "Edited child", body: "retained@example.test", parent_id: parent.id,
        display_order: 9001, is_visible: false }, child.id, run);
      publicState = await readPublicCms("home", query);
      expect(publicState.sections.some(row => row.id === child.id)).toBe(false);
      expect(publicState.sectionVisibility[`${key}_child`]).toMatchObject({ parent_id: parent.id, is_visible: false });
      expect(publicState.sectionVisibility[`${key}_child`]).not.toHaveProperty("body");
      expect((await readAdminCms(admin, query)).find(row => row.id === child.id)).toMatchObject({
        title: "Edited child", body: "retained@example.test", is_visible: false });
      await saveAdminSection(admin, { page: "home", section_key: `${key}_child`,
        title: "Edited child", body: "retained@example.test", parent_id: parent.id,
        display_order: 9001, is_visible: true }, child.id, run);
      expect((await readPublicCms("home", query)).sections.find(row => row.id === child.id))
        .toMatchObject({ title: "Edited child", body: "retained@example.test" });
      await saveAdminSiteSettings(admin, { site_title: "Staging CMS test" }, run);
      expect((await readPublicCms("home", query)).settings.site_title).toBe("Staging CMS test");
      expect((await readAdminSiteSettings(admin, query)).some(row => row.key === "site_title" &&
        row.value === "Staging CMS test")).toBe(true);
      expect((await deleteAdminSection(admin, parent.id, run)).id).toBe(parent.id);
      expect((await readPublicCms("home", query)).sections.some(row => row.id === child.id)).toBe(false);
      const audits = await client.query(`SELECT id FROM public.audit_logs WHERE actor_user_id=$1::uuid
        AND action IN ('admin_create_page_section','admin_update_page_section',
          'admin_delete_page_section','admin_update_site_settings')`, [admin.userId]);
      expect(audits.rowCount).toBeGreaterThanOrEqual(4);
    } finally {
      await client.query("ROLLBACK").catch(() => undefined);
      client.release();
      await getPool().end();
    }
  }, 60_000);
});
