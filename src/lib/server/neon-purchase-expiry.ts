import type { PoolClient } from "pg";

/** Never verify or refund here. Late provider success remains disputed/manual reconciliation. */
export async function expireNeonPurchaseHolds(db: Pick<PoolClient,"query">, eventId: string | null = null) {
  const checkouts = await db.query(`UPDATE public.payment_checkout_sessions checkout
    SET status='expired',completed_at=COALESCE(completed_at,now()),updated_at=now()
    WHERE checkout.provider_name='esewa' AND checkout.status IN ('initiated','pending')
      AND checkout.expires_at<=now()
      AND ($1::uuid IS NULL OR (checkout.entity_type='event_registration' AND EXISTS(
        SELECT 1 FROM public.event_registrations r WHERE r.id=checkout.entity_id AND r.event_id=$1::uuid))) RETURNING id`, [eventId]);
  const registrations = await db.query(`UPDATE public.event_registrations r
    SET status='cancelled',payment_status='failed',updated_at=now()
    WHERE r.status='pending' AND r.payment_status='pending' AND r.deleted_at IS NULL
      AND ($1::uuid IS NULL OR r.event_id=$1::uuid)
      AND NOT EXISTS(SELECT 1 FROM public.payment_checkout_sessions c WHERE c.entity_type='event_registration'
        AND c.entity_id=r.id AND (c.status='successful' OR (c.status IN ('initiated','pending') AND c.expires_at>now())))
      AND (EXISTS(SELECT 1 FROM public.payment_checkout_sessions c WHERE c.entity_type='event_registration'
        AND c.entity_id=r.id AND c.status IN ('expired','cancelled','failed')) OR r.registered_at<now()-interval '15 minutes')
    RETURNING id`, [eventId]);
  let bookings = 0;
  if (!eventId) {
    const result = await db.query(`UPDATE public.mentor_bookings b SET status='cancelled',payment_status='failed',updated_at=now()
      WHERE b.status='pending' AND b.payment_status='pending' AND b.deleted_at IS NULL
        AND NOT EXISTS(SELECT 1 FROM public.payment_checkout_sessions c WHERE c.entity_type='mentor_booking'
          AND c.entity_id=b.id AND (c.status='successful' OR (c.status IN ('initiated','pending') AND c.expires_at>now())))
        AND (EXISTS(SELECT 1 FROM public.payment_checkout_sessions c WHERE c.entity_type='mentor_booking'
          AND c.entity_id=b.id AND c.status IN ('expired','cancelled','failed')) OR b.created_at<now()-interval '15 minutes') RETURNING id`);
    bookings = result.rowCount ?? 0;
  }
  await db.query(`UPDATE public.payments payment SET status='cancelled',updated_at=now(),
      metadata=COALESCE(metadata,'{}'::jsonb)||jsonb_build_object('expiry_reason','checkout_expired')
    WHERE payment.status='pending' AND payment.deleted_at IS NULL AND EXISTS(
      SELECT 1 FROM public.payment_checkout_sessions c WHERE c.provider_reference=payment.id::text
        AND c.status='expired' AND ($1::uuid IS NULL OR EXISTS(SELECT 1 FROM public.event_registrations r
          WHERE r.id=c.entity_id AND c.entity_type='event_registration' AND r.event_id=$1::uuid)))`, [eventId]);
  return { checkouts: checkouts.rowCount ?? 0, registrations: registrations.rowCount ?? 0, bookings };
}
