import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260812130000_free_tiers_and_access_hardening.sql",
  ),
  "utf8",
);

describe("centrally controlled free-tier SQL contract", () => {
  it("adds internal package metadata and bundles features that share an entity", () => {
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS package_kind text");
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS module_scope text[]");
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS is_default_free boolean");
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS duration_days integer");
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS is_publicly_selectable boolean");
    expect(migration).toContain(
      `'company', 0, 'NPR', 'year',\n    '{"job_applications":true,"event_registrations":true}'::jsonb`,
    );
    expect(migration).toContain(
      `'institution', 0, 'NPR', 'year',\n    '{"college_applications":true,"event_registrations":true}'::jsonb`,
    );
    expect(migration).toContain(
      `'mentor', 0, 'NPR', 'year',\n    '{"mentor_bookings":true,"event_registrations":true}'::jsonb`,
    );
  });

  it("uses private helpers and does not spoof the JWT role claim", () => {
    expect(migration).toContain(
      "CREATE OR REPLACE FUNCTION public._provision_default_free_tier(",
    );
    expect(migration).toContain(
      "FROM PUBLIC, anon, authenticated, service_role;",
    );
    expect(migration).toContain(
      "CREATE OR REPLACE FUNCTION public.admin_provision_default_free_tier(",
    );
    expect(migration).toContain(
      "CREATE OR REPLACE FUNCTION public.admin_revoke_default_free_tier(",
    );
    expect(migration).not.toContain("request.jwt.claim.role");
  });

  it("keeps internal packages out of the public package catalog", () => {
    expect(migration).toContain(
      'CREATE POLICY "Public can view selectable or owned packages"',
    );
    expect(migration).toContain("is_publicly_selectable = true");
  });
});

describe("delegated module access SQL contract", () => {
  it("derives request identity and grants explicit permissions, not a new role", () => {
    expect(migration).toContain(
      "CREATE OR REPLACE FUNCTION public.request_sub_admin_access(",
    );
    expect(migration).toContain("JOIN auth.users au ON au.id = p.user_id");
    expect(migration).toContain("actor, trusted_name, trusted_email, safe_modules");
    expect(migration).toContain(
      "CREATE OR REPLACE FUNCTION public.admin_decide_sub_admin_request(",
    );
    expect(migration).toContain("INSERT INTO public.user_permissions");
    expect(migration).not.toContain("'sub_admin'::public.app_role");
    expect(migration).not.toContain("request.jwt.claim.role");
  });

  it("locks direct writes and protects verification and public settings", () => {
    expect(migration).toContain(
      'DROP POLICY IF EXISTS "Users create sub_admin_requests"',
    );
    expect(migration).not.toContain(
      'CREATE POLICY "Users create sub_admin_requests"',
    );
    expect(migration).toContain("NEW.is_verified := OLD.is_verified;");
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS is_public boolean");
    expect(migration).toContain(
      'CREATE POLICY "Public reads allowlisted site settings"',
    );
  });

  it("does not put subqueries inside check constraints", () => {
    expect(migration).not.toContain("ARRAY(SELECT DISTINCT unnest");
  });
});
