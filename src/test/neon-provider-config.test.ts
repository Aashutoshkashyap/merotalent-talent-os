import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NeonActor } from "@/lib/server/neon-authorization";
import { getNeonProviderStatus, parseProviderInput, parseProviderKind, providerHealth,
  saveNeonProviderConfiguration } from "@/lib/server/neon-provider-config";

const actor: NeonActor = { userId: "10000000-0000-4000-8000-000000000001",
  neonAuthUserId: "20000000-0000-4000-8000-000000000002", roles: ["super_admin"],
  permissions: [], platformAdmin: true };
const ordinary: NeonActor = { ...actor, roles: [], platformAdmin: false };
const priorKey = process.env.PROVIDER_CONFIG_ENCRYPTION_KEY;

beforeEach(() => { process.env.PROVIDER_CONFIG_ENCRYPTION_KEY = Buffer.alloc(32, 8).toString("base64"); });
afterEach(() => {
  if (priorKey === undefined) delete process.env.PROVIDER_CONFIG_ENCRYPTION_KEY;
  else process.env.PROVIDER_CONFIG_ENCRYPTION_KEY = priorKey;
});

describe("Neon provider configuration safety", () => {
  it("rejects unsupported providers, bad merchant settings, and blank replacement secrets", () => {
    expect(() => parseProviderKind("other")).toThrow();
    expect(() => parseProviderInput("payment", { providerName: "esewa", enabled: true,
      publicConfig: { environment: "uat", merchant_code: "bad code" }, secret: "key" })).toThrow();
    expect(() => parseProviderInput("ai", { providerName: "openai-compatible", enabled: true,
      publicConfig: {}, secret: " " })).toThrow();
  });

  it("distinguishes missing, disabled, active, and storage-unavailable states without secrets", () => {
    const base = { providerName: "openai-compatible", enabled: false, configured: false,
      secretStorageReady: true, publicConfig: {}, configuredAt: null, updatedAt: null };
    expect(providerHealth(base, "openai-compatible").status).toBe("not_configured");
    expect(providerHealth({ ...base, configured: true }, "openai-compatible")).toMatchObject({
      status: "configured_disabled", deliveryAvailable: false });
    expect(providerHealth({ ...base, configured: true, enabled: true }, "openai-compatible")).toMatchObject({
      status: "configured_active", deliveryAvailable: true });
    expect(providerHealth({ ...base, configured: true, enabled: true, secretStorageReady: false },
      "openai-compatible")).toMatchObject({ status: "storage_unavailable", deliveryAvailable: false });
  });

  it("denies ordinary users before reading or writing provider records", async () => {
    const query = vi.fn(); const run = vi.fn();
    await expect(getNeonProviderStatus(ordinary, "ai", query)).rejects.toMatchObject({ code: "ADMIN_REQUIRED" });
    await expect(saveNeonProviderConfiguration(ordinary, "ai", { providerName: "openai-compatible",
      enabled: false, secret: "key" }, run)).rejects.toMatchObject({ code: "ADMIN_REQUIRED" });
    expect(query).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
  });

  it("does not expose ciphertext in a status response", async () => {
    const query = vi.fn().mockResolvedValue([{ provider_kind: "ai", provider_name: "openai-compatible",
      is_enabled: false, public_config: { model: "example" },
      secret_ciphertext: "private-ciphertext", secret_iv: "iv", secret_tag: "tag",
      configured_at: null, updated_at: "2026-10-12T00:00:00Z" }]);
    const result = await getNeonProviderStatus(actor, "ai", query);
    expect(result).toMatchObject({ configured: true, enabled: false });
    expect(JSON.stringify(result)).not.toContain("private-ciphertext");
  });
});
