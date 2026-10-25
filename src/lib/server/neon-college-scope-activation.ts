/** Atomic College scope activation. A checkout or browser return is never proof of payment. */
import type { PoolClient } from "pg";
import { NeonAuthorizationError } from "./neon-authorization";

type Client = Pick<PoolClient, "query">;
const deny = (code: string, message: string): never => {
  throw new NeonAuthorizationError(403, code, message);
};

export async function activateVerifiedCollegeScope(db: Client, requestId: string) {
  const request = (await db.query<{ id: string; user_id: string; entity_id: string | null; status: string;
    payment_status: string; payment_id: string | null; package_id: string | null }>(`
    SELECT id,user_id,entity_id,status,payment_status,payment_id,package_id
    FROM public.entity_scope_requests WHERE id=$1::uuid AND module_key='college'
      AND entity_type='college' FOR UPDATE`, [requestId])).rows[0];
  if (!request) deny("REQUEST_NOT_FOUND", "College scope request not found.");
  if (request.status !== "approved" || !request.entity_id) return { activated: false, reason: "awaiting_approval" };
  if (request.payment_status !== "success" || !request.payment_id || !request.package_id) {
    return { activated: false, reason: "awaiting_payment" };
  }

  const verified = (await db.query<{ payment_id: string; price: number; duration_days: number | null;
    billing_interval: string | null; features: Record<string, unknown>; subscription_id: string | null;paid_at:Date }>(`
    SELECT payment.id AS payment_id,plan.price::float AS price,plan.duration_days,
      plan.billing_interval,plan.features,payment.subscription_id,payment.paid_at
    FROM public.entity_scope_requests r
    JOIN public.payments payment ON payment.id=$2::uuid AND payment.user_id=r.user_id
      AND payment.reference_id=r.id AND payment.payment_type='module_access_request'
      AND payment.status='success' AND payment.paid_at IS NOT NULL
    JOIN public.packages plan ON plan.id=$3::uuid AND plan.package_kind='paid'
      AND plan.is_active AND plan.deleted_at IS NULL
      AND plan.module_scope @> ARRAY['college']::text[]
      AND (plan.features->>'exact_module_scope' IS DISTINCT FROM 'true' OR cardinality(plan.module_scope)=1)
    WHERE r.id=$1::uuid AND payment.amount=plan.price
      AND payment.currency=plan.currency
      AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id=r.user_id
        AND p.account_status='active' AND p.deleted_at IS NULL)
      AND EXISTS (SELECT 1 FROM public.entity_admin_assignments a
        JOIN public.user_module_capabilities umc ON umc.id=a.user_capability_id
        JOIN public.module_capabilities mc ON mc.id=umc.capability_id
        WHERE a.user_id=r.user_id AND a.entity_type='college' AND a.entity_id=r.entity_id
          AND a.status='active' AND umc.status='active' AND mc.module_key='college' AND mc.is_active
          AND (umc.expires_at IS NULL OR umc.expires_at>now()))
    `,
    [request.id, request.payment_id, request.package_id])).rows[0];
  if (!verified) deny("PAYMENT_NOT_VERIFIED", "A verified, matching College payment and assignment are required.");
  const previous = (await db.query<{ id: string }>(`
    SELECT id FROM public.module_entitlements WHERE payment_id=$1::uuid LIMIT 1`, [request.payment_id])).rows[0];
  if (previous) return { activated: true, duplicate: true, entitlementId: previous.id };
  const duration = verified.duration_days ?? (verified.billing_interval === "quarter" ? 90 : verified.billing_interval === "year" ? 365 : 30);
  if (!Number.isSafeInteger(duration) || duration < 1 || duration > 3650) {
    deny("INVALID_PLAN_DURATION", "The College plan duration is invalid.");
  }
  const existing = (await db.query<{ id: string; expiry_date: Date }>(`
    SELECT id,expiry_date FROM public.subscriptions WHERE user_id=$1::uuid
      AND entity_type='college' AND entity_id=$2::uuid AND status IN ('active','trialing')
      AND deleted_at IS NULL ORDER BY expiry_date DESC LIMIT 1 FOR UPDATE`, [request.user_id, request.entity_id])).rows[0];
  const paidAt = new Date(verified.paid_at);
  const start = existing && new Date(existing.expiry_date).getTime() > paidAt.getTime() ? new Date(existing.expiry_date) : paidAt;
  const expiry = new Date(start.getTime() + duration * 86_400_000);
  const subscription = existing
    ? (await db.query<{ id: string }>(`
      UPDATE public.subscriptions SET package_id=$2::uuid,expiry_date=$3,status='active',
        payment_status='success',metadata=COALESCE(metadata,'{}'::jsonb) ||
          jsonb_build_object('payment_id',$4::uuid,'scope_request_id',$5::uuid),updated_at=now()
      WHERE id=$1::uuid RETURNING id`, [existing.id, request.package_id, expiry, request.payment_id, request.id])).rows[0]
    : (await db.query<{ id: string }>(`
      INSERT INTO public.subscriptions(user_id,package_id,entity_type,entity_id,start_date,expiry_date,
        status,payment_status,metadata)
      VALUES ($1::uuid,$2::uuid,'college',$3::uuid,$7,$4,'active','success',
        jsonb_build_object('payment_id',$5::uuid,'scope_request_id',$6::uuid)) RETURNING id`,
      [request.user_id, request.package_id, request.entity_id, expiry, request.payment_id, request.id,paidAt])).rows[0];
  const entitlement = (await db.query<{ id: string }>(`
    INSERT INTO public.module_entitlements(user_id,module_key,entity_type,entity_id,package_id,source,status,
      start_at,expires_at,features,payment_id,reason)
    VALUES ($1::uuid,'college','college',$2::uuid,$3::uuid,'ESEWA_PURCHASE','active',$7,$4,
      $5::jsonb,$6::uuid,'Verified eSewa payment for approved College request') RETURNING id`,
    [request.user_id, request.entity_id, request.package_id, expiry,
      JSON.stringify(verified.features ?? {}), request.payment_id,paidAt])).rows[0];
  await db.query(`UPDATE public.payments SET subscription_id=$2::uuid,updated_at=now() WHERE id=$1::uuid`,
    [request.payment_id, subscription.id]);
  await db.query(`INSERT INTO public.audit_logs(actor_user_id,action,entity_type,entity_id,metadata)
    VALUES (NULL,'COLLEGE_SCOPE_PAYMENT_ACTIVATED','college',$1::text,
      jsonb_build_object('scope_request_id',$2::uuid,'payment_id',$3::uuid,'subscription_id',$4::uuid,'entitlement_id',$5::uuid))`,
    [request.entity_id, request.id, request.payment_id, subscription.id, entitlement.id]);
  return { activated: true, duplicate: false, subscriptionId: subscription.id,
    entitlementId: entitlement.id, expiresAt: expiry.toISOString() };
}
