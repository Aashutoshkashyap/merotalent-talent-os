import {
  getConfiguredTransactionalEmailProvider,
  getTransactionalEmailProvider,
  type TransactionalEmailProvider,
} from "./email-provider";
import { loadProviderSecret } from "./provider-config-service";
import { getAdminClient } from "./supabase";

type ClaimedEmail = {
  id: string;
  title: string;
  message: string;
  email_to: string;
  category: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  delivery_attempt_count: number;
};

const retryDelayMinutes = (attempt: number) => Math.min(60, 2 ** Math.max(0, attempt - 1));

async function resolveProvider(): Promise<TransactionalEmailProvider> {
  const configured = await loadProviderSecret("email");
  return configured
    ? getConfiguredTransactionalEmailProvider(configured)
    : getTransactionalEmailProvider();
}

/**
 * Claims and delivers application-generated email notifications. The database
 * claim prevents concurrent cron invocations from sending the same row, while
 * the provider idempotency key protects the accepted-but-not-recorded edge.
 */
export async function dispatchQueuedEmails(limit = 25) {
  const provider = await resolveProvider();
  if (provider.name === "unconfigured") {
    return { configured: false, claimed: 0, sent: 0, failed: 0, retrying: 0 };
  }

  const db = getAdminClient() as any;
  const { data, error } = await db.rpc("claim_email_notifications", {
    p_limit: Math.max(1, Math.min(limit, 100)),
  });
  if (error) throw error;

  const claimed = (Array.isArray(data) ? data : []) as ClaimedEmail[];
  let sent = 0;
  let failed = 0;
  let retrying = 0;

  for (const notification of claimed) {
    let delivery: Awaited<ReturnType<TransactionalEmailProvider["send"]>>;
    try {
      delivery = await provider.send({
        event: "platform_notification",
        to: notification.email_to,
        subject: notification.title,
        text: notification.message,
        idempotencyKey: `notification-${notification.id}`,
      });
    } catch {
      delivery = {
        status: "failed",
        provider: provider.name,
        message: "Email provider request failed.",
      };
    }

    const delivered = delivery.status === "sent";
    const terminal = !delivered && notification.delivery_attempt_count >= 5;
    const nextAttempt = delivered || terminal
      ? null
      : new Date(Date.now() + retryDelayMinutes(notification.delivery_attempt_count) * 60_000).toISOString();
    const status = delivered ? "sent" : terminal ? "failed" : "queued";
    const metadata = {
      ...(notification.metadata ?? {}),
      delivery_status: delivery.status,
      delivery_provider: delivery.provider,
      ...(delivery.providerMessageId ? { provider_message_id: delivery.providerMessageId } : {}),
      ...(delivery.message ? { delivery_message: delivery.message.slice(0, 500) } : {}),
    };

    const { error: updateError } = await db.from("notifications").update({
      status,
      sent_at: delivered ? new Date().toISOString() : null,
      next_delivery_attempt_at: nextAttempt,
      metadata,
    }).eq("id", notification.id).eq("status", "processing");
    if (updateError) throw updateError;

    if (delivered) sent += 1;
    else if (terminal) failed += 1;
    else retrying += 1;
  }

  return { configured: true, claimed: claimed.length, sent, failed, retrying };
}
