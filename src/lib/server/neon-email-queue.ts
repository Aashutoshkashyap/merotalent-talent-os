/** Lease-bound transactional email delivery for isolated Neon staging. */
import type { PoolClient, QueryResultRow } from "pg";
import { queryRows, withTransaction } from "./db";
import { getConfiguredTransactionalEmailProvider, getTransactionalEmailProvider, type TransactionalEmailProvider } from "./email-provider";
import { requireNeonCron, type NeonMaintenanceTransaction } from "./neon-maintenance";
import { decryptProviderSecret, isSecretStorageConfigured } from "./secret-store";
import { neonEmailPolicy, type NeonEmailPolicy } from "./neon-delivery-policy";

type EmailRow = QueryResultRow & {
  id: string; title: string; message: string; email_to: string;
  metadata: Record<string, unknown> | null; delivery_attempt_count: number;
  last_delivery_attempt_at: string | Date;
};
type ProviderRow = QueryResultRow & {
  provider_name: string; is_enabled: boolean; public_config: Record<string, unknown> | null;
  secret_ciphertext: string | null; secret_iv: string | null; secret_tag: string | null;
};
type Environment = Record<string, string | undefined>;
type QueueOptions = { environment?: Environment; run?: NeonMaintenanceTransaction;
  query?: typeof queryRows; provider?: TransactionalEmailProvider };

/** An explicit allowlist plus a staging-origin marker excludes copied messages. */
export function neonEmailRecipients(environment: Environment = process.env): string[] {
  const policy = neonEmailPolicy(environment);
  return policy.enabled ? policy.recipients ?? [] : [];
}

export async function resolveNeonEmailProvider(query: typeof queryRows = queryRows,
  environment: Environment = process.env): Promise<TransactionalEmailProvider | null> {
  const [row] = await query<ProviderRow>(`SELECT provider_name,is_enabled,public_config,
    secret_ciphertext,secret_iv,secret_tag FROM public.provider_configurations
    WHERE provider_kind='email' LIMIT 1`);
  // An explicit Provider Center row (including disabled or broken) takes precedence.
  // Only absent configuration may reuse the existing server-side Resend adapter.
  if (!row) {
    if (!environment.EMAIL_FROM?.includes("@")) return null;
    const provider = getTransactionalEmailProvider(environment);
    return provider.name === "unconfigured" ? null : provider;
  }
  if (!isSecretStorageConfigured(environment) || !row.is_enabled || row.provider_name !== "resend" ||
      !row.secret_ciphertext || !row.secret_iv || !row.secret_tag) return null;
  try {
    const provider = getConfiguredTransactionalEmailProvider({ providerName: row.provider_name,
      publicConfig: row.public_config ?? {}, secret: decryptProviderSecret({
        ciphertext: row.secret_ciphertext, iv: row.secret_iv, tag: row.secret_tag }, environment) });
    return provider.name === "unconfigured" ? null : provider;
  } catch {
    // A valid-format but incompatible key cannot decrypt copied configuration.
    // Leave every notification queued and report unavailable without any key,
    // ciphertext or provider-secret details.
    return null;
  }
}

async function claim(client: PoolClient, policy: NeonEmailPolicy, limit: number): Promise<EmailRow[]> {
  await client.query(`UPDATE public.notifications n SET
      status=CASE WHEN n.delivery_attempt_count>=5 THEN 'failed' ELSE 'queued' END,
      next_delivery_attempt_at=CASE WHEN n.delivery_attempt_count>=5 THEN NULL ELSE now() END,
      metadata=COALESCE(n.metadata,'{}'::jsonb)||jsonb_build_object('delivery_status','worker_interrupted')
    WHERE n.channel='email' AND n.status='processing' AND n.email_delivery_enabled=true
      AND n.deleted_at IS NULL AND ($1::text[] IS NULL OR lower(n.email_to)=ANY($1::text[]))
      AND n.metadata->>'delivery_environment'=$2 AND n.created_at >= $3::timestamptz
      AND n.last_delivery_attempt_at<now()-interval '15 minutes'`, [policy.recipients, policy.environment, policy.notBefore]);
  return (await client.query<EmailRow>(`WITH candidates AS (
      SELECT n.id FROM public.notifications n WHERE n.channel='email' AND n.status='queued'
        AND n.email_delivery_enabled=true AND n.deleted_at IS NULL
        AND ($1::text[] IS NULL OR lower(n.email_to)=ANY($1::text[]))
        AND n.metadata->>'delivery_environment'=$3 AND n.created_at >= $4::timestamptz
        AND n.email_to ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
        AND n.delivery_attempt_count<5 AND COALESCE(n.next_delivery_attempt_at,n.created_at)<=now()
      ORDER BY n.created_at,n.id FOR UPDATE SKIP LOCKED LIMIT $2
    ) UPDATE public.notifications n SET status='processing',
      delivery_attempt_count=n.delivery_attempt_count+1,last_delivery_attempt_at=clock_timestamp()
      FROM candidates WHERE n.id=candidates.id
      RETURNING n.id,n.title,n.message,n.email_to,n.metadata,n.delivery_attempt_count,
        n.last_delivery_attempt_at::text AS last_delivery_attempt_at`,
  [policy.recipients, limit, policy.environment, policy.notBefore])).rows;
}

export async function dispatchNeonQueuedEmails(authorization: string | null, limit = 25, options: QueueOptions = {}) {
  const environment = options.environment ?? process.env;
  requireNeonCron(authorization, environment);
  const empty = { configured: false, claimed: 0, sent: 0, failed: 0, retrying: 0, superseded: 0 };
  const policy = neonEmailPolicy(environment);
  if (!policy.enabled) return { ...empty, reason: policy.environment === "neon-production"
    ? "production_delivery_disabled" : "staging_delivery_disabled" };
  const provider = options.provider ?? await resolveNeonEmailProvider(options.query, environment);
  if (!provider || provider.name === "unconfigured") return { ...empty, reason: "provider_unavailable" };
  const run = options.run ?? withTransaction;
  const emails = await run(client => claim(client, policy, Number.isFinite(limit) ? Math.max(1, Math.min(Math.floor(limit), 100)) : 25));
  const result = { ...empty, configured: true, claimed: emails.length };
  for (const email of emails) {
    let delivery: Awaited<ReturnType<TransactionalEmailProvider["send"]>>;
    try {
      delivery = await provider.send({ event: "platform_notification", to: email.email_to,
        subject: email.title, text: email.message, idempotencyKey: `notification-${email.id}` });
    } catch { delivery = { status: "failed", provider: provider.name }; }
    const sent = delivery.status === "sent";
    const terminal = !sent && email.delivery_attempt_count >= 5;
    const next = sent || terminal ? null : new Date(Date.now() +
      Math.min(60, 2 ** Math.max(0, email.delivery_attempt_count - 1)) * 60_000);
    const recorded = await run(client => client.query(`UPDATE public.notifications SET status=$2,
      sent_at=CASE WHEN $2='sent' THEN now() ELSE NULL END,next_delivery_attempt_at=$3,
      metadata=COALESCE(metadata,'{}'::jsonb)||$4::jsonb
      WHERE id=$1::uuid AND status='processing' AND delivery_attempt_count=$5
        AND last_delivery_attempt_at=$6::timestamptz AND deleted_at IS NULL RETURNING id`,
    [email.id, sent ? "sent" : terminal ? "failed" : "queued", next,
      JSON.stringify({ delivery_status: delivery.status, delivery_provider: provider.name,
        ...(delivery.providerMessageId ? { provider_message_id: delivery.providerMessageId } : {}) }),
      email.delivery_attempt_count, email.last_delivery_attempt_at]));
    if (!recorded.rowCount) result.superseded += 1;
    else if (sent) result.sent += 1;
    else if (terminal) result.failed += 1;
    else result.retrying += 1;
  }
  return result;
}
