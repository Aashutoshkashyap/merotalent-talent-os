import type { PoolClient } from 'pg';
import { getBackendMode } from './backend-mode';
import { appendNotificationEvent } from './neon-application-events';
import { notifyNeonAccessRequest } from './neon-access-notifications';

/** Same transaction, after the guarded payment transition. The existing
 * payment trigger owns dashboard receipts; reuse them instead of duplicating.
 * Queued email is NOT sent here: the independent delivery policy still applies.
 */
export async function recordNeonPaymentReceipt(db: Pick<PoolClient, 'query'>, paymentId: string) {
  const notices = (await db.query<{ id: string; recipient_id: string }>(`SELECT n.id,n.recipient_id
    FROM public.notifications n JOIN public.payments p ON p.id=n.entity_id AND p.user_id=n.recipient_id
    WHERE p.id=$1::uuid AND p.status IN ('success','failed','refunded') AND n.entity_type='payment'
      AND n.category='payment' AND n.channel='dashboard' AND n.metadata->>'payment_status'=p.status`, [paymentId])).rows;
  for (const notice of notices) await appendNotificationEvent(db, notice.recipient_id, notice.id);
  await db.query(`INSERT INTO public.notifications
    (recipient_id,title,message,type,category,channel,status,entity_type,entity_id,action_url,email_to,email_delivery_enabled,metadata)
    SELECT p.user_id,'MeroTalent payment: '||p.status,
      concat('Payment ',p.id,'; status: ',p.status,'; amount: ',p.currency,' ',p.amount,
        '; provider: eSewa; transaction: ',COALESCE(p.gateway_transaction_id,'not assigned'),
        '; purpose: ',replace(p.payment_type,'_',' '),
        CASE WHEN e.id IS NOT NULL THEN concat('; event: ',e.title,'; category: ',COALESCE(tier.name,'General'),
          '; quantity: ',registration.ticket_quantity,'; attendees: ',COALESCE(registration.attendee_count,registration.ticket_quantity),
          '; booking: ',registration.id,'; event time: ',e.start_date,'; ticket status: ',registration.status) ELSE '' END,
        CASE WHEN booking.id IS NOT NULL THEN concat('; mentor service: ',service.title,'; booking: ',booking.id,
          '; scheduled: ',booking.scheduled_start,'; booking status: ',booking.status) ELSE '' END,
        CASE WHEN p.payment_type IN ('module_subscription','module_access_request') THEN concat(
          '; administrative approval and entity assignment remain separate; access expiry: ',
          COALESCE((SELECT max(expires_at)::text FROM public.module_entitlements entitlement WHERE entitlement.payment_id=p.id),'awaiting approval or assignment')) ELSE '' END,
        '. View status, tickets or renewal at https://www.merotalent.com/dashboard/payments. No access is granted for an unverified payment.'),
      'info','payment','email','queued','payment',p.id,'/dashboard/payments',profile.email,true,
      jsonb_build_object('payment_status',p.status,'delivery_environment',$2::text)
    FROM public.payments p JOIN public.profiles profile ON profile.user_id=p.user_id
    LEFT JOIN public.event_registrations registration ON registration.id=p.reference_id AND p.payment_type='event_ticket'
    LEFT JOIN public.events e ON e.id=registration.event_id
    LEFT JOIN public.event_ticket_types tier ON tier.id=registration.ticket_type_id
    LEFT JOIN public.mentor_bookings booking ON booking.id=p.reference_id AND p.payment_type='mentor_booking'
    LEFT JOIN public.mentor_services service ON service.id=booking.mentor_service_id
    WHERE p.id=$1::uuid AND p.status IN ('success','failed','refunded')
      AND profile.deleted_at IS NULL AND profile.account_status='active'
      AND profile.email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
      AND NOT EXISTS(SELECT 1 FROM public.notifications n WHERE n.entity_type='payment' AND n.entity_id=p.id
        AND n.channel='email' AND n.category='payment' AND n.metadata->>'payment_status'=p.status)`, [paymentId,getBackendMode()]);
  await db.query(`INSERT INTO public.audit_logs(action,entity_type,entity_id,metadata)
    SELECT 'esewa_payment_verified','payments',p.id::text,
      jsonb_build_object('status',p.status,'payment_type',p.payment_type,'verification','authoritative_provider_lookup')
    FROM public.payments p WHERE p.id=$1::uuid AND p.status IN ('success','failed','refunded')`, [paymentId]);
  const requests = await db.query<{ reference_id: string; status: string }>(`SELECT p.reference_id,p.status
    FROM public.payments p JOIN public.sub_admin_requests r ON r.id=p.reference_id AND r.user_id=p.user_id
    WHERE p.id=$1::uuid AND p.payment_type='module_access_request' AND p.status IN ('success','failed','cancelled')`, [paymentId]);
  for (const payment of requests.rows) await notifyNeonAccessRequest(db,payment.reference_id,
    payment.status === 'success' ? 'payment_success' : payment.status === 'cancelled' ? 'payment_cancelled' : 'payment_failed',paymentId);
}
