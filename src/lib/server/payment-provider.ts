import { createHmac, timingSafeEqual } from "node:crypto";
import { buildEsewaV2Form } from "./esewa-v2-form";
import { parseEsewaAmount } from "./esewa-amount";

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
    status: "https://esewa.com.np/api/epay/transaction/status/",
  },
} as const;
const safeEquals = (actual: string, expected: string) => {
  const left = Buffer.from(actual); const right = Buffer.from(expected);
  return left.byteLength === right.byteLength && timingSafeEqual(left, right);
};

/** Bounded canonical Base64 and fatal UTF-8 decoding, shared by both runtimes. */
export function decodeEsewaRedirect(data: string): Record<string, unknown> {
  if (!data || data.length > 4096 || data.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(data)) {
    throw new Error("Invalid eSewa response encoding.");
  }
  const bytes = Buffer.from(data, "base64");
  if (bytes.toString("base64") !== data) throw new Error("Invalid eSewa response encoding.");
  const payload: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("Invalid eSewa response.");
  return payload as Record<string, unknown>;
}

/** eSewa ePay V2 form adapter. Verification remains a server-side status check. */
export class EsewaV2PaymentProvider implements PaymentProvider {
  readonly name = "esewa";

  constructor(private readonly secret: string, private readonly configuration: EsewaConfiguration) {
    if (!['uat','production'].includes(configuration.environment) ||
        !/^[A-Za-z0-9-]{2,128}$/.test(configuration.merchantCode) || !secret.trim() ||
        (configuration.environment==='production' &&
          (configuration.merchantCode==='EPAYTEST'||secret==='8gBm/:&EnhH.1/q'))) {
      throw new Error('Invalid or mixed eSewa environment configuration.');
    }
  }

  async createCheckout(input: PaymentInitiation): Promise<PaymentProviderResult> {
    const minor = Math.round(input.amount * 100);
    if (input.currency !== "NPR" || !Number.isFinite(input.amount) || input.amount <= 0 ||
        !Number.isSafeInteger(minor) || minor <= 0 || Math.abs(input.amount * 100 - minor) > 1e-7 ||
        !/^[A-Za-z0-9-]{1,128}$/.test(input.paymentId)) {
      return { status: "failed", provider: this.name, message: "eSewa checkout requires a positive NPR amount." };
    }
    const callback = (value: string) => {
      const url = new URL(value);
      if (url.username || url.password || url.hash || (url.protocol !== "https:" &&
          !(this.configuration.environment === "uat" && url.protocol === "http:" && url.hostname === "localhost"))) {
        throw new Error("Invalid eSewa callback URL.");
      }
      return url;
    };
    try {
      if (callback(input.returnUrl).origin !== callback(input.failureUrl || input.returnUrl).origin) {
        throw new Error("Mismatched callback origin.");
      }
    } catch { return { status: "failed", provider: this.name, message: "eSewa callback URLs are invalid." }; }
    const total = formatAmount(input.amount);
    return {
      status: "pending", provider: this.name, checkoutUrl: ESEWA_ENDPOINTS[this.configuration.environment].form,
      checkoutFields: buildEsewaV2Form({ total, transactionUuid: input.paymentId,
        merchantCode: this.configuration.merchantCode, successUrl: input.returnUrl,
        failureUrl: input.failureUrl || input.returnUrl }, this.secret),
    };
  }

  verifyRedirectPayload(payload: Record<string, unknown>) {
    const signedNames = typeof payload.signed_field_names === "string" ? payload.signed_field_names : "";
    const signature = typeof payload.signature === "string" ? payload.signature : "";
    const names = signedNames.split(",");
    if (signedNames !== "transaction_code,status,total_amount,transaction_uuid,product_code,signed_field_names" ||
        !/^[A-Za-z0-9+/]{43}=$/.test(signature) ||
        names.some(name => !Object.hasOwn(payload, name) ||
          !(typeof payload[name] === "string" || (typeof payload[name] === "number" && Number.isFinite(payload[name])))) ||
        payload.product_code !== this.configuration.merchantCode ||
        typeof payload.transaction_uuid !== "string" || !/^[A-Za-z0-9-]{1,128}$/.test(payload.transaction_uuid) ||
        typeof payload.transaction_code !== "string" || !payload.transaction_code.trim()) return false;
    return safeEquals(signature, base64Hmac(names.map((name) => `${name}=${String(payload[name])}`).join(","), this.secret));
  }

  async verifyCallback(): Promise<PaymentProviderResult> {
    // eSewa V2 completion is verified through its signed redirect plus the
    // server-side status endpoint, never from a generic callback assertion.
    return { status: "failed", provider: this.name, message: "Use the eSewa signed return verification flow." };
  }

  async lookupStatus(input: { reference: string; amount: number; fetcher?: typeof fetch; strict: true }): Promise<{
    status: "successful" | "failed" | "cancelled" | "pending" | "refunded" | "expired"; transactionId: string;
  }>;
  async lookupStatus(input: { reference: string; amount: number; fetcher?: typeof fetch }): Promise<{
    status: "successful" | "failed" | "cancelled" | "pending"; transactionId: string;
  }>;
  async lookupStatus(input: { reference: string; amount: number; fetcher?: typeof fetch; strict?: boolean }): Promise<{
    status: "successful" | "failed" | "cancelled" | "pending" | "refunded" | "expired"; transactionId: string;
  }> {
    if (!/^[A-Za-z0-9-]{1,128}$/.test(input.reference) || !Number.isFinite(input.amount) || input.amount <= 0 ||
        !Number.isSafeInteger(Math.round(input.amount * 100)) || Math.round(input.amount * 100) <= 0 || Math.abs(input.amount * 100 - Math.round(input.amount * 100)) > 1e-7) {
      throw new Error("Invalid eSewa verification reference or amount.");
    }
    const url = new URL(ESEWA_ENDPOINTS[this.configuration.environment].status);
    url.searchParams.set("product_code", this.configuration.merchantCode);
    url.searchParams.set("total_amount", formatAmount(input.amount));
    url.searchParams.set("transaction_uuid", input.reference);
    const response = await (input.fetcher ?? fetch)(url.toString(), { headers: { Accept: "application/json" }, cache: "no-store",
      redirect: "error", signal: AbortSignal.timeout(15_000) });
    if (!response.ok) {
      // HTTP/provider errors are not an authoritative terminal payment state.
      // Keep the checkout retryable; only a matched status response can settle it.
      throw new Error(`eSewa transaction verification returned HTTP ${response.status}.`);
    }
    const body = await response.json() as Record<string, unknown>;
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Invalid eSewa verification response.");
    const status = typeof body.status === "string" ? body.status.toUpperCase() : "";
    // Official ePay pages document both response shapes. Never accept conflicting
    // aliases: every supplied merchant/order/amount/reference must match.
    if ((body.product_code ?? body.scd) !== this.configuration.merchantCode ||
        (body.product_code !== undefined && body.product_code !== this.configuration.merchantCode) ||
        (body.scd !== undefined && body.scd !== this.configuration.merchantCode)) throw new Error("eSewa verification merchant code did not match checkout.");
    // A missing/malformed value must not bypass comparison through NaN.
    const rawAmount = body.total_amount ?? body.totalAmount;
    const returnedAmount = parseEsewaAmount(rawAmount);
    const returnedReference = String(body.transaction_uuid ?? body.pid ?? "");
    if (returnedReference !== input.reference) throw new Error("eSewa verification reference did not match the checkout order.");
    if ([body.transaction_uuid,body.pid].some(value=>value!==undefined&&value!==input.reference)) throw new Error("eSewa verification reference did not match the checkout order.");
    const returnedMinor = Math.round(returnedAmount * 100), expectedMinor = Math.round(input.amount * 100);
    if (!Number.isFinite(returnedAmount) || returnedAmount <= 0 || !Number.isSafeInteger(returnedMinor) ||
        !Number.isSafeInteger(expectedMinor) || expectedMinor <= 0 ||
        Math.abs(returnedAmount * 100 - returnedMinor) > 1e-7 || returnedMinor !== expectedMinor) {
      throw new Error("eSewa verification amount did not match the checkout order.");
    }
    if ([body.total_amount,body.totalAmount].some(value=>value!==undefined&&
        !(Number.isFinite(parseEsewaAmount(value))&&parseEsewaAmount(value)>0&&
          Math.abs(parseEsewaAmount(value)*100-expectedMinor)<1e-7))) {
      throw new Error("eSewa verification amount did not match the checkout order.");
    }
    const providerTransaction = body.ref_id ?? body.refId ?? body.transaction_code;
    if (status === "COMPLETE" && (typeof providerTransaction !== "string" || !providerTransaction.trim())) {
      throw new Error("eSewa verification transaction reference was missing.");
    }
    if ([body.ref_id,body.refId,body.transaction_code].some(value=>value!==undefined&&value!==null&&value!==providerTransaction)) {
      throw new Error("eSewa verification transaction references conflict.");
    }
    return {
      status: !input.strict ? (status === "COMPLETE" ? "successful" as const
        : status === "CANCELED" ? "cancelled" as const
        : "pending" as const)
        : status === "COMPLETE" ? "successful" as const
        : status === "CANCELED" ? "cancelled" as const
        : status === "NOT_FOUND" ? "expired" as const
        : status === "FULL_REFUND" || status === "PARTIAL_REFUND" ? "refunded" as const
        : "pending" as const,
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
  const configuredEnvironment=input.publicConfig?.environment;
  if(configuredEnvironment!==undefined&&configuredEnvironment!=='uat'&&configuredEnvironment!=='production')return new UnconfiguredPaymentProvider();
  try{return new EsewaV2PaymentProvider(input.secret, { merchantCode, environment: configuredEnvironment === "uat" ? "uat" : "production" });}
  catch{return new UnconfiguredPaymentProvider();}
};
