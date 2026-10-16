import dotenv from "dotenv";
import { randomInt, randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import type { PoolClient } from "pg";
import { getPool } from "@/lib/server/db";
import { getNeonDatabaseConfig } from "@/lib/neon/neon-config";
import { normalizeGuestIdentity, hashGuestToken } from "@/lib/server/guest-college-verification";
import { startNeonGuestVerification, checkNeonGuestVerification, submitNeonGuestCollegeApplication, claimNeonGuestCollegeApplications } from "@/lib/server/neon-guest-college-verification";
import type { NeonActor } from "@/lib/server/neon-authorization";

describe("isolated Neon guest college verification and admission", () => {
  it("proves both contact channels, exact proof binding, persistent attempts, delivery invalidation, atomic consumption and idempotency with only mock sends, then rolls back", async () => {
    Object.assign(process.env, dotenv.config({ path: ".migration.env", quiet: true }).parsed,
      { MEROTALENT_BACKEND_MODE: "neon-staging" });
    getNeonDatabaseConfig();
    const client = await getPool().connect();
    const collegeId = randomUUID(); const email = `guest-${randomUUID()}@example.test`;
    const whatsappNumber = `+97798${String(randomInt(0, 100_000_000)).padStart(8, "0")}`;
    const identity = normalizeGuestIdentity({ guestToken: randomUUID(), collegeId, email, whatsappNumber });
    const environment = { ...process.env, MEROTALENT_BACKEND_MODE: "neon-staging",
      GUEST_VERIFICATION_HMAC_KEY: Buffer.alloc(32, 12).toString("base64"),
      NEON_STAGING_EMAIL_DELIVERY_ENABLED: "true", NEON_STAGING_EMAIL_TEST_RECIPIENTS: email,
      NEON_STAGING_WHATSAPP_VERIFICATION_ENABLED: "true", NEON_STAGING_WHATSAPP_TEST_RECIPIENTS: whatsappNumber };
    const codes = new Map<string, string>();
    const sender = vi.fn(async (_identity: typeof identity, channel: "email" | "whatsapp", code: string) => { codes.set(channel, code); });
    const run = <T>(operation: (connection: PoolClient) => Promise<T>) => operation(client);
    const options = { environment, sender, run };
    try {
      await client.query("BEGIN");
      const owner = (await client.query<{ user_id: string }>(`SELECT user_id FROM public.profiles
        WHERE account_status='active' AND deleted_at IS NULL LIMIT 1`)).rows[0];
      await client.query(`INSERT INTO public.institutes(id,name,type,status,owner_user_id,applications_enabled,admission_status)
        VALUES($1::uuid,'Guest verification rollback fixture','college','approved',$2::uuid,true,'open')`, [collegeId, owner.user_id]);
      const disabled = { ...options, environment: { ...environment, NEON_STAGING_EMAIL_DELIVERY_ENABLED: "false" } };
      await expect(startNeonGuestVerification(identity, "email", disabled)).rejects.toMatchObject({ code: "EMAIL_UNAVAILABLE" });
      expect(sender).not.toHaveBeenCalled();
      expect((await client.query(`SELECT id FROM public.guest_college_verifications WHERE college_id=$1::uuid`, [collegeId])).rowCount).toBe(0);
      const started = await startNeonGuestVerification(identity, "email", options);
      await expect(startNeonGuestVerification(identity, "email", options)).rejects.toMatchObject({ code: "VERIFICATION_THROTTLED" });
      const second = await startNeonGuestVerification(identity, "whatsapp", options);
      expect(second.verificationId).toBe(started.verificationId);
      const stored = (await client.query(`SELECT email_code_hash,whatsapp_code_hash,email_dispatched_at,whatsapp_dispatched_at
        FROM public.guest_college_verifications WHERE id=$1::uuid`, [started.verificationId])).rows[0];
      expect(stored.email_code_hash).toMatch(/^[a-f0-9]{64}$/); expect(stored.whatsapp_code_hash).toMatch(/^[a-f0-9]{64}$/);
      expect(stored.email_code_hash).not.toBe(codes.get("email")); expect(stored.whatsapp_code_hash).not.toBe(codes.get("whatsapp"));
      expect(stored.email_dispatched_at).toBeTruthy(); expect(stored.whatsapp_dispatched_at).toBeTruthy();
      await expect(checkNeonGuestVerification({ ...identity, email: "different@example.test" }, started.verificationId, "email", codes.get("email")!, options))
        .rejects.toMatchObject({ code: "INVALID_CODE" });
      await expect(checkNeonGuestVerification({ ...identity, guestToken: randomUUID() }, started.verificationId, "email", codes.get("email")!, options))
        .rejects.toMatchObject({ code: "INVALID_CODE" });
      await checkNeonGuestVerification(identity, started.verificationId, "email", codes.get("email")!, options);
      const payload = { collegeId, fullName: "Guest applicant fixture", email, phone: whatsappNumber, intendedCourse: "Civil engineering" };
      const key = randomUUID();
      await expect(submitNeonGuestCollegeApplication(payload, identity.guestToken, started.verificationId, key, options))
        .rejects.toMatchObject({ code: "GUEST_VERIFICATION_REQUIRED" });
      await checkNeonGuestVerification(identity, started.verificationId, "whatsapp", codes.get("whatsapp")!, options);
      await expect(submitNeonGuestCollegeApplication({ ...payload, phone: "+9779800000001" }, identity.guestToken, started.verificationId, key, options))
        .rejects.toMatchObject({ code: "GUEST_VERIFICATION_REQUIRED" });
      const saved = await submitNeonGuestCollegeApplication(payload, identity.guestToken, started.verificationId, key, options);
      expect(saved).toMatchObject({ status: "submitted" }); expect(saved.leadId).toBeTruthy();
      expect(await submitNeonGuestCollegeApplication(payload, identity.guestToken, started.verificationId, key, options)).toMatchObject({ id: saved.id });
      await expect(submitNeonGuestCollegeApplication(payload, identity.guestToken, started.verificationId, randomUUID(), options))
        .rejects.toMatchObject({ code: "GUEST_VERIFICATION_REQUIRED" });
      await expect(submitNeonGuestCollegeApplication({ ...payload, owner_user_id: owner.user_id }, identity.guestToken, started.verificationId, key, options))
        .rejects.toMatchObject({ code: "INVALID_GUEST_DETAILS" });
      const application = (await client.query(`SELECT applicant_id,email,whatsapp_number,guest_email_verified_at,guest_whatsapp_verified_at
        FROM public.college_applications WHERE id=$1::uuid`, [saved.id])).rows[0];
      expect(application).toMatchObject({ applicant_id: null, email, whatsapp_number: whatsappNumber });
      expect(application.guest_email_verified_at).toBeTruthy(); expect(application.guest_whatsapp_verified_at).toBeTruthy();
      expect((await client.query(`SELECT consumed_at FROM public.guest_college_verifications WHERE id=$1::uuid`, [started.verificationId])).rows[0].consumed_at).toBeTruthy();
      expect((await client.query(`SELECT id FROM public.college_applications WHERE guest_token_hash=$1`, [hashGuestToken(identity.guestToken)])).rowCount).toBe(1);
      await expect(checkNeonGuestVerification(identity, started.verificationId, "email", "000000", options)).rejects.toMatchObject({ code: "INVALID_CODE" });
      const linked = (await client.query<{ user_id: string; neon_auth_user_id: string }>(`SELECT a.legacy_user_id AS user_id,l.neon_auth_user_id
        FROM public.neon_identity_links l JOIN public.neon_application_accounts a ON a.id=l.application_account_id
        JOIN public.profiles p ON p.user_id=a.legacy_user_id WHERE l.status='verified' AND a.status='active'
          AND p.account_status='active' AND p.deleted_at IS NULL LIMIT 1`)).rows[0];
      expect(linked).toBeDefined();
      const actor: NeonActor = { userId: linked.user_id, neonAuthUserId: linked.neon_auth_user_id,
        roles: [], permissions: [], platformAdmin: false };
      const grantsBefore = (await client.query(`SELECT id,status FROM public.user_module_capabilities WHERE user_id=$1::uuid ORDER BY id`, [actor.userId])).rows;
      expect(await claimNeonGuestCollegeApplications(actor, identity.guestToken, "different@example.test", run)).toEqual({ claimed_count: 0 });
      await expect(claimNeonGuestCollegeApplications({ ...actor, neonAuthUserId: randomUUID() }, identity.guestToken, email, run))
        .rejects.toMatchObject({ code: "IDENTITY_NOT_LINKED" });
      expect(await claimNeonGuestCollegeApplications(actor, identity.guestToken, email, run)).toEqual({ claimed_count: 1 });
      expect(await claimNeonGuestCollegeApplications(actor, identity.guestToken, email, run)).toEqual({ claimed_count: 0 });
      expect((await client.query(`SELECT applicant_id,guest_token_hash FROM public.college_applications WHERE id=$1::uuid`, [saved.id])).rows[0])
        .toMatchObject({ applicant_id: actor.userId, guest_token_hash: null });
      expect((await client.query(`SELECT applicant_user_id FROM public.leads WHERE source_id=$1::uuid`, [saved.id])).rows[0].applicant_user_id).toBe(actor.userId);
      expect((await client.query(`SELECT id,status FROM public.user_module_capabilities WHERE user_id=$1::uuid ORDER BY id`, [actor.userId])).rows).toEqual(grantsBefore);

      const guessing = { ...identity, guestToken: randomUUID() };
      const challenge = await startNeonGuestVerification(guessing, "email", options);
      const realCode = codes.get("email")!; const wrong = String((Number(realCode) + 1) % 1_000_000).padStart(6, "0");
      for (let attempt = 0; attempt < 5; attempt++) {
        await expect(checkNeonGuestVerification(guessing, challenge.verificationId, "email", wrong, options)).rejects.toMatchObject({ code: "INVALID_CODE" });
      }
      expect((await client.query(`SELECT email_attempts FROM public.guest_college_verifications WHERE id=$1::uuid`, [challenge.verificationId])).rows[0].email_attempts).toBe(5);
      await expect(checkNeonGuestVerification(guessing, challenge.verificationId, "email", realCode, options)).rejects.toMatchObject({ code: "INVALID_CODE" });
      await client.query(`UPDATE public.guest_college_verifications SET last_email_requested_at=now()-interval '61 seconds' WHERE id=$1::uuid`, [challenge.verificationId]);
      await startNeonGuestVerification(guessing, "email", options);
      await client.query(`UPDATE public.guest_college_verifications SET email_code_expires_at=now()-interval '1 second' WHERE id=$1::uuid`, [challenge.verificationId]);
      await expect(checkNeonGuestVerification(guessing, challenge.verificationId, "email", codes.get("email")!, options)).rejects.toMatchObject({ code: "INVALID_CODE" });

      const failure = { ...identity, guestToken: randomUUID() };
      await expect(startNeonGuestVerification(failure, "whatsapp", { ...options, sender: async () => { throw new Error("mock transport failure"); } }))
        .rejects.toMatchObject({ code: "WHATSAPP_UNAVAILABLE" });
      const invalidated = (await client.query(`SELECT whatsapp_code_hash,whatsapp_dispatched_at FROM public.guest_college_verifications
        WHERE guest_token_hash=$1 AND college_id=$2::uuid`, [hashGuestToken(failure.guestToken), collegeId])).rows[0];
      expect(invalidated).toMatchObject({ whatsapp_code_hash: null, whatsapp_dispatched_at: null });
      await client.query(`INSERT INTO public.guest_college_verification_sends(channel,destination,guest_token_hash)
        SELECT 'email',$1,$2 FROM generate_series(1,5)`, [email, hashGuestToken(identity.guestToken)]);
      await expect(startNeonGuestVerification({ ...identity, guestToken: randomUUID() }, "email", options)).rejects.toMatchObject({ code: "VERIFICATION_THROTTLED" });
      await client.query("ROLLBACK");
      expect((await client.query(`SELECT id FROM public.college_applications WHERE id=$1::uuid`, [saved.id])).rowCount).toBe(0);
      expect((await client.query(`SELECT id FROM public.institutes WHERE id=$1::uuid`, [collegeId])).rowCount).toBe(0);
    } finally {
      await client.query("ROLLBACK").catch(() => undefined); client.release(); await getPool().end();
    }
  }, 60_000);
});
