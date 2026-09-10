import { describe, expect, it } from "vitest";

import { getTransactionalEmailProvider } from "./email-provider";
import { getPaymentProvider } from "./payment-provider";

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
});
