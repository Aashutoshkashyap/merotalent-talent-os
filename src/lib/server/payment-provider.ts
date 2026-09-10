export type PaymentLifecycleStatus =
  | "initiated"
  | "pending"
  | "successful"
  | "failed"
  | "cancelled"
  | "refunded";

export interface PaymentInitiation {
  paymentId: string;
  amount: number;
  currency: string;
  description: string;
  returnUrl: string;
}

export interface PaymentProviderResult {
  status: PaymentLifecycleStatus;
  provider: string;
  checkoutUrl?: string;
  message?: string;
}

export interface PaymentProvider {
  readonly name: string;
  createCheckout(input: PaymentInitiation): Promise<PaymentProviderResult>;
  verifyCallback(input: {
    payload: unknown;
    signature?: string | null;
  }): Promise<PaymentProviderResult>;
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
    return {
      status: "failed",
      provider: this.name,
      message: "A payment provider has not been configured.",
    };
  }
}

/**
 * Resolves a provider boundary without ever treating an unconfigured checkout
 * or callback as successful. Provider adapters belong behind this contract and
 * must verify their own signed callbacks before updating the payment record.
 */
export const getPaymentProvider = (
  environment: Record<string, string | undefined> = process.env,
): PaymentProvider => {
  // No provider is selected until a concrete adapter and its secret
  // configuration are installed. This intentional default protects all
  // existing pending payment rows from accidental client-side completion.
  if (!environment.PAYMENT_PROVIDER) return new UnconfiguredPaymentProvider();
  return new UnconfiguredPaymentProvider();
};
