/** Super Admin billing supervision. Provider settlement remains provider-authoritative. */
import { randomUUID } from "node:crypto";
import type { PoolClient, QueryResultRow } from "pg";
import { withTransaction } from "./db";
import { NeonAuthorizationError, requireSuperAdmin, type NeonActor } from "./neon-authorization";
import { reviewNeonManualPayment } from "./neon-admin-access";

type Run = <T>(operation: (client: PoolClient) => Promise<T>) => Promise<T>;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fail = (status: 400 | 403 | 404 | 409, code: string, message: string): never => {
  throw new NeonAuthorizationError(status, code, message);
};
async function requireLiveAdmin(client: PoolClient, actor: NeonActor) {
  requireSuperAdmin(actor);
  const row = (await client.query(`SELECT p.user_id FROM public.profiles p
    JOIN public.neon_application_accounts a ON a.legacy_user_id=p.user_id AND a.status='active'
    JOIN public.neon_identity_links l ON l.application_account_id=a.id AND l.status='verified'
    JOIN public.user_roles r ON r.user_id=p.user_id AND r.role IN ('admin','super_admin')
    WHERE p.user_id=$1::uuid AND l.neon_auth_user_id=$2::uuid
      AND p.account_status='active' AND p.deleted_at IS NULL FOR SHARE OF p,a,l,r`,
  [actor.userId,actor.neonAuthUserId])).rows[0];
  if (!row) fail(403,"ADMIN_REQUIRED","Active linked Super Admin access is required.");
}
function page(params: URLSearchParams) {
  const offset = Number(params.get("offset") ?? "0");
  const search = params.get("search")?.trim() ?? "";
  if (!Number.isSafeInteger(offset) || offset<0 || offset>100000 || search.length>180)
    fail(400,"INVALID_BILLING_QUERY","Invalid billing search or page.");
  return {offset,search};
}
const amountFields = `p.id,p.user_id,p.payment_type,p.reference_id,p.parent_payment_id,p.subscription_id,
  p.amount::float AS amount,p.currency,p.status,p.payment_method,p.gateway,p.transaction_id,p.gateway_transaction_id,
  p.payout_status,p.payout_amount::float AS payout_amount,p.commission_amount::float AS commission_amount,
  p.payout_reference,p.payout_at,p.reconciliation_status,p.verified_by_user_id,p.verification_note,
  p.paid_at,p.failed_at,p.created_at,p.updated_at,
  jsonb_build_object('module',p.metadata->'module','entity_type',p.metadata->'entity_type',
    'entity_id',p.metadata->'entity_id','source',p.metadata->'source','start_at',p.metadata->'start_at',
    'expires_at',p.metadata->'expires_at','provider_status',p.metadata->'provider_status') AS metadata,
  jsonb_build_object('full_name',u.full_name,'email',u.email) AS profiles`;

export async function listNeonAdminPayments(actor: NeonActor, params=new URLSearchParams(), run: Run=withTransaction) {
  requireSuperAdmin(actor); const {offset,search}=page(params);
  const status=params.get("status")??"all", type=params.get("type")??"all";
  if (!/^(all|pending|success|failed|refunded|cancelled|expired)$/.test(status) ||
      !/^(all|subscription|module_subscription|module_access_request|mentor_booking|event_ticket|course|mentor_payout_settlement)$/.test(type))
    fail(400,"INVALID_BILLING_FILTER","Choose a valid payment filter.");
  return run(async client=>{
    await requireLiveAdmin(client,actor);
    const clauses=`p.deleted_at IS NULL AND ($1='all' OR p.status=$1) AND ($2='all' OR p.payment_type=$2)
      AND ($3='' OR concat_ws(' ',u.full_name,u.email,p.id::text,p.transaction_id,p.gateway_transaction_id,
        p.payout_reference,p.payment_type) ILIKE '%' || $3 || '%')`;
    const values=[status,type,search];
    const total=(await client.query<{count:number}>(`SELECT count(*)::int AS count FROM public.payments p
      LEFT JOIN public.profiles u ON u.user_id=p.user_id WHERE ${clauses}`,values)).rows[0]?.count??0;
    const payments=(await client.query(`SELECT ${amountFields} FROM public.payments p
      LEFT JOIN public.profiles u ON u.user_id=p.user_id WHERE ${clauses}
      ORDER BY p.created_at DESC,p.id DESC LIMIT 100 OFFSET $4`,[...values,offset])).rows;
    const ids=payments.map(row=>row.id);
    const proofs=ids.length?(await client.query(`SELECT pp.id,pp.payment_id,pp.uploaded_by_user_id,pp.file_name,
      pp.mime_type,pp.file_size,pp.proof_type,pp.user_note,pp.status,pp.reviewed_by_user_id,pp.reviewed_at,
      pp.review_note,pp.created_at FROM public.payment_proofs pp WHERE pp.payment_id=ANY($1::uuid[])
      ORDER BY pp.created_at DESC,pp.id DESC`,[ids])).rows:[];
    const summary=(await client.query(`SELECT
      COALESCE(sum(amount) FILTER (WHERE status='success' AND payment_type<>'mentor_payout_settlement'),0)::float AS collected,
      count(*) FILTER (WHERE payout_status='pending')::int AS pending_payouts,
      (SELECT count(*)::int FROM public.payment_proofs pp JOIN public.payments pay ON pay.id=pp.payment_id
        WHERE pp.status='pending' AND pay.deleted_at IS NULL) AS pending_proofs
      FROM public.payments WHERE deleted_at IS NULL`)).rows[0];
    return{payments,proofs,summary,total,hasMore:offset+payments.length<total};
  });
}

interface Payment extends QueryResultRow {
  id:string;user_id:string;payment_type:string;reference_id:string|null;amount:string;currency:string;
  gateway:string|null;payment_method:string|null;status:string;reconciliation_status:string|null;
  verification_note:string|null;payout_status:string|null;payout_reference:string|null;payout_amount:string|null;
  commission_amount:string|null;
}
const money=(value:number)=>{
  if(!Number.isFinite(value)||value<0||value>100000000||Math.abs(value*100-Math.round(value*100))>0.00001)
    fail(400,"INVALID_AMOUNT","Enter a valid amount with at most two decimal places.");
  return Math.round(value*100);
};
const reviewNote=(note:string)=>{
  if(typeof note!=="string"||note.trim().length<8||note.trim().length>2000)
    fail(400,"REVIEW_NOTE_REQUIRED","Enter a review note of 8–2000 characters.");
  return note.trim();
};
async function lockedPayment(client: PoolClient,id:string) {
  if(!uuid.test(id))fail(400,"INVALID_PAYMENT_ID","Select a valid transaction.");
  const row=(await client.query<Payment>(`SELECT id,user_id,payment_type,reference_id,amount,currency,gateway,
    payment_method,status,reconciliation_status,verification_note,payout_status,payout_reference,payout_amount,
    commission_amount FROM public.payments WHERE id=$1::uuid AND deleted_at IS NULL FOR UPDATE`,[id])).rows[0];
  if(!row)fail(404,"PAYMENT_NOT_FOUND","Transaction unavailable.");
  return row;
}
const isManual=(row:Payment)=>row.gateway==="manual"&&[null,"manual","bank_transfer"].includes(row.payment_method);
async function audit(client: PoolClient,actor:NeonActor,action:string,id:string,metadata:Record<string,unknown>,entityType="payments") {
  await client.query(`INSERT INTO public.audit_logs(actor_user_id,action,entity_type,entity_id,metadata)
    VALUES($1::uuid,$2,$3,$4::text,$5::jsonb)`,[actor.userId,action,entityType,id,JSON.stringify(metadata)]);
}
export async function reviewNeonAdminPaymentProof(actor:NeonActor,input:{id:string;paymentId:string;status:"accepted"|"rejected";note:string},run:Run=withTransaction) {
  requireSuperAdmin(actor); const note=reviewNote(input.note);
  if(!uuid.test(input.id)||!uuid.test(input.paymentId)||!["accepted","rejected"].includes(input.status))
    fail(400,"INVALID_PROOF_REVIEW","Choose a valid proof, transaction and decision.");
  return run(async client=>{
    await requireLiveAdmin(client,actor);const payment=await lockedPayment(client,input.paymentId);
    const proof=(await client.query<{status:string;uploaded_by_user_id:string;review_note:string}>(`SELECT status,
      uploaded_by_user_id,review_note FROM public.payment_proofs WHERE id=$1::uuid AND payment_id=$2::uuid FOR UPDATE`,
    [input.id,input.paymentId])).rows[0];
    if(!proof)fail(404,"PROOF_NOT_FOUND","This proof does not belong to the selected payment.");
    if(proof.uploaded_by_user_id!==payment.user_id)fail(409,"PROOF_OWNER_MISMATCH","The uploaded proof belongs to another payer.");
    if(proof.status===input.status&&proof.review_note===note)return{id:input.id,status:input.status,paymentActivated:false,duplicate:true};
    if(proof.status!=="pending")fail(409,"PROOF_ALREADY_REVIEWED","This proof already has a final review decision.");
    await client.query(`UPDATE public.payment_proofs SET status=$2,reviewed_by_user_id=$3::uuid,
      reviewed_at=now(),review_note=$4,updated_at=now() WHERE id=$1::uuid`,[input.id,input.status,actor.userId,note]);
    if(["pending","failed"].includes(payment.status))await client.query(`UPDATE public.payments SET
      reconciliation_status=$2,updated_at=now() WHERE id=$1::uuid`,[payment.id,input.status==="accepted"?"manual_review_required":"unresolved"]);
    await audit(client,actor,"ADMIN_REVIEW_PAYMENT_PROOF",payment.id,{proof_id:input.id,decision:input.status,note,payment_activated:false});
    await client.query(`INSERT INTO public.notifications(recipient_id,title,message,type,category,channel,status,entity_type,entity_id,action_url)
      VALUES($1::uuid,$2,$3,$4,'payment','dashboard','queued','payment',$5::uuid,'/dashboard/payments')`,
    [payment.user_id,input.status==="accepted"?"Payment evidence accepted":"Payment evidence rejected",
      input.status==="accepted"?"Your payment evidence was accepted for review. Payment confirmation remains separate.":`Your payment evidence was rejected: ${note}`,
      input.status==="accepted"?"info":"error",payment.id]);
    return{id:input.id,status:input.status,paymentActivated:false,duplicate:false};
  });
}

export async function reconcileNeonAdminPayment(actor:NeonActor,input:{id:string;status:string;reconciliation:string;note:string},run:Run=withTransaction) {
  requireSuperAdmin(actor);const note=reviewNote(input.note);
  if(!uuid.test(input.id)||!["pending","success","failed","cancelled","expired","refunded"].includes(input.status)||
    !["reconciled","manual_review_required","unresolved","disputed"].includes(input.reconciliation))
    fail(400,"INVALID_RECONCILIATION","Choose a valid transaction and reconciliation status.");
  return run(async client=>{
    await requireLiveAdmin(client,actor);
    // Match the assignment/manual-settlement lock order: target account first,
    // then its payment. Otherwise concurrent grant/review can deadlock.
    const owner=(await client.query<{user_id:string}>(`SELECT user_id FROM public.payments
      WHERE id=$1::uuid AND deleted_at IS NULL`,[input.id])).rows[0];
    if(!owner)fail(404,"PAYMENT_NOT_FOUND","Transaction unavailable.");
    await client.query(`SELECT user_id FROM public.profiles WHERE user_id=$1::uuid FOR UPDATE`,[owner.user_id]);
    const payment=await lockedPayment(client,input.id);
    if(payment.user_id!==owner.user_id)fail(409,"PAYMENT_OWNER_CHANGED","The transaction owner changed during review.");
    if(payment.status!==input.status){
      if(!isManual(payment))fail(403,"VERIFIED_PROVIDER_REQUIRED","Gateway payment status can change only after provider verification.");
      if(payment.payment_type!=="module_subscription")fail(409,"DEDICATED_MANUAL_SETTLEMENT_REQUIRED","This manual transaction needs its service settlement workflow.");
      if(!["success","failed"].includes(input.status)||input.reconciliation!=="reconciled"||note.length>1000)
        fail(400,"INVALID_MANUAL_REVIEW","Confirm or reject the pending manual module receipt with a review note.");
      await reviewNeonManualPayment(actor,payment.id,input.status==="success"?"confirm":"reject",note,operation=>operation(client));
    }
    if(payment.status===input.status&&payment.reconciliation_status===input.reconciliation&&payment.verification_note===note)
      return{id:payment.id,status:input.status,duplicate:true};
    await client.query(`UPDATE public.payments SET reconciliation_status=$2,verified_by_user_id=$3::uuid,
      verification_note=$4,updated_at=now() WHERE id=$1::uuid`,[payment.id,input.reconciliation,actor.userId,note]);
    await audit(client,actor,"ADMIN_RECONCILE_PAYMENT",payment.id,{previous_status:payment.status,status:input.status,
      reconciliation:input.reconciliation,note});
    return{id:payment.id,status:input.status,duplicate:false};
  });
}

export async function recordNeonMentorPayout(actor:NeonActor,input:{id:string;amount:number;commission:number;reference:string;note:string},run:Run=withTransaction) {
  requireSuperAdmin(actor);const note=reviewNote(input.note),payout=money(input.amount),commission=money(input.commission);
  const reference=input.reference?.trim();
  if(!reference||reference.length<4||reference.length>180||payout<=0)fail(400,"PAYOUT_REFERENCE_REQUIRED","Enter the external payout reference and a positive amount.");
  return run(async client=>{
    await requireLiveAdmin(client,actor);const payment=await lockedPayment(client,input.id);
    if(payment.payment_type!=="mentor_booking"||payment.status!=="success"||!payment.reference_id)
      fail(409,"PAYOUT_PAYMENT_UNVERIFIED","Payouts require a successful mentor-booking payment.");
    if(payout+commission!==money(Number(payment.amount)))fail(409,"PAYOUT_AMOUNT_MISMATCH","Payout plus commission must equal the verified gross payment.");
    const booking=(await client.query<{mentor_user_id:string}>(`SELECT m.user_id AS mentor_user_id FROM public.mentor_bookings b
      JOIN public.mentors m ON m.id=b.mentor_id WHERE b.id=$1::uuid AND b.student_id=$2::uuid
      AND b.amount=$3 AND b.currency=$4 AND b.payment_status='success' AND b.payment_id=$5::uuid
      AND b.deleted_at IS NULL FOR SHARE OF b,m`,[payment.reference_id,payment.user_id,payment.amount,payment.currency,payment.id])).rows[0];
    if(!booking)fail(409,"PAYOUT_BOOKING_MISMATCH","The successful booking must match the payer, amount and payment.");
    const prior=(await client.query<{id:string;amount:string;gateway_transaction_id:string;commission:string}>(`SELECT id,amount,gateway_transaction_id,
      metadata->>'commission_amount' AS commission FROM public.payments WHERE parent_payment_id=$1::uuid
        AND payment_type='mentor_payout_settlement' AND deleted_at IS NULL ORDER BY created_at FOR UPDATE`,[payment.id])).rows;
    if(prior.length){
      if(prior.length===1&&prior[0].gateway_transaction_id===reference&&money(Number(prior[0].amount))===payout&&
        money(Number(prior[0].commission))===commission)return{id:payment.id,payoutId:prior[0].id,duplicate:true,moneyTransferred:false};
      fail(409,"PAYOUT_ALREADY_RECORDED","This booking already has a different payout settlement.");
    }
    await client.query(`SELECT pg_advisory_xact_lock(hashtextextended($1::text,0))`,[`mentor-payout:${reference}`]);
    if((await client.query(`SELECT id FROM public.payments WHERE gateway='manual_payout'
      AND gateway_transaction_id=$1 AND deleted_at IS NULL LIMIT 1`,[reference])).rowCount)
      fail(409,"PAYOUT_REFERENCE_USED","This external payout reference has already been recorded.");
    const id=randomUUID();
    await client.query(`INSERT INTO public.payments(id,user_id,payment_type,reference_id,parent_payment_id,
      amount,currency,status,gateway,gateway_transaction_id,payout_status,paid_at,metadata)
      VALUES($1::uuid,$2::uuid,'mentor_payout_settlement',$3::uuid,$4::uuid,$5,$6,'success','manual_payout',$7,'processed',now(),$8::jsonb)`,
    [id,payment.user_id,payment.reference_id,payment.id,input.amount,payment.currency,reference,
      JSON.stringify({original_payment_id:payment.id,booking_id:payment.reference_id,mentor_user_id:booking.mentor_user_id,
        commission_amount:input.commission,note,recorded_by:actor.userId,money_transferred_by_application:false})]);
    await client.query(`UPDATE public.payments SET payout_status='processed',payout_amount=$2,commission_amount=$3,
      payout_reference=$4,payout_at=now(),updated_at=now() WHERE id=$1::uuid`,[payment.id,input.amount,input.commission,reference]);
    await audit(client,actor,"ADMIN_RECORD_MENTOR_PAYOUT",payment.id,{payout_payment_id:id,payout_amount:input.amount,
      commission_amount:input.commission,payout_reference:reference,mentor_user_id:booking.mentor_user_id,note,money_transferred:false});
    return{id:payment.id,payoutId:id,duplicate:false,moneyTransferred:false};
  });
}

export async function listNeonAdminSubscriptions(actor:NeonActor,params=new URLSearchParams(),run:Run=withTransaction){
  requireSuperAdmin(actor);const{offset,search}=page(params);
  return run(async client=>{
    await requireLiveAdmin(client,actor);
    const where=`s.deleted_at IS NULL AND ($1='' OR concat_ws(' ',u.full_name,u.email,s.user_id::text,p.name) ILIKE '%' || $1 || '%')`;
    const total=(await client.query<{count:number}>(`SELECT count(*)::int AS count FROM public.subscriptions s
      LEFT JOIN public.packages p ON p.id=s.package_id LEFT JOIN public.profiles u ON u.user_id=s.user_id WHERE ${where}`,[search])).rows[0]?.count??0;
    const subscriptions=(await client.query(`SELECT s.id,s.user_id,s.package_id,s.entity_type,s.entity_id,s.start_date,s.expiry_date,
      CASE WHEN s.status IN ('active','trialing') AND s.expiry_date<=now() THEN 'expired' ELSE s.status END AS status,
      s.payment_status,s.metadata,s.created_at,
      jsonb_build_object('name',p.name,'code',p.code,'package_kind',p.package_kind,'is_default_free',p.is_default_free,'module_scope',p.module_scope) AS packages,
      jsonb_build_object('full_name',u.full_name,'email',u.email) AS profiles
      FROM public.subscriptions s LEFT JOIN public.packages p ON p.id=s.package_id
      LEFT JOIN public.profiles u ON u.user_id=s.user_id WHERE ${where}
      ORDER BY s.created_at DESC,s.id DESC LIMIT 100 OFFSET $2`,[search,offset])).rows;
    return{subscriptions,total,hasMore:offset+subscriptions.length<total};
  });
}

type FreeInput={userId:string;module:string;entityType:string;entityId:string|null;reason?:string};
const scopedModules:Record<string,{type:string;table:string}>={college:{type:"college",table:"institutes"},mentor:{type:"mentor",table:"mentors"},
  jobs:{type:"company",table:"companies"},events:{type:"event",table:"events"}};
export async function changeNeonDefaultFreeTier(actor:NeonActor,input:FreeInput,action:"grant"|"revoke",run:Run=withTransaction){
  requireSuperAdmin(actor);const scoped=scopedModules[input.module];
  const entityType=input.module==="events"&&input.entityType==="organizer"?"event":input.entityType;
  if(!uuid.test(input.userId)||!["grant","revoke"].includes(action)||(input.reason?.length??0)>1000||
    (scoped?entityType!==scoped.type||!input.entityId||!uuid.test(input.entityId):
      !["student","partnered_courses"].includes(input.module)||entityType!=="user"||input.entityId!==null))
    fail(400,"INVALID_FREE_SCOPE","Choose a valid user, module and matching assigned entity.");
  return run(async client=>{
    await requireLiveAdmin(client,actor);
    if(!(await client.query(`SELECT user_id FROM public.profiles WHERE user_id=$1::uuid AND account_status='active'
      AND deleted_at IS NULL FOR UPDATE`,[input.userId])).rowCount)fail(404,"USER_UNAVAILABLE","Active target user unavailable.");
    await client.query(`SELECT pg_advisory_xact_lock(hashtextextended($1::text,0))`,[`free:${input.userId}:${input.module}:${input.entityId??"account"}`]);
    if(scoped&&!(await client.query(`SELECT a.id FROM public.entity_admin_assignments a
      JOIN public.user_module_capabilities c ON c.id=a.user_capability_id AND c.user_id=a.user_id
      JOIN public.module_capabilities mc ON mc.id=c.capability_id JOIN public.${scoped.table} e ON e.id=a.entity_id
      WHERE a.user_id=$1::uuid AND a.entity_type=$2 AND a.entity_id=$3::uuid AND a.status='active'
        AND c.status='active' AND (c.expires_at IS NULL OR c.expires_at>now()) AND mc.is_active
        AND mc.module_key=$4 AND e.deleted_at IS NULL FOR SHARE OF a,c,mc,e`,[input.userId,entityType,input.entityId,input.module])).rowCount)
      fail(403,"ASSIGNMENT_REQUIRED","The user needs the existing active capability and exact entity assignment first.");
    if(action==="revoke"){
      const subscriptions=await client.query(`UPDATE public.subscriptions s SET status='cancelled',cancelled_at=now(),
        cancellation_reason=$5,updated_at=now() FROM public.packages p WHERE p.id=s.package_id
        AND s.user_id=$1::uuid AND s.entity_type=$2 AND s.entity_id IS NOT DISTINCT FROM $3::uuid
        AND s.status IN ('active','trialing') AND s.deleted_at IS NULL AND p.is_default_free
        AND p.package_kind='free' AND p.module_scope @> ARRAY[$4]::text[] RETURNING s.id`,
      [input.userId,entityType,input.entityId,input.module,input.reason?.trim()||"Default free tier revoked by Super Admin"]);
      await client.query(`UPDATE public.module_entitlements SET status='revoked',revoked_at=now(),granted_by=$5::uuid,
        reason=$6,updated_at=now() WHERE user_id=$1::uuid AND module_key=$2 AND entity_type=$3
        AND entity_id IS NOT DISTINCT FROM $4::uuid AND source='FREE' AND status='active'`,
      [input.userId,input.module,entityType,input.entityId,actor.userId,input.reason?.trim()||"Default free tier revoked"]);
      if(subscriptions.rowCount)await audit(client,actor,"ADMIN_REVOKE_DEFAULT_FREE_TIER",input.userId,{module:input.module,entity_id:input.entityId,reason:input.reason,revoked_count:subscriptions.rowCount},"profiles");
      return{revoked_count:subscriptions.rowCount??0,duplicate:!subscriptions.rowCount};
    }
    const plan=(await client.query<{id:string;code:string;duration_days:number;features:Record<string,unknown>}>(`SELECT id,code,duration_days,features FROM public.packages
      WHERE is_default_free AND package_kind='free' AND is_active AND deleted_at IS NULL AND price=0
        AND module_scope @> ARRAY[$1]::text[] ORDER BY sort_order,id LIMIT 1 FOR SHARE`,[input.module])).rows[0];
    if(!plan||!Number.isInteger(plan.duration_days)||plan.duration_days<1||plan.duration_days>3650)
      fail(409,"FREE_PLAN_UNAVAILABLE","No valid active default free plan is configured for this module.");
    const existing=(await client.query<{id:string;package_id:string;expiry_date:Date}>(`SELECT id,package_id,expiry_date FROM public.subscriptions
      WHERE user_id=$1::uuid AND entity_type=$2 AND entity_id IS NOT DISTINCT FROM $3::uuid
        AND status IN ('active','trialing') AND expiry_date>now() AND deleted_at IS NULL FOR UPDATE`,[input.userId,entityType,input.entityId])).rows;
    if(existing.length>1||existing.some(row=>row.package_id!==plan.id))fail(409,"SUBSCRIPTION_EXISTS","Another active subscription already controls this entity.");
    if(existing[0])return{subscription_id:existing[0].id,package_code:plan.code,duplicate:true};
    const expiry=new Date(Date.now()+plan.duration_days*86400000);
    const subscription=(await client.query<{id:string}>(`INSERT INTO public.subscriptions(user_id,package_id,entity_type,entity_id,
      start_date,expiry_date,status,payment_status,auto_renew,metadata) VALUES($1::uuid,$2::uuid,$3,$4::uuid,now(),$5,
      'active','not_required',false,jsonb_build_object('provisioning','default_free_tier','module',$6::text,'package_code',$7::text)) RETURNING id`,
    [input.userId,plan.id,entityType,input.entityId,expiry,input.module,plan.code])).rows[0];
    if(scoped){
      await client.query(`UPDATE public.module_entitlements SET status='expired',updated_at=now()
        WHERE user_id=$1::uuid AND module_key=$2 AND entity_type=$3 AND entity_id=$4::uuid
          AND source='FREE' AND status='active' AND expires_at<=now()`,[input.userId,input.module,entityType,input.entityId]);
      await client.query(`INSERT INTO public.module_entitlements(user_id,module_key,entity_type,entity_id,package_id,source,status,
        start_at,expires_at,features,granted_by,reason) VALUES($1::uuid,$2,$3,$4::uuid,$5::uuid,'FREE','active',now(),$6,$7::jsonb,$8::uuid,$9)`,
      [input.userId,input.module,entityType,input.entityId,plan.id,expiry,JSON.stringify(plan.features??{}),actor.userId,input.reason?.trim()||"Default free tier granted"]);
    }
    await audit(client,actor,"ADMIN_GRANT_DEFAULT_FREE_TIER",subscription.id,{target_user_id:input.userId,module:input.module,entity_id:input.entityId,expires_at:expiry.toISOString()},"subscriptions");
    return{subscription_id:subscription.id,package_code:plan.code,duplicate:false};
  });
}
