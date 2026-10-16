import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/neon/neon-config", () => ({ getNeonConfig: () => ({ branchId: "isolated-test" }) }));
vi.mock("@/lib/server/secret-store", () => ({ decryptProviderSecret: () => "test-fixture-secret" }));
import { stagingEsewaProvider } from "@/lib/server/neon-checkout";
import type { queryRows } from "@/lib/server/db";

const configuration = { provider_name: "esewa", is_enabled: true,
  public_config: { merchant_code: "EPAYTEST", environment: "uat" },
  secret_ciphertext: "encrypted-fixture", secret_iv: "iv-fixture", secret_tag: "tag-fixture" };
const query = (row: unknown) => vi.fn(async () => row ? [row] : []) as unknown as typeof queryRows;

describe("Neon checkout uses Provider Center configuration", () => {
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
