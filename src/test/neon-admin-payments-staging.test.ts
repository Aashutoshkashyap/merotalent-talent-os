import dotenv from "dotenv";
import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { describe, expect, it } from "vitest";
import { getPool } from "@/lib/server/db";
import { getNeonDatabaseConfig, NEON_MIGRATION_STAGING_BRANCH_ID } from "@/lib/neon/neon-config";
import type { NeonActor } from "@/lib/server/neon-authorization";
import { assignNeonModuleAccess } from "@/lib/server/neon-admin-access";
import { changeNeonDefaultFreeTier, listNeonAdminPayments, listNeonAdminSubscriptions,
  reconcileNeonAdminPayment, recordNeonMentorPayout, reviewNeonAdminPaymentProof } from "@/lib/server/neon-admin-payments";

describe("isolated Neon billing ledger rollback", () => {
  it("reviews evidence separately, settles manual grants once, records external payouts and grants/revokes exact free scopes", async () => {
    const parsed = dotenv.config({ path: ".migration.env", quiet: true }).parsed ?? {};
    if (!parsed.NEON_STAGING_DATABASE_URL) throw new Error("Approved isolated staging credentials are required.");
    Object.assign(process.env, parsed, { MEROTALENT_BACKEND_MODE: "neon-staging", NEON_STAGING_BRANCH_ID: NEON_MIGRATION_STAGING_BRANCH_ID });
    getNeonDatabaseConfig();
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      const identity = (await client.query<{ legacy_user_id: string; neon_auth_user_id: string }>(`SELECT a.legacy_user_id,l.neon_auth_user_id
        FROM public.neon_identity_links l JOIN public.neon_application_accounts a ON a.id=l.application_account_id
        JOIN public.profiles p ON p.user_id=a.legacy_user_id WHERE l.status='verified' AND a.status='active'
        AND p.account_status='active' AND p.deleted_at IS NULL LIMIT 1`)).rows[0];
      expect(identity).toBeDefined();
      const admin: NeonActor = { userId: identity.legacy_user_id, neonAuthUserId: identity.neon_auth_user_id,
        platformAdmin: true, roles: ["super_admin"], permissions: [] };
      await client.query(`INSERT INTO public.user_roles(user_id,role) SELECT $1::uuid,'super_admin'
        WHERE NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=$1::uuid AND role='super_admin')`, [admin.userId]);
      const target = (await client.query<{ user_id: string }>(`SELECT p.user_id FROM public.profiles p
        WHERE p.user_id<>$1::uuid AND p.account_status='active' AND p.deleted_at IS NULL
        AND NOT EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=p.user_id AND r.role IN ('admin','super_admin')) LIMIT 1`, [admin.userId])).rows[0];
      const college = (await client.query<{ id: string }>("SELECT id FROM public.institutes WHERE deleted_at IS NULL LIMIT 1")).rows[0];
      const mentor = (await client.query<{ id: string; user_id: string }>("SELECT id,user_id FROM public.mentors WHERE deleted_at IS NULL LIMIT 1")).rows[0];
      expect(target).toBeDefined(); expect(college).toBeDefined(); expect(mentor).toBeDefined();
      const run = <T>(operation: (db: PoolClient) => Promise<T>) => operation(client);
      const paymentId = randomUUID();
      await client.query(`INSERT INTO public.payments(id,user_id,payment_type,reference_id,amount,currency,status,gateway,payment_method)
        VALUES($1::uuid,$2::uuid,'mentor_booking',$3::uuid,1000,'NPR','pending','esewa','esewa')`, [paymentId, target.user_id, randomUUID()]);
      const proof = (await client.query<{ id: string }>(`INSERT INTO public.payment_proofs(payment_id,uploaded_by_user_id,
        file_name,storage_path,mime_type,file_size,proof_type,user_note)
        VALUES($1::uuid,$2::uuid,'isolated.pdf',$3,'application/pdf',20,'receipt','Isolated rollback evidence') RETURNING id`,
      [paymentId, target.user_id, `isolated-billing/${paymentId}.pdf`])).rows[0];
      const input = { id: proof.id, paymentId, status: "accepted" as const, note: "Reviewed isolated receipt evidence" };
      expect(await reviewNeonAdminPaymentProof(admin, input, run)).toMatchObject({ paymentActivated: false, duplicate: false });
      expect(await reviewNeonAdminPaymentProof(admin, input, run)).toMatchObject({ duplicate: true });
      await expect(reviewNeonAdminPaymentProof(admin, { ...input, status: "rejected" }, run)).rejects.toMatchObject({ code: "PROOF_ALREADY_REVIEWED" });
      await expect(reconcileNeonAdminPayment(admin, { id: paymentId, status: "success", reconciliation: "reconciled", note: "Cannot fabricate eSewa success" }, run)).rejects.toMatchObject({ code: "VERIFIED_PROVIDER_REQUIRED" });
      expect(await reconcileNeonAdminPayment(admin, { id: paymentId, status: "pending", reconciliation: "disputed", note: "Investigating isolated eSewa evidence" }, run)).toMatchObject({ status: "pending" });
      expect((await client.query("SELECT status FROM public.payments WHERE id=$1::uuid", [paymentId])).rows[0].status).toBe("pending");
      expect((await client.query("SELECT id FROM public.module_entitlements WHERE payment_id=$1::uuid", [paymentId])).rowCount).toBe(0);
      const listing = await listNeonAdminPayments(admin, new URLSearchParams(`search=${paymentId}`), run);
      expect(listing.payments).toHaveLength(1);
      expect(listing.payments[0].profiles).toHaveProperty("email");
      expect(listing.proofs[0]).not.toHaveProperty("storage_path");
      await client.query(`UPDATE public.payments SET status='failed' WHERE user_id=$1::uuid AND payment_type='module_subscription'
        AND gateway='manual' AND status='pending' AND metadata->>'entity_id'=$2`, [target.user_id, college.id]);
      const assignment = await assignNeonModuleAccess(admin, { userId: target.user_id, module: "college", entityId: college.id,
        startAt: new Date(Date.now()-60000).toISOString(), expiresAt: new Date(Date.now()+86400000*30).toISOString(),
        amount: 1000, transactionReference: `ISOLATED-${randomUUID()}`, idempotencyKey: randomUUID() }, run);
      const reconcile = { id: assignment.paymentId!, status: "success", reconciliation: "reconciled", note: "External manual receipt verified" };
      expect(await reconcileNeonAdminPayment(admin, reconcile, run)).toMatchObject({ status: "success", duplicate: false });
      expect(await reconcileNeonAdminPayment(admin, reconcile, run)).toMatchObject({ duplicate: true });
      expect((await client.query("SELECT id FROM public.module_entitlements WHERE payment_id=$1::uuid", [assignment.paymentId])).rowCount).toBe(1);
      const bookingId = randomUUID(), settledId = randomUUID();
      await client.query(`INSERT INTO public.mentor_bookings(id,mentor_id,student_id,scheduled_start,scheduled_end,
        status,payment_status,amount,currency) VALUES($1::uuid,$2::uuid,$3::uuid,now()+interval '90 days',
        now()+interval '90 days 1 hour','confirmed','success',1000,'NPR')`, [bookingId, mentor.id, target.user_id]);
      await client.query(`INSERT INTO public.payments(id,user_id,payment_type,reference_id,amount,currency,status,gateway,paid_at)
        VALUES($1::uuid,$2::uuid,'mentor_booking',$3::uuid,1000,'NPR','success','isolated_fixture',now())`, [settledId, target.user_id, bookingId]);
      await client.query("UPDATE public.mentor_bookings SET payment_id=$2::uuid WHERE id=$1::uuid", [bookingId, settledId]);
      const payout = { id: settledId, amount: 900, commission: 100, reference: `ISOLATED-EXTERNAL-${randomUUID()}`, note: "Verified external payout fixture" };
      const recorded = await recordNeonMentorPayout(admin, payout, run);
      expect(recorded).toMatchObject({ duplicate: false, moneyTransferred: false });
      expect(await recordNeonMentorPayout(admin, payout, run)).toMatchObject({ duplicate: true, payoutId: recorded.payoutId });
      await expect(recordNeonMentorPayout(admin, { ...payout, reference: `Different-${randomUUID()}` }, run)).rejects.toMatchObject({ code: "PAYOUT_ALREADY_RECORDED" });
      const planId = randomUUID();
      await client.query(`UPDATE public.packages SET is_default_free=false WHERE is_default_free AND module_scope @> ARRAY['college']::text[]`);
      await client.query(`UPDATE public.subscriptions SET status='cancelled' WHERE user_id=$1::uuid AND entity_type='college'
        AND entity_id=$2::uuid AND status IN ('active','trialing')`, [target.user_id, college.id]);
      await client.query(`UPDATE public.module_entitlements SET status='revoked' WHERE user_id=$1::uuid AND entity_id=$2::uuid AND source='FREE'`, [target.user_id, college.id]);
      await client.query(`INSERT INTO public.packages(id,code,name,price,currency,billing_interval,duration_days,package_kind,
        module_scope,is_active,is_publicly_selectable,is_default_free,features)
        VALUES($1::uuid,$1::text,'Isolated free college',0,'NPR','month',14,'free',ARRAY['college'],true,false,true,
        '{"profile_editing":true}'::jsonb)`, [planId]);
      const scope = { userId: target.user_id, module: "college", entityType: "college", entityId: college.id };
      expect(await changeNeonDefaultFreeTier(admin, scope, "grant", run)).toMatchObject({ duplicate: false });
      expect(await changeNeonDefaultFreeTier(admin, scope, "grant", run)).toMatchObject({ duplicate: true });
      expect((await listNeonAdminSubscriptions(admin, new URLSearchParams(), run)).subscriptions.length).toBeGreaterThan(0);
      expect(await changeNeonDefaultFreeTier(admin, scope, "revoke", run)).toMatchObject({ revoked_count: 1, duplicate: false });
      expect(await changeNeonDefaultFreeTier(admin, scope, "revoke", run)).toMatchObject({ revoked_count: 0, duplicate: true });
      expect((await client.query("SELECT status FROM public.module_entitlements WHERE payment_id=$1::uuid", [assignment.paymentId])).rows[0].status).toBe("active");
      await client.query("UPDATE public.profiles SET account_status='suspended' WHERE user_id=$1::uuid", [admin.userId]);
      await expect(listNeonAdminPayments(admin, new URLSearchParams(), run)).rejects.toMatchObject({ code: "ADMIN_REQUIRED" });
    } finally {
      await client.query("ROLLBACK").catch(() => undefined); client.release(); await getPool().end();
    }
  }, 90000);
});
