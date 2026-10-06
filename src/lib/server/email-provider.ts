export type TransactionalEmailStatus =
  | "queued"
  | "sent"
  | "failed"
  | "not_configured";

export interface TransactionalEmail {
  event:
    | "access_request_decision"
    | "college_claim_decision"
    | "subscription_changed"
    | "college_lead_received"
    | "mentor_booking_received"
    | "event_registration_received"
    | "job_application_received"
    | "guest_application_verification";
  to: string;
  subject: string;
  text: string;
  html?: string;
  idempotencyKey?: string;
}

export interface EmailDeliveryResult {
  status: TransactionalEmailStatus;
  provider: string;
  providerMessageId?: string;
  message?: string;
}

export interface TransactionalEmailProvider {
  readonly name: string;
  send(message: TransactionalEmail): Promise<EmailDeliveryResult>;
}

class ResendEmailProvider implements TransactionalEmailProvider {
  readonly name = "resend";
  constructor(private readonly apiKey: string, private readonly from: string) {}

  async send(message: TransactionalEmail): Promise<EmailDeliveryResult> {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json", ...(message.idempotencyKey ? { "Idempotency-Key": message.idempotencyKey } : {}) },
      body: JSON.stringify({ from: this.from, to: [message.to], subject: message.subject, text: message.text, ...(message.html ? { html: message.html } : {}) }),
    });
    const body = await response.json().catch(() => null) as { id?: string; message?: string } | null;
    if (!response.ok) return { status: "failed", provider: this.name, message: body?.message || "Email provider rejected delivery." };
    return { status: "sent", provider: this.name, providerMessageId: body?.id, message: "Accepted by email provider." };
  }
}

class UnconfiguredEmailProvider implements TransactionalEmailProvider {
  readonly name = "unconfigured";

  async send(): Promise<EmailDeliveryResult> {
    return {
      status: "not_configured",
      provider: this.name,
      message: "Transactional email delivery has not been configured.",
    };
  }
}

/**
 * Provider adapters are deliberately resolved server-side. Notifications can
 * remain queued in the database while this function reports a configuration
 * block; no UI path should claim that an email was delivered from this state.
 */
export const getTransactionalEmailProvider = (
  environment: Record<string, string | undefined> = process.env,
): TransactionalEmailProvider => {
  const apiKey = environment.RESEND_API_KEY;
  if (apiKey) {
    const fromAddress = environment.EMAIL_FROM || "onboarding@resend.dev";
    return new ResendEmailProvider(apiKey, fromAddress);
  }
  return new UnconfiguredEmailProvider();
};

/** Resolves encrypted Provider Center configuration without exposing it to UI callers. */
export const getConfiguredTransactionalEmailProvider = (input: { providerName: string; secret: string; publicConfig: Record<string, unknown> }): TransactionalEmailProvider => {
  if (input.providerName === "resend" && typeof input.publicConfig.from_address === "string" && input.publicConfig.from_address.includes("@")) {
    return new ResendEmailProvider(input.secret, input.publicConfig.from_address);
  }
  return new UnconfiguredEmailProvider();
};
