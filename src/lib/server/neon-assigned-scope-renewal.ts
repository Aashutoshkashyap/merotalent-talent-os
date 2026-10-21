/** Renew an existing delegated scope; payment cannot create capabilities or assignments. */
import type {PoolClient} from 'pg';
import {NeonAuthorizationError} from './neon-authorization';
type Client=Pick<PoolClient,'query'>;
interface ScopePlan {user_id:string;module_key:string;entity_type:string;entity_id:string;package_id:string;price:number;currency:string;duration_days:number|null;billing_interval:string|null;features:Record<string,unknown>}
const entities:Record<string,Record<string,string>>={college:{college:'institutes'},jobs:{company:'companies',job:'jobs'},mentor:{mentor:'mentors'},events:{organizer:'profiles',event:'events'}};
const deny=(code:string):never=>{throw new NeonAuthorizationError(403,code,'An active matching assignment, capability and plan are required.');};

export async function prepareAssignedScopeRenewal(db:Client,userId:string,assignmentId:string,packageId:string):Promise<ScopePlan>{
  const row=(await db.query<ScopePlan>(`SELECT a.user_id,mc.module_key,a.entity_type,a.entity_id,
    p.id AS package_id,p.price::float AS price,p.currency,p.duration_days,p.billing_interval,p.features
    FROM public.entity_admin_assignments a
    JOIN public.user_module_capabilities umc ON umc.id=a.user_capability_id AND umc.user_id=a.user_id
    JOIN public.module_capabilities mc ON mc.id=umc.capability_id
    JOIN public.profiles profile ON profile.user_id=a.user_id
    JOIN public.packages p ON p.id=$3::uuid AND p.module_scope @> ARRAY[mc.module_key]::text[]
    WHERE a.id=$1::uuid AND a.user_id=$2::uuid AND a.status='active' AND umc.status='active'
      AND mc.is_active AND (umc.expires_at IS NULL OR umc.expires_at>now())
      AND profile.account_status='active' AND profile.deleted_at IS NULL
      AND p.is_active AND p.is_publicly_selectable AND p.deleted_at IS NULL AND p.package_kind='paid'
    FOR SHARE OF a,umc,mc,profile,p`,[assignmentId,userId,packageId])).rows[0];
  if(!row)deny('RENEWAL_SCOPE_REQUIRED');
  const types=Object.hasOwn(entities,row.module_key)?entities[row.module_key]:null;
  const table=types&&Object.hasOwn(types,row.entity_type)?types[row.entity_type]:null;if(!table)deny('INVALID_RENEWAL_SCOPE');
  const column=table==='profiles'?'user_id':'id';
  if(!(await db.query(`SELECT ${column} FROM public.${table} WHERE ${column}=$1::uuid AND deleted_at IS NULL FOR SHARE`,[row.entity_id])).rows[0])deny('RENEWAL_ENTITY_UNAVAILABLE');
  const days=row.duration_days??({year:365,quarter:90,month:30,one_time:30}[row.billing_interval??'']??30);
  if(!Number.isSafeInteger(days)||days<1||days>3650||row.currency!=='NPR'||!Number.isFinite(row.price)||row.price<=0)deny('INVALID_RENEWAL_PLAN');
  return {...row,duration_days:days};
}

export async function activateVerifiedAssignedScope(db:Client,input:{userId:string;assignmentId:string;packageId:string;paymentId:string}){
  const scope=await prepareAssignedScopeRenewal(db,input.userId,input.assignmentId,input.packageId);
  await db.query(`SELECT pg_advisory_xact_lock(hashtextextended($1::text,0))`,[`${input.userId}:${scope.module_key}:${scope.entity_type}:${scope.entity_id}`]);
  const paid=(await db.query(`SELECT payment.id FROM public.payments payment
    JOIN public.payment_checkout_sessions checkout ON checkout.provider_reference=payment.id::text
      AND checkout.user_id=payment.user_id AND checkout.entity_type='assigned_scope'
      AND checkout.entity_id=payment.reference_id AND checkout.package_id=$4::uuid
      AND checkout.provider_name='esewa' AND checkout.status='successful'
    WHERE payment.id=$1::uuid AND payment.user_id=$2::uuid AND payment.reference_id=$3::uuid
      AND payment.payment_type='module_subscription' AND payment.gateway='esewa'
      AND payment.status='success' AND payment.paid_at IS NOT NULL AND payment.deleted_at IS NULL
      AND payment.amount=$5 AND payment.currency=$6 FOR SHARE OF payment,checkout`,
    [input.paymentId,input.userId,input.assignmentId,input.packageId,scope.price,scope.currency])).rows[0];
  if(!paid)deny('RENEWAL_PAYMENT_NOT_VERIFIED');
  const previous=(await db.query<{id:string}>(`SELECT id FROM public.module_entitlements
    WHERE payment_id=$1::uuid AND user_id=$2::uuid AND module_key=$3 AND entity_type=$4 AND entity_id=$5::uuid`,
    [input.paymentId,input.userId,scope.module_key,scope.entity_type,scope.entity_id])).rows[0];
  if(previous)return {activated:true,duplicate:true,entitlementId:previous.id};
  // Exact user/module/entity serialization makes two distinct confirmed renewals additive.
  const boundary=(await db.query<{expires_at:Date}>(`SELECT GREATEST(now(),
    COALESCE((SELECT max(expires_at) FROM public.module_entitlements WHERE user_id=$1::uuid
      AND module_key=$2 AND entity_type=$3 AND entity_id=$4::uuid AND status='active' AND start_at<=now()),now()),
    COALESCE((SELECT max(expiry_date) FROM public.subscriptions WHERE user_id=$1::uuid
      AND entity_type=$3 AND entity_id=$4::uuid AND status IN ('active','trialing') AND deleted_at IS NULL),now()))
      + ($5::int*interval '1 day') AS expires_at`,
    [input.userId,scope.module_key,scope.entity_type,scope.entity_id,scope.duration_days])).rows[0];
  if(!boundary?.expires_at)deny('RENEWAL_BOUNDARY_INVALID');
  let subscriptionId:string|null=null;
  // Existing subscriptions support organizational entities. Job/event-specific
  // scopes use the already authoritative module_entitlements ledger, unchanged.
  if(['college','mentor','company','organizer'].includes(scope.entity_type)){
    const current=(await db.query<{id:string}>(`SELECT id FROM public.subscriptions WHERE user_id=$1::uuid
      AND entity_type=$2 AND entity_id=$3::uuid AND deleted_at IS NULL
      AND status IN ('active','trialing','past_due','expired') ORDER BY expiry_date DESC LIMIT 1 FOR UPDATE`,
      [input.userId,scope.entity_type,scope.entity_id])).rows[0];
    const metadata=JSON.stringify({payment_id:input.paymentId,assignment_id:input.assignmentId,module:scope.module_key});
    subscriptionId=current?(await db.query<{id:string}>(`UPDATE public.subscriptions SET package_id=$2::uuid,
      expiry_date=$3,status='active',payment_status='success',metadata=COALESCE(metadata,'{}'::jsonb)||$4::jsonb,updated_at=now()
      WHERE id=$1::uuid RETURNING id`,[current.id,input.packageId,boundary.expires_at,metadata])).rows[0]?.id??null:
      (await db.query<{id:string}>(`INSERT INTO public.subscriptions(user_id,package_id,entity_type,entity_id,
        start_date,expiry_date,status,payment_status,metadata) VALUES($1::uuid,$2::uuid,$3,$4::uuid,now(),$5,'active','success',$6::jsonb) RETURNING id`,
        [input.userId,input.packageId,scope.entity_type,scope.entity_id,boundary.expires_at,metadata])).rows[0]?.id??null;
    if(!subscriptionId)deny('RENEWAL_SUBSCRIPTION_FAILED');
  }
  const entitlement=(await db.query<{id:string}>(`INSERT INTO public.module_entitlements(user_id,module_key,
    entity_type,entity_id,package_id,source,status,start_at,expires_at,features,payment_id,reason)
    VALUES($1::uuid,$2,$3,$4::uuid,$5::uuid,'ESEWA_PURCHASE','active',now(),$6,$7::jsonb,$8::uuid,
      'Verified payment renewing an existing assigned scope') RETURNING id`,
    [input.userId,scope.module_key,scope.entity_type,scope.entity_id,input.packageId,boundary.expires_at,JSON.stringify(scope.features??{}),input.paymentId])).rows[0];
  if(!entitlement)deny('RENEWAL_ENTITLEMENT_FAILED');
  await db.query(`UPDATE public.payments SET subscription_id=$2::uuid,metadata=COALESCE(metadata,'{}'::jsonb)||$3::jsonb,updated_at=now() WHERE id=$1::uuid`,
    [input.paymentId,subscriptionId,JSON.stringify({module:scope.module_key,entity_type:scope.entity_type,entity_id:scope.entity_id,expires_at:new Date(boundary.expires_at).toISOString()})]);
  await db.query(`INSERT INTO public.audit_logs(actor_user_id,action,entity_type,entity_id,metadata)
    VALUES(NULL,'ASSIGNED_SCOPE_RENEWED',$1,$2::text,$3::jsonb)`,[scope.entity_type,scope.entity_id,
    JSON.stringify({user_id:input.userId,assignment_id:input.assignmentId,payment_id:input.paymentId,entitlement_id:entitlement.id,subscription_id:subscriptionId})]);
  return {activated:true,duplicate:false,entitlementId:entitlement.id,subscriptionId,expiresAt:new Date(boundary.expires_at).toISOString()};
}
