import { describe, expect, it } from "vitest";

import { getTransactionalEmailProvider } from "./email-provider";
import { EsewaV2PaymentProvider, getPaymentProvider } from "./payment-provider";

describe("provider-independent delivery boundaries", () => {
  it("never turns an unconfigured payment attempt into success", async () => {
    const result = await getPaymentProvider({}).createCheckout({
      paymentId: "payment-1",
      amount: 1500,
      currency: "NPR",
      description: "Mentor session",
      returnUrl: "https://merotalent.test/payments/return",
    });

    expect(result).toMatchObject({ provider: "unconfigured", status: "pending" });
  });

  it("never claims email delivery when no provider configuration exists", async () => {
    const result = await getTransactionalEmailProvider({}).send({
      event: "job_application_received",
      to: "owner@example.com",
      subject: "New application",
      text: "A candidate applied.",
    });

    expect(result).toMatchObject({ provider: "unconfigured", status: "not_configured" });
  });

  it("creates a server-signed eSewa V2 form without exposing the merchant secret", async () => {
    const provider = getPaymentProvider({ providerName: "esewa", secret: "merchant-secret", publicConfig: { merchant_code: "NP-ES-TEES", environment: "uat" } });
    const result = await provider.createCheckout({ paymentId: "mt-order-1", amount: 1500, currency: "NPR", description: "Plan", returnUrl: "https://merotalent.test/return", failureUrl: "https://merotalent.test/failure" });
    expect(result.checkoutUrl).toContain("rc-epay.esewa.com.np");
    expect(result.checkoutFields).toMatchObject({ product_code: "NP-ES-TEES", transaction_uuid: "mt-order-1", total_amount: "1500.00" });
    expect(JSON.stringify(result)).not.toContain("merchant-secret");
    expect(provider).toBeInstanceOf(EsewaV2PaymentProvider);
  });
});
