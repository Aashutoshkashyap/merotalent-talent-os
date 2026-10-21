import { describe, expect, it } from "vitest";
import { decryptProviderSecret, encryptProviderSecret, getSecretStorageStatus, isSecretStorageConfigured } from "./secret-store";

const env = { PROVIDER_CONFIG_ENCRYPTION_KEY: Buffer.alloc(32, 9).toString("base64") };

describe("provider secret storage", () => {
  it("distinguishes missing and invalid deployment keys without returning key material", () => {
    expect(getSecretStorageStatus({})).toBe("missing");
    expect(getSecretStorageStatus({ PROVIDER_CONFIG_ENCRYPTION_KEY: "   " })).toBe("missing");
    expect(getSecretStorageStatus({ PROVIDER_CONFIG_ENCRYPTION_KEY: "not-base64" })).toBe("invalid");
    expect(getSecretStorageStatus(env)).toBe("ready");
  });

  it("keeps encryption working across a fresh invocation with the same configured key", () => {
    const encrypted = encryptProviderSecret("test-only-provider", env);
    expect(decryptProviderSecret(JSON.parse(JSON.stringify(encrypted)), { ...env })).toBe("test-only-provider");
    expect(() => decryptProviderSecret(encrypted, {
      PROVIDER_CONFIG_ENCRYPTION_KEY: Buffer.alloc(32, 8).toString("base64"),
    })).toThrow();
  });
  it("round-trips encrypted provider material without retaining plaintext", () => {
    const encrypted = encryptProviderSecret("secret-value", env);
    expect(JSON.stringify(encrypted)).not.toContain("secret-value");
    expect(decryptProviderSecret(encrypted, env)).toBe("secret-value");
  });

  it("requires a valid deployment encryption key", () => {
    expect(isSecretStorageConfigured({})).toBe(false);
    expect(isSecretStorageConfigured({ PROVIDER_CONFIG_ENCRYPTION_KEY: "not-base64" })).toBe(false);
    expect(isSecretStorageConfigured({ PROVIDER_CONFIG_ENCRYPTION_KEY: Buffer.alloc(31, 7).toString("base64") })).toBe(false);
    expect(() => encryptProviderSecret("secret", {})).toThrow(/storage/i);
  });
});
