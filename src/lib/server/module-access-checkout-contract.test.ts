import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const checkout = readFileSync(resolve(process.cwd(), "app/api/v1/payments/checkout/route.ts"), "utf8");
const settlement = readFileSync(resolve(process.cwd(), "src/lib/server/esewa-settlement.ts"), "utf8");
const requestUi = readFileSync(resolve(process.cwd(), "src/screens/RequestSubAdminAccess.tsx"), "utf8");
const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20261007130000_module_access_request_esewa_payments.sql"), "utf8");

describe("delegated module access eSewa checkout contract", () => {
  it("binds checkout to the signed-in owner's request and a server-priced compatible plan", () => {
    expect(checkout).toContain("value.accessRequestId");
    expect(checkout).toContain('.eq("user_id", authenticated.user.id)');
    expect(checkout).toContain("requestedModules.some");
    expect(checkout).toContain("amount: pkg.price");
    expect(checkout).toContain('entity_type: "module_access_request"');
    expect(checkout).toContain("reuseActiveCheckout");
  });

  it("redirects through the canonical signed provider form instead of showing local success", () => {
    expect(requestUi).toContain('body: JSON.stringify({ accessRequestId: requestId, packageId: selectedPlanId })');
    expect(requestUi).toContain("postToCheckout(checkoutPayload.data.checkoutUrl");
    expect(requestUi).not.toContain("Access Request Submitted!");
    expect(requestUi).not.toContain("setIsSubmitted(true)");
  });

  it("links a verified provider settlement to the request without granting access from the redirect", () => {
    expect(settlement).toContain('checkout.entity_type === "module_access_request"');
    expect(settlement).toContain('.from("sub_admin_requests").update');
    expect(settlement).toContain("payment_id: paymentId");
    expect(settlement).toContain('payment_status: requestPaymentStatus');
    expect(settlement).not.toContain('rpc("admin_decide_sub_admin_request"');
    expect(migration).toContain("Verified payment is required before approving this paid access request");
  });

  it("enforces one active checkout attempt per user and payable resource", () => {
    expect(migration).toContain("payment_checkout_one_active_resource_idx");
    expect(migration).toContain("WHERE status IN ('initiated', 'pending')");
  });
});
