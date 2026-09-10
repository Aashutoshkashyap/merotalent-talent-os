import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("Phase 5 platform-admin grant hardening", () => {
  it("keeps platform-admin role assignment out of normal role management", () => {
    const migration = readFileSync(
      resolve(root, "supabase/migrations/20260910145000_phase5_prevent_platform_admin_grants.sql"),
      "utf8",
    );
    expect(migration).toContain("p_role IN ('admin', 'super_admin')");
    expect(migration).toContain("Platform Admin role cannot be granted through role management");
  });

  it("does not offer the platform-admin role in the module assignment dialog", () => {
    const page = readFileSync(
      resolve(root, "src/screens/admin/AdminRoleManagement.tsx"),
      "utf8",
    );
    expect(page).toContain('.filter(([role]) => role !== "admin")');
  });
});
