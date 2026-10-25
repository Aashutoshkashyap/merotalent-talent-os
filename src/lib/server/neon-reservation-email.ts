import type {PoolClient} from "pg";
import {getBackendMode} from "./backend-mode";

/** Called under the booking/registration transaction, never proof of actual delivery. */
export async function queueNeonReservationEmail(db:Pick<PoolClient,"query">,kind:"mentor"|"event",id:string,
  state:"pending"|"confirmed"|"cancelled"|"rescheduled"|"completed",includePayer=true) {
  const context=kind==="mentor" ? `SELECT b.id,b.student_id AS payer,m.user_id AS owner,s.title AS title,b.amount,b.currency,
      b.scheduled_start::text AS scheduled,b.status AS actual_status,1 AS quantity
    FROM public.mentor_bookings b JOIN public.mentors m ON m.id=b.mentor_id
    JOIN public.mentor_services s ON s.id=b.mentor_service_id WHERE b.id=$1::uuid`
    : `SELECT r.id,r.user_id AS payer,e.organizer_user_id AS owner,
        concat(e.title,' / ',COALESCE(t.name,'General')) AS title,r.total_amount AS amount,COALESCE(t.currency,e.currency) AS currency,
        e.start_date::text AS scheduled,r.status AS actual_status,COALESCE(r.attendee_count,r.ticket_quantity) AS quantity
      FROM public.event_registrations r JOIN public.events e ON e.id=r.event_id
      LEFT JOIN public.event_ticket_types t ON t.id=r.ticket_type_id WHERE r.id=$1::uuid`;
  await db.query(`WITH context AS (${context}), recipients AS (
    SELECT owner AS user_id FROM context UNION SELECT payer FROM context WHERE $4::boolean
  ) INSERT INTO public.notifications(recipient_id,title,message,type,category,channel,status,entity_type,entity_id,
    action_url,email_to,email_delivery_enabled,metadata)
    SELECT p.user_id,'MeroTalent ${kind} booking: '||$2::text,
      concat('Reference: ',c.id,'; ',c.title,'; requested update: ',$2::text,'; current booking status: ',c.actual_status,
        '; amount: ',c.currency,' ',c.amount,'; attendees: ',c.quantity,'; scheduled: ',c.scheduled,
        '. Pending reservations are not paid or confirmed. View booking, ticket or payment status at https://www.merotalent.com/dashboard/payments.'),
      'info','${kind}_booking','email','queued','${kind}_booking',c.id,'/dashboard/payments',p.email,true,
      jsonb_build_object('reservation_event',$2::text,'schedule',c.scheduled,'delivery_environment',$3::text)
    FROM context c CROSS JOIN recipients recipient JOIN public.profiles p ON p.user_id=recipient.user_id
    WHERE p.account_status='active' AND p.deleted_at IS NULL AND p.email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
      AND NOT EXISTS(SELECT 1 FROM public.notifications n WHERE n.recipient_id=p.user_id AND n.entity_id=c.id
        AND n.entity_type='${kind}_booking' AND n.channel='email' AND n.metadata->>'reservation_event'=$2
        AND ($2<>'rescheduled' OR n.metadata->>'schedule'=c.scheduled))`,[id,state,getBackendMode(),includePayer]);
}
