/** Explicitly opted-in real delivery to the proven account owner; DB fixture rolls back. */
import { describe, expect, it } from "vitest";
import dotenv from "dotenv";
import { randomUUID, createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import { getPool } from "@/lib/server/db";
import { getNeonDatabaseConfig } from "@/lib/neon/neon-config";
import { dispatchNeonQueuedEmails } from "@/lib/server/neon-email-queue";
import { encryptProviderSecret } from "@/lib/server/secret-store";
import type { QueryResultRow } from "pg";

describe.skipIf(process.env.NEON_STAGING_RESEND_LIVE_TEST !== "br-frosty-haze-azsnybmr")("actual opted-in staging Resend delivery", () => {
  it("leases a real notification, calls Resend, records acceptance, then rolls back its fixture", async () => {
    const parsed = dotenv.config({ path: ".migration.env", quiet: true }).parsed ?? {};
    // Retain only the explicitly supplied email credential; the DB remains pinned
    // to migration-staging even when Vercel supplies production email settings.
    const apiKey = process.env.RESEND_API_KEY, from = process.env.EMAIL_FROM;
    const encryptionKey = dotenv.config({ path: ".env", quiet: true }).parsed?.PROVIDER_CONFIG_ENCRYPTION_KEY;
    const recipient = process.env.NEON_STAGING_EMAIL_TEST_RECIPIENTS;
    expect(apiKey && from && recipient && !recipient.includes(",")).toBeTruthy();
    Object.assign(process.env, parsed, { MEROTALENT_BACKEND_MODE: "neon-staging",
      NEXT_PUBLIC_MEROTALENT_BACKEND_MODE: "neon-staging" });
    delete process.env.VERCEL_ENV;
    expect(getNeonDatabaseConfig().branchId).toBe("br-frosty-haze-azsnybmr");
    const client = await getPool().connect();
    const id = randomUUID();
    try {
      await client.query("BEGIN");
      await client.query("SET LOCAL lock_timeout='5s'");
      await client.query("LOCK TABLE public.notifications IN SHARE ROW EXCLUSIVE MODE");
      const eligible = (await client.query<{ n: number }>(`SELECT count(*)::int AS n FROM public.notifications
        WHERE channel='email' AND status IN ('queued','processing') AND email_delivery_enabled=true
          AND deleted_at IS NULL AND lower(email_to)=$1 AND metadata->>'delivery_environment'='neon-staging'`,
      [recipient!.toLowerCase()])).rows[0].n;
      expect(eligible).toBe(0); // Never send or recover an unrelated queued message.
      const [owner] = (await client.query<{ user_id: string }>(`SELECT a.legacy_user_id AS user_id
        FROM public.neon_application_accounts a JOIN public.neon_identity_links l ON l.application_account_id=a.id
        JOIN neon_auth."user" u ON u.id::uuid=l.neon_auth_user_id
        WHERE l.status='verified' AND l.verification_method='dual_authenticated_session'
          AND u."emailVerified"=true AND lower(u.email)=$1 AND a.status='active'`, [recipient!.toLowerCase()])).rows;
      expect(owner).toBeDefined();
      const secureEnvironment = { ...process.env, PROVIDER_CONFIG_ENCRYPTION_KEY: encryptionKey };
      const encrypted = encryptProviderSecret(apiKey!, secureEnvironment);
      // Exercise the real encrypted Provider Center resolution, not a provider
      // injected around it. This configuration fixture also rolls back.
      await client.query(`INSERT INTO public.provider_configurations
        (provider_kind,provider_name,is_enabled,public_config,secret_ciphertext,secret_iv,secret_tag)
        VALUES('email','resend',true,$1::jsonb,$2,$3,$4)
        ON CONFLICT(provider_kind) DO UPDATE SET provider_name='resend',is_enabled=true,
          public_config=excluded.public_config,secret_ciphertext=excluded.secret_ciphertext,
          secret_iv=excluded.secret_iv,secret_tag=excluded.secret_tag`,
      [JSON.stringify({ from_address: from }), encrypted.ciphertext, encrypted.iv, encrypted.tag]);
      await client.query(`INSERT INTO public.notifications(id,recipient_id,title,message,channel,status,email_to,metadata)
        VALUES($1::uuid,$2::uuid,'MeroTalent Neon staging email verification',
          'This is the single requested migration delivery check. No action or payment is required.',
          'email','queued',$3,'{"delivery_environment":"neon-staging","migration_delivery_check":true}')`,
      [id, owner.user_id, recipient]);
      const environment = { ...secureEnvironment, CRON_SECRET: randomUUID(), NEON_STAGING_EMAIL_DELIVERY_ENABLED: "true",
        NEON_STAGING_EMAIL_TEST_RECIPIENTS: recipient };
      // The queue can only lease this exact allowlisted recipient and staging-origin messages.
      const result = await dispatchNeonQueuedEmails(`Bearer ${environment.CRON_SECRET}`, 1, { environment,
        run: operation => operation(client),
        query: async <T extends QueryResultRow>(sql: string, values: readonly unknown[] = []) =>
          (await client.query<T>(sql, [...values])).rows });
      expect(result).toMatchObject({ configured: true, claimed: 1, sent: 1, failed: 0 });
      const saved = (await client.query<{ status: string; accepted: boolean }>(`SELECT status,
        metadata->>'provider_message_id' IS NOT NULL AS accepted FROM public.notifications WHERE id=$1::uuid`, [id])).rows[0];
      expect(saved).toEqual({ status: "sent", accepted: true });
      await client.query("ROLLBACK");
      expect((await client.query("SELECT id FROM public.notifications WHERE id=$1::uuid", [id])).rowCount).toBe(0);
      await writeFile(join(homedir(), "Library", "Application Support", "MeroTalent", "migration-artifacts",
        `resend-acceptance-${id}.json`), JSON.stringify({ result: "PASS", at: new Date().toISOString(),
        provider: "resend", accepted: 1, inboxDeliveryVerified: false, databaseFixtureRolledBack: true,
        recipientFingerprint: createHash("sha256").update(recipient!).digest("hex").slice(0, 16), productionWrites: 0 }),
      { mode: 0o600, flag: "wx" });
    } finally { await client.query("ROLLBACK").catch(() => {}); client.release(); }
  }, 60000);
});
