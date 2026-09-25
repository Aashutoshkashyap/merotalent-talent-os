import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  class ApiAuthError extends Error {
    constructor(readonly status: number, readonly code: string, message: string) {
      super(message);
    }
  }
  class ProviderConfigurationPersistenceError extends Error {
    constructor(readonly code: "PROVIDER_AUDIT_UNAVAILABLE" | "PROVIDER_CONFIGURATION_PERSIST_FAILED", message: string) {
      super(message);
    }
  }
  return {
    authenticateAdminRequest: vi.fn(),
    getProviderStatus: vi.fn(),
    saveProviderConfiguration: vi.fn(),
    ApiAuthError,
    ProviderConfigurationPersistenceError,
  };
});

vi.mock("@/lib/server/auth", () => ({
  authenticateAdminRequest: mocks.authenticateAdminRequest,
  ApiAuthError: mocks.ApiAuthError,
}));
vi.mock("@/lib/server/provider-config-service", () => ({
  getProviderStatus: mocks.getProviderStatus,
  isProviderKind: (kind: string) => ["payment", "ai", "email"].includes(kind),
  saveProviderConfiguration: mocks.saveProviderConfiguration,
  ProviderConfigurationPersistenceError: mocks.ProviderConfigurationPersistenceError,
}));
vi.mock("@/lib/server/supabase", () => ({
  ServerConfigurationError: class ServerConfigurationError extends Error {},
}));

import { PUT as putProvider } from "../../app/api/v1/admin/providers/[kind]/route";

const context = { params: Promise.resolve({ kind: "payment" }) };
const request = (body: unknown, headers: Record<string, string> = {}) => new Request("https://merotalent.test/api/v1/admin/providers/payment", {
  method: "PUT",
  headers: { Authorization: "Bearer admin-token", "Content-Type": "application/json", ...headers },
  body: JSON.stringify(body),
});

describe("provider configuration save route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authenticateAdminRequest.mockResolvedValue({ user: { id: "11111111-1111-4111-8111-111111111111" } });
    mocks.saveProviderConfiguration.mockResolvedValue({ configured: true, enabled: true, secretStorageReady: true, publicConfig: {} });
  });

  it("returns a clear validation error without mutation when eSewa merchant code is missing", async () => {
    const response = await putProvider(request({ providerName: "esewa", enabled: false, publicConfig: { environment: "uat" } }), context);
    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "ESEWA_MERCHANT_CODE_REQUIRED", message: "eSewa merchant code is required." } });
    expect(mocks.saveProviderConfiguration).not.toHaveBeenCalled();
  });

  it("returns a clear validation error without mutation for an invalid eSewa merchant code", async () => {
    const response = await putProvider(request({ providerName: "esewa", enabled: false, publicConfig: { merchant_code: "!", environment: "uat" } }), context);
    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "INVALID_ESEWA_MERCHANT_CODE", message: "Enter a valid eSewa merchant code." } });
    expect(mocks.saveProviderConfiguration).not.toHaveBeenCalled();
  });

  it("allows a validated Super Admin save and passes only the submitted secret to trusted server code", async () => {
    const response = await putProvider(request({ providerName: "esewa", enabled: true, publicConfig: { merchant_code: "EPAYTEST", environment: "uat" }, secret: "merchant-secret" }), context);
    expect(response.status).toBe(200);
    expect(mocks.saveProviderConfiguration).toHaveBeenCalledWith(expect.objectContaining({ kind: "payment", providerName: "esewa", enabled: true, secret: "merchant-secret" }));
  });

  it("returns a specific safe response when the atomic audit write fails", async () => {
    mocks.saveProviderConfiguration.mockRejectedValue(new mocks.ProviderConfigurationPersistenceError("PROVIDER_AUDIT_UNAVAILABLE", "Provider configuration could not be saved because its audit record could not be persisted. No configuration was changed."));
    const response = await putProvider(request({ providerName: "esewa", enabled: false, publicConfig: { merchant_code: "EPAYTEST", environment: "uat" } }), context);
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "PROVIDER_AUDIT_UNAVAILABLE" } });
  });

  it("rejects an unauthenticated request before any mutation", async () => {
    mocks.authenticateAdminRequest.mockRejectedValue(new mocks.ApiAuthError(401, "AUTH_REQUIRED", "A valid bearer token is required."));
    const response = await putProvider(request({ providerName: "esewa", enabled: false, publicConfig: { merchant_code: "EPAYTEST", environment: "uat" } }), context);
    expect(response.status).toBe(401);
    expect(mocks.saveProviderConfiguration).not.toHaveBeenCalled();
  });

  it("rejects a non-Super-Admin request before any mutation", async () => {
    mocks.authenticateAdminRequest.mockRejectedValue(new mocks.ApiAuthError(403, "INSUFFICIENT_ROLE", "Your account role cannot perform this action."));
    const response = await putProvider(request({ providerName: "esewa", enabled: false, publicConfig: { merchant_code: "EPAYTEST", environment: "uat" } }), context);
    expect(response.status).toBe(403);
    expect(mocks.saveProviderConfiguration).not.toHaveBeenCalled();
  });
});
