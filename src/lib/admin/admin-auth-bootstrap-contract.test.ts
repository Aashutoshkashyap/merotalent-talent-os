import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260806093000_secure_admin_auth_user_access.sql",
  ),
  "utf8",
);

describe("first Super Admin bootstrap SQL contract", () => {
  it("is service-role-only and cannot run after an admin assignment exists", () => {
    expect(migration).toContain("IF auth.role() <> 'service_role'");
    expect(migration).toMatch(
      /IF EXISTS \(SELECT 1 FROM public\.user_roles ur WHERE ur\.role = 'admin'\)/,
    );
    expect(migration).toContain(
      "REVOKE ALL ON FUNCTION public.bootstrap_first_admin(uuid) FROM PUBLIC, anon, authenticated",
    );
    expect(migration).toContain(
      "GRANT EXECUTE ON FUNCTION public.bootstrap_first_admin(uuid) TO service_role",
    );
  });

  it("requires a verified active identity/profile and writes an explicit audit event", () => {
    expect(migration).toContain("au.email_confirmed_at IS NOT NULL");
    expect(migration).toContain("au.deleted_at IS NULL");
    expect(migration).toContain("p.account_status = 'active'");
    expect(migration).toContain("p.deleted_at IS NULL");
    expect(migration).toContain("'bootstrap_first_admin'");
    expect(migration).toContain("'provisioning_actor', 'service_role'");
  });
});
