/** Isolated Neon staging checkout. A browser return is never a payment result. */
import type { PoolClient } from "pg";
import { randomUUID } from "node:crypto";
import { queryRows, withTransaction } from "./db";
import { getNeonConfig } from "@/lib/neon/neon-config";
import { getBackendMode } from "./backend-mode";
import { NeonAuthorizationError, type NeonActor } from "./neon-authorization";
import { EsewaV2PaymentProvider } from "./payment-provider";
import { parseEsewaAmount } from "./esewa-amount";
import { activateVerifiedCollegeScope } from "./neon-college-scope-activation";
import { decryptProviderSecret } from "./secret-store";
import { prepareNeonModuleAccessCheckout, activateVerifiedNeonModuleAccess } from "./neon-module-access";
import {prepareAssignedScopeRenewal,activateVerifiedAssignedScope} from './neon-assigned-scope-renewal';
import {requireNeonPaidInitiation} from './neon-paid-initiation';
import { recordNeonPaymentReceipt } from './neon-payment-receipt';

type Client = Pick<PoolClient, "query">;
type Kind = "mentor_booking" | "event_registration" | "college_scope_request" | "module_access_request" | "assigned_scope";
type CheckoutRow = {
  id: string; user_id: string; entity_type: Kind; entity_id: string; package_id: string | null;
  provider_reference: string; amount: number; currency: string; status: string;
  expires_at: Date; created_at: Date;
};

export async function stagingEsewaProvider(query: typeof queryRows = queryRows): Promise<EsewaV2PaymentProvider> {
  getNeonConfig();
  const environment = getBackendMode() === "neon-production" ? "production" : "uat";
  const unavailable = () => new NeonAuthorizationError(503,
    environment === "uat" ? "SANDBOX_UNAVAILABLE" : "PROVIDER_UNAVAILABLE",
    environment === "uat" ? "The isolated eSewa sandbox is not configured." : "Production eSewa is not configured.");
  const [configured] = await query<{
    provider_name: string; is_enabled: boolean; public_config: Record<string, unknown> | null;
    secret_ciphertext: string | null; secret_iv: string | null; secret_tag: string | null;
  }>(`SELECT provider_name,is_enabled,public_config,secret_ciphertext,secret_iv,secret_tag
    FROM public.provider_configurations WHERE provider_kind='payment' LIMIT 1`, []);
  const merchantCode = configured?.public_config?.merchant_code;
  if (!configured?.is_enabled || configured.provider_name !== "esewa" ||
      configured.public_config?.environment !== environment ||
      typeof merchantCode !== "string" || !/^[A-Za-z0-9-]{2,128}$/.test(merchantCode) ||
      (environment==='uat' && merchantCode!=='EPAYTEST') ||
      !configured.secret_ciphertext || !configured.secret_iv || !configured.secret_tag) {
    throw unavailable();
  }
  let secret: string;
  try { secret = decryptProviderSecret({ ciphertext: configured.secret_ciphertext,
    iv: configured.secret_iv, tag: configured.secret_tag }); }
  catch { throw unavailable(); }
  try{return new EsewaV2PaymentProvider(secret, { merchantCode, environment });}
  catch{throw unavailable();}
}

function deny(code: string, message: string, status: 400 | 403 | 404 | 409 | 503 = 403): never {
  throw new NeonAuthorizationError(status, code, message);
}

function money(value: unknown): number {
  const amount = Number(value);
  // Decimal PostgreSQL prices such as 1.10 are not exactly representable as
  // binary floats. Permit representation noise, never a fractional paisa.
  if (!Number.isSafeInteger(Math.round(amount * 100)) || amount <= 0 ||
      Math.abs(Math.round(amount * 100) - amount * 100) > 1e-7) {
    deny("INVALID_PRICE", "The published price is invalid.", 409);
  }
  return amount;
}

export class NeonCheckoutService {
  constructor(private readonly configuredProvider?: EsewaV2PaymentProvider) {}

  /** Recovery for a lost/temporarily pending return, never a new charge.
   * The payer must own both ledgers. Serialize repeated checks without waiting
   * behind an in-flight provider request; all fulfillment stays in verifyReturn.
   */
  async recheckOwnPayment(actor: NeonActor, reference: string, transactionClient?: Client) {
    const run = async (db: Client) => {
      const owned = (await db.query(`SELECT c.provider_reference
        FROM public.payment_checkout_sessions c JOIN public.payments p
          ON p.id::text=c.provider_reference AND p.user_id=c.user_id AND p.deleted_at IS NULL
        WHERE c.provider_reference=$2 AND c.user_id=$1::uuid AND c.provider_name='esewa'
        LIMIT 1`, [actor.userId, reference])).rows[0];
      if (!owned) deny("CHECKOUT_NOT_FOUND", "Checkout not found.", 404);
      const lock = (await db.query<{ acquired: boolean }>(`SELECT pg_try_advisory_xact_lock(
        hashtextextended($1::text,0)) AS acquired`, [`esewa-recheck:${reference}`])).rows[0];
      if (!lock?.acquired) throw new NeonAuthorizationError(429, "VERIFICATION_IN_PROGRESS", "A payment check is already in progress.");
      return this.verifyReturn({ reference }, db);
    };
    return transactionClient ? run(transactionClient) : withTransaction(run);
  }

  async initiate(actor: NeonActor, kind: Kind, targetId: string, origin: string, transactionClient?: Client,
    selectedPackageId?: string, renewal = false) {
    // Disable new paid checkout independently of verification of existing returns.
    requireNeonPaidInitiation(actor.userId);
    const provider = this.configuredProvider ?? await stagingEsewaProvider();
    const run = async (db: Client) => {
      const linked = (await db.query<{ allowed: boolean }>(`SELECT true AS allowed
        FROM public.neon_application_accounts a
        JOIN public.neon_identity_links l ON l.application_account_id=a.id
        JOIN public.profiles p ON p.user_id=a.legacy_user_id
        WHERE a.legacy_user_id=$1::uuid AND a.status='active' AND p.account_status='active'
          AND p.deleted_at IS NULL AND l.neon_auth_user_id=$2::uuid AND l.status='verified'
        LIMIT 1 FOR SHARE OF a,l,p`, [actor.userId,actor.neonAuthUserId])).rows[0];
      if (!linked?.allowed) deny("IDENTITY_NOT_LINKED", "Active verified account access is required.");
      let amount: number;
      let currency: string;
      let packageId: string | null = null;
      if (kind === "mentor_booking") {
        const row = (await db.query<{
          student_id: string; amount: number; currency: string; status: string; payment_status: string;
          service_price: number; service_currency: string;
        }>(`SELECT b.student_id,b.amount::float AS amount,b.currency,b.status,b.payment_status,
            s.price::float AS service_price,s.currency AS service_currency
          FROM public.mentor_bookings b JOIN public.mentor_services s ON s.id=b.mentor_service_id
          WHERE b.id=$1::uuid AND b.deleted_at IS NULL FOR UPDATE OF b`, [targetId])).rows[0];
        if (!row || row.student_id !== actor.userId) deny("BOOKING_NOT_FOUND", "Booking not found.", 404);
        if (row.status !== "pending" || row.payment_status !== "pending") deny("BOOKING_NOT_PAYABLE", "Booking is not awaiting payment.", 409);
        if (Number(row.amount) !== Number(row.service_price) || row.currency !== row.service_currency) deny("PRICE_CHANGED", "The booking price no longer matches its service.", 409);
        amount = money(row.service_price); currency = row.service_currency;
      } else if (kind === "event_registration") {
        const row = (await db.query<{
          user_id: string; total_amount: number; ticket_quantity: number; status: string; payment_status: string;
          unit_price: number | null; tier_currency: string | null; event_price: number; event_currency: string;
        }>(`SELECT r.user_id,r.total_amount::float AS total_amount,r.ticket_quantity,r.status,r.payment_status,
            t.price::float AS unit_price,t.currency AS tier_currency,
            e.ticket_price::float AS event_price,e.currency AS event_currency
          FROM public.event_registrations r JOIN public.events e ON e.id=r.event_id
          LEFT JOIN public.event_ticket_types t ON t.id=r.ticket_type_id
          WHERE r.id=$1::uuid AND r.deleted_at IS NULL FOR UPDATE OF r`, [targetId])).rows[0];
        if (!row || row.user_id !== actor.userId) deny("REGISTRATION_NOT_FOUND", "Registration not found.", 404);
        if (row.status !== "pending" || row.payment_status !== "pending") deny("REGISTRATION_NOT_PAYABLE", "Registration is not awaiting payment.", 409);
        const unit = row.unit_price ?? row.event_price;
        if (Number(row.total_amount) !== Number(unit) * row.ticket_quantity) deny("PRICE_CHANGED", "The registration price no longer matches its ticket.", 409);
        amount = money(row.total_amount); currency = row.tier_currency ?? row.event_currency;
      } else if(kind==='assigned_scope'){
        if(!selectedPackageId)deny('INVALID_PLAN','Select a valid renewal plan.',400);
        const prepared=await prepareAssignedScopeRenewal(db,actor.userId,targetId,selectedPackageId);
        amount=money(prepared.price);currency=prepared.currency;packageId=prepared.package_id;
        await db.query(`SELECT pg_advisory_xact_lock(hashtextextended($1::text,0))`,[`checkout:${actor.userId}:${kind}:${targetId}`]);
      } else if (kind === "module_access_request") {
        if (!selectedPackageId || renewal) deny("INVALID_PLAN", "Select a valid access plan.", 400);
        const prepared = await prepareNeonModuleAccessCheckout(actor,targetId,selectedPackageId,db);
        amount=money(prepared.amount);currency=prepared.currency;packageId=prepared.packageId;
      } else {
        if (!selectedPackageId || !/^[0-9a-f-]{36}$/i.test(selectedPackageId)) deny("INVALID_PLAN", "Select a valid college plan.", 400);
        const row = (await db.query<{ user_id: string; status: string; payment_status: string;
          package_id: string | null; plan_id: string | null; price: number; currency: string;
          capability_active: boolean; assignment_active: boolean }>(`
          SELECT r.user_id,r.status,r.payment_status,r.package_id,p.id AS plan_id,
            p.price::float AS price,p.currency,
            EXISTS (SELECT 1 FROM public.user_module_capabilities umc
              JOIN public.module_capabilities mc ON mc.id=umc.capability_id
              JOIN public.profiles profile ON profile.user_id=umc.user_id
              WHERE umc.user_id=r.user_id AND umc.status='active' AND mc.module_key='college'
                AND mc.is_active AND (umc.expires_at IS NULL OR umc.expires_at>now())
                AND profile.account_status='active' AND profile.deleted_at IS NULL) AS capability_active,
            EXISTS (SELECT 1 FROM public.entity_admin_assignments a
              JOIN public.user_module_capabilities umc ON umc.id=a.user_capability_id
              JOIN public.module_capabilities mc ON mc.id=umc.capability_id
              WHERE a.user_id=r.user_id AND a.entity_type='college' AND a.entity_id=r.entity_id
                AND a.status='active' AND umc.status='active' AND mc.module_key='college'
                AND mc.is_active AND (umc.expires_at IS NULL OR umc.expires_at>now())) AS assignment_active
          FROM public.entity_scope_requests r
          JOIN public.packages p ON p.id=$2::uuid AND p.is_active AND p.deleted_at IS NULL
            AND p.is_publicly_selectable AND p.package_kind='paid'
            AND p.module_scope @> ARRAY['college']::text[]
          WHERE r.id=$1::uuid AND r.module_key='college' AND r.entity_type='college'
          FOR UPDATE OF r`, [targetId, selectedPackageId])).rows[0];
        if (!row || row.user_id !== actor.userId) deny("REQUEST_NOT_FOUND", "College request not found.", 404);
        if (!row.capability_active) deny("COLLEGE_CAPABILITY_REQUIRED", "Active College capability is required before checkout.");
        if (row.status === "approved" && !row.assignment_active)
          deny("COLLEGE_SCOPE_REQUIRED", "The approved College assignment is no longer active.");
        if (!["pending", "approved"].includes(row.status) || (row.payment_status === "success" && (!renewal || row.status !== "approved"))) {
          deny("REQUEST_NOT_PAYABLE", "This college request is not awaiting payment.", 409);
        }
        if (row.package_id && row.package_id !== selectedPackageId && row.payment_status === "pending") {
          deny("PLAN_CHANGED", "Finish or expire the current checkout first.", 409);
        }
        packageId = selectedPackageId;
        amount = money(row.price); currency = row.currency;
      }
      if (currency !== "NPR") deny("CURRENCY_UNSUPPORTED", "eSewa accepts NPR only.", 409);

      // The partial unique index also covers overdue pending rows. Expire them
      // under the same locked resource transaction before creating a retry.
      await db.query(`UPDATE public.payment_checkout_sessions SET status='expired',completed_at=now(),updated_at=now()
        WHERE user_id=$1::uuid AND entity_type=$2 AND entity_id=$3::uuid
          AND status IN ('initiated','pending') AND expires_at<=now()`, [actor.userId,kind,targetId]);

      const existing = (await db.query<CheckoutRow>(`SELECT id,user_id,entity_type,entity_id,package_id,provider_reference,
          amount::float AS amount,currency,status,expires_at,created_at
        FROM public.payment_checkout_sessions
        WHERE user_id=$1::uuid AND entity_type=$2 AND entity_id=$3::uuid
          AND status IN ('initiated','pending') AND expires_at>now()
        ORDER BY created_at DESC LIMIT 1`, [actor.userId, kind, targetId])).rows[0];
      if (existing && (Number(existing.amount) !== amount || existing.currency !== currency)) {
        deny("PRICE_CHANGED", "An existing checkout has a different price.", 409);
      }
      if (existing && (existing.package_id ?? null) !== packageId) deny("PLAN_CHANGED", "The existing checkout uses another plan.", 409);
      const reference = existing?.provider_reference ?? randomUUID();
      const checkout = await provider.createCheckout({ paymentId: reference, amount, currency,
        description: kind === "mentor_booking" ? "Mentor session" : kind === "event_registration" ? "Event tickets"
          : kind === 'assigned_scope' ? 'Assigned module renewal' : kind === "module_access_request" ? "Module management access" : "College access request",
        returnUrl: `${origin}/api/v1/neon-staging/payments/esewa/return`,
        failureUrl: `${origin}/api/v1/neon-staging/payments/esewa/return?reference=${reference}&state=failed` });
      if (!checkout.checkoutUrl || !checkout.checkoutFields || checkout.status !== "pending") {
        deny("SANDBOX_UNAVAILABLE", "eSewa sandbox checkout is unavailable.", 503);
      }
      if (existing) return { session: existing, checkoutUrl: checkout.checkoutUrl, checkoutFields: checkout.checkoutFields, reused: true };

      await db.query(`INSERT INTO public.payments
        (id,user_id,payment_type,reference_id,amount,currency,status,payment_method,gateway,metadata)
        VALUES ($1::uuid,$2::uuid,$3,$4::uuid,$5,$6,'pending','esewa','esewa',$7::jsonb)`, [
        reference, actor.userId, kind === "mentor_booking" ? "mentor_booking" : kind === "event_registration" ? "event_ticket" : kind === 'assigned_scope' ? 'module_subscription' : "module_access_request",
        targetId, amount, currency, JSON.stringify({ source: "neon_staging_checkout" })]);
      const session = (await db.query<CheckoutRow>(`INSERT INTO public.payment_checkout_sessions
        (user_id,package_id,entity_type,entity_id,provider_name,provider_reference,amount,currency,status,expires_at)
        VALUES ($1::uuid,$7::uuid,$2,$3::uuid,'esewa',$4,$5,$6,'pending',now()+interval '5 minutes')
        RETURNING id,user_id,entity_type,entity_id,package_id,provider_reference,amount::float AS amount,
          currency,status,expires_at,created_at`, [actor.userId, kind, targetId, reference, amount, currency, packageId])).rows[0];
      if (kind === "college_scope_request") await db.query(`UPDATE public.entity_scope_requests
        SET package_id=$2::uuid,payment_status='pending',updated_at=now()
        WHERE id=$1::uuid AND user_id=$3::uuid`, [targetId, packageId, actor.userId]);
      if (kind === "module_access_request") await db.query(`UPDATE public.sub_admin_requests
        SET package_id=$2::uuid,payment_status='pending',updated_at=now()
        WHERE id=$1::uuid AND user_id=$3::uuid AND status='pending'`,[targetId,packageId,actor.userId]);
      return { session, checkoutUrl: checkout.checkoutUrl, checkoutFields: checkout.checkoutFields, reused: false };
    };
    return transactionClient ? run(transactionClient) : withTransaction(run);
  }

  async verifyReturn(input: { reference: string; signedPayload?: Record<string, unknown> | null }, transactionClient?: Client) {
    const provider = this.configuredProvider ?? await stagingEsewaProvider();
    if (input.signedPayload) {
      const payload = input.signedPayload;
      if (payload.signed_field_names !== "transaction_code,status,total_amount,transaction_uuid,product_code,signed_field_names" ||
          payload.transaction_uuid !== input.reference || !provider.verifyRedirectPayload(payload)) {
        deny("INVALID_PROVIDER_SIGNATURE", "The eSewa response was not authentic.", 400);
      }
    }
    // Read price/reference from our own checkout. The eSewa status API, not the
    // redirect status, is the authority for fulfillment.
    const read = async (db: Client) => (await db.query<CheckoutRow>(`SELECT id,user_id,entity_type,entity_id,package_id,
      provider_reference,amount::float AS amount,currency,status,expires_at,created_at
      FROM public.payment_checkout_sessions WHERE provider_reference=$1 AND provider_name='esewa'`, [input.reference])).rows[0];
    const checkout = transactionClient ? await read(transactionClient) : await withTransaction(read);
    if (!checkout) deny("CHECKOUT_NOT_FOUND", "Checkout not found.", 404);
    if (input.signedPayload && (parseEsewaAmount(input.signedPayload.total_amount) !== Number(checkout.amount) ||
        input.signedPayload.status !== "COMPLETE")) {
      deny("INVALID_PROVIDER_PAYLOAD", "The eSewa response does not match checkout.", 400);
    }
    if (checkout.currency !== "NPR") deny("CURRENCY_UNSUPPORTED", "Unexpected checkout currency.", 409);
    if (!["pending", "initiated", "expired"].includes(checkout.status)) return { status: checkout.status, duplicate: true };

    const verified = await provider.lookupStatus({ reference: input.reference, amount: Number(checkout.amount), strict: true });
    if (input.signedPayload && verified.status === "successful" &&
        input.signedPayload.transaction_code !== verified.transactionId) {
      deny("PROVIDER_TRANSACTION_MISMATCH", "The verified eSewa transaction does not match its signed response.", 400);
    }
    if(checkout.status === "expired" && verified.status !== "successful")return {status:"expired",duplicate:true};
    if (verified.status === "pending") return { status: "pending", duplicate: false };
    if (verified.status === "refunded") {
      const markForReview = async (db: Client) => {
        await db.query(`UPDATE public.payments SET reconciliation_status='disputed',updated_at=now(),
          metadata=metadata || $2::jsonb WHERE id=$1::uuid AND status='pending'`, [
          input.reference, JSON.stringify({ provider_status: "refunded", review_required: true })]);
      };
      if (transactionClient) await markForReview(transactionClient);
      else await withTransaction(markForReview);
      return { status: "pending", duplicate: false, manualReview: true };
    }
    const run = async (db: Client) => {
      const locked = (await db.query<CheckoutRow>(`SELECT id,user_id,entity_type,entity_id,package_id,provider_reference,
          amount::float AS amount,currency,status,expires_at,created_at
        FROM public.payment_checkout_sessions WHERE id=$1::uuid FOR UPDATE`, [checkout.id])).rows[0];
      if (!locked || locked.provider_reference !== input.reference || Number(locked.amount) !== Number(checkout.amount)) {
        deny("CHECKOUT_MISMATCH", "Checkout changed during verification.", 409);
      }
      if (!["pending", "initiated", "expired"].includes(locked.status)) return { status: locked.status, duplicate: true };
      const expired = locked.status === "expired" || new Date(locked.expires_at).getTime() <= Date.now();
      const status = expired ? "expired" : verified.status === "successful" ? "successful"
        : verified.status === "cancelled" ? "cancelled" : verified.status === "expired" ? "expired" : "failed";
      await db.query(`UPDATE public.payment_checkout_sessions SET status=$2,completed_at=now(),updated_at=now()
        WHERE id=$1::uuid`, [locked.id, status]);
      if((expired || locked.status === "expired") && verified.status === "successful") {
        // A delayed real settlement must remain visible to operations, even if
        // maintenance expired its checkout before the callback arrived. The
        // copied payment-success triggers must not fulfill an expired service.
        await db.query(`UPDATE public.payments SET reconciliation_status='disputed',updated_at=now(),
          gateway_transaction_id=$2,metadata=metadata || $3::jsonb
          WHERE id=$1::uuid AND user_id=$4::uuid AND reference_id=$5::uuid`,
        [input.reference,verified.transactionId ?? null,JSON.stringify({provider_status:"successful",
          reconciliation:"late_success_needs_review",checkout_session_id:locked.id}),locked.user_id,locked.entity_id]);
        return {status:"expired",duplicate:locked.status === "expired",manualReview:true};
      }
      if(locked.entity_type==='assigned_scope'){
        if(!locked.package_id)deny('INVALID_PLAN','The renewal plan is missing.',409);
        const scope=await prepareAssignedScopeRenewal(db,locked.user_id,locked.entity_id,locked.package_id);
        if(Number(scope.price)!==Number(locked.amount)||scope.currency!==locked.currency)deny('PRICE_CHANGED','The renewal price changed.',409);
        const payment=await db.query(`UPDATE public.payments SET status=$2,gateway_transaction_id=$3,
          paid_at=CASE WHEN $2='success' THEN now() ELSE NULL END,
          failed_at=CASE WHEN $2='success' THEN NULL ELSE now() END,updated_at=now(),
          metadata=COALESCE(metadata,'{}'::jsonb)||$4::jsonb WHERE id=$1::uuid AND user_id=$5::uuid
          AND reference_id=$6::uuid AND payment_type='module_subscription' AND amount=$7 AND currency=$8 AND status='pending'`,
          [input.reference,status==='successful'?'success':'failed',verified.transactionId,
            JSON.stringify({checkout_session_id:locked.id,provider_status:verified.status}),locked.user_id,locked.entity_id,locked.amount,locked.currency]);
        if(!payment.rowCount)deny('PAYMENT_CHANGED','Renewal payment cannot be settled.',409);
        const activation=status==='successful'?await activateVerifiedAssignedScope(db,{userId:locked.user_id,
          assignmentId:locked.entity_id,packageId:locked.package_id,paymentId:input.reference}):{activated:false};
        await recordNeonPaymentReceipt(db,input.reference);
        return {status,duplicate:false,activation};
      }
      if (locked.entity_type === "module_access_request") {
        const target=(await db.query<{id:string}>(`SELECT r.id FROM public.sub_admin_requests r
          JOIN public.packages p ON p.id=$3::uuid AND p.package_kind='paid' AND p.module_scope @> r.requested_modules
          WHERE r.id=$1::uuid AND r.user_id=$2::uuid AND r.package_id=p.id AND p.price=$4 AND p.currency=$5
            AND r.status IN ('pending','approved') FOR UPDATE OF r`,
        [locked.entity_id,locked.user_id,locked.package_id,locked.amount,locked.currency])).rows[0];
        if (!target) deny("REQUEST_CHANGED","The access request or plan changed before verification.",409);
        const paymentStatus=status === "successful"?"success":status;
        const paid=await db.query(`UPDATE public.payments SET status=$2,gateway_transaction_id=$3,
          paid_at=CASE WHEN $2='success' THEN now() ELSE NULL END,
          failed_at=CASE WHEN $2='success' THEN NULL ELSE now() END,updated_at=now(),metadata=metadata || $4::jsonb
          WHERE id=$1::uuid AND user_id=$5::uuid AND payment_type='module_access_request'
            AND reference_id=$6::uuid AND amount=$7 AND currency=$8 AND status='pending'`,
        [input.reference,paymentStatus === "success"?"success":"failed",verified.transactionId ?? null,
          JSON.stringify({checkout_session_id:locked.id,provider_status:verified.status,
            ...(expired&&verified.status === "successful"?{reconciliation:"late_success_needs_review"}:{})}),
          locked.user_id,locked.entity_id,locked.amount,locked.currency]);
        if (!paid.rowCount) deny("PAYMENT_CHANGED","Module access payment cannot be settled.",409);
        await db.query(`UPDATE public.sub_admin_requests SET payment_id=$2::uuid,payment_status=$3,
          paid_at=CASE WHEN $3='success' THEN now() ELSE paid_at END,updated_at=now()
          WHERE id=$1::uuid AND user_id=$4::uuid AND package_id=$5::uuid`,
        [locked.entity_id,input.reference,paymentStatus,locked.user_id,locked.package_id]);
        const activation=paymentStatus === "success"?await activateVerifiedNeonModuleAccess(db,locked.entity_id)
          :{activated:false,reason:"payment_not_verified"};
        await recordNeonPaymentReceipt(db,input.reference);
        return {status,duplicate:false,activation};
      }
      if (locked.entity_type === "college_scope_request") {
        const target = (await db.query<{ id: string; status: string }>(`
          SELECT r.id,r.status FROM public.entity_scope_requests r
          JOIN public.packages p ON p.id=$3::uuid AND p.package_kind='paid'
            AND p.module_scope @> ARRAY['college']::text[]
          WHERE r.id=$1::uuid AND r.user_id=$2::uuid AND r.module_key='college'
            AND r.entity_type='college' AND r.package_id=p.id AND p.price=$4
            AND p.currency=$5 FOR UPDATE OF r`,
          [locked.entity_id, locked.user_id, locked.package_id, locked.amount, locked.currency])).rows[0];
        if (!target) deny("SCOPE_CHANGED", "The College request or plan changed before verification.", 409);
        const paymentStatus = status === "successful" ? "success" : status;
        const paid = await db.query(`UPDATE public.payments SET status=$2,gateway_transaction_id=$3,
          paid_at=CASE WHEN $2='success' THEN now() ELSE NULL END,
          failed_at=CASE WHEN $2='success' THEN NULL ELSE now() END,updated_at=now(),
          metadata=metadata || $4::jsonb
          WHERE id=$1::uuid AND user_id=$5::uuid AND payment_type='module_access_request'
            AND reference_id=$6::uuid AND amount=$7 AND currency=$8 AND status='pending'`,
        [input.reference, paymentStatus === "success" ? "success" : "failed", verified.transactionId ?? null,
          JSON.stringify({ checkout_session_id: locked.id, provider_status: verified.status,
            ...(expired && verified.status === "successful" ? { reconciliation: "late_success_needs_review" } : {}) }),
          locked.user_id, locked.entity_id, locked.amount, locked.currency]);
        if (!paid.rowCount) deny("PAYMENT_CHANGED", "College payment cannot be settled.", 409);
        await db.query(`UPDATE public.entity_scope_requests
          SET payment_id=$2::uuid,payment_status=$3,
            paid_at=CASE WHEN $3='success' THEN now() ELSE paid_at END,updated_at=now()
          WHERE id=$1::uuid AND user_id=$4::uuid AND package_id=$5::uuid`,
        [locked.entity_id, input.reference, paymentStatus, locked.user_id, locked.package_id]);
        const activation = paymentStatus === "success"
          ? await activateVerifiedCollegeScope(db, locked.entity_id)
          : { activated: false, reason: "payment_not_verified" };
        await recordNeonPaymentReceipt(db,input.reference);
        return { status, duplicate: false, activation };
      }
      if (status === "successful") {
        if (locked.entity_type === "mentor_booking") {
          const changed = await db.query(`UPDATE public.mentor_bookings
            SET status='confirmed',payment_status='success',payment_id=$2::uuid,updated_at=now()
            WHERE id=$1::uuid AND student_id=$3::uuid AND status='pending' AND payment_status='pending'
              AND amount=$4 AND currency=$5 RETURNING id`, [locked.entity_id,input.reference,locked.user_id,locked.amount,locked.currency]);
          if (!changed.rowCount) deny("BOOKING_CHANGED", "Booking can no longer be fulfilled.", 409);
        } else {
          const changed = await db.query<{ ticket_quantity: number; event_id: string; ticket_type_id: string | null;
            form_data: { participants?: Array<{ fullName?: string; email?: string }> } }>(`UPDATE public.event_registrations
            SET status='confirmed',payment_status='success',payment_id=$2::uuid,updated_at=now()
            WHERE id=$1::uuid AND user_id=$3::uuid AND status='pending' AND payment_status='pending'
              AND total_amount=$4 RETURNING ticket_quantity,event_id,ticket_type_id,form_data`, [
            locked.entity_id,input.reference,locked.user_id,locked.amount]);
          const registration = changed.rows[0];
          if (!registration) deny("REGISTRATION_CHANGED", "Registration can no longer be fulfilled.", 409);
          for (let i = 0; i < registration.ticket_quantity; i++) {
            const attendee = registration.form_data?.participants?.[i];
            await db.query(`INSERT INTO public.event_tickets
              (ticket_number,registration_id,event_id,ticket_type_id,user_id,attendee_name,attendee_email,qr_token,status)
              VALUES ($1,$2::uuid,$3::uuid,$4::uuid,$5::uuid,$6,$7,$8,'active')`, [
              `MT-${randomUUID()}`,locked.entity_id,registration.event_id,registration.ticket_type_id,locked.user_id,
              attendee?.fullName?.trim() || "Attendee",attendee?.email?.trim() || null,randomUUID()]);
          }
        }
      } else if (verified.status !== "successful") {
        if (locked.entity_type === "mentor_booking") await db.query(`UPDATE public.mentor_bookings
          SET status='cancelled',payment_status='failed',updated_at=now()
          WHERE id=$1::uuid AND student_id=$2::uuid AND status='pending'`, [locked.entity_id,locked.user_id]);
        else await db.query(`UPDATE public.event_registrations SET status='cancelled',payment_status='failed',updated_at=now()
          WHERE id=$1::uuid AND user_id=$2::uuid AND status='pending'`, [locked.entity_id,locked.user_id]);
      }
      // The copied schema has payment-status triggers that also update the
      // booking/registration. Change the entity first; fire those triggers only
      // after our guarded fulfillment and ticket issuance have succeeded.
      const paymentUpdate = await db.query(`UPDATE public.payments SET status=$2,gateway_transaction_id=$3,
          paid_at=CASE WHEN $2='success' THEN now() ELSE NULL END,
          failed_at=CASE WHEN $2='success' THEN NULL ELSE now() END,updated_at=now(),
          metadata=metadata || $4::jsonb
        WHERE id=$1::uuid AND user_id=$5::uuid AND reference_id=$6::uuid AND status='pending'`, [
        input.reference, status === "successful" ? "success" : "failed",
        verified.transactionId ?? null,
        JSON.stringify({ checkout_session_id: locked.id, provider_status: verified.status,
          ...(expired && verified.status === "successful" ? { reconciliation: "late_success_needs_review" } : {}) }),
        locked.user_id, locked.entity_id]);
      if (!paymentUpdate.rowCount) deny("PAYMENT_CHANGED", "Payment can no longer be settled.", 409);
      await recordNeonPaymentReceipt(db,input.reference);
      return { status, duplicate: false };
    };
    return transactionClient ? run(transactionClient) : withTransaction(run);
  }
}
