import dotenv from "dotenv";
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { getPool } from "@/lib/server/db";
import { getNeonDatabaseConfig, NEON_MIGRATION_STAGING_BRANCH_ID } from "@/lib/neon/neon-config";
import type { NeonActor } from "@/lib/server/neon-authorization";
import { activateVerifiedNeonModuleAccess, downloadNeonAccessProof, NeonModuleAccess,
  prepareNeonModuleAccessCheckout, uploadNeonAccessProof } from "@/lib/server/neon-module-access";
import { deleteObject, headObject } from "@/lib/server/storage";
import {NeonCheckoutService} from "@/lib/server/neon-checkout";
import type {EsewaV2PaymentProvider} from "@/lib/server/payment-provider";

describe("isolated Neon module-request proofs, approval and payment scope", () => {
  it("stores actual private bytes, trusts the profile, refuses unverified approval, activates only assigned scope and rolls back fixtures", async () => {
    const parsed = dotenv.config({ path: ".migration.env", quiet: true }).parsed ?? {};
    if (!parsed.NEON_STAGING_DATABASE_URL) throw new Error("Staging credentials required.");
    Object.assign(process.env, parsed, { MEROTALENT_BACKEND_MODE: "neon-staging", NEON_STAGING_BRANCH_ID: NEON_MIGRATION_STAGING_BRANCH_ID });
    getNeonDatabaseConfig();
    const client = await getPool().connect(), uploaded: string[] = [];
    try {
      await client.query("BEGIN");
      const identity = (await client.query<{ legacy_user_id: string; neon_auth_user_id: string }>(`SELECT a.legacy_user_id,l.neon_auth_user_id
        FROM public.neon_identity_links l JOIN public.neon_application_accounts a ON a.id=l.application_account_id
        JOIN public.profiles p ON p.user_id=a.legacy_user_id WHERE l.status='verified' AND a.status='active'
          AND p.account_status='active' AND p.deleted_at IS NULL LIMIT 1`)).rows[0];
      expect(identity).toBeDefined();
      const actor: NeonActor = { userId: identity.legacy_user_id, neonAuthUserId: identity.neon_auth_user_id, roles: [], permissions: [], platformAdmin: false };
      const forged: NeonActor = { ...actor, neonAuthUserId: randomUUID() };
      const admin = { ...actor, roles: ["super_admin"], platformAdmin: true };
      await client.query(`INSERT INTO public.user_roles(user_id,role) SELECT $1::uuid,'super_admin'
        WHERE NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=$1::uuid AND role='super_admin')`, [actor.userId]);
      await client.query(`UPDATE public.profiles SET full_name='Isolated verified requester',phone='9800000000' WHERE user_id=$1::uuid`, [actor.userId]);
      // Isolate any prior fixture request without changing committed staging state.
      await client.query(`UPDATE public.sub_admin_requests SET status='cancelled' WHERE user_id=$1::uuid AND status='pending'`, [actor.userId]);
      const packageId = randomUUID();
      await client.query(`INSERT INTO public.packages(id,code,name,price,currency,billing_interval,duration_days,package_kind,module_scope,
        is_active,is_publicly_selectable,features) VALUES($1::uuid,$1::text,$2,125,'NPR','month',30,'paid',ARRAY['college','jobs','mentor','events'],true,true,
        '{"profile_editing":true,"lead_viewing":true,"media_management":true}'::jsonb)`, [packageId, `Isolated module request ${packageId}`]);
      const college = (await client.query<{ id: string }>(`SELECT id FROM public.institutes WHERE status='approved' AND deleted_at IS NULL LIMIT 1`)).rows[0];
      expect(college).toBeDefined();
      const run = <T>(operation: (db: import("pg").PoolClient) => Promise<T>) => operation(client);
      const service = new NeonModuleAccess(run), draftId = randomUUID();
      const bytes = new TextEncoder().encode("%PDF-1.4\n% Isolated application request proof\n%%EOF\n");
      await expect(uploadNeonAccessProof(forged, { draftId, module: "college", fileName: "proof.pdf", contentType: "application/pdf", bytes }, run))
        .rejects.toMatchObject({ code: "ACCESS_DENIED" });
      const proof = await uploadNeonAccessProof(actor, { draftId, module: "college", fileName: "proof.pdf", contentType: "application/pdf", bytes }, run);
      uploaded.push(proof.path);
      expect((await headObject("application-files", proof.path))?.contentLength).toBe(bytes.byteLength);
      const input = { draftId, modules: ["college" as const], packageId, collegeId: college.id,
        reason: "Verified isolated college administrator application", organization: "Isolated College", proofs: { college: proof } };
      const row = await service.submit(actor, input);
      expect((row as unknown as { user_name: string }).user_name).toBe("Isolated verified requester");
      expect(await service.submit(actor, input)).toMatchObject({ id: row.id, existing_request: true });
      expect(await prepareNeonModuleAccessCheckout(actor, row.id, packageId, client)).toEqual({ amount: 125, currency: "NPR", packageId });
      await expect(service.decide(actor, row.id, true)).rejects.toMatchObject({ code: "ACCESS_DENIED" });
      await expect(service.decide(admin, row.id, true)).rejects.toMatchObject({ code: "PAYMENT_NOT_VERIFIED" });
      await expect(downloadNeonAccessProof(forged, row.id, "college", run)).rejects.toMatchObject({ code: "ACCESS_DENIED" });
      const download = await downloadNeonAccessProof(actor, row.id, "college", run);
      const response = await fetch(download.signedUrl);
      expect(response.status).toBe(200); expect(Buffer.from(await response.arrayBuffer()).equals(Buffer.from(bytes))).toBe(true);
      await expect(service.assign(admin, row.id, "college", college.id)).rejects.toMatchObject({ code: "APPROVED_REQUEST_REQUIRED" });
      // Deterministic provider fixture exercises our real atomic callback/ledger;
      // this is not evidence of a genuine external sandbox settlement.
      let providerStatus:"pending"|"successful"="pending";
      const provider={createCheckout:async()=>({status:"pending",checkoutUrl:"https://sandbox.example.invalid",checkoutFields:{product_code:"fixture"}}),
        lookupStatus:async({reference}:{reference:string})=>({status:providerStatus,transactionId:`test-${reference}`}),
        verifyRedirectPayload:()=>false} as unknown as EsewaV2PaymentProvider;
      const checkoutService=new NeonCheckoutService(provider);
      const checkout=await checkoutService.initiate(actor,"module_access_request",row.id,"http://localhost:3210",client,packageId);
      const paymentId=checkout.session.provider_reference;
      expect((await checkoutService.verifyReturn({reference:paymentId},client)).status).toBe("pending");
      expect((await client.query("SELECT payment_status FROM public.sub_admin_requests WHERE id=$1::uuid",[row.id])).rows[0].payment_status).toBe("pending");
      providerStatus="successful";
      const callback=await checkoutService.verifyReturn({reference:paymentId},client);
      expect(callback).toMatchObject({status:"successful",activation:{activated:false,reason:"awaiting_approval"}});
      expect((await checkoutService.verifyReturn({reference:paymentId},client)).duplicate).toBe(true);
      expect(await activateVerifiedNeonModuleAccess(client, row.id)).toEqual({ activated: false, reason: "awaiting_approval" });
      const decision = await service.decide(admin, row.id, true);
      expect(decision.status).toBe("approved");
      expect(await service.decide(admin, row.id, true)).toMatchObject({ duplicate: true });
      const assigned = await service.assign(admin, row.id, "college", college.id);
      expect(assigned.activation).toMatchObject({ activated: true });
      const assignedAgain = await service.assign(admin, row.id, "college", college.id);
      expect(assignedAgain.assignmentId).toBe(assigned.assignmentId);
      expect((await client.query(`SELECT id FROM public.module_entitlements WHERE payment_id=$1::uuid`, [paymentId])).rowCount).toBe(1);
      await expect(service.assign(admin, row.id, "college", randomUUID())).rejects.toMatchObject({ code: "SCOPE_MISMATCH" });
      await expect(service.cancel(actor, row.id)).rejects.toMatchObject({ code: "REQUEST_NOT_CANCELLABLE" });
      const nextDraft = randomUUID();
      const nextProof = await uploadNeonAccessProof(actor, { draftId: nextDraft, module: "jobs", fileName: "company.pdf", contentType: "application/pdf", bytes }, run);
      uploaded.push(nextProof.path);
      const pending = await service.submit(actor, { draftId: nextDraft, modules: ["jobs"], packageId, reason: "Isolated company authorization request",
        organization: "Company", proofs: { jobs: nextProof } });
      expect(await service.cancel(actor, pending.id)).toMatchObject({ status: "cancelled", duplicate: false });
      expect(await service.cancel(actor, pending.id)).toMatchObject({ duplicate: true });
    } finally {
      for (const path of uploaded) await deleteObject("application-files", path).catch(() => undefined);
      await client.query("ROLLBACK").catch(() => undefined); client.release(); await getPool().end();
    }
  }, 90000);
});
