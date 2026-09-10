import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("release hardening entitlement and checkout boundaries", () => {
  const migration = read("supabase/migrations/20260910152000_release_harden_entitlement_delivery.sql");

  it("materializes manual entitlement features as audited entity grants", () => {
    expect(migration).toContain("ADMIN_MANUAL_ENROLLMENT_CREATED");
    expect(migration).toContain("INSERT INTO public.entity_feature_grants");
    expect(migration).toContain("ON CONFLICT (user_id,module_key,entity_type,entity_id,feature_key)");
    expect(migration).toContain("p_source IN ('SUPER_ADMIN_PACKAGE', 'ADMIN_PACKAGE') AND p_package_id IS NULL");
  });

  it("keeps manual entitlements compatible with legacy private lead gates", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.has_active_entity_subscription");
    expect(migration).toContain("e.user_id = auth.uid()");
    expect(migration).toContain("lead_viewing");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.get_my_college_workspaces");
  });

  it("uses a trusted server checkout and never allows a user-level plan target", () => {
    const checkout = read("app/api/v1/payments/checkout/route.ts");
    const paymentScreen = read("src/screens/dashboard/Payments.tsx");
    expect(checkout).not.toContain('value.entityType !== "user"');
    expect(checkout).toContain("!uuid(value.entityId)");
    expect(paymentScreen).toContain("/api/v1/payments/checkout");
    expect(paymentScreen).toContain("postToCheckout");
    expect(paymentScreen).toContain("No access is activated until eSewa verification succeeds");
  });
});
