import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PoolClient } from "pg";
import {
  canDecryptSecret,
  getNeonProviderStatus,
  parseProviderInput,
  saveNeonProviderConfiguration,
} from "@/lib/server/neon-provider-config";
import { encryptProviderSecret, decryptProviderSecret } from "@/lib/server/secret-store";
import type { NeonActor } from "@/lib/server/neon-authorization";

const validKey = Buffer.alloc(32, 7).toString("base64");
const differentKey = Buffer.alloc(32, 9).toString("base64");

const superAdmin: NeonActor = {
  userId: "10000000-0000-4000-8000-000000000001",
  neonAuthUserId: "auth-super-admin-1",
  roles: ["super_admin"],
  permissions: [],
  platformAdmin: true,
};

describe("Neon provider configuration validation & security guards", () => {
  beforeEach(() => {
    process.env.PROVIDER_CONFIG_ENCRYPTION_KEY = validKey;
  });

  describe("parseProviderInput validation", () => {
    it("accepts valid production eSewa configuration", () => {
      const result = parseProviderInput("payment", {
        providerName: "esewa",
        enabled: true,
        publicConfig: { merchant_code: "LIVE-MERCHANT-01", environment: "production" },
        secret: "real-production-secret-value",
      }, "neon-production");

      expect(result).toEqual({
        providerName: "esewa",
        enabled: true,
        config: { merchant_code: "LIVE-MERCHANT-01", environment: "production" },
        secret: "real-production-secret-value",
      });
    });

    it("rejects EPAYTEST merchant code when environment is production", () => {
      expect(() =>
        parseProviderInput("payment", {
          providerName: "esewa",
          enabled: true,
          publicConfig: { merchant_code: "EPAYTEST", environment: "production" },
          secret: "some-secret",
        }, "neon-production")
      ).toThrow("Test merchant code EPAYTEST cannot be enabled in production.");
    });

    it("rejects published test secret in production", () => {
      expect(() =>
        parseProviderInput("payment", {
          providerName: "esewa",
          enabled: true,
          publicConfig: { merchant_code: "LIVE-MERCHANT-01", environment: "production" },
          secret: "8gBm/:&EnhH.1/q",
        }, "neon-production")
      ).toThrow("Test secret cannot be enabled in production.");
    });

    it("rejects UAT environment when enabled in neon-production mode", () => {
      expect(() =>
        parseProviderInput("payment", {
          providerName: "esewa",
          enabled: true,
          publicConfig: { merchant_code: "EPAYTEST", environment: "uat" },
          secret: "8gBm/:&EnhH.1/q",
        }, "neon-production")
      ).toThrow("Cannot enable UAT environment in neon-production mode.");
    });

    it("accepts UAT environment in neon-staging mode", () => {
      const result = parseProviderInput("payment", {
        providerName: "esewa",
        enabled: false,
        publicConfig: { merchant_code: "EPAYTEST", environment: "uat" },
        secret: "8gBm/:&EnhH.1/q",
      }, "neon-staging");

      expect(result.config.environment).toBe("uat");
      expect(result.config.merchant_code).toBe("EPAYTEST");
    });

    it.each([
      ["invalid merchant code with spaces", { merchant_code: "BAD CODE", environment: "production" }],
      ["merchant code with special characters", { merchant_code: "MERCH#123", environment: "production" }],
      ["missing environment", { merchant_code: "VALID-CODE" }],
      ["invalid environment string", { merchant_code: "VALID-CODE", environment: "sandbox" }],
    ])("rejects malformed publicConfig: %s", (_label, publicConfig) => {
      expect(() =>
        parseProviderInput("payment", {
          providerName: "esewa",
          enabled: false,
          publicConfig,
        }, "neon-production")
      ).toThrow("Invalid eSewa configuration.");
    });

    it("rejects empty or whitespace-only secret", () => {
      expect(() =>
        parseProviderInput("payment", {
          providerName: "esewa",
          enabled: true,
          publicConfig: { merchant_code: "LIVE-MERCHANT", environment: "production" },
          secret: "   ",
        }, "neon-production")
      ).toThrow("Provider secret is required.");
    });
  });

  describe("canDecryptSecret decryptability check", () => {
    it("returns true for freshly encrypted ciphertext", () => {
      const encrypted = encryptProviderSecret("my-secret");
      expect(canDecryptSecret({
        secret_ciphertext: encrypted.ciphertext,
        secret_iv: encrypted.iv,
        secret_tag: encrypted.tag,
      })).toBe(true);
    });

    it("returns false for ciphertext encrypted with a different key", () => {
      const encryptedUnderDifferentKey = encryptProviderSecret(
        "my-secret",
        { PROVIDER_CONFIG_ENCRYPTION_KEY: differentKey },
      );
      expect(canDecryptSecret({
        secret_ciphertext: encryptedUnderDifferentKey.ciphertext,
        secret_iv: encryptedUnderDifferentKey.iv,
        secret_tag: encryptedUnderDifferentKey.tag,
      })).toBe(false);
    });

    it("returns false for corrupted or incomplete ciphertext", () => {
      expect(canDecryptSecret({
        secret_ciphertext: "bad-base64",
        secret_iv: "bad-iv",
        secret_tag: "bad-tag",
      })).toBe(false);
      expect(canDecryptSecret(null)).toBe(false);
      expect(canDecryptSecret(undefined)).toBe(false);
    });
  });

  describe("saveNeonProviderConfiguration security & rollback preservation", () => {
    it("rejects enabling a stored sandbox secret with production metadata before any write", async () => {
      const stored = encryptProviderSecret("8gBm/:&EnhH.1/q");
      const query = vi.fn(async (sql: string) => {
        if (sql.includes("FROM public.profiles")) return { rowCount: 1 };
        if (sql.includes("FOR UPDATE")) return { rows: [{
          secret_ciphertext: stored.ciphertext, secret_iv: stored.iv, secret_tag: stored.tag,
        }] };
        throw new Error("Unexpected write");
      });
      await expect(saveNeonProviderConfiguration(superAdmin, "payment", {
        providerName: "esewa", enabled: true,
        publicConfig: { merchant_code: "LIVE-MERCHANT", environment: "production" },
      }, async (fn) => fn({ query } as unknown as PoolClient))).rejects.toMatchObject({
        code: "INVALID_ESEWA_CONFIGURATION",
      });
      expect(query.mock.calls.every(([sql]) => sql.startsWith("SELECT"))).toBe(true);
    });

    it("fresh status reads verify persisted credentials against the current runtime key", async () => {
      const stored = encryptProviderSecret("test-merchant-credential");
      const query = vi.fn().mockResolvedValue([{
        provider_kind: "payment", provider_name: "esewa", is_enabled: true,
        public_config: { merchant_code: "LIVE-MERCHANT", environment: "production" },
        secret_ciphertext: stored.ciphertext, secret_iv: stored.iv, secret_tag: stored.tag,
      }]);
      expect(await getNeonProviderStatus(superAdmin, "payment", query)).toMatchObject({
        enabled: true, secretDecryptable: true,
      });
      process.env.PROVIDER_CONFIG_ENCRYPTION_KEY = differentKey;
      const result = await getNeonProviderStatus(superAdmin, "payment", query);
      expect(result).toMatchObject({ enabled: false, configured: true, secretDecryptable: false });
      expect(JSON.stringify(result)).not.toContain(stored.ciphertext);
      expect(JSON.stringify(result)).not.toContain("test-merchant-credential");
      expect(query).toHaveBeenCalledTimes(2);
    });

    it("rejects corrupted persisted ciphertext before recording a successful save", async () => {
      const query = vi.fn(async (sql: string) => {
        if (sql.includes("FROM public.profiles")) return { rowCount: 1 };
        if (sql.includes("FOR UPDATE")) return { rows: [] };
        if (sql.includes("INSERT INTO public.provider_configurations")) return { rows: [{
          secret_ciphertext: "corrupted", secret_iv: "corrupted", secret_tag: "corrupted",
        }] };
        throw new Error("Unexpected audit success");
      });
      await expect(saveNeonProviderConfiguration(superAdmin, "payment", {
        providerName: "esewa", enabled: false, secret: "test-merchant-credential",
        publicConfig: { merchant_code: "LIVE-MERCHANT", environment: "production" },
      }, async (fn) => fn({ query } as unknown as PoolClient))).rejects.toMatchObject({
        code: "ENCRYPTION_VERIFICATION_FAILED",
      });
      expect(query.mock.calls.some(([sql]) => sql.includes("INSERT INTO public.audit_logs"))).toBe(false);
    });

    it("encrypts new secret, verifies round-trip decryption, and returns secret-free status", async () => {
      let savedRow: any = null;
      let auditLogged = false;

      const mockClient = {
        query: vi.fn(async (sql: string, params: any[]) => {
          if (sql.includes("FROM public.profiles")) {
            return { rowCount: 1 };
          }
          if (sql.includes("SELECT provider_kind") && sql.includes("FOR UPDATE")) {
            return { rows: [] };
          }
          if (sql.includes("INSERT INTO public.provider_configurations")) {
            savedRow = {
              provider_kind: params[0],
              provider_name: params[1],
              is_enabled: params[2],
              public_config: JSON.parse(params[3]),
              secret_ciphertext: params[4],
              secret_iv: params[5],
              secret_tag: params[6],
              configured_at: "2026-10-21T08:00:00Z",
              updated_at: "2026-10-21T08:00:00Z",
            };
            return { rows: [savedRow] };
          }
          if (sql.includes("INSERT INTO public.audit_logs")) {
            auditLogged = true;
            return { rowCount: 1 };
          }
          throw new Error(`Unexpected query: ${sql}`);
        }),
      } as unknown as PoolClient;

      const run = async <T>(fn: (c: PoolClient) => Promise<T>) => fn(mockClient);

      const status = await saveNeonProviderConfiguration(
        superAdmin,
        "payment",
        {
          providerName: "esewa",
          enabled: true,
          publicConfig: { merchant_code: "PROD-MERCHANT-88", environment: "production" },
          secret: "super-secret-key-1234",
        },
        run,
      );

      // Verify that status payload is completely secret-free
      expect(status).toMatchObject({
        providerName: "esewa",
        enabled: true,
        configured: true,
        publicConfig: { merchant_code: "PROD-MERCHANT-88", environment: "production" },
      });
      expect(JSON.stringify(status)).not.toContain("super-secret-key-1234");
      expect(JSON.stringify(status)).not.toContain("ciphertext");
      expect(JSON.stringify(status)).not.toContain("secret_iv");
      expect(JSON.stringify(status)).not.toContain("secret_tag");

      // Verify saved ciphertext in database decrypts to the original secret
      const decrypted = decryptProviderSecret({
        ciphertext: savedRow.secret_ciphertext,
        iv: savedRow.secret_iv,
        tag: savedRow.secret_tag,
      });
      expect(decrypted).toBe("super-secret-key-1234");
      expect(auditLogged).toBe(true);
    });

    it("refuses to enable provider if existing secret is undecryptable and no new secret is provided", async () => {
      const staleRow = {
        provider_kind: "payment",
        provider_name: "esewa",
        is_enabled: false,
        public_config: { merchant_code: "PROD-MERCHANT-88", environment: "production" },
        secret_ciphertext: "stale-undecryptable-ciphertext",
        secret_iv: "stale-iv",
        secret_tag: "stale-tag",
      };

      const mockClient = {
        query: vi.fn(async (sql: string) => {
          if (sql.includes("FROM public.profiles")) return { rowCount: 1 };
          if (sql.includes("SELECT provider_kind") && sql.includes("FOR UPDATE")) return { rows: [staleRow] };
          throw new Error(`Unexpected query: ${sql}`);
        }),
      } as unknown as PoolClient;

      const run = async <T>(fn: (c: PoolClient) => Promise<T>) => fn(mockClient);

      await expect(
        saveNeonProviderConfiguration(
          superAdmin,
          "payment",
          {
            providerName: "esewa",
            enabled: true,
            publicConfig: { merchant_code: "PROD-MERCHANT-88", environment: "production" },
            // Notice: no secret provided, trying to enable existing stale secret
          },
          run,
        ),
      ).rejects.toMatchObject({
        code: "PROVIDER_SECRET_REQUIRED",
        message: "Configure a valid provider secret before enabling.",
      });
    });

    it("allows updating publicConfig while disabled when existing secret is undecryptable", async () => {
      const staleRow = {
        provider_kind: "payment",
        provider_name: "esewa",
        is_enabled: false,
        public_config: { merchant_code: "OLD-MERCHANT", environment: "production" },
        secret_ciphertext: "stale-undecryptable-ciphertext",
        secret_iv: "stale-iv",
        secret_tag: "stale-tag",
      };

      const mockClient = {
        query: vi.fn(async (sql: string, params: any[]) => {
          if (sql.includes("FROM public.profiles")) return { rowCount: 1 };
          if (sql.includes("SELECT provider_kind") && sql.includes("FOR UPDATE")) return { rows: [staleRow] };
          if (sql.includes("INSERT INTO public.provider_configurations")) {
            return {
              rows: [{
                ...staleRow,
                public_config: JSON.parse(params[3]),
                is_enabled: false,
                configured_at: null,
                updated_at: new Date().toISOString(),
              }],
            };
          }
          if (sql.includes("INSERT INTO public.audit_logs")) return { rowCount: 1 };
          throw new Error(`Unexpected query: ${sql}`);
        }),
      } as unknown as PoolClient;

      const run = async <T>(fn: (c: PoolClient) => Promise<T>) => fn(mockClient);

      const status = await saveNeonProviderConfiguration(
        superAdmin,
        "payment",
        {
          providerName: "esewa",
          enabled: false,
          publicConfig: { merchant_code: "NEW-MERCHANT", environment: "production" },
        },
        run,
      );

      // Stale ciphertext is preserved in DB for rollback, but reported as disabled
      expect(status).toMatchObject({
        providerName: "esewa",
        enabled: false,
        configured: true,
        publicConfig: { merchant_code: "NEW-MERCHANT", environment: "production" },
      });
    });
  });
});
