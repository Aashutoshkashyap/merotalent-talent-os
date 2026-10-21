/** Delivery policy is independent of provider credentials and defaults to disabled. */
import { getBackendMode } from "./backend-mode";

type Environment = Record<string, string | undefined>;
export type NeonEmailPolicy = {
  environment: "neon-staging" | "neon-production";
  enabled: boolean;
  recipients: string[] | null;
  notBefore: string;
};

export function neonEmailPolicy(environment: Environment = process.env): NeonEmailPolicy {
  const mode = getBackendMode(environment);
  if (mode === "neon-production") {
    const cutoff = environment.NEON_PRODUCTION_EMAIL_NOT_BEFORE ?? "";
    const validCutoff = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(cutoff) &&
      Number.isFinite(Date.parse(cutoff));
    return { environment: mode, recipients: null,
      enabled: environment.NEON_PRODUCTION_EMAIL_DELIVERY_ENABLED === "true" && validCutoff,
      notBefore: validCutoff ? cutoff : "9999-01-01T00:00:00Z" };
  }
  const recipients = (environment.NEON_STAGING_EMAIL_TEST_RECIPIENTS ?? "").split(",")
    .map(value => value.trim().toLowerCase()).filter(Boolean);
  const valid = recipients.length > 0 && recipients.length <= 20 &&
    recipients.every(value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
  return { environment: "neon-staging", recipients: valid ? [...new Set(recipients)] : [],
    enabled: mode === "neon-staging" && environment.NEON_STAGING_EMAIL_DELIVERY_ENABLED === "true" && valid,
    notBefore: "1970-01-01T00:00:00Z" };
}

export function neonEmailRecipientAllowed(email: string, environment: Environment = process.env): boolean {
  const policy = neonEmailPolicy(environment);
  return policy.enabled && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
    (policy.recipients === null || policy.recipients.includes(email.trim().toLowerCase()));
}
