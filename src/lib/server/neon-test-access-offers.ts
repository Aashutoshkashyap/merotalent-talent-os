import type { PoolClient } from "pg";
import { temporaryAccessOffers } from "../payments/access-plans";
import { withTransaction } from "./db";
import { NeonAuthorizationError, type NeonActor } from "./neon-authorization";
import { getBackendMode } from "./backend-mode";

/** Explicit Super Admin operation, additive and idempotent. Never changes existing offers. */
export async function configureTemporaryAccessOffers(actor: NeonActor,
  run: <T>(operation: (db: PoolClient) => Promise<T>) => Promise<T> = withTransaction) {
  if (!actor.platformAdmin) throw new NeonAuthorizationError(403, "ACCESS_DENIED", "Super Admin access required.");
  return run(async db => {
    const verified = await db.query(`SELECT p.user_id FROM public.profiles p
      JOIN public.neon_application_accounts a ON a.legacy_user_id=p.user_id AND a.status='active'
      JOIN public.neon_identity_links l ON l.application_account_id=a.id AND l.status='verified'
      WHERE p.user_id=$1::uuid AND l.neon_auth_user_id=$2::uuid AND p.account_status='active'
        AND p.deleted_at IS NULL AND EXISTS(SELECT 1 FROM public.user_roles r
          WHERE r.user_id=p.user_id AND r.role IN ('admin','super_admin')) FOR SHARE OF p,a,l`,
    [actor.userId, actor.neonAuthUserId]);
    if (!verified.rowCount) throw new NeonAuthorizationError(403, "ACCESS_DENIED", "Verified Super Admin access required.");
    await db.query(`SELECT pg_advisory_xact_lock(hashtextextended('merotalent:temporary-access-offers',0))`);
    let created = 0;
    for (const offer of temporaryAccessOffers()) {
      const result = await db.query(`INSERT INTO public.packages(code,name,description,audience,price,currency,
        billing_interval,package_kind,module_scope,duration_days,is_active,is_publicly_selectable,
        is_default_free,lead_access_mode,sort_order,features)
        SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9::text[],$10,true,true,false,$11,$12,$13::jsonb
        WHERE NOT EXISTS(SELECT 1 FROM public.packages WHERE code=$1) RETURNING id`,
      [offer.code,offer.name,offer.description,offer.audience,offer.price,offer.currency,offer.billing_interval,
        offer.package_kind,offer.module_scope,offer.duration_days,offer.lead_access_mode,offer.sort_order,JSON.stringify(offer.features)]);
      created += result.rowCount ?? 0;
    }
    if (created) await db.query(`INSERT INTO public.audit_logs(actor_user_id,action,entity_type,metadata)
      VALUES($1::uuid,'configure_temporary_access_offers','packages',
        jsonb_build_object('created',$2::int,'price_per_module',10,'validity_hours',24,'existing_plans_preserved',true))`, [actor.userId,created]);
    if (created) await db.query(`INSERT INTO public.notifications(recipient_id,title,message,type,category,channel,status,
      action_url,email_to,email_delivery_enabled,metadata)
      SELECT p.user_id,'Temporary access offers configured',
        'NPR 10 per administrative module and 24-hour validity are configured. Multiple modules use their full bundle total. Existing Dashain and free plans are unchanged. Payment confirmation, Super Admin approval and entity assignment remain separate. Manage offers at https://www.merotalent.com/admin/packages.',
        'info','admin','email','queued','/admin/packages',p.email,true,
        jsonb_build_object('configuration_event','temporary_access_offers','delivery_environment',$2::text)
      FROM public.profiles p WHERE p.user_id=$1::uuid AND p.deleted_at IS NULL AND p.account_status='active'
        AND p.email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
        AND NOT EXISTS(SELECT 1 FROM public.notifications n WHERE n.recipient_id=p.user_id AND n.channel='email'
          AND n.metadata->>'configuration_event'='temporary_access_offers')`, [actor.userId,getBackendMode()]);
    return { created, preservedExisting: true };
  });
}
