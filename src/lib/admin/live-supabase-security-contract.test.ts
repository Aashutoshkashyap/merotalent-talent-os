import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260910113000_harden_live_supabase_security.sql",
  ),
  "utf8",
);
const triggerMigration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260910114000_revoke_trigger_rpc_execution.sql",
  ),
  "utf8",
);

describe("live Supabase security hardening contract", () => {
  it("removes the legacy broad Storage write policies", () => {
    expect(migration).toContain('DROP POLICY IF EXISTS "Active accounts insert storage objects" ON storage.objects;');
    expect(migration).toContain('DROP POLICY IF EXISTS "Give anon users access to JPG images in folder 1wfxz4x_1" ON storage.objects;');
    expect(migration).toContain('DROP POLICY IF EXISTS "Give users authenticated access to folder 1wfxz4x_1" ON storage.objects;');
  });

  it("removes default anonymous execution from all security-definer functions", () => {
    expect(migration).toContain("WHERE n.nspname = 'public' AND p.prosecdef");
    expect(migration).toContain("REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon");
    expect(migration).toContain("REVOKE ALL ON FUNCTION public.claim_initial_oauth_role(text)");
  });

  it("restores only the explicit authenticated and server RPC surface", () => {
    expect(migration).toContain("public.request_sub_admin_access(text[], text, text) TO authenticated, service_role");
    expect(migration).toContain("public.run_platform_maintenance() TO service_role");
    expect(migration).toContain("public.is_platform_admin(uuid) TO anon, authenticated, service_role");
  });

  it("keeps trigger functions off the authenticated RPC surface", () => {
    expect(triggerMigration).toContain("p.prorettype = 'trigger'::regtype");
    expect(triggerMigration).toContain("FROM PUBLIC, anon, authenticated");
  });
});
