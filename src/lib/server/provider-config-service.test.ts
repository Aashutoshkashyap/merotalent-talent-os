import { beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({
  from: vi.fn(),
  maybeSingle: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("./supabase", () => ({
  getAdminClient: () => ({ from: database.from, rpc: database.rpc }),
  ServerConfigurationError: class ServerConfigurationError extends Error {
    readonly code = "SERVER_NOT_CONFIGURED";
  },
}));

import { hasEncryptedProviderSecret, saveProviderConfiguration, toProviderConfigurationStatus } from "./provider-config-service";

const encryptedRow = {
  provider_kind: "payment" as const,
  provider_name: "esewa",
  is_enabled: true,
  public_config: { merchant_code: "EPAYTEST", environment: "uat" },
  secret_ciphertext: "ciphertext",
  secret_iv: "iv",
  secret_tag: "tag",
  configured_at: "2026-09-24T00:00:00.000Z",
  updated_at: "2026-09-24T00:00:00.000Z",
};

describe("provider configuration status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    database.maybeSingle.mockResolvedValue({ data: encryptedRow, error: null });
    database.rpc.mockResolvedValue({ data: { provider_kind: "payment" }, error: null });
    database.from.mockImplementation((table: string) => {
      if (table === "provider_configurations") {
        return {
          select: () => ({ eq: () => ({ maybeSingle: database.maybeSingle }) }),
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    });
  });

  it("reports encrypted configuration separately from server encryption readiness", () => {
    expect(hasEncryptedProviderSecret(encryptedRow)).toBe(true);
    expect(toProviderConfigurationStatus(encryptedRow, false)).toMatchObject({
      configured: true,
      secretStorageReady: false,
      providerName: "esewa",
    });
  });

  it("does not consider incomplete or blank ciphertext configured", () => {
    expect(hasEncryptedProviderSecret({ ...encryptedRow, secret_tag: " " })).toBe(false);
    expect(toProviderConfigurationStatus(null, true)).toMatchObject({
      configured: false,
      secretStorageReady: true,
    });
  });

  it("keeps encrypted fields out of the public status payload", () => {
    const status = toProviderConfigurationStatus(encryptedRow, true);
    expect(JSON.stringify(status)).not.toContain("ciphertext");
    expect(JSON.stringify(status)).not.toContain('"iv"');
    expect(JSON.stringify(status)).not.toContain('"tag"');
  });

  it("uses the atomic provider RPC and preserves stored ciphertext when public settings change", async () => {
    await saveProviderConfiguration({
      kind: "payment",
      providerName: "esewa",
      enabled: true,
      publicConfig: { merchant_code: "EPAYTEST", environment: "uat" },
      actorUserId: "11111111-1111-4111-8111-111111111111",
    });

    const [name, payload] = database.rpc.mock.calls[0] as [string, Record<string, unknown>];
    expect(name).toBe("admin_save_provider_configuration");
    expect(payload).toMatchObject({
      p_provider_kind: "payment",
      p_provider_name: "esewa",
      p_is_enabled: true,
      p_public_config: { merchant_code: "EPAYTEST", environment: "uat" },
      p_secret_ciphertext: null,
      p_secret_iv: null,
      p_secret_tag: null,
    });
    expect(database.maybeSingle).toHaveBeenCalledTimes(1);
  });

  it("does not treat whitespace as a secret when enabling an unconfigured provider", async () => {
    database.maybeSingle.mockResolvedValue({ data: null, error: null });

    await expect(saveProviderConfiguration({
      kind: "payment",
      providerName: "esewa",
      enabled: true,
      publicConfig: { merchant_code: "EPAYTEST", environment: "uat" },
      secret: "   ",
      actorUserId: "11111111-1111-4111-8111-111111111111",
    })).rejects.toThrow("provider secret is required");

    expect(database.rpc).not.toHaveBeenCalled();
  });

  it("sends only encrypted replacement material to the atomic RPC", async () => {
    const prior = process.env.PROVIDER_CONFIG_ENCRYPTION_KEY;
    process.env.PROVIDER_CONFIG_ENCRYPTION_KEY = Buffer.alloc(32, 6).toString("base64");
    try {
      await saveProviderConfiguration({
        kind: "payment",
        providerName: "esewa",
        enabled: true,
        publicConfig: { merchant_code: "EPAYTEST", environment: "uat" },
        secret: "new-provider-secret",
        actorUserId: "11111111-1111-4111-8111-111111111111",
      });
    } finally {
      if (prior === undefined) delete process.env.PROVIDER_CONFIG_ENCRYPTION_KEY;
      else process.env.PROVIDER_CONFIG_ENCRYPTION_KEY = prior;
    }

    const [, payload] = database.rpc.mock.calls[0] as [string, Record<string, unknown>];
    expect(payload.p_secret_ciphertext).toEqual(expect.any(String));
    expect(payload.p_secret_ciphertext).not.toContain("new-provider-secret");
    expect(JSON.stringify(payload)).not.toContain("new-provider-secret");
    expect(payload.p_secret_iv).toEqual(expect.any(String));
    expect(payload.p_secret_tag).toEqual(expect.any(String));
  });

  it("fails before any database mutation when a replacement secret has no server encryption key", async () => {
    const prior = process.env.PROVIDER_CONFIG_ENCRYPTION_KEY;
    delete process.env.PROVIDER_CONFIG_ENCRYPTION_KEY;
    try {
      await expect(saveProviderConfiguration({
        kind: "payment",
        providerName: "esewa",
        enabled: false,
        publicConfig: { merchant_code: "EPAYTEST", environment: "uat" },
        secret: "replacement-secret",
        actorUserId: "11111111-1111-4111-8111-111111111111",
      })).rejects.toThrow("Secure provider-secret storage is unavailable");
    } finally {
      if (prior === undefined) delete process.env.PROVIDER_CONFIG_ENCRYPTION_KEY;
      else process.env.PROVIDER_CONFIG_ENCRYPTION_KEY = prior;
    }

    expect(database.rpc).not.toHaveBeenCalled();
  });

  it("surfaces an audit failure as a safe atomic-save failure", async () => {
    database.rpc.mockResolvedValue({
      data: null,
      error: { code: "P0001", message: "Provider configuration audit could not be persisted" },
    });

    await expect(saveProviderConfiguration({
      kind: "payment",
      providerName: "esewa",
      enabled: false,
      publicConfig: { merchant_code: "EPAYTEST", environment: "uat" },
      actorUserId: "11111111-1111-4111-8111-111111111111",
    })).rejects.toMatchObject({ code: "PROVIDER_AUDIT_UNAVAILABLE" });

    expect(database.from).toHaveBeenCalledWith("provider_configurations");
  });
});
