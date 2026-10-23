import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHmac, randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { NeonCheckoutService, stagingEsewaProvider } from "@/lib/server/neon-checkout";
import {
  EsewaV2PaymentProvider,
  decodeEsewaRedirect,
} from "@/lib/server/payment-provider";
import {
  canDecryptSecret,
  getNeonProviderStatus,
  providerHealth,
  saveNeonProviderConfiguration,
} from "@/lib/server/neon-provider-config";
import {
  encryptProviderSecret,
  decryptProviderSecret,
} from "@/lib/server/secret-store";
import type { NeonActor } from "@/lib/server/neon-authorization";

const validKey = Buffer.alloc(32, 11).toString("base64");
const rotatedKey = Buffer.alloc(32, 22).toString("base64");

const superAdmin: NeonActor = {
  userId: "10000000-0000-4000-8000-000000000001",
  neonAuthUserId: "20000000-0000-4000-8000-000000000001",
  roles: ["super_admin"],
  permissions: [],
  platformAdmin: true,
};

const studentActor: NeonActor = {
  userId: "10000000-0000-4000-8000-000000000002",
  neonAuthUserId: "20000000-0000-4000-8000-000000000002",
  roles: ["student"],
  permissions: [],
  platformAdmin: false,
};

const liveMerchantCode = "MERCHANT-LIVE-TEST";
const liveSecret = "test-live-merchant-secret-key-42";

function signPayload(payload: Record<string, string>, secret: string): string {
  const names = payload.signed_field_names.split(",");
  const message = names.map((name) => `${name}=${payload[name]}`).join(",");
  return createHmac("sha256", secret).update(message).digest("base64");
}

describe("Neon eSewa End-to-End Payment & Provider Verification", () => {
  beforeEach(() => {
    process.env.PROVIDER_CONFIG_ENCRYPTION_KEY = validKey;
    process.env.NEON_PRODUCTION_PAYMENTS_ENABLED = "true";
  });

  describe("1. Configuration round-trip and decryptability guards", () => {
    it("saves live credentials, test-decrypts, persists encrypted fields, and produces secret-free status", async () => {
      let savedRow: any = null;
      const mockClient = {
        query: vi.fn(async (sql: string, params: any[]) => {
          if (sql.includes("FROM public.profiles")) return { rowCount: 1 };
          if (sql.includes("SELECT provider_kind") && sql.includes("FOR UPDATE")) return { rows: [] };
          if (sql.includes("INSERT INTO public.provider_configurations")) {
            savedRow = {
              provider_kind: params[0],
              provider_name: params[1],
              is_enabled: params[2],
              public_config: JSON.parse(params[3]),
              secret_ciphertext: params[4],
              secret_iv: params[5],
              secret_tag: params[6],
              configured_at: "2026-10-21T10:00:00Z",
              updated_at: "2026-10-21T10:00:00Z",
            };
            return { rows: [savedRow] };
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
          enabled: true,
          publicConfig: { merchant_code: liveMerchantCode, environment: "production" },
          secret: liveSecret,
        },
        run,
      );

      // Status response is completely secret-free
      expect(status).toMatchObject({
        providerName: "esewa",
        enabled: true,
        configured: true,
        secretDecryptable: true,
        publicConfig: { merchant_code: liveMerchantCode, environment: "production" },
      });
      const serialized = JSON.stringify(status);
      expect(serialized).not.toContain(liveSecret);
      expect(serialized).not.toContain("ciphertext");
      expect(serialized).not.toContain("secret_iv");
      expect(serialized).not.toContain("secret_tag");

      // Verify the persisted row decrypts back to the exact live secret
      const decrypted = decryptProviderSecret({
        ciphertext: savedRow.secret_ciphertext,
        iv: savedRow.secret_iv,
        tag: savedRow.secret_tag,
      });
      expect(decrypted).toBe(liveSecret);

      // Verify providerHealth reports configured_active
      const health = providerHealth(status, "esewa");
      expect(health).toMatchObject({
        status: "configured_active",
        deliveryAvailable: true,
      });
    });

    it("detects key mismatch, reports secretDecryptable: false, and sets health to not_configured", async () => {
      // Secret was encrypted with validKey
      const encrypted = encryptProviderSecret("secret-under-old-key", {
        PROVIDER_CONFIG_ENCRYPTION_KEY: validKey,
      });

      const staleRow = {
        provider_kind: "payment" as const,
        provider_name: "esewa",
        is_enabled: true, // Marked enabled in DB, but undecryptable with rotated key
        public_config: { merchant_code: liveMerchantCode, environment: "production" },
        secret_ciphertext: encrypted.ciphertext,
        secret_iv: encrypted.iv,
        secret_tag: encrypted.tag,
        configured_at: "2026-10-21T00:00:00Z",
        updated_at: "2026-10-21T00:00:00Z",
      };

      // Now switch server environment to rotatedKey
      process.env.PROVIDER_CONFIG_ENCRYPTION_KEY = rotatedKey;

      expect(canDecryptSecret(staleRow)).toBe(false);

      const query = vi.fn().mockResolvedValue([staleRow]);
      const status = await getNeonProviderStatus(superAdmin, "payment", query as any);

      // Enabled fails closed to false, secretDecryptable is false
      expect(status).toMatchObject({
        providerName: "esewa",
        enabled: false,
        configured: true,
        secretDecryptable: false,
      });

      const health = providerHealth(status, "esewa");
      expect(health).toMatchObject({
        status: "not_configured",
        deliveryAvailable: false,
      });
    });
  });

  describe("2. Checkout creation across supported products", () => {
    const provider = new EsewaV2PaymentProvider(liveSecret, {
      merchantCode: liveMerchantCode,
      environment: "production",
    });

    it("initiates mentor_booking checkout and inserts pending payment and session", async () => {
      const targetId = randomUUID();
      const queries: Array<{ sql: string; params: any[] }> = [];

      const mockDb = {
        query: vi.fn(async (sql: string, params: any[]) => {
          queries.push({ sql, params });
          if (sql.includes("SELECT true AS allowed")) return { rows: [{ allowed: true }] };
          if (sql.includes("SELECT b.student_id")) {
            return {
              rows: [{
                student_id: studentActor.userId,
                amount: 1500,
                currency: "NPR",
                status: "pending",
                payment_status: "pending",
                service_price: 1500,
                service_currency: "NPR",
              }],
            };
          }
          if (sql.includes("UPDATE public.payment_checkout_sessions SET status='expired'")) return { rowCount: 0 };
          if (sql.includes("SELECT id,user_id,entity_type")) return { rows: [] };
          if (sql.includes("INSERT INTO public.payments")) return { rowCount: 1 };
          if (sql.includes("INSERT INTO public.payment_checkout_sessions")) {
            return {
              rows: [{
                id: randomUUID(),
                user_id: studentActor.userId,
                entity_type: "mentor_booking",
                entity_id: targetId,
                package_id: null,
                provider_reference: params[3],
                amount: 1500,
                currency: "NPR",
                status: "pending",
                expires_at: new Date(Date.now() + 300_000),
                created_at: new Date(),
              }],
            };
          }
          throw new Error(`Unexpected SQL: ${sql}`);
        }),
      } as unknown as PoolClient;

      const service = new NeonCheckoutService(provider);
      const result = await service.initiate(
        studentActor,
        "mentor_booking",
        targetId,
        "https://www.merotalent.com",
        mockDb,
      );

      expect(result.reused).toBe(false);
      expect(result.checkoutUrl).toBe("https://epay.esewa.com.np/api/epay/main/v2/form");
      expect(result.checkoutFields.product_code).toBe(liveMerchantCode);
      expect(result.checkoutFields.total_amount).toBe("1500.00");
      expect(result.checkoutFields.amount).toBe("1500.00");
      expect(result.checkoutFields.signed_field_names).toBe(
        "total_amount,transaction_uuid,product_code",
      );

      // Verify payment insertion parameters
      const paymentInsert = queries.find((q) => q.sql.includes("INSERT INTO public.payments"));
      expect(paymentInsert).toBeDefined();
      expect(paymentInsert?.params[1]).toBe(studentActor.userId);
      expect(paymentInsert?.params[2]).toBe("mentor_booking");
      expect(paymentInsert?.params[3]).toBe(targetId);
      expect(paymentInsert?.params[4]).toBe(1500);
      expect(paymentInsert?.params[5]).toBe("NPR");
    });

    it("initiates event_registration checkout and calculates unit * quantity correctly", async () => {
      const targetId = randomUUID();
      const queries: Array<{ sql: string; params: any[] }> = [];

      const mockDb = {
        query: vi.fn(async (sql: string, params: any[]) => {
          queries.push({ sql, params });
          if (sql.includes("SELECT true AS allowed")) return { rows: [{ allowed: true }] };
          if (sql.includes("SELECT r.user_id,r.total_amount")) {
            return {
              rows: [{
                user_id: studentActor.userId,
                total_amount: 2000,
                ticket_quantity: 2,
                status: "pending",
                payment_status: "pending",
                unit_price: 1000,
                tier_currency: "NPR",
                event_price: 1000,
                event_currency: "NPR",
              }],
            };
          }
          if (sql.includes("UPDATE public.payment_checkout_sessions SET status='expired'")) return { rowCount: 0 };
          if (sql.includes("SELECT id,user_id,entity_type")) return { rows: [] };
          if (sql.includes("INSERT INTO public.payments")) return { rowCount: 1 };
          if (sql.includes("INSERT INTO public.payment_checkout_sessions")) {
            return {
              rows: [{
                id: randomUUID(),
                user_id: studentActor.userId,
                entity_type: "event_registration",
                entity_id: targetId,
                package_id: null,
                provider_reference: params[3],
                amount: 2000,
                currency: "NPR",
                status: "pending",
                expires_at: new Date(Date.now() + 300_000),
                created_at: new Date(),
              }],
            };
          }
          throw new Error(`Unexpected SQL: ${sql}`);
        }),
      } as unknown as PoolClient;

      const service = new NeonCheckoutService(provider);
      const result = await service.initiate(
        studentActor,
        "event_registration",
        targetId,
        "https://www.merotalent.com",
        mockDb,
      );

      expect(result.checkoutFields.total_amount).toBe("2000.00");
      expect(result.checkoutFields.product_code).toBe(liveMerchantCode);
    });

    it("rejects non-NPR currency", async () => {
      const targetId = randomUUID();
      const mockDb = {
        query: vi.fn(async (sql: string) => {
          if (sql.includes("SELECT true AS allowed")) return { rows: [{ allowed: true }] };
          if (sql.includes("SELECT b.student_id")) {
            return {
              rows: [{
                student_id: studentActor.userId,
                amount: 100,
                currency: "USD",
                status: "pending",
                payment_status: "pending",
                service_price: 100,
                service_currency: "USD",
              }],
            };
          }
          return { rows: [] };
        }),
      } as unknown as PoolClient;

      const service = new NeonCheckoutService(provider);
      await expect(
        service.initiate(studentActor, "mentor_booking", targetId, "https://www.merotalent.com", mockDb),
      ).rejects.toMatchObject({ code: "CURRENCY_UNSUPPORTED" });
    });
  });

  describe("3. Authoritative callback verification & entitlement fulfillment", () => {
    const provider = new EsewaV2PaymentProvider(liveSecret, {
      merchantCode: liveMerchantCode,
      environment: "production",
    });

    it("verifies authentic callback, issues event tickets, and marks payment success", async () => {
      const reference = randomUUID();
      const eventRegistrationId = randomUUID();
      const eventId = randomUUID();
      const ticketTypeId = randomUUID();

      const checkoutRow = {
        id: randomUUID(),
        user_id: studentActor.userId,
        entity_type: "event_registration",
        entity_id: eventRegistrationId,
        package_id: null,
        provider_reference: reference,
        amount: 2500,
        currency: "NPR",
        status: "pending",
        expires_at: new Date(Date.now() + 300_000),
        created_at: new Date(),
      };

      const issuedTickets: any[] = [];
      let paymentUpdated = false;
      let registrationConfirmed = false;

      const mockDb = {
        query: vi.fn(async (sql: string, params: any[]) => {
          if (sql.includes("SELECT id,user_id,entity_type") && sql.includes("WHERE provider_reference=$1")) {
            return { rows: [checkoutRow] };
          }
          if (sql.includes("SELECT id,user_id,entity_type") && sql.includes("FOR UPDATE")) {
            return { rows: [checkoutRow] };
          }
          if (sql.includes("UPDATE public.payment_checkout_sessions SET status=$2")) {
            return { rowCount: 1 };
          }
          if (sql.includes("UPDATE public.event_registrations")) {
            registrationConfirmed = true;
            return {
              rows: [{
                ticket_quantity: 2,
                event_id: eventId,
                ticket_type_id: ticketTypeId,
                form_data: {
                  participants: [
                    { fullName: "Alice Student", email: "alice@example.com" },
                    { fullName: "Bob Student", email: "bob@example.com" },
                  ],
                },
              }],
            };
          }
          if (sql.includes("INSERT INTO public.event_tickets")) {
            issuedTickets.push(params);
            return { rowCount: 1 };
          }
          if (sql.includes('SELECT n.id,n.recipient_id')) return { rows: [] };
          if (sql.includes('INSERT INTO public.notifications') || sql.includes('INSERT INTO public.audit_logs')) return { rowCount: 1 };
          if (sql.includes("UPDATE public.payments SET status=$2")) {
            paymentUpdated = true;
            return { rowCount: 1 };
          }
          throw new Error(`Unexpected query: ${sql}`);
        }),
      } as unknown as PoolClient;

      // Mock provider lookupStatus to return authoritative success from eSewa
      const mockLookupStatus = vi.fn(async () => ({
        status: "successful" as const,
        transactionId: "ESEWA-TX-99999",
      }));
      const adapter = {
        verifyRedirectPayload: (p: any) => provider.verifyRedirectPayload(p),
        lookupStatus: mockLookupStatus,
      } as unknown as EsewaV2PaymentProvider;

      const rawPayload = {
        transaction_code: "ESEWA-TX-99999",
        status: "COMPLETE",
        total_amount: "2500.00",
        transaction_uuid: reference,
        product_code: liveMerchantCode,
        signed_field_names: "transaction_code,status,total_amount,transaction_uuid,product_code,signed_field_names",
      };
      const signature = signPayload(rawPayload, liveSecret);
      const signedPayload = { ...rawPayload, signature };

      const service = new NeonCheckoutService(adapter);
      const result = await service.verifyReturn({ reference, signedPayload }, mockDb);

      expect(result.status).toBe("successful");
      expect(result.duplicate).toBe(false);
      expect(registrationConfirmed).toBe(true);
      expect(paymentUpdated).toBe(true);
      expect(issuedTickets).toHaveLength(2);
      expect(issuedTickets[0][5]).toBe("Alice Student");
      expect(issuedTickets[1][5]).toBe("Bob Student");
    });

    it("is idempotent: duplicate callback returns duplicate: true without re-fulfillment", async () => {
      const reference = randomUUID();
      const settledCheckoutRow = {
        id: randomUUID(),
        user_id: studentActor.userId,
        entity_type: "mentor_booking",
        entity_id: randomUUID(),
        package_id: null,
        provider_reference: reference,
        amount: 1500,
        currency: "NPR",
        status: "successful", // Already settled!
        expires_at: new Date(Date.now() + 300_000),
        created_at: new Date(),
      };

      const mockDb = {
        query: vi.fn(async () => ({ rows: [settledCheckoutRow] })),
      } as unknown as PoolClient;

      const mockLookupStatus = vi.fn();
      const adapter = {
        verifyRedirectPayload: () => true,
        lookupStatus: mockLookupStatus,
      } as unknown as EsewaV2PaymentProvider;

      const service = new NeonCheckoutService(adapter);
      const result = await service.verifyReturn({ reference }, mockDb);

      expect(result).toEqual({ status: "successful", duplicate: true });
      expect(mockLookupStatus).not.toHaveBeenCalled();
      expect(mockDb.query).toHaveBeenCalledOnce();
    });

    it("rejects forged redirect signature", async () => {
      const reference = randomUUID();
      const forgedPayload = {
        transaction_code: "FORGED-CODE",
        status: "COMPLETE",
        total_amount: "1500.00",
        transaction_uuid: reference,
        product_code: liveMerchantCode,
        signed_field_names: "transaction_code,status,total_amount,transaction_uuid,product_code,signed_field_names",
        signature: "bad-fake-signature-that-does-not-match-hmac-sha256=",
      };

      const mockDb = { query: vi.fn() } as unknown as PoolClient;
      const service = new NeonCheckoutService(provider);

      await expect(
        service.verifyReturn({ reference, signedPayload: forgedPayload }, mockDb),
      ).rejects.toMatchObject({ code: "INVALID_PROVIDER_SIGNATURE" });
      expect(mockDb.query).not.toHaveBeenCalled();
    });

    it("rejects amount mismatch between eSewa callback and local checkout record", async () => {
      const reference = randomUUID();
      const checkoutRow = {
        id: randomUUID(),
        user_id: studentActor.userId,
        entity_type: "mentor_booking",
        entity_id: randomUUID(),
        package_id: null,
        provider_reference: reference,
        amount: 1500, // DB expects 1500
        currency: "NPR",
        status: "pending",
        expires_at: new Date(Date.now() + 300_000),
        created_at: new Date(),
      };

      const mockDb = {
        query: vi.fn(async () => ({ rows: [checkoutRow] })),
      } as unknown as PoolClient;

      // Attacker sends valid signature for 100 instead of 1500
      const tamperingPayload = {
        transaction_code: "SOME-TX",
        status: "COMPLETE",
        total_amount: "100.00",
        transaction_uuid: reference,
        product_code: liveMerchantCode,
        signed_field_names: "transaction_code,status,total_amount,transaction_uuid,product_code,signed_field_names",
      };
      const signature = signPayload(tamperingPayload, liveSecret);
      const signedPayload = { ...tamperingPayload, signature };

      const service = new NeonCheckoutService(provider);
      await expect(
        service.verifyReturn({ reference, signedPayload }, mockDb),
      ).rejects.toMatchObject({ code: "INVALID_PROVIDER_PAYLOAD" });
    });

    it("handles failed/cancelled payment by marking entities cancelled and payments failed", async () => {
      const reference = randomUUID();
      const bookingId = randomUUID();

      const checkoutRow = {
        id: randomUUID(),
        user_id: studentActor.userId,
        entity_type: "mentor_booking",
        entity_id: bookingId,
        package_id: null,
        provider_reference: reference,
        amount: 1500,
        currency: "NPR",
        status: "pending",
        expires_at: new Date(Date.now() + 300_000),
        created_at: new Date(),
      };

      let bookingCancelled = false;
      let paymentFailed = false;

      const mockDb = {
        query: vi.fn(async (sql: string) => {
          if (sql.includes("SELECT id,user_id,entity_type")) return { rows: [checkoutRow] };
          if (sql.includes("UPDATE public.payment_checkout_sessions")) return { rowCount: 1 };
          if (sql.includes("UPDATE public.mentor_bookings")) {
            bookingCancelled = true;
            return { rowCount: 1 };
          }
          if (sql.includes("UPDATE public.payments SET status=$2")) {
            paymentFailed = true;
            return { rowCount: 1 };
          }
          if (sql.includes('SELECT n.id,n.recipient_id')) return { rows: [] };
          if (sql.includes('INSERT INTO public.notifications') || sql.includes('INSERT INTO public.audit_logs')) return { rowCount: 1 };
          throw new Error(`Unexpected query: ${sql}`);
        }),
      } as unknown as PoolClient;

      const mockLookupStatus = vi.fn(async () => ({
        status: "cancelled" as const,
        transactionId: "CANCELLED-TX",
      }));
      const adapter = {
        verifyRedirectPayload: () => true,
        lookupStatus: mockLookupStatus,
      } as unknown as EsewaV2PaymentProvider;

      const service = new NeonCheckoutService(adapter);
      const result = await service.verifyReturn({ reference }, mockDb);

      expect(result.status).toBe("cancelled");
      expect(bookingCancelled).toBe(true);
      expect(paymentFailed).toBe(true);
    });
  });
});
