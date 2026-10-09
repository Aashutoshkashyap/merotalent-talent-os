import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  loadProviderSecret: vi.fn(),
  send: vi.fn(),
  rpc: vi.fn(),
  update: vi.fn(),
}));

vi.mock("./provider-config-service", () => ({ loadProviderSecret: mocks.loadProviderSecret }));
vi.mock("./email-provider", () => ({
  getConfiguredTransactionalEmailProvider: () => ({ name: "resend", send: mocks.send }),
  getTransactionalEmailProvider: () => ({ name: "unconfigured", send: mocks.send }),
}));
vi.mock("./supabase", () => ({
  getAdminClient: () => ({
    rpc: mocks.rpc,
    from: () => ({ update: mocks.update }),
  }),
}));

import { dispatchQueuedEmails } from "./email-queue";

const notification = {
  id: "11111111-1111-4111-8111-111111111111",
  title: "Payment verified",
  message: "Your payment was verified.",
  email_to: "user@example.com",
  category: "payment",
  entity_type: "payment",
  entity_id: "22222222-2222-4222-8222-222222222222",
  metadata: { source: "test" },
  delivery_attempt_count: 1,
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.loadProviderSecret.mockResolvedValue({ providerName: "resend", secret: "secret", publicConfig: { from_address: "MeroTalent <noreply@merotalent.com>" } });
  mocks.rpc.mockResolvedValue({ data: [notification], error: null });
  const eq = vi.fn();
  eq.mockReturnValue({ eq });
  mocks.update.mockReturnValue({ eq });
});

describe("transactional email queue", () => {
  it("does not claim records when delivery is unconfigured", async () => {
    mocks.loadProviderSecret.mockResolvedValue(null);
    await expect(dispatchQueuedEmails()).resolves.toMatchObject({ configured: false, claimed: 0 });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("records a provider-accepted delivery using a stable idempotency key", async () => {
    mocks.send.mockResolvedValue({ status: "sent", provider: "resend", providerMessageId: "email-1" });
    await expect(dispatchQueuedEmails()).resolves.toMatchObject({ sent: 1, retrying: 0 });
    expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({
      to: "user@example.com",
      idempotencyKey: `notification-${notification.id}`,
    }));
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      status: "sent",
      metadata: expect.objectContaining({ provider_message_id: "email-1" }),
    }));
  });

  it("returns a transient provider failure to the queue without claiming success", async () => {
    mocks.send.mockResolvedValue({ status: "failed", provider: "resend", message: "temporary" });
    await expect(dispatchQueuedEmails()).resolves.toMatchObject({ sent: 0, retrying: 1 });
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ status: "queued", sent_at: null }));
  });
});
