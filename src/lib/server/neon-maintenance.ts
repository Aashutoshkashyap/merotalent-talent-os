/** Scheduled business transitions on the guarded, isolated Neon database. */
import type { PoolClient } from "pg";
import { getBackendMode, requireNeonBackend } from "./backend-mode";
import { isValidCronAuthorization } from "./cron-auth";
import { withTransaction } from "./db";

export type NeonMaintenanceTransaction = <T>(operation: (client: PoolClient) => Promise<T>) => Promise<T>;
export class NeonCronAuthorizationError extends Error {
  constructor() { super("Valid cron authorization is required."); this.name = "NeonCronAuthorizationError"; }
}

export function requireNeonCron(authorization: string | null,
  environment: Record<string, string | undefined> = process.env) {
  requireNeonBackend(environment);
  if (!isValidCronAuthorization(authorization, environment.CRON_SECRET)) throw new NeonCronAuthorizationError();
}

/** No user-context or copied SECURITY DEFINER functions are impersonated here. */
export async function runNeonMaintenance(authorization: string | null,
  run: NeonMaintenanceTransaction = withTransaction,
  environment: Record<string, string | undefined> = process.env) {
  requireNeonCron(authorization, environment);
  return run(async client => {
    const [lock] = (await client.query<{ acquired: boolean }>(
      `SELECT pg_try_advisory_xact_lock(hashtextextended('merotalent:neon:maintenance',0)) AS acquired`)).rows;
    if (!lock?.acquired) return { skipped: true, reason: "maintenance_in_progress" };

    const expiredSubscriptions = await client.query(`UPDATE public.subscriptions
      SET status='expired',updated_at=now() WHERE status IN ('trialing','active','past_due')
      AND expiry_date<=now() AND deleted_at IS NULL RETURNING id`);
    const expiredEntitlements = await client.query(`UPDATE public.module_entitlements
      SET status='expired',updated_at=now() WHERE status='active'
      AND expires_at IS NOT NULL AND expires_at<=now() RETURNING id`);

    // The expiry timestamp distinguishes successive renewals of the same row.
    // Both channels are durable; sending still requires the staging delivery gate.
    const notifications = await client.query(`INSERT INTO public.notifications
      (recipient_id,title,message,type,category,channel,status,entity_type,entity_id,action_url,email_to,metadata)
      SELECT s.user_id,'Subscription expired',
        'Your MeroTalent subscription has expired. Renew it to restore premium access.',
        'warning','subscription',delivery.channel,'queued','subscription',s.id,'/dashboard/payments',
        CASE WHEN delivery.channel='email' THEN p.email ELSE NULL END,
        jsonb_build_object('maintenance_event','expired','subscription_expiry',s.expiry_date::text,
          'delivery_environment',$1::text)
      FROM public.subscriptions s JOIN public.profiles p ON p.user_id=s.user_id
      CROSS JOIN (VALUES ('dashboard'),('email')) delivery(channel)
      WHERE s.status='expired' AND s.expiry_date<=now() AND s.deleted_at IS NULL
        AND p.deleted_at IS NULL AND p.account_status='active'
        AND (delivery.channel='dashboard' OR p.email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$')
        AND NOT EXISTS (SELECT 1 FROM public.notifications n
          WHERE n.recipient_id=s.user_id AND n.entity_type='subscription' AND n.entity_id=s.id
            AND n.category='subscription' AND n.channel=delivery.channel
            AND n.metadata->>'maintenance_event'='expired'
            AND (n.metadata->>'subscription_expiry'=s.expiry_date::text OR
              (n.metadata->>'subscription_expiry' IS NULL AND n.created_at>=s.expiry_date)))
      RETURNING id`, [getBackendMode(environment)]);
    const expiredJobs = await client.query(`UPDATE public.jobs SET status='expired',is_active=false,updated_at=now()
      WHERE status='published' AND approval_status='approved' AND is_active=true AND deleted_at IS NULL
        AND COALESCE(expires_at,application_deadline)<=now() RETURNING id`);
    const completedEvents = await client.query(`UPDATE public.events SET status='completed',is_active=false,updated_at=now()
      WHERE status IN ('approved','published') AND approval_status='approved' AND is_active=true
        AND deleted_at IS NULL AND end_date<=now() RETURNING id`);
    const expiredAds = await client.query(`UPDATE public.advertisements SET status='expired',is_active=false,updated_at=now()
      WHERE status IN ('scheduled','active') AND deleted_at IS NULL AND end_date<=now() RETURNING id`);
    const expiredCheckouts = await client.query(`UPDATE public.payment_checkout_sessions
      SET status='expired',completed_at=COALESCE(completed_at,now()),updated_at=now()
      WHERE provider_name='esewa' AND status IN ('initiated','pending') AND expires_at IS NOT NULL
        AND expires_at<=now() RETURNING id`);
    const guestChallenges = await client.query(`DELETE FROM public.guest_college_verifications
      WHERE expires_at<now()-interval '7 days' RETURNING id`);
    const guestSends = await client.query(`DELETE FROM public.guest_college_verification_sends
      WHERE created_at<now()-interval '2 days' RETURNING id`);

    // An intent is also the persisted proof of file ownership used by download,
    // replacement, request-proof and delete operations. Its age is not evidence
    // that the file is unused. Retain it until the explicit owned deletion path
    // checks references and removes the object; maintenance never deletes files.
    return {
      expired_subscriptions: expiredSubscriptions.rowCount ?? 0,
      expired_entitlements: expiredEntitlements.rowCount ?? 0,
      expired_jobs: expiredJobs.rowCount ?? 0,
      completed_events: completedEvents.rowCount ?? 0,
      expired_advertisements: expiredAds.rowCount ?? 0,
      expired_checkouts: expiredCheckouts.rowCount ?? 0,
      notifications_enqueued: notifications.rowCount ?? 0,
      upload_intents_removed: 0,
      guestVerification: { guest_challenges_removed: guestChallenges.rowCount ?? 0,
        guest_rate_records_removed: guestSends.rowCount ?? 0 },
      ran_at: new Date().toISOString(),
    };
  });
}
