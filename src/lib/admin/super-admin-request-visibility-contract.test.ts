import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readSource = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), "utf8");

const migration = readSource(
  "supabase/migrations/20260910103000_fix_super_admin_module_request_visibility.sql",
);
const requestScreen = readSource("src/screens/RequestSubAdminAccess.tsx");
const reviewScreen = readSource("src/screens/admin/AdminAccessRequests.tsx");

describe("Super Admin module-access request contract", () => {
  it("treats both legacy admin and super_admin accounts as platform administrators", () => {
    expect(migration).toContain("ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin'");
    expect(migration).toContain("ur.role::text IN ('admin', 'super_admin')");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.is_platform_admin");
  });

  it("notifies Super Admins for signup, OAuth, and Student Dashboard requests", () => {
    expect(migration).toContain("'signup'");
    expect(migration).toContain("'oauth'");
    expect(migration).toContain("'student_dashboard'");
    expect(migration).toContain("notify_platform_admins_of_module_access_request");
  });

  it("does not substitute browser-side writes for the secured workflows", () => {
    expect(requestScreen).toContain('rpc(\n        "request_sub_admin_access"');
    expect(requestScreen).not.toContain('.from("sub_admin_requests")');
    expect(reviewScreen).not.toContain('.from("sub_admin_requests")');
  });
});
