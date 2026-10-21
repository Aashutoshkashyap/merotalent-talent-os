import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { EsewaV2PaymentProvider } from "./payment-provider";

const secret = "mock-reference-secret-not-a-merchant-credential";
const provider = new EsewaV2PaymentProvider(secret, { environment: "uat", merchantCode: "EPAYTEST" });

describe("supplied MrValuator ePay V2 pattern adapted to MeroTalent", () => {
  it.each([10, 10.5, 1000])("preserves the exact field signing protocol for NPR %s", async amount => {
    const result = await provider.createCheckout({ paymentId: "fixture-reference-1", amount, currency: "NPR",
      description: "Reference parity", returnUrl: "https://merotalent.test/success", failureUrl: "https://merotalent.test/failure" });
    const form = result.checkoutFields!;
    // Reference initiateEsewaPayment constructs these three pairs in this order.
    const message = `total_amount=${form.total_amount},transaction_uuid=${form.transaction_uuid},product_code=${form.product_code}`;
    expect(form.signature).toBe(createHmac("sha256", secret).update(message).digest("base64"));
    expect(form.signed_field_names).toBe("total_amount,transaction_uuid,product_code");
    expect(Number(form.amount) + Number(form.tax_amount) + Number(form.product_service_charge) + Number(form.product_delivery_charge)).toBe(Number(form.total_amount));
    expect(result.checkoutUrl).toBe("https://rc-epay.esewa.com.np/api/epay/main/v2/form");
    expect(JSON.stringify(result)).not.toContain(secret);
  });
  it("does not turn a signed COMPLETE response into authoritative settlement", async () => {
    expect(await provider.verifyCallback()).toMatchObject({ status: "failed" });
    const fetcher = vi.fn(async () => { throw new Error("provider timeout"); }) as unknown as typeof fetch;
    await expect(provider.lookupStatus({ reference: "fixture-reference-1", amount: 10, fetcher, strict: true })).rejects.toThrow("provider timeout");
  });
  it("preserves the raw grouped amount for HMAC and matches the authoritative amount", async () => {
    const payload = { transaction_code: "fixture-code", status: "COMPLETE", total_amount: "1,000.0",
      transaction_uuid: "fixture-reference-1", product_code: "EPAYTEST",
      signed_field_names: "transaction_code,status,total_amount,transaction_uuid,product_code,signed_field_names" };
    const signature = createHmac("sha256", secret).update(payload.signed_field_names.split(",")
      .map(name => `${name}=${payload[name as keyof typeof payload]}`).join(",")).digest("base64");
    expect(provider.verifyRedirectPayload({ ...payload, signature })).toBe(true);
    expect(provider.verifyRedirectPayload({ ...payload, total_amount: "1000.0", signature })).toBe(false);
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ product_code: "EPAYTEST",
      transaction_uuid: "fixture-reference-1", total_amount: "1,000.0", status: "COMPLETE", ref_id: "fixture-code" }))) as unknown as typeof fetch;
    expect(await provider.lookupStatus({ reference: "fixture-reference-1", amount: 1000, fetcher, strict: true }))
      .toEqual({ status: "successful", transactionId: "fixture-code" });
  });
});
