import { createHmac, timingSafeEqual } from "node:crypto";

export type PaymentLifecycleStatus = "initiated" | "pending" | "successful" | "failed" | "cancelled" | "refunded" | "expired";

export interface PaymentInitiation {
  paymentId: string;
  amount: number;
  currency: string;
  description: string;
  returnUrl: string;
  failureUrl?: string;
}

export interface PaymentProviderResult {
  status: PaymentLifecycleStatus;
  provider: string;
  checkoutUrl?: string;
  checkoutFields?: Record<string, string>;
  message?: string;
}

export interface PaymentProvider {
  readonly name: string;
  createCheckout(input: PaymentInitiation): Promise<PaymentProviderResult>;
  verifyCallback(input: { payload: unknown; signature?: string | null }): Promise<PaymentProviderResult>;
}

export type EsewaConfiguration = { merchantCode: string; environment: "production" | "uat" };

const base64Hmac = (message: string, secret: string) => createHmac("sha256", secret).update(message).digest("base64");
const formatAmount = (amount: number) => amount.toFixed(2);
// eSewa ePay V2 endpoints (official — https://developer.esewa.com.np/pages/Epay)
const ESEWA_ENDPOINTS = {
  uat: {
    form: "https://rc-epay.esewa.com.np/api/epay/main/v2/form",
    status: "https://rc.esewa.com.np/api/epay/transaction/status/",
  },
  production: {
    form: "https://epay.esewa.com.np/api/epay/main/v2/form",
    status: "https://epay.esewa.com.np/api/epay/transaction/status/",
  },
} as const;
const safeEquals = (actual: string, expected: string) => {
  const left = Buffer.from(actual); const right = Buffer.from(expected);
  return left.byteLength === right.byteLength && timingSafeEqual(left, right);
};

/** eSewa ePay V2 form adapter. Verification remains a server-side status check. */
export class EsewaV2PaymentProvider implements PaymentProvider {
  readonly name = "esewa";

  constructor(private readonly secret: string, private readonly configuration: EsewaConfiguration) {}

  async createCheckout(input: PaymentInitiation): Promise<PaymentProviderResult> {
    if (input.currency !== "NPR" || !Number.isFinite(input.amount) || input.amount <= 0) {
      return { status: "failed", provider: this.name, message: "eSewa checkout requires a positive NPR amount." };
    }
    const total = formatAmount(input.amount);
    const signedFieldNames = "total_amount,transaction_uuid,product_code";
    const signature = base64Hmac(`total_amount=${total},transaction_uuid=${input.paymentId},product_code=${this.configuration.merchantCode}`, this.secret);
    return {
      status: "pending", provider: this.name, checkoutUrl: ESEWA_ENDPOINTS[this.configuration.environment].form,
      checkoutFields: {
        amount: total, tax_amount: "0", total_amount: total, transaction_uuid: input.paymentId,
        product_code: this.configuration.merchantCode, product_service_charge: "0", product_delivery_charge: "0",
        success_url: input.returnUrl, failure_url: input.failureUrl || input.returnUrl, signed_field_names: signedFieldNames, signature,
      },
    };
  }

  verifyRedirectPayload(payload: Record<string, unknown>) {
    const signedNames = typeof payload.signed_field_names === "string" ? payload.signed_field_names : "";
    const signature = typeof payload.signature === "string" ? payload.signature : "";
    const names = signedNames.split(",").map((value) => value.trim()).filter(Boolean);
    if (!signature || !names.length || names.some((name) => !(name in payload))) return false;
    return safeEquals(signature, base64Hmac(names.map((name) => `${name}=${String(payload[name])}`).join(","), this.secret));
  }

  async verifyCallback(): Promise<PaymentProviderResult> {
    // eSewa V2 completion is verified through its signed redirect plus the
    // server-side status endpoint, never from a generic callback assertion.
    return { status: "failed", provider: this.name, message: "Use the eSewa signed return verification flow." };
  }

  async lookupStatus(input: { reference: string; amount: number; fetcher?: typeof fetch }) {
    const url = new URL(ESEWA_ENDPOINTS[this.configuration.environment].status);
    url.searchParams.set("product_code", this.configuration.merchantCode);
    url.searchParams.set("total_amount", formatAmount(input.amount));
    url.searchParams.set("transaction_uuid", input.reference);
    const response = await (input.fetcher ?? fetch)(url.toString(), { headers: { Accept: "application/json" }, cache: "no-store" });
    if (!response.ok) {
      // eSewa returns 400/404 for unknown transactions — treat as failed, not unavailable
      if (response.status === 400 || response.status === 404) {
        return { status: "failed" as const, transactionId: input.reference };
      }
      throw new Error(`eSewa transaction verification returned HTTP ${response.status}.`);
    }
    const body = await response.json() as Record<string, unknown>;
    const status = typeof body.status === "string" ? body.status.toUpperCase() : "";
    // eSewa may return the amount as a string or number; compare after parsing both as floats
    const returnedAmount = Number(body.total_amount ?? body.totalAmount);
    const returnedReference = String(body.transaction_uuid ?? body.pid ?? "");
    if (returnedReference !== input.reference) throw new Error("eSewa verification reference did not match the checkout order.");
    // Allow a tiny float tolerance (eSewa rounds to 2dp)
    if (Math.abs(returnedAmount - input.amount) > 0.01) throw new Error("eSewa verification amount did not match the checkout order.");
    return {
      status: status === "COMPLETE" ? "successful" as const
        : status === "CANCELED" ? "cancelled" as const
        : status === "PENDING" ? "pending" as const
        : "failed" as const,
      transactionId: String(body.ref_id ?? body.refId ?? body.transaction_code ?? input.reference),
    };
  }
}

class UnconfiguredPaymentProvider implements PaymentProvider {
  readonly name = "unconfigured";

  async createCheckout(): Promise<PaymentProviderResult> {
    return {
      status: "pending",
      provider: this.name,
      message: "A payment provider has not been configured.",
    };
  }

  async verifyCallback(): Promise<PaymentProviderResult> {
    return { status: "failed", provider: this.name, message: "A payment provider has not been configured." };
  }

}

/**
 * Resolves a provider boundary without ever treating an unconfigured checkout
 * or callback as successful. Provider adapters belong behind this contract and
 * must verify their own signed callbacks before updating the payment record.
 */
export const getPaymentProvider = (input: { providerName?: string; secret?: string; publicConfig?: Record<string, unknown> } = {}): PaymentProvider => {
  if (input.providerName !== "esewa" || !input.secret) return new UnconfiguredPaymentProvider();
  const merchantCode = typeof input.publicConfig?.merchant_code === "string" ? input.publicConfig.merchant_code.trim() : "";
  if (!/^[A-Za-z0-9-]{2,128}$/.test(merchantCode)) return new UnconfiguredPaymentProvider();
  return new EsewaV2PaymentProvider(input.secret, { merchantCode, environment: input.publicConfig?.environment === "uat" ? "uat" : "production" });
};
