import { afterEach, describe, expect, it, vi } from "vitest";
import { postSignedCheckoutForm } from "./browser-checkout";

const checkoutUrl = "https://rc-epay.esewa.com.np/api/epay/main/v2/form";
const fields = {
  amount: "10.00", tax_amount: "0", total_amount: "10.00", transaction_uuid: "fixture-order",
  product_code: "EPAYTEST", product_service_charge: "0", product_delivery_charge: "0",
  success_url: "https://merotalent.test/return", failure_url: "https://merotalent.test/failure",
  signed_field_names: "total_amount,transaction_uuid,product_code", signature: "test-signature-only",
};
afterEach(() => vi.restoreAllMocks());
describe("reference-compatible eSewa POST form", () => {
  it("submits all server-signed fields unchanged and removes the temporary form", () => {
    const submit = vi.spyOn(HTMLFormElement.prototype, "submit").mockImplementation(function(this: HTMLFormElement) {
      expect(this.method).toBe("post"); expect(this.action).toBe(checkoutUrl);
      expect(Object.fromEntries(new FormData(this))).toEqual(fields);
    });
    postSignedCheckoutForm({ checkoutUrl, checkoutFields: fields });
    expect(submit).toHaveBeenCalledOnce(); expect(document.querySelector("form")).toBeNull();
  });
  it.each(["https://example.com/collect", `${checkoutUrl}?redirect=evil`, "javascript:alert(1)"])
    ("rejects a non-allowlisted gateway before sending any fields: %s", url => {
      const submit = vi.spyOn(HTMLFormElement.prototype, "submit");
      expect(() => postSignedCheckoutForm({ checkoutUrl: url, checkoutFields: fields })).toThrow();
      expect(submit).not.toHaveBeenCalled();
    });
  it("rejects missing fields, unknown fields and mixed environment before submitting", () => {
    const submit = vi.spyOn(HTMLFormElement.prototype, "submit");
    for (const bad of [{ ...fields, signature: "" }, { ...fields, submit: "shadow-method" }]) {
      expect(() => postSignedCheckoutForm({ checkoutUrl, checkoutFields: bad })).toThrow();
    }
    expect(() => postSignedCheckoutForm({ checkoutUrl: "https://epay.esewa.com.np/api/epay/main/v2/form", checkoutFields: fields })).toThrow("Mixed");
    expect(submit).not.toHaveBeenCalled();
  });
  it("does not interpolate provider values as executable HTML", () => {
    vi.spyOn(HTMLFormElement.prototype, "submit").mockImplementation(function(this: HTMLFormElement) {
      expect(this.querySelector("script")).toBeNull();
      expect(new FormData(this).get("transaction_uuid")).toBe('<script>alert("test")</script>');
    });
    postSignedCheckoutForm({ checkoutUrl, checkoutFields: { ...fields, transaction_uuid: '<script>alert("test")</script>' } });
  });
});
