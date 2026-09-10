import { describe, expect, it } from "vitest";
import { decryptProviderSecret, encryptProviderSecret, isSecretStorageConfigured } from "./secret-store";

const env = { PROVIDER_CONFIG_ENCRYPTION_KEY: Buffer.alloc(32, 9).toString("base64") };

describe("provider secret storage", () => {
  it("round-trips encrypted provider material without retaining plaintext", () => {
    const encrypted = encryptProviderSecret("secret-value", env);
    expect(JSON.stringify(encrypted)).not.toContain("secret-value");
    expect(decryptProviderSecret(encrypted, env)).toBe("secret-value");
  });

  it("requires a valid deployment encryption key", () => {
    expect(isSecretStorageConfigured({})).toBe(false);
    expect(() => encryptProviderSecret("secret", {})).toThrow(/storage/i);
  });
});
