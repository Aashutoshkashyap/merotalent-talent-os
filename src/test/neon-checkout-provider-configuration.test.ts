import { describe, expect, it, vi } from "vitest";
const runtime = vi.hoisted(() => ({ mode: "neon-staging" }));
vi.mock("@/lib/server/backend-mode", () => ({ getBackendMode: () => runtime.mode }));

vi.mock("@/lib/neon/neon-config", () => ({ getNeonConfig: () => ({ branchId: "isolated-test" }) }));
vi.mock("@/lib/server/secret-store", () => ({ decryptProviderSecret: () => "test-fixture-secret" }));
import { NeonCheckoutService, stagingEsewaProvider } from "@/lib/server/neon-checkout";
import type { NeonActor } from "@/lib/server/neon-authorization";
import type { queryRows } from "@/lib/server/db";

const configuration = { provider_name: "esewa", is_enabled: true,
  public_config: { merchant_code: "EPAYTEST", environment: "uat" },
  secret_ciphertext: "encrypted-fixture", secret_iv: "iv-fixture", secret_tag: "tag-fixture" };
const query = (row: unknown) => vi.fn(async () => row ? [row] : []) as unknown as typeof queryRows;

describe("Neon checkout uses Provider Center configuration", () => {
  it.each([undefined, "false", "1", "TRUE"])("blocks production paid initiation unless explicitly enabled (%s)", async value => {
    runtime.mode = "neon-production";
    const prior = process.env.NEON_PRODUCTION_PAYMENTS_ENABLED;
    if (value === undefined) delete process.env.NEON_PRODUCTION_PAYMENTS_ENABLED;
    else process.env.NEON_PRODUCTION_PAYMENTS_ENABLED = value;
    try {
      const service = new NeonCheckoutService();
      for (const kind of ["mentor_booking", "event_registration", "college_scope_request", "module_access_request", "assigned_scope"] as const) {
        await expect(service.initiate({} as NeonActor, kind, "not-a-real-entity", "https://www.merotalent.com"))
          .rejects.toMatchObject({ status: 503, code: "PAYMENTS_DISABLED" });
      }
    } finally {
      runtime.mode = "neon-staging";
      if (prior === undefined) delete process.env.NEON_PRODUCTION_PAYMENTS_ENABLED;
      else process.env.NEON_PRODUCTION_PAYMENTS_ENABLED = prior;
    }
  });
  it("rejects sandbox credentials in production and accepts only production-marked configuration", async () => {
    runtime.mode = "neon-production";
    try {
      await expect(stagingEsewaProvider(query(configuration))).rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE" });
      const provider = await stagingEsewaProvider(query({ ...configuration,
        public_config: { merchant_code: "MERCHANT-UNIT", environment: "production" } }));
      const checkout = await provider.createCheckout({ paymentId: "unit-only", amount: 100,
        currency: "NPR", description: "Unit test only", returnUrl: "https://www.merotalent.com/return" });
      expect(checkout.checkoutUrl).toBe("https://epay.esewa.com.np/api/epay/main/v2/form");
      expect(JSON.stringify(checkout)).not.toContain("test-fixture-secret");
    } finally { runtime.mode = "neon-staging"; }
  });
  it("loads the encrypted enabled UAT credential and produces sandbox checkout fields", async () => {
    const provider = await stagingEsewaProvider(query(configuration));
    const checkout = await provider.createCheckout({ paymentId: "test-payment", amount: 100,
      currency: "NPR", description: "Isolated sandbox", returnUrl: "http://localhost:3210/return" });
    expect(checkout.checkoutUrl).toBe("https://rc-epay.esewa.com.np/api/epay/main/v2/form");
    expect(checkout.checkoutFields?.product_code).toBe("EPAYTEST");
    expect(JSON.stringify(checkout)).not.toContain("test-fixture-secret");
    expect(JSON.stringify(checkout)).not.toContain("encrypted-fixture");
  });
  it.each([null, { ...configuration, is_enabled: false },
    { ...configuration, public_config: { merchant_code: "EPAYTEST", environment: "production" } },
    { ...configuration, secret_tag: null }])("fails closed for unavailable or production-marked credentials", async row => {
    await expect(stagingEsewaProvider(query(row))).rejects.toMatchObject({ code: "SANDBOX_UNAVAILABLE" });
  });
});
