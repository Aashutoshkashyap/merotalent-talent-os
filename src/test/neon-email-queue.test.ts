import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PoolClient } from "pg";
import { dispatchNeonQueuedEmails, neonEmailRecipients, resolveNeonEmailProvider } from "@/lib/server/neon-email-queue";
import { encryptProviderSecret } from "@/lib/server/secret-store";
import { neonEmailPolicy, neonEmailRecipientAllowed } from "@/lib/server/neon-delivery-policy";

const environment = { MEROTALENT_BACKEND_MODE: "neon-staging", CRON_SECRET: "isolated-cron-test",
  NEON_STAGING_EMAIL_DELIVERY_ENABLED: "true", NEON_STAGING_EMAIL_TEST_RECIPIENTS: "qa@example.test",
  PROVIDER_CONFIG_ENCRYPTION_KEY: Buffer.alloc(32, 9).toString("base64") };
const authorization = "Bearer isolated-cron-test";
const query = vi.fn();
const send = vi.fn();
const provider = { name: "resend", send };
const transactionStarted = vi.fn();
const run = async <T>(operation: (client: PoolClient) => Promise<T>): Promise<T> => {
  transactionStarted(); return operation({ query } as unknown as PoolClient);
};
const notification = { id: "11000000-0000-4000-8000-000000000001", title: "Confirmation", message: "Confirmed",
  email_to: "qa@example.test", metadata: { delivery_environment: "neon-staging" }, delivery_attempt_count: 1,
  last_delivery_attempt_at: "2026-10-14 10:00:00.123456+00" };
beforeEach(() => {
  vi.clearAllMocks();
  query.mockImplementation(async (sql: string) => sql.startsWith("WITH candidates")
    ? { rows: [notification], rowCount: 1 } : { rows: [{ id: notification.id }], rowCount: 1 });
  send.mockResolvedValue({ status: "sent", provider: "resend", providerMessageId: "accepted-1" });
});

describe("Neon controlled staging email queue", () => {
  it("reuses the server Resend configuration only when Provider Center has no email row", async () => {
    const load = vi.fn().mockResolvedValue([]);
    const configured = { ...environment, RESEND_API_KEY: "unit-only-resend-key", EMAIL_FROM: "MeroTalent <contact@example.test>" };
    expect((await resolveNeonEmailProvider(load, configured))?.name).toBe("resend");
    expect(await resolveNeonEmailProvider(load, { ...configured, EMAIL_FROM: "" })).toBeNull();
    load.mockResolvedValue([{ provider_name: "resend", is_enabled: false }]);
    expect(await resolveNeonEmailProvider(load, configured)).toBeNull();
  });
  it("requires independent production opt-in, paired runtime flags, and an explicit UTC cutoff", async () => {
    const production = { ...environment, MEROTALENT_BACKEND_MODE: "neon-production",
      NEXT_PUBLIC_MEROTALENT_BACKEND_MODE: "neon-production" };
    for (const env of [production, { ...production, NEON_PRODUCTION_EMAIL_DELIVERY_ENABLED: "true" },
      { ...production, NEON_PRODUCTION_EMAIL_DELIVERY_ENABLED: "true", NEON_PRODUCTION_EMAIL_NOT_BEFORE: "invalid" }]) {
      expect(await dispatchNeonQueuedEmails(authorization, 25, { environment: env, run, provider }))
        .toMatchObject({ configured: false, claimed: 0, reason: "production_delivery_disabled" });
    }
    expect(transactionStarted).not.toHaveBeenCalled();
    const enabled = { ...production, NEON_PRODUCTION_EMAIL_DELIVERY_ENABLED: "true",
      NEON_PRODUCTION_EMAIL_NOT_BEFORE: "2026-10-19T18:00:00Z" };
    expect(neonEmailPolicy(enabled)).toMatchObject({ enabled: true, recipients: null, environment: "neon-production" });
    expect(neonEmailRecipientAllowed("actual-user@example.test", enabled)).toBe(true);
    expect(neonEmailRecipientAllowed("not-an-email", enabled)).toBe(false);
    expect(await dispatchNeonQueuedEmails(authorization, 25, { environment: enabled, run, provider }))
      .toMatchObject({ configured: true, sent: 1 });
    const claim = query.mock.calls.find(([sql]) => sql.startsWith("WITH candidates"));
    expect(claim?.[1]).toEqual([null, 25, "neon-production", enabled.NEON_PRODUCTION_EMAIL_NOT_BEFORE]);
    expect(claim?.[0]).toContain("n.metadata->>'delivery_environment'=$3");
    expect(claim?.[0]).toContain("n.created_at >= $4::timestamptz");
    expect(() => neonEmailPolicy({ ...enabled, NEXT_PUBLIC_MEROTALENT_BACKEND_MODE: "neon-staging" })).toThrow();
  });
  it("requires cron authorization before any database or provider call", async () => {
    await expect(dispatchNeonQueuedEmails(null, 25, { environment, run, provider })).rejects.toMatchObject({ name: "NeonCronAuthorizationError" });
    expect(transactionStarted).not.toHaveBeenCalled(); expect(send).not.toHaveBeenCalled();
  });
  it("does not claim copied emails when delivery is disabled or the allowlist is absent", async () => {
    for (const env of [{ ...environment, NEON_STAGING_EMAIL_DELIVERY_ENABLED: "false" },
      { ...environment, NEON_STAGING_EMAIL_TEST_RECIPIENTS: "" }]) {
      expect(await dispatchNeonQueuedEmails(authorization, 25, { environment: env, run, provider })).toMatchObject({
        configured: false, claimed: 0, reason: "staging_delivery_disabled" });
    }
    expect(transactionStarted).not.toHaveBeenCalled(); expect(send).not.toHaveBeenCalled();
    expect(neonEmailRecipients({ ...environment, NEON_STAGING_EMAIL_TEST_RECIPIENTS: "*" })).toEqual([]);
  });
  it("decrypts only enabled Resend configuration on the server without returning secrets", async () => {
    const encrypted = encryptProviderSecret("private-resend-unit-key", environment);
    const load = vi.fn().mockResolvedValue([{ provider_name: "resend", is_enabled: false,
      public_config: { from_address: "noreply@example.test" }, secret_ciphertext: encrypted.ciphertext,
      secret_iv: encrypted.iv, secret_tag: encrypted.tag }]);
    expect(await resolveNeonEmailProvider(load, environment)).toBeNull();
    load.mockResolvedValue([{ provider_name: "resend", is_enabled: true, public_config: { from_address: "noreply@example.test" },
      secret_ciphertext: encrypted.ciphertext, secret_iv: encrypted.iv, secret_tag: encrypted.tag }]);
    const resolved = await resolveNeonEmailProvider(load, environment);
    expect(resolved?.name).toBe("resend");
    expect(await resolveNeonEmailProvider(load, { ...environment, PROVIDER_CONFIG_ENCRYPTION_KEY: "invalid" })).toBeNull();
    expect(await resolveNeonEmailProvider(load, { ...environment,
      PROVIDER_CONFIG_ENCRYPTION_KEY: Buffer.alloc(32, 10).toString("base64") })).toBeNull();
  });
  it("records provider acceptance only under the exact lease with a stable retry idempotency key", async () => {
    const result = await dispatchNeonQueuedEmails(authorization, 25, { environment, run, provider });
    expect(result).toMatchObject({ configured: true, claimed: 1, sent: 1, retrying: 0 });
    expect(JSON.stringify(result)).not.toContain("secret");
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ idempotencyKey: `notification-${notification.id}`, to: "qa@example.test" }));
    const completion = query.mock.calls.find(([sql]) => sql.startsWith("UPDATE public.notifications SET"));
    expect(completion?.[1]).toEqual(expect.arrayContaining([notification.last_delivery_attempt_at, 1]));
  });
  it("keeps provider failures retryable with exponential backoff and makes the fifth failure terminal", async () => {
    send.mockResolvedValue({ status: "failed", provider: "resend" });
    expect(await dispatchNeonQueuedEmails(authorization, 25, { environment, run, provider })).toMatchObject({ sent: 0, retrying: 1 });
    expect(query.mock.calls.find(([sql]) => sql.startsWith("UPDATE public.notifications SET"))?.[1][1]).toBe("queued");
    query.mockImplementation(async (sql: string) => sql.startsWith("WITH candidates")
      ? { rows: [{ ...notification, delivery_attempt_count: 5 }], rowCount: 1 } : { rows: [{ id: notification.id }], rowCount: 1 });
    expect(await dispatchNeonQueuedEmails(authorization, 25, { environment, run, provider })).toMatchObject({ sent: 0, failed: 1, retrying: 0 });
  });
  it("cannot overwrite a newer worker's lease", async () => {
    query.mockImplementation(async (sql: string) => sql.startsWith("WITH candidates") ? { rows: [notification], rowCount: 1 }
      : { rows: [], rowCount: 0 });
    expect(await dispatchNeonQueuedEmails(authorization, 25, { environment, run, provider })).toMatchObject({ sent: 0, superseded: 1 });
  });
});
