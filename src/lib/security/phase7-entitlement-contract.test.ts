import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("Phase 7 entitlement and eSewa security boundaries", () => {
  const migration = read("supabase/migrations/20260910150000_phase7_esewa_entitlements_and_trials.sql");

  it("keeps entitlement provenance separate from payment rows and blocks repeated trials", () => {
    expect(migration).toContain("module_entitlements");
    expect(migration).toContain("source IN ('TRIAL', 'ESEWA_PURCHASE', 'ADMIN_MANUAL'");
    expect(migration).toContain("module_entitlements_one_trial_idx");
    expect(migration).toContain("ADMIN_MANUAL_ENROLLMENT_CREATED");
  });

  it("requires server-side enrollment authority and exact target scope", () => {
    expect(migration).toContain("manage_module_enrollments");
    expect(migration).toContain("has_active_entity_assignment(p_target_user_id");
    expect(migration).toContain("Only Super Admin can start a trial");
  });

  it("does not allow an ordinary authenticated caller to probe another user's entitlements", () => {
    const scoped = read("supabase/migrations/20260910151000_phase7_entitlement_rpc_actor_scope.sql");
    expect(scoped).toContain("p_user_id = auth.uid() OR public.is_platform_admin(auth.uid())");
  });

  it("does not activate eSewa access from a return URL alone", () => {
    const callback = read("app/api/v1/payments/esewa/callback/route.ts");
    expect(callback).toContain("verifyRedirectPayload");
    expect(callback).toContain("lookupStatus");
    expect(callback).toContain("settleVerifiedCheckout");
  });
});
