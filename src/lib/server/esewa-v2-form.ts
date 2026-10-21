import { createHmac } from "node:crypto";

/** Adapted from the supplied MrValuator src/lib/esewa.ts initiateEsewaPayment.
 * The caller supplies the persisted server-priced order and validated callbacks.
 * Keep the reference's V2 fields/order; preserve MeroTalent's minor-unit format.
 */
export function buildEsewaV2Form(input: {
  total: string; transactionUuid: string; merchantCode: string;
  successUrl: string; failureUrl: string;
}, secret: string): Record<string, string> {
  const signedFieldNames = "total_amount,transaction_uuid,product_code";
  const message = `total_amount=${input.total},transaction_uuid=${input.transactionUuid},product_code=${input.merchantCode}`;
  return {
    amount: input.total, tax_amount: "0", total_amount: input.total,
    transaction_uuid: input.transactionUuid, product_code: input.merchantCode,
    product_service_charge: "0", product_delivery_charge: "0",
    success_url: input.successUrl, failure_url: input.failureUrl,
    signed_field_names: signedFieldNames,
    signature: createHmac("sha256", secret).update(message).digest("base64"),
  };
}
