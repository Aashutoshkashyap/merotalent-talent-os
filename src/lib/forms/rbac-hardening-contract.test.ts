import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const collegeMigration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260810110000_secure_college_directory_and_applications.sql",
  ),
  "utf8",
);

const rbacMigration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260810110500_rbac_and_entitlement_hardening.sql",
  ),
  "utf8",
);

const oauthMigration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260810110700_secure_oauth_role_onboarding.sql",
  ),
  "utf8",
);

const roleGuardMigration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260810111500_seed_fixture_and_role_guard.sql",
  ),
  "utf8",
);

const seedScript = readFileSync(
  resolve(process.cwd(), "scripts/seed-test-users.mjs"),
  "utf8",
);

describe("college directory and application security contract", () => {
  it("derives the public badge only from an exact successful paid subscription", () => {
    expect(collegeMigration).toContain(
      "CREATE OR REPLACE FUNCTION public.is_college_payment_verified(_institute_id uuid)",
    );
    expect(collegeMigration).toContain("s.entity_id = i.id");
    expect(collegeMigration).toContain("s.payment_status = 'success'");
    expect(collegeMigration).toContain(
      "public.is_college_payment_verified(i.id) AS payment_verified",
    );
    expect(collegeMigration).not.toContain("i.is_verified AS payment_verified");
  });

  it("uses trusted account identity and an explicit listing intake switch", () => {
    expect(collegeMigration).toContain("i.applications_enabled = true");
    expect(collegeMigration).toContain(
      "public.has_permission(actor, 'application.submit')",
    );
    expect(collegeMigration).toContain("trusted_payload := jsonb_set(");
    expect(collegeMigration).toContain("trusted_payload\n  )");
  });
});

describe("RBAC and entitlement hardening contract", () => {
  it("removes accumulated roles and enforces one deferred primary-role constraint", () => {
    expect(rbacMigration).toContain("'remove_duplicate_primary_role'");
    expect(rbacMigration).toContain("WHERE ur.id = rr.id AND rr.role_rank > 1");
    expect(rbacMigration).toContain("CONSTRAINT user_roles_one_primary_role");
    expect(rbacMigration).toContain("DEFERRABLE INITIALLY DEFERRED");
  });

  it("requires exact entity entitlements and handles standalone jobs as user plans", () => {
    expect(rbacMigration).toContain(
      "s.entity_type = 'user' AND s.entity_id IS NULL AND _entity_id IS NULL",
    );
    expect(rbacMigration).toContain(
      "auth.uid(), 'user', NULL::uuid, 'job_applications', 'read_only'",
    );
    expect(rbacMigration).toContain(
      "CASE WHEN j.company_id IS NULL THEN 'user' ELSE 'company' END",
    );
  });

  it("rechecks current entity ownership instead of trusting stale lead ownership", () => {
    expect(rbacMigration).toContain("i.owner_user_id = auth.uid()");
    expect(rbacMigration).toContain("m.user_id = auth.uid()");
    expect(rbacMigration).toContain("e.organizer_user_id = auth.uid()");
    expect(rbacMigration).toContain("j.owner_user_id = auth.uid()");
    expect(rbacMigration).toContain("FROM public.event_registrations er");
    expect(rbacMigration).toContain("FROM public.job_applications ja");
  });
});

describe("OAuth role onboarding security contract", () => {
  it("permits one recent non-admin OAuth role claim and audits the change", () => {
    expect(oauthMigration).toContain("p_role NOT IN ('institution', 'company', 'mentor')");
    expect(oauthMigration).toContain("account_created_at < now() - interval '30 minutes'");
    expect(oauthMigration).toContain("auth_provider NOT IN ('google', 'apple')");
    expect(oauthMigration).toContain("role_count <> 1 OR current_role <> 'talent'");
    expect(oauthMigration).toContain("'claim_initial_oauth_role'");
  });
});

describe("legacy role and test-fixture hardening contract", () => {
  it("makes every legacy has_role policy depend on the Auth-aware account check", () => {
    expect(roleGuardMigration).toContain(
      "CREATE OR REPLACE FUNCTION public.has_role(",
    );
    expect(roleGuardMigration).toContain(
      "_user_id uuid,\n  _role public.app_role",
    );
    expect(roleGuardMigration).toContain("SECURITY DEFINER");
    expect(roleGuardMigration).toContain(
      "SELECT public.is_account_active(_user_id) AND EXISTS (",
    );
    expect(roleGuardMigration).not.toMatch(/\b(?:DROP FUNCTION|REVOKE|GRANT)\b/i);
  });

  it("keeps the institution fixture private and grants standalone-job entitlement", () => {
    expect(seedScript).toContain('status: "draft"');
    expect(seedScript).toContain('applications_enabled: false');
    expect(seedScript).toContain('entityType: "user"');
    expect(seedScript).toContain("entityId: null");
    expect(seedScript).toContain("features: { job_applications: true }");
  });

  it("looks up NULL entity subscriptions with IS NULL semantics", () => {
    expect(seedScript).toContain("entityId === null");
    expect(seedScript).toContain('.is("entity_id", null)');
  });
});
