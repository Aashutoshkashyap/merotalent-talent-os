import dotenv from "dotenv";
import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import type { PoolClient } from "pg";
import { getPool } from "@/lib/server/db";
import { getNeonDatabaseConfig } from "@/lib/neon/neon-config";
import { runNeonMaintenance } from "@/lib/server/neon-maintenance";
import { dispatchNeonQueuedEmails } from "@/lib/server/neon-email-queue";

const configure = () => {
  const parsed = dotenv.config({ path: ".migration.env", quiet: true }).parsed ?? {};
  if (!parsed.NEON_STAGING_DATABASE_URL) throw new Error("Isolated staging configuration required.");
  Object.assign(process.env, parsed, { MEROTALENT_BACKEND_MODE: "neon-staging" });
  getNeonDatabaseConfig();
  return { ...process.env, MEROTALENT_BACKEND_MODE: "neon-staging", CRON_SECRET: "maintenance-rollback-test" };
};
const authorization = "Bearer maintenance-rollback-test";

describe("isolated Neon maintenance and controlled email delivery", () => {
  it("executes expiry, durable renewed-period notifications, pruning, queue retries and lease completion, then rolls every database change back", async () => {
    const environment = configure();
    const client = await getPool().connect();
    const fixture = { college: randomUUID(), subscription: randomUUID(), entitlement: randomUUID(),
      job: randomUUID(), draft: randomUUID(), event: randomUUID(), ad: randomUUID(), package: randomUUID(),
      checkout: randomUUID(), paidCheckout: randomUUID(), expiredGuest: randomUUID(), recentGuest: randomUUID(), intent: randomUUID() };
    try {
      await client.query("BEGIN");
      const user = (await client.query<{ user_id: string }>(`SELECT user_id FROM public.profiles
        WHERE account_status='active' AND deleted_at IS NULL LIMIT 1`)).rows[0];
      expect(user).toBeDefined();
      await client.query(`INSERT INTO public.packages(id,code,name,audience,module_scope) VALUES($1::uuid,$2,'Maintenance rollback fixture',NULL,ARRAY['college'])`,
        [fixture.package, `maintenance-${fixture.package}`]);
      await client.query(`INSERT INTO public.institutes(id,name,type,owner_user_id,status,logo_url)
        VALUES($1::uuid,'Maintenance rollback institution','college',$2::uuid,'approved',$3)`,
      [fixture.college, user.user_id, `college_logo/${fixture.college}/logo.png`]);
      const capability = (await client.query<{ id: string }>(`SELECT id FROM public.module_capabilities
        WHERE module_key='college' AND is_active LIMIT 1`)).rows[0];
      const grant = (await client.query<{ id: string }>(`INSERT INTO public.user_module_capabilities(user_id,capability_id,status)
        VALUES($1::uuid,$2::uuid,'active') ON CONFLICT(user_id,capability_id) DO UPDATE SET status='active' RETURNING id`,
      [user.user_id, capability.id])).rows[0];
      await client.query(`INSERT INTO public.entity_admin_assignments(user_id,user_capability_id,entity_type,entity_id,status)
        VALUES($1::uuid,$2::uuid,'college',$3::uuid,'active')`, [user.user_id, grant.id, fixture.college]);
      await client.query(`INSERT INTO public.subscriptions(id,user_id,package_id,entity_type,entity_id,start_date,expiry_date,status,payment_status)
        VALUES($1::uuid,$2::uuid,$3::uuid,'college',$4::uuid,now()-interval '10 days',now()-interval '1 hour','active','success')`,
      [fixture.subscription, user.user_id, fixture.package, fixture.college]);
      await client.query(`INSERT INTO public.module_entitlements(id,user_id,module_key,entity_type,entity_id,source,start_at,expires_at)
        VALUES($1::uuid,$2::uuid,'college','college',$3::uuid,'TRIAL',now()-interval '10 days',now()-interval '1 hour')`,
      [fixture.entitlement, user.user_id, fixture.college]);
      await client.query(`INSERT INTO public.jobs(id,title,owner_user_id,status,approval_status,is_active,expires_at)
        VALUES($1::uuid,'Maintenance expired job',$3::uuid,'published','approved',true,now()-interval '1 hour'),
          ($2::uuid,'Maintenance draft remains private',$3::uuid,'draft','pending',false,now()-interval '1 hour')`,
      [fixture.job, fixture.draft, user.user_id]);
      await client.query(`INSERT INTO public.events(id,organizer_user_id,title,status,approval_status,is_active,start_date,end_date)
        VALUES($1::uuid,$2::uuid,'Maintenance completed event','published','approved',true,
          now()-interval '2 days',now()-interval '1 day')`, [fixture.event, user.user_id]);
      await client.query(`INSERT INTO public.advertisements(id,title,placement,status,start_date,end_date)
        VALUES($1::uuid,'Maintenance elapsed campaign','homepage','active',now()-interval '2 days',now()-interval '1 day')`, [fixture.ad]);
      await client.query(`INSERT INTO public.payment_checkout_sessions(id,user_id,package_id,entity_type,entity_id,
        provider_name,provider_reference,amount,status,expires_at)
        VALUES($1::uuid,$3::uuid,$4::uuid,'college',$5::uuid,'esewa',$6,100,'pending',now()-interval '1 hour'),
          ($2::uuid,$3::uuid,$4::uuid,'college',$5::uuid,'esewa',$7,100,'successful',now()-interval '1 hour')`,
      [fixture.checkout, fixture.paidCheckout, user.user_id, fixture.package, fixture.college,
        `MAINT-${fixture.checkout}`, `MAINT-${fixture.paidCheckout}`]);
      await client.query(`INSERT INTO public.media_upload_intents(id,user_id,module,resource_id,object_path,declared_size,created_at)
        VALUES($1::uuid,$2::uuid,'college_logo',$3::uuid,$4,100,now()-interval '20 days')`,
      [fixture.intent, user.user_id, fixture.college, `college_logo/${fixture.college}/logo.png`]);
      await client.query(`INSERT INTO public.guest_college_verifications(id,guest_token_hash,college_id,email,whatsapp_number,expires_at)
        VALUES($1::uuid,$3,$4::uuid,'fixture@example.test','+9779800000001',now()-interval '8 days'),
          ($2::uuid,$5,$4::uuid,'fixture@example.test','+9779800000001',now()-interval '1 day')`,
      [fixture.expiredGuest, fixture.recentGuest, randomUUID(), fixture.college, randomUUID()]);
      const run = <T>(operation: (connection: PoolClient) => Promise<T>) => operation(client);
      await expect(runNeonMaintenance(null, run, environment)).rejects.toMatchObject({ name: "NeonCronAuthorizationError" });
      const first = await runNeonMaintenance(authorization, run, environment);
      expect(first).toMatchObject({ upload_intents_removed: 0 });
      for (const [table, id, status] of [["subscriptions", fixture.subscription, "expired"],
        ["module_entitlements", fixture.entitlement, "expired"], ["jobs", fixture.job, "expired"],
        ["events", fixture.event, "completed"], ["advertisements", fixture.ad, "expired"],
        ["payment_checkout_sessions", fixture.checkout, "expired"],
        ["payment_checkout_sessions", fixture.paidCheckout, "successful"], ["jobs", fixture.draft, "draft"]]) {
        expect((await client.query(`SELECT status FROM public.${table} WHERE id=$1::uuid`, [id])).rows[0]?.status).toBe(status);
      }
      expect((await client.query(`SELECT id FROM public.media_upload_intents WHERE id=$1::uuid`, [fixture.intent])).rowCount).toBe(1);
      expect((await client.query(`SELECT id FROM public.guest_college_verifications WHERE id=$1::uuid`, [fixture.expiredGuest])).rowCount).toBe(0);
      expect((await client.query(`SELECT id FROM public.guest_college_verifications WHERE id=$1::uuid`, [fixture.recentGuest])).rowCount).toBe(1);
      const notifications = await client.query(`SELECT channel FROM public.notifications WHERE entity_id=$1::uuid`, [fixture.subscription]);
      expect(notifications.rows.map(row => row.channel).sort()).toEqual(["dashboard", "email"]);
      const repeated = await runNeonMaintenance(authorization, run, environment);
      expect(repeated).toMatchObject({ notifications_enqueued: 0, expired_subscriptions: 0, expired_checkouts: 0 });
      await client.query(`UPDATE public.subscriptions SET status='active',expiry_date=now()-interval '30 minutes' WHERE id=$1::uuid`, [fixture.subscription]);
      expect(await runNeonMaintenance(authorization, run, environment)).toMatchObject({ notifications_enqueued: 2 });

      const recipient = `queue-${randomUUID()}@example.test`;
      const queueEnv = { ...environment, NEON_STAGING_EMAIL_DELIVERY_ENABLED: "true", NEON_STAGING_EMAIL_TEST_RECIPIENTS: recipient };
      const ids = { sent: randomUUID(), copied: randomUUID(), foreign: randomUUID(), retry: randomUUID(), terminal: randomUUID(), recovered: randomUUID() };
      for (const [kind, id] of Object.entries(ids)) {
        await client.query(`INSERT INTO public.notifications(id,recipient_id,title,message,channel,status,email_to,
          metadata,delivery_attempt_count,last_delivery_attempt_at)
          VALUES($1::uuid,$2::uuid,$3,'Isolated test notification','email',$4,$5,$6::jsonb,$7,
            CASE WHEN $4='processing' THEN now()-interval '20 minutes' ELSE NULL END)`,
        [id, user.user_id, kind, kind === "recovered" ? "processing" : "queued",
          kind === "foreign" ? "unapproved@example.test" : recipient,
          JSON.stringify(kind === "copied" ? {} : { delivery_environment: "neon-staging" }),
          kind === "terminal" ? 4 : kind === "recovered" ? 1 : 0]);
      }
      const send = vi.fn(async (message: { subject: string }) => message.subject === "retry" || message.subject === "terminal"
        ? { status: "failed" as const, provider: "mock-controlled" }
        : { status: "sent" as const, provider: "mock-controlled", providerMessageId: randomUUID() });
      const delivered = await dispatchNeonQueuedEmails(authorization, 25, { environment: queueEnv, run, provider: { name: "mock-controlled", send } });
      expect(delivered).toMatchObject({ claimed: 4, sent: 2, retrying: 1, failed: 1, superseded: 0 });
      expect(send).toHaveBeenCalledTimes(4);
      const state = (await client.query<{ id: string; status: string }>(`SELECT id,status FROM public.notifications WHERE id=ANY($1::uuid[])`, [Object.values(ids)])).rows;
      expect(state).toContainEqual({ id: ids.copied, status: "queued" });
      expect(state).toContainEqual({ id: ids.foreign, status: "queued" });
      expect(state).toContainEqual({ id: ids.terminal, status: "failed" });
      expect(await dispatchNeonQueuedEmails(authorization, 25, { environment: queueEnv, run, provider: { name: "mock-controlled", send } })).toMatchObject({ claimed: 0 });
      await client.query("ROLLBACK");
      expect((await client.query(`SELECT id FROM public.institutes WHERE id=$1::uuid`, [fixture.college])).rowCount).toBe(0);
      expect((await client.query(`SELECT id FROM public.notifications WHERE id=ANY($1::uuid[])`, [Object.values(ids)])).rowCount).toBe(0);
    } finally {
      await client.query("ROLLBACK").catch(() => undefined); client.release();
    }
  }, 60_000);

  it("runs two concurrent real database workers without delivering a notification twice, then removes only the three isolated fixture rows", async () => {
    const base = configure();
    const token = randomUUID(); const ids = [randomUUID(), randomUUID(), randomUUID()];
    const recipient = `concurrent-${token}@example.test`;
    const environment = { ...base, NEON_STAGING_EMAIL_DELIVERY_ENABLED: "true", NEON_STAGING_EMAIL_TEST_RECIPIENTS: recipient };
    const user = (await getPool().query<{ user_id: string }>(`SELECT user_id FROM public.profiles WHERE deleted_at IS NULL LIMIT 1`)).rows[0];
    try {
      await getPool().query(`INSERT INTO public.notifications(id,recipient_id,title,message,channel,email_to,metadata)
        SELECT unnest($1::uuid[]),$2::uuid,'Concurrent isolated fixture','Mock delivery only','email',$3,
          jsonb_build_object('delivery_environment','neon-staging','test_fixture',$4::text)`, [ids, user.user_id, recipient, token]);
      const send = vi.fn(async () => ({ status: "sent" as const, provider: "mock-controlled", providerMessageId: randomUUID() }));
      const result = await Promise.all([1, 2].map(() => dispatchNeonQueuedEmails(authorization, 2,
        { environment, provider: { name: "mock-controlled", send } })));
      expect(result.reduce((total, row) => total + row.sent, 0)).toBe(3);
      expect(send).toHaveBeenCalledTimes(3);
      const keys = send.mock.calls.map(args => (args as unknown as [{ idempotencyKey: string }])[0].idempotencyKey);
      expect(new Set(keys).size).toBe(3);
      expect((await getPool().query(`SELECT id FROM public.notifications WHERE id=ANY($1::uuid[]) AND status='sent'`, [ids])).rowCount).toBe(3);
    } finally {
      await getPool().query(`DELETE FROM public.notifications WHERE id=ANY($1::uuid[])
        AND metadata->>'test_fixture'=$2`, [ids, token]);
      expect((await getPool().query(`SELECT id FROM public.notifications WHERE id=ANY($1::uuid[])`, [ids])).rowCount).toBe(0);
      await getPool().end();
    }
  }, 60_000);
});
