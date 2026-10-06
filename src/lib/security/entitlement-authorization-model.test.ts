import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("authoritative entitlement authorization model", () => {
  const migration = read("supabase/migrations/20260911123000_enforce_entitlement_authorization_model.sql");
  const trialMigration = read("supabase/migrations/20260911130000_add_trial_entitlement_features.sql");
  const accountGuardMigration = read("supabase/migrations/20260911131000_restore_core_account_status_guardrails.sql");
  const freeBridgeMigration = read("supabase/migrations/20260911132000_bridge_free_tier_to_entitlement_ledger.sql");

  it("keeps Super Admin as the explicit platform-wide exception", () => {
    expect(migration).toContain("public.is_platform_admin(p_user_id)");
    expect(migration).toContain("Super Admin controls audit logs");
    expect(migration).toContain("Super Admin views AI usage metadata");
  });

  it("requires module admins to satisfy capability, assignment, entitlement, and feature checks", () => {
    expect(migration).toContain("public.has_active_module_capability(p_user_id, p_module_key)");
    expect(migration).toContain("public.has_active_entity_assignment(p_user_id, p_module_key, p_entity_type, p_entity_id)");
    expect(migration).toContain("public.has_active_module_entitlement(p_user_id, p_module_key, p_entity_type, p_entity_id, NULL)");
    expect(migration).toContain("public.has_entity_feature_access(p_user_id, p_module_key, p_entity_type, p_entity_id, p_feature_key)");
  });

  it("supports FREE provenance without treating absent payment as access", () => {
    expect(migration).toContain("'FREE'");
    expect(migration).toContain("A free package is required for a free entitlement");
    expect(migration).toContain("package_kind = 'free'");
  });

  it("materializes explicit default features for trial access in a forward migration", () => {
    expect(trialMigration).toContain("default_features jsonb");
    expect(trialMigration).toContain("Granted with trial");
    expect(trialMigration).toContain("Only Super Admin can start a trial");
  });

  it("replaces legacy module row scopes while preserving account-status guards and preventing delegated self-grants", () => {
    expect(migration).toContain("Active accounts read private data");
    expect(migration).toContain("Only Super Admin can manage module entitlements");
    expect(migration).toContain("DROP POLICY IF EXISTS \"Scoped managers update jobs\"");
    expect(accountGuardMigration).toContain("AS RESTRICTIVE");
    expect(accountGuardMigration).toContain("public.is_account_active(auth.uid())");
  });

  it("records AI usage without writing provider secrets into the ledger", () => {
    const aiRoute = read("app/api/v1/ai/generate/route.ts");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.ai_usage_logs");
    expect(aiRoute).toContain('from("ai_usage_logs")');
    expect(aiRoute).not.toContain("secret: configured.secret, status");
  });

  it("centralizes dated manual assignments and payment tracking in one Super Admin transaction", () => {
    const assignmentMigration = read("supabase/migrations/20261006150000_centralize_admin_module_assignment.sql");
    const accessMatrixRoute = read("app/api/v1/admin/access-matrix/route.ts");
    expect(assignmentMigration).toContain("admin_assign_module_access_with_payment");
    expect(assignmentMigration).toContain("admin_assign_entity_scope");
    expect(assignmentMigration).toContain("admin_manage_module_entitlement");
    expect(assignmentMigration).toContain("INSERT INTO public.payments");
    expect(accessMatrixRoute).toContain("ACCESS_ASSIGNMENT_MOVED");
  });

  it("bridges legacy Free subscription controls to the ledger and lets only Super Admin revoke", () => {
    expect(freeBridgeMigration).toContain("_upsert_free_module_entitlement");
    expect(freeBridgeMigration).toContain("admin_provision_module_free_entitlement");
    expect(freeBridgeMigration).toContain("admin_revoke_module_entitlement");
    expect(freeBridgeMigration).toContain("Only Super Admin can revoke module entitlements");
  });
});
