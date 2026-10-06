import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("central Super Admin module assignment", () => {
  const users = read("src/screens/admin/AdminUsers.tsx");
  const sidebar = read("src/components/admin/AdminSidebar.tsx");
  const migration = read("supabase/migrations/20261006150000_centralize_admin_module_assignment.sql");

  it("uses one dated, scoped, auditable assignment transaction", () => {
    expect(users).toContain('rpc("admin_assign_module_access_with_payment"');
    expect(users).toContain("Subscription starts");
    expect(users).toContain("Subscription ends");
    expect(users).toContain("Amount Received (NPR)");
    expect(migration).toContain("Only Super Admin can assign module access");
    expect(migration).toContain("Super Admin already has platform-wide access");
    expect(migration).toContain("INSERT INTO public.payments");
  });

  it("removes duplicate role and access-matrix navigation", () => {
    expect(sidebar).not.toContain('label: "Roles"');
    expect(sidebar).not.toContain('label: "Access matrix"');
    expect(sidebar).toContain('label: "Access requests"');
  });
});
