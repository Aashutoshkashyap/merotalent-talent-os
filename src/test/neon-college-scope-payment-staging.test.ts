import { describe, expect, it } from "vitest";
import dotenv from "dotenv";
import { randomUUID } from "node:crypto";
import { getPool } from "@/lib/server/db";
import { getNeonDatabaseConfig, NEON_MIGRATION_STAGING_BRANCH_ID } from "@/lib/neon/neon-config";
import { NeonCheckoutService } from "@/lib/server/neon-checkout";
import { NeonCollegeScopes } from "@/lib/server/neon-college-scopes";
import { activateVerifiedCollegeScope } from "@/lib/server/neon-college-scope-activation";
import type { NeonActor } from "@/lib/server/neon-authorization";
import type { EsewaV2PaymentProvider } from "@/lib/server/payment-provider";

describe("isolated College scope payment activation", () => {
  it("keeps checkout pending, activates only verified approved scope, and ignores duplicate returns", async () => {
    const parsed = dotenv.config({ path: ".migration.env", quiet: true }).parsed ?? {};
    if (!parsed.NEON_STAGING_DATABASE_URL) throw new Error("Isolated staging DB is required.");
    Object.assign(process.env, parsed, { MEROTALENT_BACKEND_MODE: "neon-staging",
      NEON_STAGING_BRANCH_ID: NEON_MIGRATION_STAGING_BRANCH_ID });
    getNeonDatabaseConfig();
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      const identity = (await client.query<{ user_id: string; neon_auth_user_id: string }>(`
        SELECT a.legacy_user_id AS user_id,l.neon_auth_user_id FROM public.neon_identity_links l
        JOIN public.neon_application_accounts a ON a.id=l.application_account_id
        JOIN public.profiles p ON p.user_id=a.legacy_user_id
        WHERE l.status='verified' AND a.status='active' AND p.account_status='active'
          AND p.deleted_at IS NULL LIMIT 1`)).rows[0];
      expect(identity).toBeTruthy();
      const actor: NeonActor = { userId: identity.user_id, neonAuthUserId: identity.neon_auth_user_id,
        roles: ["talent"], permissions: [], platformAdmin: false };
      const college = (await client.query<{ id: string }>(`SELECT id FROM public.institutes
        WHERE status='approved' AND deleted_at IS NULL ORDER BY id LIMIT 1`)).rows[0];
      const plan = (await client.query<{ id: string; price: number }>(`
        SELECT id,price::float AS price FROM public.packages
        WHERE package_kind='paid' AND module_scope @> ARRAY['college']::text[]
          AND is_active AND is_publicly_selectable AND deleted_at IS NULL ORDER BY id LIMIT 1`)).rows[0];
      expect(college).toBeTruthy(); expect(plan).toBeTruthy();
      const capability = (await client.query<{ id: string }>(`
        SELECT id FROM public.module_capabilities WHERE module_key='college' AND is_active LIMIT 1`)).rows[0];
      await client.query(`INSERT INTO public.user_module_capabilities(user_id,capability_id,status)
        VALUES ($1::uuid,$2::uuid,'active') ON CONFLICT(user_id,capability_id)
        DO UPDATE SET status='active'`, [actor.userId, capability.id]);
      const userCapability = (await client.query<{ id: string }>(`
        SELECT id FROM public.user_module_capabilities WHERE user_id=$1::uuid AND capability_id=$2::uuid`,
      [actor.userId, capability.id])).rows[0];
      await client.query(`INSERT INTO public.entity_admin_assignments
        (user_id,user_capability_id,entity_type,entity_id,status,assigned_by,scopes)
        VALUES ($1::uuid,$2::uuid,'college',$3::uuid,'active',$1::uuid,'{}'::jsonb)
        ON CONFLICT(user_capability_id,entity_type,entity_id) DO UPDATE SET status='active'`,
      [actor.userId, userCapability.id, college.id]);
      const requestId = randomUUID();
      await client.query(`INSERT INTO public.entity_scope_requests
        (id,user_id,module_key,entity_type,entity_id,request_kind,request_data,reason,status)
        VALUES ($1::uuid,$2::uuid,'college','college',$3::uuid,'claim','{}'::jsonb,
          'Isolated staging payment verification','approved')`, [requestId, actor.userId, college.id]);
      let providerStatus: "pending" | "successful" | "failed" = "pending";
      const provider = {
        createCheckout: async ({ paymentId }: { paymentId: string }) => ({ status: "pending",
          checkoutUrl: "https://sandbox.example.invalid/form", checkoutFields: { transaction_uuid: paymentId } }),
        verifyRedirectPayload: () => true,
        lookupStatus: async ({ reference }: { reference: string }) => ({ status: providerStatus, transactionId: `sandbox-${reference}` }),
      } as unknown as EsewaV2PaymentProvider;
      const service = new NeonCheckoutService(provider);
      const unrelated: NeonActor = { ...actor, userId: randomUUID() };
      await expect(service.initiate(unrelated, "college_scope_request", requestId,
        "http://localhost:3210", client, plan.id)).rejects.toMatchObject({ code: "IDENTITY_NOT_LINKED" });
      await expect(service.initiate(actor,"college_scope_request",randomUUID(),
        "http://localhost:3210",client,plan.id)).rejects.toMatchObject({code:"REQUEST_NOT_FOUND"});
      const checkout = await service.initiate(actor, "college_scope_request", requestId,
        "http://localhost:3210", client, plan.id);
      expect(Number(checkout.session.amount)).toBe(plan.price);
      const reused = await service.initiate(actor, "college_scope_request", requestId,
        "http://localhost:3210", client, plan.id);
      expect(reused.reused).toBe(true);
      const reference = checkout.session.provider_reference;
      expect((await service.verifyReturn({ reference }, client)).status).toBe("pending");
      expect((await client.query(`SELECT id FROM public.module_entitlements WHERE payment_id=$1::uuid`, [reference])).rowCount).toBe(0);
      providerStatus = "successful";
      const settled = await service.verifyReturn({ reference }, client);
      expect(settled.status).toBe("successful");
      expect("activation" in settled ? settled.activation : null).toMatchObject({ activated: true, duplicate: false });
      expect((await service.verifyReturn({ reference }, client)).duplicate).toBe(true);
      // Real staging SQL, but deliberately injected provider state: this is
      // atomic fulfillment/receipt evidence, NOT genuine eSewa settlement.
      expect((await client.query(`SELECT id FROM public.audit_logs WHERE entity_id=$1
        AND action='esewa_payment_verified'`, [reference])).rowCount).toBe(1);
      expect((await client.query(`SELECT id FROM public.notifications WHERE entity_id=$1::uuid
        AND category='payment' AND channel='email' AND metadata->>'payment_status'='success'`, [reference])).rowCount).toBe(1);
      const entitlement = await client.query(`SELECT id FROM public.module_entitlements WHERE payment_id=$1::uuid
        AND user_id=$2::uuid AND entity_id=$3::uuid AND status='active'`, [reference, actor.userId, college.id]);
      expect(entitlement.rowCount).toBe(1);
      const paid = await client.query<{ status: string }>(`SELECT status FROM public.payments WHERE id=$1::uuid`, [reference]);
      expect(paid.rows[0].status).toBe("success");
      const beforeRenewal = (await client.query<{ expiry_date: Date }>(`
        SELECT expiry_date FROM public.subscriptions WHERE user_id=$1::uuid AND entity_type='college'
          AND entity_id=$2::uuid AND status='active' ORDER BY expiry_date DESC LIMIT 1`,
      [actor.userId, college.id])).rows[0];
      await expect(service.initiate(actor, "college_scope_request", requestId,
        "http://localhost:3210", client, plan.id)).rejects.toMatchObject({ code: "REQUEST_NOT_PAYABLE" });
      const renewalCheckout = await service.initiate(actor, "college_scope_request", requestId,
        "http://localhost:3210", client, plan.id, true);
      expect(renewalCheckout.reused).toBe(false);
      providerStatus = "pending";
      expect((await service.verifyReturn({ reference: renewalCheckout.session.provider_reference }, client)).status).toBe("pending");
      providerStatus = "successful";
      const renewed = await service.verifyReturn({ reference: renewalCheckout.session.provider_reference }, client);
      expect("activation" in renewed ? renewed.activation : null).toMatchObject({ activated: true, duplicate: false });
      expect((await service.verifyReturn({ reference: renewalCheckout.session.provider_reference }, client)).duplicate).toBe(true);
      const afterRenewal = (await client.query<{ expiry_date: Date }>(`
        SELECT expiry_date FROM public.subscriptions WHERE user_id=$1::uuid AND entity_type='college'
          AND entity_id=$2::uuid AND status='active' ORDER BY expiry_date DESC LIMIT 1`,
      [actor.userId, college.id])).rows[0];
      expect(new Date(afterRenewal.expiry_date).getTime()).toBeGreaterThan(new Date(beforeRenewal.expiry_date).getTime());
      expect((await client.query(`SELECT id FROM public.module_entitlements WHERE user_id=$1::uuid
        AND entity_id=$2::uuid AND payment_id IN ($3::uuid,$4::uuid)`,
      [actor.userId, college.id, reference, renewalCheckout.session.provider_reference])).rowCount).toBe(2);
      await client.query(`UPDATE public.entity_admin_assignments SET status='revoked' WHERE user_id=$1::uuid
        AND entity_type='college' AND entity_id=$2::uuid`, [actor.userId, college.id]);
      await expect(service.initiate(actor, "college_scope_request", requestId,
        "http://localhost:3210", client, plan.id, true)).rejects.toMatchObject({ code: "COLLEGE_SCOPE_REQUIRED" });
      await client.query(`UPDATE public.entity_admin_assignments SET status='active' WHERE user_id=$1::uuid
        AND entity_type='college' AND entity_id=$2::uuid`, [actor.userId, college.id]);

      const invalidRequest = randomUUID();
      await client.query(`INSERT INTO public.entity_scope_requests
        (id,user_id,module_key,entity_type,entity_id,request_kind,request_data,reason,status,
          payment_status,payment_id,package_id)
        VALUES ($1::uuid,$2::uuid,'college','college',$3::uuid,'claim','{}'::jsonb,
          'Wrong-payment staging attack','approved','success',$4::uuid,$5::uuid)`,
      [invalidRequest, actor.userId, college.id, reference, plan.id]);
      await expect(activateVerifiedCollegeScope(client, invalidRequest))
        .rejects.toMatchObject({ code: "PAYMENT_NOT_VERIFIED" });

      const failedRequest = randomUUID();
      await client.query(`INSERT INTO public.entity_scope_requests
        (id,user_id,module_key,entity_type,entity_id,request_kind,request_data,reason,status)
        VALUES ($1::uuid,$2::uuid,'college','college',$3::uuid,'claim','{}'::jsonb,
          'Failed-payment staging check','approved')`, [failedRequest, actor.userId, college.id]);
      const failedCheckout = await service.initiate(actor, "college_scope_request", failedRequest,
        "http://localhost:3210", client, plan.id);
      providerStatus = "failed";
      expect((await service.verifyReturn({ reference: failedCheckout.session.provider_reference }, client)).status).toBe("failed");
      expect((await client.query(`SELECT id FROM public.module_entitlements WHERE payment_id=$1::uuid`,
        [failedCheckout.session.provider_reference])).rowCount).toBe(0);

      const awaitingRequest = randomUUID();
      await client.query(`INSERT INTO public.entity_scope_requests
        (id,user_id,module_key,entity_type,entity_id,request_kind,request_data,reason,status)
        VALUES ($1::uuid,$2::uuid,'college','college',$3::uuid,'claim','{}'::jsonb,
          'Payment before approval check','pending')`, [awaitingRequest, actor.userId, college.id]);
      const awaitingCheckout = await service.initiate(actor, "college_scope_request", awaitingRequest,
        "http://localhost:3210", client, plan.id);
      providerStatus = "successful";
      const awaiting = await service.verifyReturn({ reference: awaitingCheckout.session.provider_reference }, client);
      expect("activation" in awaiting ? awaiting.activation : null).toMatchObject({ activated: false, reason: "awaiting_approval" });
      await client.query(`INSERT INTO public.user_roles(user_id,role)
        SELECT $1::uuid,'admin' WHERE NOT EXISTS
          (SELECT 1 FROM public.user_roles WHERE user_id=$1::uuid AND role='admin')`, [actor.userId]);
      const admin: NeonActor = { ...actor, roles: ["admin"], platformAdmin: true };
      await new NeonCollegeScopes(async operation => operation(client)).decide(admin, awaitingRequest, true);
      expect((await client.query(`SELECT id FROM public.module_entitlements WHERE payment_id=$1::uuid`,
        [awaitingCheckout.session.provider_reference])).rowCount).toBe(1);
    } finally {
      await client.query("ROLLBACK").catch(() => undefined);
      client.release();
      await getPool().end();
    }
  }, 60_000);
});
