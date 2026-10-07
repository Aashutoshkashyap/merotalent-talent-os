import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20261007110000_fix_request_sub_admin_access_guard_and_user_profiles.sql"), "utf8");
const route = readFileSync(resolve(process.cwd(), "app/api/v1/admin/auth-users/route.ts"), "utf8");

describe("Google OAuth People visibility contract", () => {
  it("creates and backfills the canonical profile and talent role for OAuth Auth users", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.handle_new_user()");
    expect(migration).toContain("NEW.raw_user_meta_data ->> 'name'");
    expect(migration).toContain("NEW.raw_user_meta_data ->> 'picture'");
    expect(migration).toContain("INSERT INTO public.profiles");
    expect(migration).toContain("FROM auth.users u");
    expect(migration).toContain("INSERT INTO public.user_roles");
  });

  it("lists the Auth population even when an application profile is absent", () => {
    expect(route).toContain("adminClient.auth.admin.listUsers");
    expect(route).toContain("sanitizeAuthUser(user, platform.profiles.get(user.id)");
    expect(route).not.toContain("users.filter((user) => platform.profiles.has(user.id))");
  });

  it("applies search before server-side pagination", () => {
    const filterIndex = route.indexOf("safeUsers.filter");
    const sliceIndex = route.indexOf("searchedUsers.slice");
    expect(filterIndex).toBeGreaterThan(-1);
    expect(sliceIndex).toBeGreaterThan(filterIndex);
  });
});
