import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticateAdminRequest: vi.fn(),
  getProviderStatus: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  authenticateAdminRequest: mocks.authenticateAdminRequest,
  ApiAuthError: class ApiAuthError extends Error {},
}));

vi.mock("@/lib/server/provider-config-service", () => ({
  getProviderStatus: mocks.getProviderStatus,
}));

import { GET as getProviderStatus } from "../../app/api/v1/admin/provider-status/route";

const provider = (overrides: Record<string, unknown> = {}) => ({
  providerName: "esewa",
  enabled: false,
  configured: false,
  secretStorageReady: true,
  publicConfig: {},
  configuredAt: null,
  updatedAt: null,
  ...overrides,
});

const readStatus = async (payment: Record<string, unknown>) => {
  mocks.getProviderStatus.mockResolvedValueOnce(provider(payment));
  mocks.getProviderStatus.mockResolvedValueOnce(provider({ providerName: "resend" }));
  mocks.getProviderStatus.mockResolvedValueOnce(provider({ providerName: "openai-compatible" }));
  const response = await getProviderStatus(new Request("https://merotalent.test/api/v1/admin/provider-status"));
  return { response, body: await response.json() as { data: { payment: Record<string, unknown> } } };
};

describe("provider status route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authenticateAdminRequest.mockResolvedValue({ user: { id: "11111111-1111-4111-8111-111111111111" } });
  });

  it("reports a missing eSewa secret as not configured", async () => {
    const { response, body } = await readStatus({ configured: false, enabled: false });
    expect(response.status).toBe(200);
    expect(body.data.payment).toMatchObject({
      status: "not_configured",
      credentialConfigured: false,
      integrationEnabled: false,
      deliveryAvailable: false,
    });
  });

  it("reports an encrypted eSewa secret as configured but disabled when the integration is off", async () => {
    const { body } = await readStatus({ configured: true, enabled: false });
    expect(body.data.payment).toMatchObject({
      status: "configured_disabled",
      credentialConfigured: true,
      integrationEnabled: false,
      deliveryAvailable: false,
    });
  });

  it("reports a configured and enabled eSewa integration as active", async () => {
    const { body } = await readStatus({ configured: true, enabled: true });
    expect(body.data.payment).toMatchObject({
      status: "configured_active",
      credentialConfigured: true,
      integrationEnabled: true,
      deliveryAvailable: true,
    });
  });

  it("prioritizes secure-storage unavailability without exposing provider material", async () => {
    const { body } = await readStatus({ configured: true, enabled: true, secretStorageReady: false });
    expect(body.data.payment).toMatchObject({
      status: "storage_unavailable",
      credentialConfigured: true,
      integrationEnabled: true,
      secretStorageReady: false,
      deliveryAvailable: false,
    });
    expect(JSON.stringify(body)).not.toContain("ciphertext");
    expect(JSON.stringify(body)).not.toContain("secret_tag");
  });
});
