import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readSource = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), "utf8");

const authContext = readSource("src/contexts/AuthContext.tsx");

/**
 * The client is never the authority on identity. Roles and account status come
 * from the get_my_access_context RPC, which resolves them server-side; a
 * client that can mint its own session or assign its own role is an
 * authentication bypass regardless of what RLS later rejects.
 */
describe("auth client holds no identity authority", () => {
  it("never fabricates a session or access token", () => {
    expect(authContext).not.toContain("mock-test-access-token");
    expect(authContext).not.toContain("mock-test-refresh-token");
    expect(authContext).not.toMatch(/setSession\(\s*mock/i);
    expect(authContext).not.toMatch(/setUser\(\s*mock/i);
  });

  it("never writes user_roles from the browser", () => {
    // Reading roles is fine and RLS-protected; assigning them is not. Match a
    // write verb applied to the user_roles table specifically.
    const userRolesWrite =
      /from\(\s*["']user_roles["']\s*\)\s*\.\s*(upsert|insert|update|delete)\b/;
    expect(authContext).not.toMatch(userRolesWrite);
  });

  it("resolves roles only through the server access context", () => {
    expect(authContext).toContain("get_my_access_context");
  });

  it("carries no hardcoded credentials for a privileged domain", () => {
    // These shipped in the public client bundle and named the admin accounts.
    expect(authContext).not.toMatch(/@merotalent\.com/);
    expect(authContext).not.toContain("TEST_ACCOUNTS");
  });

  it("never calls the development email-confirmation fixture", () => {
    expect(authContext).not.toContain("confirm_test_user_email");
  });
});

/**
 * Functions reachable by `anon` are reachable by the whole internet. Read-only
 * predicates are fine there — every one below is a boolean used inside an RLS
 * policy. A function that writes must not be in this set.
 */
describe("anon-executable database functions stay read-only", () => {
  const ANON_EXECUTABLE_ALLOWLIST = new Set([
    "has_permission",
    "has_role",
    "is_account_active",
    "is_college_payment_verified",
    "is_platform_admin",
  ]);

  const migrationsDir = resolve(process.cwd(), "supabase/migrations");

  /**
   * Replays every migration in version order and tracks the net anon grant per
   * function, so a grant that a later migration revokes does not count.
   */
  const grantedToAnon = () => {
    const granted = new Map<string, string>();

    const grantPattern =
      /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.([a-z_]+)\s*\([^)]*\)\s*\n?\s*TO\s+([^;']+);/gi;
    const revokePattern =
      /REVOKE\s+[A-Z ]*ON\s+FUNCTION\s+public\.([a-z_]+)\s*\([^)]*\)\s*\n?\s*FROM\s+([^;']+)/gi;

    for (const file of readdirSync(migrationsDir).filter((n) => n.endsWith(".sql")).sort()) {
      const sql = readFileSync(resolve(migrationsDir, file), "utf8");

      for (const [, name, roles] of sql.matchAll(grantPattern)) {
        if (/\banon\b/i.test(roles)) granted.set(name, file);
      }
      for (const [, name, roles] of sql.matchAll(revokePattern)) {
        if (/\banon\b|\bPUBLIC\b/i.test(roles)) granted.delete(name);
      }
    }

    return granted;
  };

  it("grants anon nothing outside the read-only allowlist", () => {
    const unexpected = [...grantedToAnon().entries()]
      .filter(([name]) => !ANON_EXECUTABLE_ALLOWLIST.has(name))
      .map(([name, file]) => `${name} (${file})`);

    expect(unexpected).toEqual([]);
  });

  it("keeps the email-confirmation fixture off the anon surface", () => {
    // 20260820163000 granted it to anon; 20260821120000 revokes that. The
    // revoke must stay present for as long as the fixture exists.
    const harden = readSource(
      "supabase/migrations/20260821120000_harden_confirm_test_user_email.sql",
    );
    expect(harden).toMatch(/REVOKE ALL ON FUNCTION public\.confirm_test_user_email/);
    expect(harden).toMatch(/FROM PUBLIC, anon, authenticated/);
  });
});
