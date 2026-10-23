import type { PoolClient } from 'pg';
import { getBackendMode } from './backend-mode';
import { appendNotificationEvent } from './neon-application-events';

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
    SELECT p.user_id,'MeroTalent payment update',
      CASE p.status WHEN 'success' THEN 'Your payment was verified. View your receipt and booking or registration in MeroTalent.'
        WHEN 'failed' THEN 'Your payment did not complete. View its status in MeroTalent.' ELSE 'Your payment was refunded.' END,
      'info','payment','email','queued','payment',p.id,'/dashboard/payments',profile.email,true,
      jsonb_build_object('payment_status',p.status,'delivery_environment',$2::text)
    FROM public.payments p JOIN public.profiles profile ON profile.user_id=p.user_id
    WHERE p.id=$1::uuid AND p.status IN ('success','failed','refunded')
      AND profile.deleted_at IS NULL AND profile.account_status='active'
      AND profile.email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
      AND NOT EXISTS(SELECT 1 FROM public.notifications n WHERE n.entity_type='payment' AND n.entity_id=p.id
        AND n.channel='email' AND n.category='payment' AND n.metadata->>'payment_status'=p.status)`, [paymentId,getBackendMode()]);
  await db.query(`INSERT INTO public.audit_logs(action,entity_type,entity_id,metadata)
    SELECT 'esewa_payment_verified','payments',p.id::text,
      jsonb_build_object('status',p.status,'payment_type',p.payment_type,'verification','authoritative_provider_lookup')
    FROM public.payments p WHERE p.id=$1::uuid AND p.status IN ('success','failed','refunded')`, [paymentId]);
}
