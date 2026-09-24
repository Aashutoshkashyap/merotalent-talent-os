import { beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({
  from: vi.fn(),
  insert: vi.fn(),
  maybeSingle: vi.fn(),
  upsert: vi.fn(),
}));

vi.mock("./supabase", () => ({
  getAdminClient: () => ({ from: database.from }),
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
    database.upsert.mockResolvedValue({ error: null });
    database.insert.mockResolvedValue({ error: null });
    database.from.mockImplementation((table: string) => {
      if (table === "provider_configurations") {
        return {
          select: () => ({ eq: () => ({ maybeSingle: database.maybeSingle }) }),
          upsert: database.upsert,
        };
      }
      if (table === "audit_logs") return { insert: database.insert };
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

  it("preserves the stored ciphertext when saving public settings without a replacement secret", async () => {
    await saveProviderConfiguration({
      kind: "payment",
      providerName: "esewa",
      enabled: true,
      publicConfig: { merchant_code: "EPAYTEST", environment: "uat" },
      actorUserId: "11111111-1111-4111-8111-111111111111",
    });

    const [payload] = database.upsert.mock.calls[0] as [Record<string, unknown>];
    expect(payload).not.toHaveProperty("secret_ciphertext");
    expect(payload).not.toHaveProperty("secret_iv");
    expect(payload).not.toHaveProperty("secret_tag");
    expect(payload.configured_at).toBe(encryptedRow.configured_at);
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

    expect(database.upsert).not.toHaveBeenCalled();
  });
});
