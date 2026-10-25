import type { PoolClient } from "pg";
import { getBackendMode } from "./backend-mode";
import { appendNotificationEvent } from "./neon-application-events";

/** Request, payment and approval remain separate. Both channels use one durable event key. */
export async function notifyNeonAccessRequest(db: Pick<PoolClient, "query">, requestId: string,
  event: "submitted" | "approved" | "rejected" | "payment_success" | "payment_failed" | "payment_cancelled",
  paymentId: string | null = null) {
  const key = `${event}:${paymentId ?? requestId}`;
  await db.query(`SELECT pg_advisory_xact_lock(hashtextextended($1::text,0))`, [`access-notice:${requestId}:${key}`]);
  const notices = await db.query<{ id: string; recipient_id: string; channel: string }>(`WITH request_context AS (
    SELECT r.*,profile.full_name,profile.email,plan.name AS plan_name,plan.price,plan.currency,
      payment.status AS verified_payment_status,payment.id AS payment_reference,payment.gateway_transaction_id,
      COALESCE(i.name,r.organization) AS entity_name
    FROM public.sub_admin_requests r JOIN public.profiles profile ON profile.user_id=r.user_id
    LEFT JOIN public.packages plan ON plan.id=r.package_id
    LEFT JOIN public.payments payment ON payment.id=COALESCE($4::uuid,r.payment_id)
    LEFT JOIN public.institutes i ON i.id=CASE WHEN r.requested_entity_scopes->0->>'entity_type'='college'
      THEN NULLIF(r.requested_entity_scopes->0->>'entity_id','')::uuid ELSE NULL END
    WHERE r.id=$1::uuid
  ), recipient_candidates AS (
    SELECT c.user_id AS id,false AS admin FROM request_context c
    UNION SELECT roles.user_id,true FROM public.user_roles roles JOIN public.profiles p ON p.user_id=roles.user_id
      WHERE roles.role IN ('admin','super_admin') AND p.account_status='active' AND p.deleted_at IS NULL
  ), recipients AS (SELECT id,bool_or(admin) AS admin FROM recipient_candidates GROUP BY id)
    INSERT INTO public.notifications(recipient_id,title,message,type,category,channel,status,entity_type,entity_id,
    action_url,email_to,email_delivery_enabled,metadata)
    SELECT DISTINCT recipient.id,'Module access: '||replace($2::text,'_',' '),
      concat('Request ',c.id,' — ',c.full_name,'; modules: ',array_to_string(c.requested_modules,', '),
        '; entity: ',COALESCE(c.entity_name,'awaiting assignment'),'; reason: ',left(c.reason,240),
        '; amount due: ',c.currency,' ',c.price,'; payment: ',c.payment_status,
        '; approval: ',c.status,'; reference: ',COALESCE(c.gateway_transaction_id,c.payment_reference::text,'not yet assigned'),
        '. Payment alone does not grant administrative access. View ',
        CASE WHEN recipient.admin THEN 'https://www.merotalent.com/admin/access-requests' ELSE 'https://www.merotalent.com/request-access' END),
      'info','sub_admin_request',delivery.channel,'queued','sub_admin_request',c.id,
      CASE WHEN recipient.admin THEN '/admin/access-requests' ELSE '/request-access' END,
      CASE WHEN delivery.channel='email' THEN p.email END,delivery.channel='email',
      jsonb_build_object('access_event',$3::text,'delivery_environment',$5::text)
    FROM request_context c CROSS JOIN recipients recipient JOIN public.profiles p ON p.user_id=recipient.id
    CROSS JOIN (VALUES ('dashboard'),('email')) delivery(channel)
    WHERE p.account_status='active' AND p.deleted_at IS NULL
      AND (delivery.channel='dashboard' OR p.email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$')
      AND NOT EXISTS(SELECT 1 FROM public.notifications n WHERE n.recipient_id=recipient.id
        AND n.entity_id=c.id AND n.entity_type='sub_admin_request' AND n.channel=delivery.channel
        AND n.metadata->>'access_event'=$3)
    RETURNING id,recipient_id,channel`, [requestId,event,key,paymentId,getBackendMode()]);
  for (const notice of notices.rows) if (notice.channel === "dashboard") await appendNotificationEvent(db,notice.recipient_id,notice.id);
}
