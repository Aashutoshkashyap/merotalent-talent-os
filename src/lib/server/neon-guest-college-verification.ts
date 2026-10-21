/** Anonymous admission proofs and submission, bound to one guest and college. */
import { randomInt } from "node:crypto";
import type { PoolClient, QueryResultRow } from "pg";
import { getBackendMode, requireNeonBackend } from "./backend-mode";
import { queryRows, withTransaction } from "./db";
import { GuestVerificationError, guestCodeHash, hashGuestToken, normalizeGuestIdentity,
  openwaConfiguration, sendWhatsAppCode, type GuestVerificationChannel } from "./guest-college-verification";
import { resolveNeonEmailProvider } from "./neon-email-queue";
import { neonEmailRecipientAllowed } from "./neon-delivery-policy";
import type { NeonMaintenanceTransaction } from "./neon-maintenance";
import { validateModuleForm } from "@/lib/forms/module-form-validation";
import { appendNotificationEvent } from "./neon-application-events";
import { NeonAuthorizationError, type NeonActor } from "./neon-authorization";

type Identity = ReturnType<typeof normalizeGuestIdentity>;
type Environment = Record<string, string | undefined>;
type Sender = (identity: Identity, channel: GuestVerificationChannel, code: string) => Promise<void>;
type Options = { run?: NeonMaintenanceTransaction; environment?: Environment; sender?: Sender; query?: typeof queryRows };
type Challenge = QueryResultRow & { id: string; email: string; whatsapp_number: string; active: boolean;
  throttled: boolean; email_verified_at: Date | null; whatsapp_verified_at: Date | null; consumed_at: Date | null };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const columns = (channel: GuestVerificationChannel) => ({ code: `${channel}_code_hash`,
  expires: `${channel}_code_expires_at`, dispatched: `${channel}_dispatched_at`,
  verified: `${channel}_verified_at`, attempts: `${channel}_attempts`, requested: `last_${channel}_requested_at` });
const unavailable = (channel: GuestVerificationChannel) => new GuestVerificationError(503,
  channel === "email" ? "EMAIL_UNAVAILABLE" : "WHATSAPP_UNAVAILABLE", "Verification message delivery is currently unavailable.");
const proofRequired = () => new GuestVerificationError(403, "GUEST_VERIFICATION_REQUIRED", "Verify your email and WhatsApp number before applying.");

async function senderFor(identity: Identity, channel: GuestVerificationChannel, options: Options): Promise<Sender> {
  const environment = options.environment ?? process.env;
  const allowed = channel === "email" ? neonEmailRecipientAllowed(identity.email, environment)
    : environment.NEON_STAGING_WHATSAPP_VERIFICATION_ENABLED === "true" &&
      (environment.NEON_STAGING_WHATSAPP_TEST_RECIPIENTS ?? "").split(",").map(v => v.trim())
        .filter(v => /^\+[1-9]\d{7,14}$/.test(v)).includes(identity.whatsappNumber);
  if (!allowed) throw unavailable(channel);
  if (options.sender) return options.sender;
  if (channel === "whatsapp") {
    try { openwaConfiguration(); } catch { throw unavailable(channel); }
    return (target, _channel, code) => sendWhatsAppCode(target.whatsappNumber, code);
  }
  const provider = await resolveNeonEmailProvider(options.query, environment);
  if (!provider) throw unavailable(channel);
  return async (target, _channel, code) => {
    const sent = await provider.send({ event: "guest_application_verification", to: target.email,
      subject: "Verify your MeroTalent college application",
      text: `Your MeroTalent college application verification code is ${code}. It expires in 10 minutes. Do not share this code.` });
    if (sent.status !== "sent") throw unavailable(channel);
  };
}

async function requireAcceptingCollege(client: PoolClient, collegeId: string) {
  const college = await client.query(`SELECT id FROM public.institutes WHERE id=$1::uuid AND status='approved'
    AND applications_enabled=true AND admission_status='open' AND deleted_at IS NULL
    AND (admission_deadline IS NULL OR admission_deadline>now()) FOR SHARE`, [collegeId]);
  if (!college.rowCount) throw new GuestVerificationError(403, "ADMISSIONS_CLOSED", "This institution is not accepting applications.");
}

export async function startNeonGuestVerification(rawIdentity: Identity, channel: GuestVerificationChannel, options: Options = {}) {
  const environment = options.environment ?? process.env;
  requireNeonBackend(environment);
  const identity = normalizeGuestIdentity(rawIdentity);
  if (channel !== "email" && channel !== "whatsapp") throw unavailable(channel);
  const send = await senderFor(identity, channel, options);
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const hash = guestCodeHash(identity, channel, code, environment);
  const tokenHash = hashGuestToken(identity.guestToken);
  const destination = channel === "email" ? identity.email : identity.whatsappNumber;
  const col = columns(channel);
  const run = options.run ?? withTransaction;
  const verificationId = await run(async client => {
    await requireAcceptingCollege(client, identity.collegeId);
    // Token serialization covers cross-channel and cross-college aggregate limits.
    await client.query(`SELECT pg_advisory_xact_lock(hashtextextended($1::text,0))`, [`guest-verification:${tokenHash}`]);
    await client.query(`SELECT pg_advisory_xact_lock(hashtextextended($1::text,0))`, [`${channel}:${destination}`]);
    const [rate] = (await client.query<{ limited: boolean }>(`SELECT
      (SELECT count(*) FROM public.guest_college_verification_sends WHERE channel=$1 AND destination=$2
        AND created_at>now()-interval '1 hour')>=5 OR
      (SELECT count(*) FROM public.guest_college_verification_sends WHERE guest_token_hash=$3
        AND created_at>now()-interval '1 hour')>=10 AS limited`, [channel, destination, tokenHash])).rows;
    if (rate?.limited) throw new GuestVerificationError(429, "VERIFICATION_THROTTLED", "Too many verification requests. Please wait and try again.");
    const [existing] = (await client.query<Challenge>(`SELECT id,email,whatsapp_number,consumed_at,
      expires_at>now() AND consumed_at IS NULL AS active,
      ${col.requested}>now()-interval '60 seconds' AS throttled
      FROM public.guest_college_verifications WHERE guest_token_hash=$1 AND college_id=$2::uuid FOR UPDATE`,
    [tokenHash, identity.collegeId])).rows;
    let id: string;
    if (existing?.active && existing.email === identity.email && existing.whatsapp_number === identity.whatsappNumber) {
      if (existing.throttled) throw new GuestVerificationError(429, "VERIFICATION_THROTTLED", "Wait before requesting another code.");
      id = (await client.query<{ id: string }>(`UPDATE public.guest_college_verifications SET ${col.code}=$2,
        ${col.expires}=now()+interval '10 minutes',${col.dispatched}=NULL,${col.verified}=NULL,
        ${col.attempts}=0,${col.requested}=now(),updated_at=now() WHERE id=$1::uuid RETURNING id`, [existing.id, hash])).rows[0].id;
    } else {
      id = (await client.query<{ id: string }>(`INSERT INTO public.guest_college_verifications
        (guest_token_hash,college_id,email,whatsapp_number,${col.code},${col.expires},${col.requested})
        VALUES($1,$2::uuid,$3,$4,$5,now()+interval '10 minutes',now())
        ON CONFLICT(guest_token_hash,college_id) DO UPDATE SET id=gen_random_uuid(),email=EXCLUDED.email,
          whatsapp_number=EXCLUDED.whatsapp_number,email_code_hash=EXCLUDED.email_code_hash,
          whatsapp_code_hash=EXCLUDED.whatsapp_code_hash,email_code_expires_at=EXCLUDED.email_code_expires_at,
          whatsapp_code_expires_at=EXCLUDED.whatsapp_code_expires_at,email_dispatched_at=NULL,
          whatsapp_dispatched_at=NULL,email_verified_at=NULL,whatsapp_verified_at=NULL,email_attempts=0,
          whatsapp_attempts=0,last_email_requested_at=EXCLUDED.last_email_requested_at,
          last_whatsapp_requested_at=EXCLUDED.last_whatsapp_requested_at,expires_at=now()+interval '30 minutes',
          consumed_at=NULL,updated_at=now() RETURNING id`, [tokenHash, identity.collegeId, identity.email, identity.whatsappNumber, hash])).rows[0].id;
    }
    await client.query(`INSERT INTO public.guest_college_verification_sends(channel,destination,guest_token_hash) VALUES($1,$2,$3)`,
      [channel, destination, tokenHash]);
    return id;
  });
  try {
    await send(identity, channel, code);
    const delivered = await run(client => client.query(`UPDATE public.guest_college_verifications
      SET ${col.dispatched}=now(),updated_at=now() WHERE id=$1::uuid AND guest_token_hash=$2
        AND ${col.code}=$3 AND email=$4 AND whatsapp_number=$5 AND consumed_at IS NULL AND expires_at>now() RETURNING id`,
    [verificationId, tokenHash, hash, identity.email, identity.whatsappNumber]));
    if (!delivered.rowCount) throw unavailable(channel);
  } catch {
    await run(client => client.query(`UPDATE public.guest_college_verifications SET ${col.code}=NULL,
      ${col.requested}=NULL,${col.dispatched}=NULL,updated_at=now()
      WHERE id=$1::uuid AND guest_token_hash=$2 AND ${col.code}=$3`, [verificationId, tokenHash, hash]));
    throw unavailable(channel);
  }
  return { verificationId, channel, status: "code_requested" as const };
}

export async function checkNeonGuestVerification(rawIdentity: Identity, verificationId: string,
  channel: GuestVerificationChannel, code: string, options: Options = {}) {
  const environment = options.environment ?? process.env;
  requireNeonBackend(environment);
  const identity = normalizeGuestIdentity(rawIdentity);
  if (!uuid.test(verificationId) || !/^\d{6}$/.test(code) || !["email", "whatsapp"].includes(channel)) {
    throw new GuestVerificationError(422, "INVALID_CODE", "Enter the six-digit verification code.");
  }
  const hash = guestCodeHash(identity, channel, code, environment);
  const col = columns(channel);
  const valid = await (options.run ?? withTransaction)(async client => {
    const [row] = (await client.query<{ verified: boolean; usable: boolean; matching: boolean }>(`SELECT
      ${col.verified} IS NOT NULL AS verified,
      ${col.attempts}<5 AND ${col.dispatched} IS NOT NULL AND ${col.expires}>now() AS usable,
      ${col.code}=$6 AS matching FROM public.guest_college_verifications
      WHERE id=$1::uuid AND guest_token_hash=$2 AND college_id=$3::uuid AND email=$4 AND whatsapp_number=$5
        AND consumed_at IS NULL AND expires_at>now() FOR UPDATE`,
    [verificationId, hashGuestToken(identity.guestToken), identity.collegeId, identity.email, identity.whatsappNumber, hash])).rows;
    if (!row) return false;
    if (row.verified) return true;
    if (!row.usable) return false;
    await client.query(`UPDATE public.guest_college_verifications SET ${col.attempts}=${col.attempts}+1,
      ${col.verified}=CASE WHEN $2 THEN now() ELSE NULL END,${col.code}=CASE WHEN $2 THEN NULL ELSE ${col.code} END,
      updated_at=now() WHERE id=$1::uuid`, [verificationId, row.matching === true]);
    return row.matching === true;
  });
  // Throw after committing an invalid attempt; throwing inside the transaction
  // would roll back the attempt counter and allow unlimited guessing.
  if (!valid) throw new GuestVerificationError(422, "INVALID_CODE", "That code is invalid or expired. Request a new code if needed.");
  return { verificationId, channel, verified: true };
}

export async function submitNeonGuestCollegeApplication(rawPayload: Record<string, unknown>, guestToken: string,
  verificationId: string, idempotencyKey: string | undefined, options: Options = {}) {
  const environment = options.environment ?? process.env;
  requireNeonBackend(environment);
  const { _formVersion, _idempotencyKey, ...submitted } = rawPayload;
  const validation = validateModuleForm("college_application", submitted);
  if (!validation.success) throw new GuestVerificationError(422, "INVALID_GUEST_DETAILS", "Check your application details.");
  const payload = validation.data;
  const identity = normalizeGuestIdentity({ guestToken, collegeId: payload.collegeId, email: payload.email, whatsappNumber: payload.phone });
  if (!uuid.test(verificationId) || !idempotencyKey || !/^[a-zA-Z0-9][a-zA-Z0-9._:-]{7,127}$/.test(idempotencyKey)) throw proofRequired();
  if (typeof payload.fullName !== "string" || payload.fullName.trim().length < 2 || payload.fullName.length > 120) {
    throw new GuestVerificationError(422, "INVALID_GUEST_DETAILS", "Enter your full name.");
  }
  const fullName = payload.fullName.trim();
  const tokenHash = hashGuestToken(identity.guestToken);
  return (options.run ?? withTransaction)(async client => {
    const [challenge] = (await client.query<Challenge>(`SELECT id,email_verified_at,whatsapp_verified_at,consumed_at,
      expires_at>now() AS active FROM public.guest_college_verifications WHERE id=$1::uuid AND guest_token_hash=$2
      AND college_id=$3::uuid AND email=$4 AND whatsapp_number=$5 FOR UPDATE`,
    [verificationId, tokenHash, identity.collegeId, identity.email, identity.whatsappNumber])).rows;
    if (!challenge?.active) throw proofRequired();
    const [previous] = (await client.query<{ id: string; status: string; submitted_at: string; institute_id: string; email: string; whatsapp_number: string }>(
      `SELECT id,status,submitted_at,institute_id,email,whatsapp_number FROM public.college_applications
       WHERE guest_token_hash=$1 AND guest_idempotency_key=$2 AND applicant_id IS NULL LIMIT 1`, [tokenHash, idempotencyKey])).rows;
    if (previous) {
      if (previous.institute_id !== identity.collegeId || previous.email !== identity.email || previous.whatsapp_number !== identity.whatsappNumber) {
        throw new GuestVerificationError(409, "DUPLICATE_SUBMISSION", "This request key belongs to another application.");
      }
      return { id: previous.id, status: previous.status, createdAt: previous.submitted_at };
    }
    if (challenge.consumed_at || !challenge.email_verified_at || !challenge.whatsapp_verified_at) throw proofRequired();
    await requireAcceptingCollege(client, identity.collegeId);
    await client.query(`SELECT pg_advisory_xact_lock(hashtextextended($1::text,0))`, [`guest-admission:${identity.collegeId}:${identity.email}`]);
    const [rate] = (await client.query<{ limited: boolean }>(`SELECT count(*)>=3 AS limited FROM public.college_applications
      WHERE institute_id=$1::uuid AND lower(email)=$2 AND applicant_id IS NULL AND submitted_at>now()-interval '10 minutes'`,
    [identity.collegeId, identity.email])).rows;
    if (rate?.limited) throw new GuestVerificationError(429, "APPLICATION_THROTTLED", "Too many applications. Please try again later.");
    const formData = { ...payload, email: identity.email, phone: identity.whatsappNumber, _submission_mode: "guest", _formVersion: 1 };
    const [saved] = (await client.query<{ id: string; status: string; submitted_at: string }>(`INSERT INTO public.college_applications
      (institute_id,applicant_id,full_name,email,phone,whatsapp_number,program_interest,intake,message,form_data,
       guest_token_hash,guest_idempotency_key,guest_email_verified_at,guest_whatsapp_verified_at)
      VALUES($1::uuid,NULL,$2,$3,$4,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,$12) RETURNING id,status,submitted_at`,
    [identity.collegeId, fullName, identity.email, identity.whatsappNumber,
      payload.intendedCourse || null, payload.preferredIntake || null, payload.message || null, JSON.stringify(formData),
      tokenHash, idempotencyKey, challenge.email_verified_at, challenge.whatsapp_verified_at])).rows;
    if (!saved) throw new Error("Guest application was not saved.");
    await client.query(`UPDATE public.guest_college_verifications SET consumed_at=now(),updated_at=now() WHERE id=$1::uuid`, [challenge.id]);
    await client.query(`INSERT INTO public.audit_logs(action,entity_type,entity_id,metadata)
      VALUES('submit_guest_college_application','college_application',$1::text,
        jsonb_build_object('college_id',$2::uuid,'verified_email',true,'verified_whatsapp',true))`, [saved.id, identity.collegeId]);
    const notices = await client.query<{ id: string; recipient_id: string }>(`WITH recipients AS (
      SELECT DISTINCT p.user_id,p.email FROM public.profiles p WHERE p.account_status='active' AND p.deleted_at IS NULL
        AND (EXISTS(SELECT 1 FROM public.user_roles ur WHERE ur.user_id=p.user_id AND ur.role IN ('admin','super_admin'))
          OR EXISTS(SELECT 1 FROM public.entity_admin_assignments a
            JOIN public.user_module_capabilities umc ON umc.id=a.user_capability_id AND umc.user_id=p.user_id
              AND umc.status='active' AND (umc.expires_at IS NULL OR umc.expires_at>now())
            JOIN public.module_capabilities mc ON mc.id=umc.capability_id AND mc.module_key='college' AND mc.is_active
            WHERE a.user_id=p.user_id AND a.entity_type='college' AND a.entity_id=$1::uuid AND a.status='active'))
    ) INSERT INTO public.notifications(recipient_id,title,message,type,category,channel,status,entity_type,entity_id,
      email_to,action_url,metadata)
    SELECT r.user_id,'New college application','A new application is available for your assigned college.',
      'info','college_application',delivery.channel,'queued','college_application',$2::uuid,
      CASE WHEN delivery.channel='email' THEN r.email ELSE NULL END,'/institute',
      jsonb_build_object('source_type','college_application','source_id',$2::uuid,'college_id',$1::uuid,
        'delivery_environment',$3::text)
    FROM recipients r CROSS JOIN (VALUES('dashboard'),('email')) delivery(channel)
    WHERE (delivery.channel='dashboard' OR r.email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$')
      AND NOT EXISTS(SELECT 1 FROM public.notifications n WHERE n.recipient_id=r.user_id
        AND n.entity_type='college_application' AND n.entity_id=$2::uuid AND n.channel=delivery.channel)
    RETURNING id,recipient_id`, [identity.collegeId, saved.id, getBackendMode(environment)]);
    for (const notice of notices.rows) await appendNotificationEvent(client, notice.recipient_id, notice.id);
    const lead = (await client.query<{ id: string }>(`SELECT id FROM public.leads
      WHERE source_type='college_application' AND source_id=$1::uuid`, [saved.id])).rows[0];
    return { id: saved.id, status: saved.status, createdAt: saved.submitted_at, ...(lead ? { leadId: lead.id } : {}) };
  });
}

/** Guest-token possession plus a verified session email claims application
 * history only. The application's pre-existing trusted identity link remains
 * mandatory; this operation never creates a user link or grants a capability. */
export async function claimNeonGuestCollegeApplications(actor: NeonActor, guestToken: string, verifiedSessionEmail: string,
  run: NeonMaintenanceTransaction = withTransaction) {
  requireNeonBackend();
  if (!uuid.test(guestToken) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(verifiedSessionEmail)) {
    throw new GuestVerificationError(422, "INVALID_GUEST_DETAILS", "Enter a valid guest application token.");
  }
  return run(async client => {
    const linked = await client.query(`SELECT p.user_id FROM public.profiles p
      JOIN public.neon_application_accounts a ON a.legacy_user_id=p.user_id AND a.status='active'
      JOIN public.neon_identity_links l ON l.application_account_id=a.id AND l.status='verified'
      WHERE p.user_id=$1::uuid AND l.neon_auth_user_id=$2::uuid AND p.account_status='active'
        AND p.deleted_at IS NULL FOR SHARE OF p,a,l`, [actor.userId, actor.neonAuthUserId]);
    if (!linked.rowCount) throw new NeonAuthorizationError(403, "IDENTITY_NOT_LINKED", "The application identity link is inactive.");
    const claimed = await client.query<{ id: string }>(`UPDATE public.college_applications SET
      applicant_id=$1::uuid,guest_token_hash=NULL,guest_idempotency_key=NULL,updated_at=now()
      WHERE applicant_id IS NULL AND deleted_at IS NULL AND guest_token_hash=$2 AND lower(email)=$3 RETURNING id`,
    [actor.userId, hashGuestToken(guestToken), verifiedSessionEmail.trim().toLowerCase()]);
    if (claimed.rows.length) {
      await client.query(`UPDATE public.leads SET applicant_user_id=$1::uuid,updated_at=now()
        WHERE source_type='college_application' AND source_id=ANY($2::uuid[])`, [actor.userId, claimed.rows.map(row => row.id)]);
      await client.query(`INSERT INTO public.audit_logs(actor_user_id,action,entity_type,entity_id,metadata)
        VALUES($1::uuid,'claim_guest_college_applications','college_applications',$1::text,
          jsonb_build_object('claimed_count',$2::int))`, [actor.userId, claimed.rows.length]);
    }
    return { claimed_count: claimed.rows.length };
  });
}
