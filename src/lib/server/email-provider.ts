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
    | "job_application_received";
  to: string;
  subject: string;
  text: string;
  html?: string;
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
  if (!environment.EMAIL_PROVIDER) return new UnconfiguredEmailProvider();
  return new UnconfiguredEmailProvider();
};
