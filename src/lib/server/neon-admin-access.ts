/** Super Admin People grants: capability, entity and manual ledger stay atomic. */
import { createHash } from "node:crypto";
import type { PoolClient, QueryResultRow } from "pg";
import { queryRows, withTransaction } from "./db";
import { NeonAuthorizationError, requireSuperAdmin, type NeonActor, type NeonQueryExecutor } from "./neon-authorization";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const entities = {
  college: { type: "college", table: "institutes" },
  jobs: { type: "company", table: "companies" },
  mentor: { type: "mentor", table: "mentors" },
  events: { type: "event", table: "events" },
} as const;
export type ManagedModule = keyof typeof entities;
type Run = <T>(operation: (client: PoolClient) => Promise<T>) => Promise<T>;
const defaultDb: NeonQueryExecutor = { query: queryRows };
const fail = (status: 400 | 401 | 403 | 404 | 409 | 503, code: string, message: string): never => {
  throw new NeonAuthorizationError(status, code, message);
};
const adminGuard = `EXISTS (SELECT 1 FROM public.profiles p
  JOIN public.user_roles r ON r.user_id=p.user_id
  JOIN public.neon_application_accounts a ON a.legacy_user_id=p.user_id AND a.status='active'
  JOIN public.neon_identity_links l ON l.application_account_id=a.id AND l.status='verified'
  WHERE p.user_id=$1::uuid AND p.account_status='active' AND p.deleted_at IS NULL
    AND r.role IN ('admin','super_admin') AND l.neon_auth_user_id=$2::uuid)`;

async function assertAdmin(client: PoolClient, actor: NeonActor): Promise<void> {
  requireSuperAdmin(actor);
  const result = await client.query<{ allowed: boolean }>(`SELECT ${adminGuard} AS allowed`,
    [actor.userId, actor.neonAuthUserId]);
  if (!result.rows[0]?.allowed) fail(403, "ADMIN_REQUIRED", "Active linked Super Admin access is required.");
}

export interface AssignmentInput {
  userId: string;
  module: ManagedModule;
  entityId: string;
  startAt: string;
  expiresAt: string;
  amount: number;
  transactionReference?: string;
  note?: string;
  idempotencyKey: string;
}
export interface AssignmentResult {
  assignmentId: string;
  capabilityId: string;
  paymentId: string | null;
  entitlementId: string | null;
  paymentStatus: "pending" | "not_required";
  duplicate: boolean;
}

const featureSets: Record<ManagedModule, Record<string, boolean>> = {
  college: { profile_editing: true, media_management: true, college_applications: true, lead_viewing: true },
  jobs: { job_management: true, application_management: true, lead_viewing: true },
  mentor: { profile_editing: true, session_management: true, booking_management: true, lead_viewing: true },
  events: { event_management: true, registration_management: true, lead_viewing: true },
};

function validateAssignment(input: AssignmentInput) {
  if (!uuid.test(input.userId) || !uuid.test(input.entityId) || !uuid.test(input.idempotencyKey) ||
      !Object.hasOwn(entities, input.module)) fail(400, "INVALID_ASSIGNMENT", "Select a valid user, module and entity.");
  const start = new Date(input.startAt);
  const end = new Date(input.expiresAt);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) ||
      end <= start || end.getTime() <= Date.now() || end.getTime() - start.getTime() > 3650 * 86_400_000) {
    fail(400, "INVALID_ASSIGNMENT_DATES", "Choose valid subscription dates within ten years.");
  }
  if (!Number.isFinite(input.amount) || input.amount < 0 || input.amount > 100_000_000 ||
      Math.round(input.amount * 100) !== input.amount * 100) {
    fail(400, "INVALID_AMOUNT", "Enter a valid non-negative NPR amount.");
  }
  const reference = input.transactionReference?.trim() ?? "";
  if ((input.amount > 0 && (reference.length < 4 || reference.length > 180)) ||
      (input.amount === 0 && reference.length > 0) || (input.note?.length ?? 0) > 1000) {
    fail(400, "INVALID_PAYMENT_REFERENCE", "A unique manual payment reference is required for a positive amount.");
  }
  return { start, end, reference, note: input.note?.trim() ?? "" };
}

export async function listNeonAssignableEntities(actor: NeonActor, module: ManagedModule,
  search = "", db: NeonQueryExecutor = defaultDb): Promise<Array<{ id: string; label: string }>> {
  requireSuperAdmin(actor);
  if (!Object.hasOwn(entities, module) || search.length > 120) fail(400, "INVALID_ENTITY_QUERY", "Invalid entity search.");
  const entity = entities[module];
  const label = module === "college" || module === "jobs" ? "e.name"
    : module === "events" ? "e.title" : "COALESCE(p.full_name,p.email,e.headline,'Mentor')";
  const join = module === "mentor" ? "LEFT JOIN public.profiles p ON p.user_id=e.user_id" : "";
  const rows = await db.query<QueryResultRow & { id: string; label: string }>(`
    SELECT e.id,${label} AS label FROM public.${entity.table} e ${join}
    WHERE ${adminGuard} AND e.deleted_at IS NULL
      AND ($3::text='' OR ${label} ILIKE '%' || $3 || '%')
    ORDER BY label,e.id LIMIT 100`, [actor.userId, actor.neonAuthUserId, search.trim()]);
  return rows.map(row => ({ id: row.id, label: row.label }));
}

export async function assignNeonModuleAccess(actor: NeonActor, input: AssignmentInput,
  run: Run = withTransaction): Promise<AssignmentResult> {
  requireSuperAdmin(actor);
  if (input.userId === actor.userId) fail(403, "SELF_ASSIGNMENT_DENIED", "Super Admin needs no module purchase.");
  const { start, end, reference, note } = validateAssignment(input);
  const entity = entities[input.module];
  const fingerprint = createHash("sha256").update(JSON.stringify({ ...input,
    startAt: start.toISOString(), expiresAt: end.toISOString(),
    transactionReference: reference, note })).digest("hex");
  return run(async client => {
    await assertAdmin(client, actor);
    const target = (await client.query<{ user_id: string }>(`
      SELECT user_id FROM public.profiles WHERE user_id=$1::uuid AND account_status='active'
        AND deleted_at IS NULL FOR UPDATE`, [input.userId])).rows[0];
    if (!target) fail(404, "TARGET_UNAVAILABLE", "The selected active user was not found.");
    const privileged = (await client.query<{ exists: boolean }>(`
      SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=$1::uuid
        AND role IN ('admin','super_admin')) AS exists`, [input.userId])).rows[0]?.exists;
    if (privileged) fail(403, "ADMIN_ASSIGNMENT_DENIED", "Super Admin does not need a paid module assignment.");
    const previous = (await client.query<{ fingerprint: string; result: AssignmentResult }>(`
      SELECT metadata->>'fingerprint' AS fingerprint,metadata->'result' AS result
      FROM public.audit_logs WHERE action='ADMIN_MODULE_ACCESS_ASSIGNED'
        AND metadata->>'idempotency_key'=$1 AND actor_user_id=$2::uuid
      ORDER BY id DESC LIMIT 1`, [input.idempotencyKey, actor.userId])).rows[0];
    if (previous) {
      if (previous.fingerprint !== fingerprint) fail(409, "IDEMPOTENCY_CONFLICT", "This operation key was used for different details.");
      return { ...previous.result, duplicate: true };
    }
    const capability = (await client.query<{ id: string }>(`
      SELECT id FROM public.module_capabilities WHERE module_key=$1 AND is_active`, [input.module])).rows[0];
    if (!capability) fail(409, "MODULE_UNAVAILABLE", "This module is not active.");
    const found = (await client.query<{ id: string }>(`
      SELECT id FROM public.${entity.table} WHERE id=$1::uuid AND deleted_at IS NULL`, [input.entityId])).rows[0];
    if (!found) fail(404, "ENTITY_NOT_FOUND", "The selected entity was not found.");
    const pending = (await client.query<{ id: string }>(`
      SELECT id FROM public.payments WHERE user_id=$1::uuid AND payment_type='module_subscription'
        AND gateway='manual' AND status='pending' AND deleted_at IS NULL
        AND metadata->>'module'=$2 AND metadata->>'entity_id'=$3 LIMIT 1 FOR UPDATE`,
      [input.userId, input.module, input.entityId])).rows[0];
    if (pending) fail(409, "PENDING_PAYMENT_EXISTS", "Review the existing pending manual payment first.");
    const userCapability = (await client.query<{ id: string }>(`
      INSERT INTO public.user_module_capabilities(user_id,capability_id,status,granted_by)
      VALUES ($1::uuid,$2::uuid,'active',$3::uuid)
      ON CONFLICT (user_id,capability_id) DO UPDATE SET status='active',revoked_by=NULL,
        revoked_at=NULL,expires_at=NULL,updated_at=now() RETURNING id`,
      [input.userId, capability.id, actor.userId])).rows[0];
    const assignment = (await client.query<{ id: string }>(`
      INSERT INTO public.entity_admin_assignments(user_id,user_capability_id,entity_type,entity_id,status,assigned_by)
      VALUES ($1::uuid,$2::uuid,$3,$4::uuid,'active',$5::uuid)
      ON CONFLICT (user_capability_id,entity_type,entity_id) DO UPDATE SET status='active',
        revoked_by=NULL,revoked_at=NULL,updated_at=now() RETURNING id`,
      [input.userId, userCapability.id, entity.type, input.entityId, actor.userId])).rows[0];
    let paymentId: string | null = null;
    let entitlementId: string | null = null;
    if (input.amount > 0) {
      const payment = (await client.query<{ id: string }>(`
        INSERT INTO public.payments(user_id,payment_type,reference_id,amount,currency,status,
          payment_method,transaction_id,gateway,gateway_transaction_id,metadata)
        VALUES ($1::uuid,'module_subscription',$2::uuid,$3,'NPR','pending','manual',$4,
          'manual',$4,jsonb_build_object('module',$5::text,'entity_type',$6::text,
          'entity_id',$7::uuid,'start_at',$8::timestamptz,'expires_at',$9::timestamptz,
          'recorded_by',$10::uuid,'note',$11::text,'idempotency_key',$12::uuid))
        ON CONFLICT (gateway,gateway_transaction_id)
          WHERE gateway_transaction_id IS NOT NULL DO NOTHING RETURNING id`,
      [input.userId, assignment.id, input.amount, reference, input.module, entity.type,
        input.entityId, start, end, actor.userId, note, input.idempotencyKey])).rows[0];
      if (!payment) fail(409, "DUPLICATE_PAYMENT_REFERENCE", "That manual transaction reference already exists.");
      paymentId = payment.id;
    } else {
      const created = (await client.query<{ id: string }>(`
        INSERT INTO public.module_entitlements(user_id,module_key,entity_type,entity_id,source,status,
          start_at,expires_at,features,granted_by,reason)
        VALUES ($1::uuid,$2,$3,$4::uuid,'ADMIN_MANUAL','active',$5,$6,$7::jsonb,$8::uuid,$9)
        RETURNING id`, [input.userId, input.module, entity.type, input.entityId,start,end,
          JSON.stringify(featureSets[input.module]), actor.userId, note || "Complimentary Super Admin assignment"])).rows[0];
      entitlementId = created.id;
    }
    const result: AssignmentResult = { assignmentId: assignment.id,
      capabilityId: userCapability.id, paymentId, entitlementId,
      paymentStatus: paymentId ? "pending" : "not_required", duplicate: false };
    await client.query(`INSERT INTO public.audit_logs(actor_user_id,action,entity_type,entity_id,metadata)
      VALUES ($1::uuid,'ADMIN_MODULE_ACCESS_ASSIGNED',$2,$3::text,
        jsonb_build_object('target_user_id',$4::uuid,'module',$5::text,
          'amount',$6::numeric,'payment_id',$7::uuid,'entitlement_id',$8::uuid,
          'idempotency_key',$9::uuid,'fingerprint',$10::text,'result',$11::jsonb))`,
    [actor.userId, entity.type, input.entityId, input.userId, input.module, input.amount,
      paymentId, entitlementId, input.idempotencyKey, fingerprint, JSON.stringify(result)]);
    return result;
  });
}

export async function listNeonUserAccess(actor: NeonActor, userId: string,
  db: NeonQueryExecutor = defaultDb) {
  requireSuperAdmin(actor);
  if (!uuid.test(userId)) fail(400, "INVALID_USER", "Select a valid user.");
  const rows = await db.query<QueryResultRow & { capability_id: string; module_key: string;
    capability_status: string; assignment_id: string | null; entity_type: string | null;
    entity_id: string | null; assignment_status: string | null; label: string | null }>(`
    SELECT umc.id AS capability_id,mc.module_key,umc.status AS capability_status,
      a.id AS assignment_id,a.entity_type,a.entity_id,a.status AS assignment_status,
      CASE a.entity_type WHEN 'college' THEN (SELECT name FROM public.institutes WHERE id=a.entity_id)
        WHEN 'company' THEN (SELECT name FROM public.companies WHERE id=a.entity_id)
        WHEN 'mentor' THEN (SELECT COALESCE(p.full_name,p.email,m.headline) FROM public.mentors m
          LEFT JOIN public.profiles p ON p.user_id=m.user_id WHERE m.id=a.entity_id)
        WHEN 'event' THEN (SELECT title FROM public.events WHERE id=a.entity_id)
      END AS label
    FROM public.user_module_capabilities umc
    JOIN public.module_capabilities mc ON mc.id=umc.capability_id
    LEFT JOIN public.entity_admin_assignments a ON a.user_capability_id=umc.id
    WHERE ${adminGuard} AND umc.user_id=$3::uuid
    ORDER BY mc.module_key,a.created_at,a.id`, [actor.userId, actor.neonAuthUserId, userId]);
  return rows.map(row => ({ capabilityId: row.capability_id, module: row.module_key,
    capabilityStatus: row.capability_status, assignmentId: row.assignment_id,
    entityType: row.entity_type, entityId: row.entity_id,
    assignmentStatus: row.assignment_status, label: row.label }));
}

export async function listNeonManualPayments(actor: NeonActor, userId: string,
  db: NeonQueryExecutor = defaultDb) {
  requireSuperAdmin(actor);
  if (!uuid.test(userId)) fail(400, "INVALID_USER", "Select a valid user.");
  const rows = await db.query<QueryResultRow & { id: string; amount: string; status: string;
    transaction_id: string; created_at: string; module: string; entity_id: string }>(`
    SELECT pay.id,pay.amount,pay.status,pay.transaction_id,pay.created_at,
      pay.metadata->>'module' AS module,pay.metadata->>'entity_id' AS entity_id
    FROM public.payments pay WHERE ${adminGuard} AND pay.user_id=$3::uuid
      AND pay.payment_type='module_subscription' AND pay.gateway='manual'
      AND pay.deleted_at IS NULL ORDER BY pay.created_at DESC LIMIT 100`,
  [actor.userId,actor.neonAuthUserId,userId]);
  return rows.map(row => ({ id: row.id, amount: Number(row.amount), status: row.status,
    transactionReference: row.transaction_id, createdAt: row.created_at,
    module: row.module, entityId: row.entity_id }));
}

export async function reviewNeonManualPayment(actor: NeonActor, paymentId: string,
  decision: "confirm" | "reject", note: string, run: Run = withTransaction) {
  requireSuperAdmin(actor);
  if (!uuid.test(paymentId) || !["confirm", "reject"].includes(decision) ||
      note.trim().length < 8 || note.length > 1000) {
    fail(400, "INVALID_PAYMENT_REVIEW", "Provide a valid decision and review note (8–1000 characters).");
  }
  return run(async client => {
    await assertAdmin(client, actor);
    const paymentOwner = (await client.query<{ user_id: string }>(`
      SELECT user_id FROM public.payments WHERE id=$1::uuid AND deleted_at IS NULL`,
    [paymentId])).rows[0];
    if (!paymentOwner) fail(404, "MANUAL_PAYMENT_NOT_FOUND", "Manual module payment not found.");
    await client.query(`SELECT user_id FROM public.profiles WHERE user_id=$1::uuid FOR UPDATE`,
      [paymentOwner.user_id]);
    const payment = (await client.query<{ id: string; user_id: string; reference_id: string;
      status: string; gateway: string; payment_type: string; metadata: Record<string, unknown> }>(`
      SELECT id,user_id,reference_id,status,gateway,payment_type,metadata
      FROM public.payments WHERE id=$1::uuid AND deleted_at IS NULL FOR UPDATE`, [paymentId])).rows[0];
    if (!payment || payment.user_id !== paymentOwner.user_id || payment.gateway !== "manual" || payment.payment_type !== "module_subscription") {
      fail(404, "MANUAL_PAYMENT_NOT_FOUND", "Manual module payment not found.");
    }
    const desired = decision === "confirm" ? "success" : "failed";
    if (payment.status === desired) return { paymentId, status: desired, duplicate: true };
    if (payment.status !== "pending") fail(409, "PAYMENT_ALREADY_REVIEWED", "This payment has a conflicting final state.");
    const meta = payment.metadata ?? {};
    const moduleKey = meta.module as ManagedModule;
    const entity = entities[moduleKey];
    const entityId = meta.entity_id;
    const startAt = new Date(String(meta.start_at));
    const expiresAt = new Date(String(meta.expires_at));
    if (!entity || meta.entity_type !== entity.type || typeof entityId !== "string" ||
        !uuid.test(entityId) || !Number.isFinite(startAt.getTime()) ||
        !Number.isFinite(expiresAt.getTime()) || expiresAt <= startAt) {
      fail(409, "PAYMENT_SCOPE_INVALID", "The stored payment scope is invalid.");
    }
    const assigned = (await client.query<{ id: string }>(`
      SELECT a.id FROM public.entity_admin_assignments a
        JOIN public.user_module_capabilities umc ON umc.id=a.user_capability_id
        JOIN public.module_capabilities mc ON mc.id=umc.capability_id
        JOIN public.profiles p ON p.user_id=a.user_id
        WHERE a.id=$1::uuid AND a.user_id=$2::uuid AND a.entity_type=$3
          AND a.entity_id=$4::uuid AND a.status='active' AND umc.status='active'
          AND mc.module_key=$5 AND mc.is_active AND p.account_status='active'
          AND p.deleted_at IS NULL FOR UPDATE OF a,umc,p`,
    [payment.reference_id, payment.user_id, entity.type, entityId, moduleKey])).rows[0];
    if (decision === "confirm" && !assigned) {
      fail(409, "ASSIGNMENT_INACTIVE", "The linked active assignment is required before settlement.");
    }
    let entitlementId: string | null = null;
    if (decision === "confirm") {
      const effectiveStart = new Date(Math.max(Date.now(), startAt.getTime()));
      const effectiveEnd = new Date(effectiveStart.getTime() + expiresAt.getTime() - startAt.getTime());
      const entitlement = (await client.query<{ id: string }>(`
        INSERT INTO public.module_entitlements(user_id,module_key,entity_type,entity_id,source,status,
          start_at,expires_at,features,granted_by,payment_id,reason)
        VALUES ($1::uuid,$2,$3,$4::uuid,'ADMIN_MANUAL','active',$5,$6,$7::jsonb,$8::uuid,$9::uuid,$10)
        RETURNING id`, [payment.user_id,moduleKey,entity.type,entityId,effectiveStart,effectiveEnd,
          JSON.stringify(featureSets[moduleKey]),actor.userId,paymentId,note.trim()])).rows[0];
      entitlementId = entitlement.id;
      await client.query(`UPDATE public.payments SET status='success',paid_at=now(),
        verified_by_user_id=$2::uuid,verification_note=$3,updated_at=now() WHERE id=$1::uuid`,
      [paymentId, actor.userId, note.trim()]);
    } else {
      await client.query(`UPDATE public.payments SET status='failed',failed_at=now(),
        failure_reason=$2,verified_by_user_id=$3::uuid,verification_note=$2,updated_at=now()
        WHERE id=$1::uuid`, [paymentId,note.trim(),actor.userId]);
    }
    await client.query(`INSERT INTO public.audit_logs(actor_user_id,action,entity_type,entity_id,metadata)
      VALUES ($1::uuid,$2,'payments',$3::text,jsonb_build_object('target_user_id',$4::uuid,
        'module',$5::text,'entity_id',$6::uuid,'decision',$7::text,'entitlement_id',$8::uuid,
        'review_note',$9::text))`, [actor.userId,
      decision === "confirm" ? "CONFIRM_MANUAL_PAYMENT" : "REJECT_MANUAL_PAYMENT",paymentId,
      payment.user_id,moduleKey,entityId,decision,entitlementId,note.trim()]);
    return { paymentId, status: desired, entitlementId, duplicate: false };
  });
}

export async function revokeNeonAccess(actor: NeonActor, input: { userId: string;
  kind: "scope" | "capability"; id: string }, run: Run = withTransaction) {
  requireSuperAdmin(actor);
  if (!uuid.test(input.userId) || !uuid.test(input.id) ||
      !["scope", "capability"].includes(input.kind) || input.userId === actor.userId) {
    fail(400, "INVALID_REVOCATION", "Select a valid user's access to revoke.");
  }
  return run(async client => {
    await assertAdmin(client, actor);
    const target = (await client.query<{ user_id: string }>(`
      SELECT user_id FROM public.profiles WHERE user_id=$1::uuid AND deleted_at IS NULL FOR UPDATE`,
    [input.userId])).rows[0];
    if (!target) fail(404, "TARGET_UNAVAILABLE", "User not found.");
    if (input.kind === "scope") {
      const scope = (await client.query<{ id: string; module_key: string; entity_type: string;
        entity_id: string; status: string }>(`
        SELECT a.id,mc.module_key,a.entity_type,a.entity_id,a.status
        FROM public.entity_admin_assignments a
        JOIN public.user_module_capabilities umc ON umc.id=a.user_capability_id
        JOIN public.module_capabilities mc ON mc.id=umc.capability_id
        WHERE a.id=$1::uuid AND a.user_id=$2::uuid FOR UPDATE OF a`,
      [input.id,input.userId])).rows[0];
      if (!scope) fail(404, "SCOPE_NOT_FOUND", "Scope not found for this user.");
      if (scope.status === "revoked") return { id: scope.id, status: "revoked", duplicate: true };
      await client.query(`UPDATE public.entity_admin_assignments SET status='revoked',
        revoked_by=$2::uuid,revoked_at=now(),updated_at=now() WHERE id=$1::uuid`,[scope.id,actor.userId]);
      await client.query(`UPDATE public.module_entitlements SET status='revoked',revoked_at=now(),updated_at=now()
        WHERE user_id=$1::uuid AND module_key=$2 AND entity_type=$3 AND entity_id=$4::uuid
          AND status='active'`,[input.userId,scope.module_key,scope.entity_type,scope.entity_id]);
      await client.query(`UPDATE public.payments SET status='failed',failed_at=now(),
        failure_reason='Administrative scope revoked before payment confirmation',updated_at=now()
        WHERE user_id=$1::uuid AND payment_type='module_subscription' AND gateway='manual'
          AND status='pending' AND reference_id=$2::uuid`,[input.userId,scope.id]);
      await client.query(`INSERT INTO public.audit_logs(actor_user_id,action,entity_type,entity_id,metadata)
        VALUES ($1::uuid,'REVOKE_MODULE_SCOPE',$2,$3::text,
          jsonb_build_object('target_user_id',$4::uuid,'module',$5::text,'assignment_id',$6::uuid))`,
      [actor.userId,scope.entity_type,scope.entity_id,input.userId,scope.module_key,scope.id]);
    } else {
      const capability = (await client.query<{ id: string; module_key: string; status: string }>(`
        SELECT umc.id,mc.module_key,umc.status FROM public.user_module_capabilities umc
        JOIN public.module_capabilities mc ON mc.id=umc.capability_id
        WHERE umc.id=$1::uuid AND umc.user_id=$2::uuid FOR UPDATE OF umc`,
      [input.id,input.userId])).rows[0];
      if (!capability) fail(404, "CAPABILITY_NOT_FOUND", "Capability not found for this user.");
      if (capability.status === "revoked") return { id: capability.id, status: "revoked", duplicate: true };
      await client.query(`UPDATE public.user_module_capabilities SET status='revoked',
        revoked_by=$2::uuid,revoked_at=now(),updated_at=now() WHERE id=$1::uuid`,[capability.id,actor.userId]);
      await client.query(`UPDATE public.entity_admin_assignments SET status='revoked',
        revoked_by=$2::uuid,revoked_at=now(),updated_at=now()
        WHERE user_capability_id=$1::uuid AND status='active'`,[capability.id,actor.userId]);
      await client.query(`UPDATE public.module_entitlements SET status='revoked',revoked_at=now(),updated_at=now()
        WHERE user_id=$1::uuid AND module_key=$2 AND status='active'`,[input.userId,capability.module_key]);
      await client.query(`UPDATE public.payments SET status='failed',failed_at=now(),
        failure_reason='Administrative module revoked before payment confirmation',updated_at=now()
        WHERE user_id=$1::uuid AND payment_type='module_subscription' AND gateway='manual'
          AND status='pending' AND metadata->>'module'=$2`,[input.userId,capability.module_key]);
      await client.query(`INSERT INTO public.audit_logs(actor_user_id,action,entity_type,entity_id,metadata)
        VALUES ($1::uuid,'REVOKE_MODULE_CAPABILITY','module_capability',$2::text,
          jsonb_build_object('target_user_id',$3::uuid,'module',$4::text))`,
      [actor.userId,capability.id,input.userId,capability.module_key]);
    }
    return { id: input.id, status: "revoked", duplicate: false };
  });
}
