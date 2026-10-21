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
    const provider = getPaymentProvider({ providerName: "esewa", secret: "merchant-secret", publicConfig: { merchant_code: "EPAYTEST", environment: "uat" } });
    const result = await provider.createCheckout({ paymentId: "mt-order-1", amount: 1500, currency: "NPR", description: "Plan", returnUrl: "https://merotalent.test/return", failureUrl: "https://merotalent.test/failure" });
    expect(result.checkoutUrl).toContain("rc-epay.esewa.com.np");
    expect(result.checkoutFields).toMatchObject({ product_code: "EPAYTEST", transaction_uuid: "mt-order-1", total_amount: "1500.00", signed_field_names: "total_amount,transaction_uuid,product_code" });
    expect(JSON.stringify(result)).not.toContain("merchant-secret");
    expect(provider).toBeInstanceOf(EsewaV2PaymentProvider);
  });

  it("uses eSewa's documented UAT and production transaction-status hosts", async () => {
    const seen: string[] = [];
    const fetcher = async (input: string | URL | Request) => {
      const url = String(input); seen.push(url);
      const requestUrl = new URL(url);
      return new Response(JSON.stringify({ product_code: requestUrl.searchParams.get("product_code"), transaction_uuid: requestUrl.searchParams.get("transaction_uuid"), total_amount: requestUrl.searchParams.get("total_amount"), status: "COMPLETE", ref_id: "ref-1" }), { status: 200, headers: { "Content-Type": "application/json" } });
    };
    const uat = getPaymentProvider({ providerName: "esewa", secret: "merchant-secret", publicConfig: { merchant_code: "EPAYTEST", environment: "uat" } }) as EsewaV2PaymentProvider;
    await uat.lookupStatus({ reference: "mt-order-1", amount: 1500, fetcher: fetcher as typeof fetch });
    const production = getPaymentProvider({ providerName: "esewa", secret: "merchant-secret", publicConfig: { merchant_code: "LIVE-CODE", environment: "production" } }) as EsewaV2PaymentProvider;
    await production.lookupStatus({ reference: "mt-order-2", amount: 1500, fetcher: fetcher as typeof fetch });
    expect(seen[0]).toContain("https://rc.esewa.com.np/api/epay/transaction/status/");
    expect(seen[1]).toContain("https://esewa.com.np/api/epay/transaction/status/");
  });

  it("does not create an eSewa adapter without a merchant-issued product code", () => {
    expect(getPaymentProvider({ providerName: "esewa", secret: "merchant-secret", publicConfig: { environment: "uat" } })).not.toBeInstanceOf(EsewaV2PaymentProvider);
  });
  it.each([
    {merchant_code:'EPAYTEST',environment:'production'},
    {merchant_code:'LIVE-CODE',environment:'invalid'},
  ])('rejects mixed or invalid provider environment %j',publicConfig=>{
    expect(getPaymentProvider({providerName:'esewa',secret:'fixture-secret',publicConfig})).not.toBeInstanceOf(EsewaV2PaymentProvider);
  });
  it('blocks the published UAT secret even with a production-marked merchant',()=>{
    expect(getPaymentProvider({providerName:'esewa',secret:'8gBm/:&EnhH.1/q',publicConfig:{merchant_code:'LIVE-CODE',environment:'production'}})).not.toBeInstanceOf(EsewaV2PaymentProvider);
  });
});
