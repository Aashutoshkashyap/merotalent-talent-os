/** Delegated access requests preserve the approval, payment and entity-scope boundaries. */
import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { withTransaction } from "./db";
import { NeonAuthorizationError, type NeonActor } from "./neon-authorization";
import { buildMediaObjectPath, parseMediaUploadIntent } from "./media-policy";
import { validateManagedMediaBytes } from "./neon-managed-media";
import { createPresignedDownloadUrl, deleteObject, headObject, uploadObject } from "./storage";
import { appendNotificationEvent } from "./neon-application-events";

type Client = Pick<PoolClient, "query">;
type Run = <T>(operation: (client: PoolClient) => Promise<T>) => Promise<T>;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const modules = ["college", "jobs", "mentor", "events"] as const;
export type AccessModule = typeof modules[number];
export interface RequestProof { path: string; fileName: string; contentType: string; size: number }
export interface ModuleAccessInput {
  draftId: string; modules: AccessModule[]; packageId: string; collegeId?: string;
  reason: string; organization: string; proofs: Partial<Record<AccessModule, RequestProof>>;
}
interface Scope { module_key: AccessModule; entity_type: string | null; entity_id: string | null; proof: RequestProof }
interface RequestRow {
  id: string; user_id: string; status: string; requested_modules: AccessModule[];
  requested_entity_scopes: Scope[]; package_id: string | null; payment_id: string | null;
  payment_status: string; assigned_capabilities: string[];
}
const fail = (status: 400 | 403 | 404 | 409 | 503, code: string, message: string): never => {
  throw new NeonAuthorizationError(status, code, message);
};

async function assertActor(client: Client, actor: NeonActor, admin = false) {
  const profile = (await client.query<{ full_name: string; email: string; phone: string; admin: boolean }>(`
    SELECT p.full_name,p.email,p.phone,EXISTS (SELECT 1 FROM public.user_roles r
      WHERE r.user_id=p.user_id AND r.role IN ('admin','super_admin')) AS admin
    FROM public.profiles p JOIN public.neon_application_accounts a ON a.legacy_user_id=p.user_id AND a.status='active'
    JOIN public.neon_identity_links l ON l.application_account_id=a.id AND l.status='verified'
    WHERE p.user_id=$1::uuid AND l.neon_auth_user_id=$2::uuid AND p.account_status='active'
      AND p.deleted_at IS NULL FOR SHARE OF p,a,l`, [actor.userId, actor.neonAuthUserId])).rows[0];
  if (!profile || (admin && (!actor.platformAdmin || !profile.admin)))
    fail(403, "ACCESS_DENIED", "An active verified account with the required access is needed.");
  return profile;
}

function validateInput(input: ModuleAccessInput) {
  if (!uuid.test(input.draftId) || !uuid.test(input.packageId) || !Array.isArray(input.modules) ||
      !input.modules.length || input.modules.length > modules.length ||
      new Set(input.modules).size !== input.modules.length || input.modules.some(key => !modules.includes(key)) ||
      typeof input.reason !== "string" || input.reason.trim().length < 10 || input.reason.length > 2000 ||
      typeof input.organization !== "string" || input.organization.trim().length < 2 || input.organization.length > 180 ||
      (input.modules.includes("college") && (!input.collegeId || !uuid.test(input.collegeId))) ||
      (!input.modules.includes("college") && input.collegeId !== undefined) ||
      !input.proofs || typeof input.proofs !== "object" || Array.isArray(input.proofs) ||
      Object.keys(input.proofs).some(key => !input.modules.includes(key as AccessModule)))
    fail(400, "INVALID_REQUEST", "Select valid modules, a plan, organization, college and supporting documents.");
  for (const key of input.modules) {
    const proof = input.proofs[key];
    if (!proof || typeof proof.path !== "string" || typeof proof.fileName !== "string" ||
        typeof proof.contentType !== "string" || !Number.isSafeInteger(proof.size) || proof.size <= 0)
      fail(400, "PROOF_REQUIRED", "Upload a supporting document for each selected module.");
  }
}

async function planForModules(client: Client, packageId: string, requested: string[]) {
  const plan = (await client.query<{ id: string; price: number; currency: string; features: Record<string, boolean>;
    duration_days: number | null; billing_interval: string }>(`
    SELECT id,price::float AS price,currency,features,duration_days,billing_interval FROM public.packages
    WHERE id=$1::uuid AND is_active AND is_publicly_selectable AND deleted_at IS NULL
      AND package_kind='paid' AND module_scope @> $2::text[] FOR SHARE`, [packageId, requested])).rows[0];
  if (!plan || !Number.isFinite(plan.price) || plan.price <= 0 || Math.round(plan.price * 100) !== plan.price * 100)
    fail(409, "PLAN_UNAVAILABLE", "This public paid plan does not cover all requested modules.");
  return plan;
}

export async function prepareNeonModuleAccessCheckout(actor: NeonActor, requestId: string, packageId: string, client: Client) {
  if (!uuid.test(requestId) || !uuid.test(packageId)) fail(400, "INVALID_REQUEST", "Choose a valid request and plan.");
  await assertActor(client, actor);
  const row = (await client.query<RequestRow>(`SELECT * FROM public.sub_admin_requests WHERE id=$1::uuid FOR UPDATE`, [requestId])).rows[0];
  if (!row || row.user_id !== actor.userId) fail(404, "REQUEST_NOT_FOUND", "Access request not found.");
  if (!["pending", "approved"].includes(row.status) || row.payment_status === "success")
    fail(409, "REQUEST_NOT_PAYABLE", "This request is not awaiting payment.");
  if (row.package_id && row.package_id !== packageId) fail(409, "PLAN_CHANGED", "Use the plan selected for this request.");
  if (!row.requested_modules.length || row.requested_modules.some(key => !modules.includes(key)))
    fail(409, "INVALID_MODULES", "The request contains unavailable modules.");
  const plan = await planForModules(client, packageId, row.requested_modules);
  return { amount: plan.price, currency: plan.currency, packageId: plan.id };
}

/** Called only in the transaction that recorded a verified payment or approved decision. */
export async function activateVerifiedNeonModuleAccess(client: Client, requestId: string) {
  const row = (await client.query<RequestRow>(`SELECT * FROM public.sub_admin_requests WHERE id=$1::uuid FOR UPDATE`, [requestId])).rows[0];
  if (!row) fail(404, "REQUEST_NOT_FOUND", "Access request not found.");
  if (row.status !== "approved") return { activated: false, reason: "awaiting_approval" };
  if (row.payment_status !== "success" || !row.payment_id || !row.package_id)
    return { activated: false, reason: "awaiting_payment" };
  const plan = await planForModules(client, row.package_id, row.requested_modules);
  const verified = (await client.query<{ id: string; paid_at: Date }>(`
    SELECT p.id,p.paid_at FROM public.payments p JOIN public.profiles profile ON profile.user_id=p.user_id
    WHERE p.id=$1::uuid AND p.user_id=$2::uuid AND p.reference_id=$3::uuid
      AND p.payment_type='module_access_request' AND p.status='success' AND p.deleted_at IS NULL
      AND p.amount=$4 AND p.currency=$5 AND profile.account_status='active' AND profile.deleted_at IS NULL
      AND p.paid_at IS NOT NULL FOR SHARE OF p,profile`, [row.payment_id, row.user_id, row.id, plan.price, plan.currency])).rows[0];
  if (!verified) fail(403, "PAYMENT_NOT_VERIFIED", "A matching server-verified payment is required.");
  const days = plan.duration_days ?? (plan.billing_interval === "year" ? 365 : plan.billing_interval === "quarter" ? 90 : 30);
  if (!Number.isSafeInteger(days) || days < 1 || days > 3650) fail(409, "INVALID_PLAN_DURATION", "Invalid plan duration.");
  // Scope remains an explicit Super Admin decision. Payment cannot turn a requested
  // college into an assignment or unlock another organization.
  const assignments = (await client.query<{ module_key: AccessModule; entity_type: string; entity_id: string; source_request_id: string | null }>(`
    SELECT mc.module_key,a.entity_type,a.entity_id,a.metadata->>'source_request_id' AS source_request_id FROM public.entity_admin_assignments a
    JOIN public.user_module_capabilities umc ON umc.id=a.user_capability_id
    JOIN public.module_capabilities mc ON mc.id=umc.capability_id
    WHERE a.user_id=$1::uuid AND a.status='active' AND umc.status='active' AND mc.is_active
      AND (umc.expires_at IS NULL OR umc.expires_at>now()) AND mc.module_key=ANY($2::text[])
    FOR SHARE OF a,umc,mc`, [row.user_id, row.requested_modules])).rows;
  const scopes = row.requested_entity_scopes ?? [];
  let count = 0;
  for (const assignment of assignments) {
    const requested = scopes.find(scope => scope.module_key === assignment.module_key);
    if (!requested?.entity_id && assignment.source_request_id !== requestId) continue;
    if (requested?.entity_id && requested.entity_id !== assignment.entity_id) continue;
    const prior = (await client.query(`SELECT id FROM public.module_entitlements
      WHERE payment_id=$1::uuid AND module_key=$2 AND entity_type=$3 AND entity_id=$4::uuid`,
    [row.payment_id, assignment.module_key, assignment.entity_type, assignment.entity_id])).rows[0];
    if (prior) { count++; continue; }
    const start = new Date(verified.paid_at);
    const end = new Date(start.getTime() + days * 86_400_000);
    await client.query(`INSERT INTO public.module_entitlements(user_id,module_key,entity_type,entity_id,package_id,
      source,status,start_at,expires_at,features,payment_id,reason)
      VALUES($1::uuid,$2,$3,$4::uuid,$5::uuid,'ESEWA_PURCHASE','active',$6,$7,$8::jsonb,$9::uuid,
        'Verified payment for approved delegated access request')`,
    [row.user_id, assignment.module_key, assignment.entity_type, assignment.entity_id, plan.id,
      start, end, JSON.stringify(plan.features ?? {}), row.payment_id]);
    count++;
  }
  return { activated: count > 0, reason: count ? "active" : "awaiting_scope", entitlementCount: count };
}

export class NeonModuleAccess {
  constructor(private readonly run: Run = withTransaction) {}

  async catalog(actor: NeonActor) {
    return this.run(async client => {
      const profile = await assertActor(client, actor);
      const options = (await client.query(`SELECT module_key AS id,label,description AS desc FROM public.module_capabilities
        WHERE is_active AND is_requestable AND module_key=ANY($1::text[]) ORDER BY label`, [modules])).rows;
      const plans = (await client.query(`SELECT id,name,price::float AS price,currency,duration_days,module_scope
        FROM public.packages WHERE is_active AND is_publicly_selectable AND package_kind='paid'
          AND deleted_at IS NULL ORDER BY price,id`)).rows;
      const colleges = (await client.query(`SELECT id,name,location FROM public.institutes
        WHERE status='approved' AND deleted_at IS NULL ORDER BY name LIMIT 2000`)).rows;
      return { profile: { full_name: profile.full_name, email: profile.email, phone: profile.phone }, modules: options, plans, colleges };
    });
  }

  async history(actor: NeonActor, admin = false) {
    return this.run(async client => {
      await assertActor(client, actor, admin);
      const requests = (await client.query(`SELECT r.*,COALESCE(p.full_name,r.user_name) AS user_name,
        COALESCE(p.email,r.user_email) AS user_email,p.phone AS applicant_phone,i.name AS college_name
        FROM public.sub_admin_requests r LEFT JOIN public.profiles p ON p.user_id=r.user_id
        LEFT JOIN public.institutes i ON i.id=CASE WHEN r.requested_entity_scopes->0->>'entity_type'='college'
          AND r.requested_entity_scopes->0->>'entity_id' ~ '^[0-9a-f-]{36}$'
          THEN (r.requested_entity_scopes->0->>'entity_id')::uuid ELSE NULL END
        WHERE ($1::boolean OR r.user_id=$2::uuid) ORDER BY r.created_at DESC LIMIT 500`, [admin, actor.userId])).rows;
      const entitlements = admin ? [] : (await client.query(`SELECT module_key,status,start_at,expires_at FROM public.module_entitlements
        WHERE user_id=$1::uuid ORDER BY created_at DESC`, [actor.userId])).rows;
      return { requests, entitlements };
    });
  }

  async submit(actor: NeonActor, input: ModuleAccessInput) {
    validateInput(input);
    return this.run(async client => {
      const profile = await assertActor(client, actor);
      if (!profile.full_name?.trim() || !profile.email?.trim() || !profile.phone?.trim())
        fail(409, "PROFILE_INCOMPLETE", "Complete your profile name, email and phone first.");
      await client.query(`SELECT pg_advisory_xact_lock(hashtextextended($1::text,0))`, [actor.userId]);
      const keys = [...input.modules].sort();
      const active = (await client.query<{ module_key: string }>(`SELECT module_key FROM public.module_capabilities
        WHERE is_active AND is_requestable AND module_key=ANY($1::text[])`, [keys])).rows;
      if (active.length !== keys.length) fail(409, "MODULE_UNAVAILABLE", "A selected module is unavailable.");
      await planForModules(client, input.packageId, keys);
      if (input.collegeId && !(await client.query(`SELECT id FROM public.institutes WHERE id=$1::uuid
        AND status='approved' AND deleted_at IS NULL FOR SHARE`, [input.collegeId])).rowCount)
        fail(404, "COLLEGE_NOT_FOUND", "The selected college is unavailable.");
      const prior = (await client.query<RequestRow>(`SELECT * FROM public.sub_admin_requests
        WHERE user_id=$1::uuid AND status='pending' ORDER BY created_at DESC LIMIT 1 FOR UPDATE`, [actor.userId])).rows[0];
      if (prior) {
        const college = prior.requested_entity_scopes?.find(scope => scope.module_key === "college")?.entity_id;
        if (JSON.stringify([...prior.requested_modules].sort()) !== JSON.stringify(keys) ||
            prior.package_id !== input.packageId || (college ?? null) !== (input.collegeId ?? null))
          fail(409, "PENDING_REQUEST_EXISTS", "Complete or cancel your pending request before changing modules or college.");
        return { ...prior, existing_request: true };
      }
      const scopes: Scope[] = [];
      for (const key of keys) {
        const proof = input.proofs[key]!;
        const owned = (await client.query(`SELECT id FROM public.media_upload_intents
          WHERE user_id=$1::uuid AND module='application_file' AND resource_id=$2::uuid
            AND object_path=$3 AND declared_size=$4 FOR SHARE`,
        [actor.userId, input.draftId, proof.path, proof.size])).rowCount;
        if (!owned || !proof.path.startsWith(`${actor.userId}/application_file/${input.draftId}/`))
          fail(403, "PROOF_NOT_OWNED", "Use your uploaded supporting documents.");
        const object = await headObject("application-files", proof.path);
        if (!object || object.contentType !== proof.contentType || object.contentLength !== proof.size)
          fail(409, "PROOF_UNAVAILABLE", "A supporting document is missing or invalid.");
        scopes.push({ module_key: key, entity_type: key === "college" ? "college" : null,
          entity_id: key === "college" ? input.collegeId! : null, proof });
      }
      const row = (await client.query<RequestRow>(`INSERT INTO public.sub_admin_requests(id,user_id,user_name,user_email,
        requested_modules,reason,organization,status,requested_entity_scopes,package_id)
        VALUES($1::uuid,$2::uuid,$3,$4,$5::text[],$6,$7,'pending',$8::jsonb,$9::uuid) RETURNING *`,
      [input.draftId, actor.userId, profile.full_name.trim(), profile.email.trim(), keys,
        input.reason.trim(), input.organization.trim(), JSON.stringify(scopes), input.packageId])).rows[0];
      await client.query(`INSERT INTO public.audit_logs(actor_user_id,action,entity_type,entity_id,metadata)
        VALUES($1::uuid,'request_module_access','sub_admin_requests',$2::text,
          jsonb_build_object('modules',$3::text[],'package_id',$4::uuid))`, [actor.userId, row.id, keys, input.packageId]);
      const notices = (await client.query<{ id: string; recipient_id: string }>(`INSERT INTO public.notifications(recipient_id,title,message,type,category,channel,status,entity_type,entity_id,action_url)
        SELECT DISTINCT r.user_id,'Module access requested','A user submitted a delegated module access request.',
          'info','sub_admin_request','dashboard','queued','sub_admin_request',$1::uuid,'/admin/access-requests'
        FROM public.user_roles r JOIN public.profiles p ON p.user_id=r.user_id
        WHERE r.role IN ('admin','super_admin') AND p.account_status='active' AND p.deleted_at IS NULL
        RETURNING id,recipient_id`, [row.id])).rows;
      for (const notice of notices) await appendNotificationEvent(client, notice.recipient_id, notice.id);
      return { ...row, existing_request: false };
    });
  }

  async cancel(actor: NeonActor, id: string) {
    if (!uuid.test(id)) fail(400, "INVALID_REQUEST", "Invalid request.");
    return this.run(async client => {
      await assertActor(client, actor);
      const row = (await client.query<RequestRow>(`SELECT * FROM public.sub_admin_requests WHERE id=$1::uuid
        AND user_id=$2::uuid FOR UPDATE`, [id, actor.userId])).rows[0];
      if (!row) fail(404, "REQUEST_NOT_FOUND", "Access request not found.");
      if (row.status === "cancelled") return { id, status: "cancelled", duplicate: true };
      if (row.status !== "pending" || row.payment_status === "success")
        fail(409, "REQUEST_NOT_CANCELLABLE", "Only unpaid pending requests may be cancelled.");
      await client.query(`UPDATE public.sub_admin_requests SET status='cancelled',payment_status='cancelled',updated_at=now() WHERE id=$1::uuid`, [id]);
      await client.query(`UPDATE public.payment_checkout_sessions SET status='cancelled',completed_at=now(),updated_at=now()
        WHERE entity_type='module_access_request' AND entity_id=$1::uuid AND status IN ('pending','initiated')`, [id]);
      await client.query(`UPDATE public.payments SET status='cancelled',updated_at=now()
        WHERE reference_id=$1::uuid AND user_id=$2::uuid AND payment_type='module_access_request'
          AND status='pending' AND deleted_at IS NULL`, [id, actor.userId]);
      await client.query(`INSERT INTO public.audit_logs(actor_user_id,action,entity_type,entity_id,metadata)
        VALUES($1::uuid,'cancel_module_access_request','sub_admin_requests',$2::text,'{}'::jsonb)`, [actor.userId, id]);
      return { id, status: "cancelled", duplicate: false };
    });
  }

  async decide(actor: NeonActor, id: string, approve: boolean, note = "") {
    if (!uuid.test(id) || typeof approve !== "boolean" || note.length > 2000) fail(400, "INVALID_DECISION", "Invalid decision.");
    return this.run(async client => {
      await assertActor(client, actor, true);
      const row = (await client.query<RequestRow>(`SELECT * FROM public.sub_admin_requests WHERE id=$1::uuid FOR UPDATE`, [id])).rows[0];
      if (!row) fail(404, "REQUEST_NOT_FOUND", "Access request not found.");
      const status = approve ? "approved" : "rejected";
      if (row.status === status) return { id, status, duplicate: true };
      if (row.status !== "pending") fail(409, "REQUEST_ALREADY_DECIDED", "This request was already decided.");
      const target = (await client.query(`SELECT user_id FROM public.profiles WHERE user_id=$1::uuid
        AND account_status='active' AND deleted_at IS NULL FOR SHARE`, [row.user_id])).rowCount;
      if (!target) fail(403, "ACCOUNT_INACTIVE", "The requester account is inactive.");
      if (approve && row.package_id) {
        if (row.payment_status !== "success" || !row.payment_id) fail(403, "PAYMENT_NOT_VERIFIED", "Verified payment is required before approval.");
        const plan = await planForModules(client, row.package_id, row.requested_modules);
        if (!(await client.query(`SELECT id FROM public.payments WHERE id=$1::uuid AND user_id=$2::uuid
          AND reference_id=$3::uuid AND payment_type='module_access_request' AND status='success'
          AND amount=$4 AND currency=$5 AND paid_at IS NOT NULL AND deleted_at IS NULL FOR SHARE`,
        [row.payment_id, row.user_id, row.id, plan.price, plan.currency])).rowCount)
          fail(403, "PAYMENT_NOT_VERIFIED", "Verified payment is required before approval.");
      }
      if (approve) for (const key of row.requested_modules) {
        if (!modules.includes(key)) fail(409, "MODULE_UNAVAILABLE", "A requested module is unavailable.");
        const capability = (await client.query<{ id: string }>(`SELECT id FROM public.module_capabilities
          WHERE module_key=$1 AND is_active FOR SHARE`, [key])).rows[0];
        if (!capability) fail(409, "MODULE_UNAVAILABLE", "A requested module is unavailable.");
        await client.query(`INSERT INTO public.user_module_capabilities(user_id,capability_id,status,granted_by,source_request_id)
          VALUES($1::uuid,$2::uuid,'active',$3::uuid,$4::uuid) ON CONFLICT(user_id,capability_id) DO UPDATE
          SET status='active',granted_by=EXCLUDED.granted_by,source_request_id=EXCLUDED.source_request_id,
            revoked_by=NULL,revoked_at=NULL,updated_at=now()`, [row.user_id, capability.id, actor.userId, id]);
        const permission = {college:"college.manage",jobs:"job.post",mentor:"mentor.manage",events:"event.organize"}[key];
        await client.query(`INSERT INTO public.user_permissions(user_id,permission_id,granted_by)
          SELECT $1::uuid,id,$2::uuid FROM public.permissions WHERE code=ANY($3::text[])
          ON CONFLICT(user_id,permission_id) DO UPDATE SET granted_by=EXCLUDED.granted_by,expires_at=NULL`,
        [row.user_id, actor.userId, [permission,"lead.view","media.manage"]]);
      }
      await client.query(`UPDATE public.sub_admin_requests SET status=$2,decision_note=NULLIF($3,''),decided_by=$4::uuid,
        decided_at=now(),assigned_capabilities=$5::jsonb,updated_at=now() WHERE id=$1::uuid`,
      [id, status, note.trim(), actor.userId, JSON.stringify(approve ? row.requested_modules : [])]);
      const activation = approve && row.package_id ? await activateVerifiedNeonModuleAccess(client, id) : null;
      await client.query(`INSERT INTO public.audit_logs(actor_user_id,action,entity_type,entity_id,metadata)
        VALUES($1::uuid,$2,'sub_admin_requests',$3::text,jsonb_build_object('user_id',$4::uuid,'modules',$5::text[]))`,
      [actor.userId, approve ? "approve_module_access" : "reject_module_access", id, row.user_id, row.requested_modules]);
      const notification = (await client.query<{ id: string }>(`INSERT INTO public.notifications(recipient_id,title,message,type,category,channel,status,entity_type,entity_id,action_url)
        VALUES($1::uuid,$2,$3,'info','sub_admin_request','dashboard','queued','sub_admin_request',$4::uuid,'/request-access') RETURNING id`,
      [row.user_id, approve ? "Module access approved" : "Module access request rejected",
        approve ? "Your module capability is approved. Entity assignments control private access." : (note.trim() || "Your request was not approved."), id])).rows[0];
      await appendNotificationEvent(client, row.user_id, notification.id);
      return { id, status, duplicate: false, activation };
    });
  }

  async assign(actor: NeonActor, requestId: string, module: AccessModule, entityId: string) {
    if (!uuid.test(requestId) || !uuid.test(entityId) || !modules.includes(module))
      fail(400, "INVALID_SCOPE", "Select a valid requested module and entity.");
    const entity = { college: { type: "college", table: "institutes" }, jobs: { type: "company", table: "companies" },
      mentor: { type: "mentor", table: "mentors" }, events: { type: "event", table: "events" } }[module];
    return this.run(async client => {
      await assertActor(client, actor, true);
      const request = (await client.query<RequestRow>(`SELECT * FROM public.sub_admin_requests WHERE id=$1::uuid FOR UPDATE`, [requestId])).rows[0];
      if (!request || request.status !== "approved" || !request.requested_modules.includes(module))
        fail(403, "APPROVED_REQUEST_REQUIRED", "The module must be approved for this requester.");
      const scope = request.requested_entity_scopes?.find(value => value.module_key === module);
      if (scope?.entity_id && scope.entity_id !== entityId)
        fail(403, "SCOPE_MISMATCH", "Assign the college selected in the approved request.");
      const capability = (await client.query<{ id: string }>(`SELECT umc.id FROM public.user_module_capabilities umc
        JOIN public.module_capabilities mc ON mc.id=umc.capability_id JOIN public.profiles p ON p.user_id=umc.user_id
        WHERE umc.user_id=$1::uuid AND mc.module_key=$2 AND mc.is_active AND umc.status='active'
          AND (umc.expires_at IS NULL OR umc.expires_at>now()) AND p.account_status='active' AND p.deleted_at IS NULL
        FOR SHARE OF umc,mc,p`, [request.user_id, module])).rows[0];
      if (!capability) fail(403, "CAPABILITY_REQUIRED", "An active approved capability is required.");
      if (!(await client.query(`SELECT id FROM public.${entity.table} WHERE id=$1::uuid AND deleted_at IS NULL FOR SHARE`, [entityId])).rowCount)
        fail(404, "ENTITY_NOT_FOUND", "The selected entity is unavailable.");
      const assignment = (await client.query<{ id: string }>(`INSERT INTO public.entity_admin_assignments
        (user_id,user_capability_id,entity_type,entity_id,status,assigned_by,metadata)
        VALUES($1::uuid,$2::uuid,$3,$4::uuid,'active',$5::uuid,jsonb_build_object('source_request_id',$6::uuid))
        ON CONFLICT(user_capability_id,entity_type,entity_id) DO UPDATE SET status='active',revoked_by=NULL,
          revoked_at=NULL,metadata=COALESCE(entity_admin_assignments.metadata,'{}'::jsonb) || EXCLUDED.metadata,
          updated_at=now() RETURNING id`,
      [request.user_id, capability.id, entity.type, entityId, actor.userId, request.id])).rows[0];
      const activation = await activateVerifiedNeonModuleAccess(client, requestId);
      await client.query(`INSERT INTO public.audit_logs(actor_user_id,action,entity_type,entity_id,metadata)
        VALUES($1::uuid,'assign_approved_module_scope',$2,$3::text,
          jsonb_build_object('request_id',$4::uuid,'assignment_id',$5::uuid,'user_id',$6::uuid))`,
      [actor.userId, entity.type, entityId, requestId, assignment.id, request.user_id]);
      return { assignmentId: assignment.id, activation };
    });
  }
}

export async function uploadNeonAccessProof(actor: NeonActor, input: { draftId: string; module: AccessModule;
  fileName: string; contentType: string; bytes: Uint8Array }, run: Run = withTransaction) {
  if (!uuid.test(input.draftId) || !modules.includes(input.module)) fail(400, "INVALID_PROOF", "Select a valid module.");
  const validated = parseMediaUploadIntent({ module: input.contentType.startsWith("image/") ? "payment_proof" : "application_file",
    resourceId: input.draftId, fileName: input.fileName, contentType: input.contentType, sizeBytes: input.bytes.byteLength });
  const intent = { ...validated, module: "application_file" as const };
  await validateManagedMediaBytes(input.bytes, intent.contentType);
  const path = buildMediaObjectPath(intent, actor.userId, randomUUID());
  let stored = false;
  try { return await run(async client => {
    await assertActor(client, actor);
    await client.query(`SELECT pg_advisory_xact_lock(hashtextextended($1::text,0))`, [actor.userId]);
    const quota = (await client.query<{ count: number }>(`SELECT count(*)::int AS count FROM public.media_upload_intents
      WHERE user_id=$1::uuid AND created_at>now()-interval '1 hour'`, [actor.userId])).rows[0];
    if ((quota?.count ?? 0) >= 30) fail(409, "UPLOAD_LIMIT_REACHED", "Try again after the hourly upload limit resets.");
    const existing = (await client.query(`SELECT id FROM public.sub_admin_requests WHERE id=$1::uuid`, [input.draftId])).rowCount;
    if (existing) fail(409, "REQUEST_ALREADY_SUBMITTED", "Supporting documents cannot change after submission.");
    await uploadObject("application-files", path, input.bytes, intent.contentType); stored = true;
    const checked = await headObject("application-files", path);
    if (checked?.contentLength !== input.bytes.byteLength || checked.contentType !== intent.contentType)
      fail(503, "UPLOAD_FAILED", "The uploaded document could not be verified.");
    await client.query(`INSERT INTO public.media_upload_intents(user_id,module,resource_id,object_path,declared_size)
      VALUES($1::uuid,'application_file',$2::uuid,$3,$4)`, [actor.userId, input.draftId, path, input.bytes.byteLength]);
    await client.query(`INSERT INTO public.audit_logs(actor_user_id,action,entity_type,entity_id,metadata)
      VALUES($1::uuid,'upload_module_request_proof','sub_admin_requests',$2::text,
        jsonb_build_object('module',$3::text,'size_bytes',$4::integer))`, [actor.userId, input.draftId, input.module, input.bytes.byteLength]);
    return { path, fileName: intent.fileName, contentType: intent.contentType, size: input.bytes.byteLength };
  }); } catch (error) { if (stored) await deleteObject("application-files", path).catch(() => undefined); throw error; }
}

export async function downloadNeonAccessProof(actor: NeonActor, requestId: string, module: AccessModule, run: Run = withTransaction) {
  if (!uuid.test(requestId) || !modules.includes(module)) fail(400, "INVALID_PROOF", "Invalid supporting document.");
  return run(async client => {
    const identity = await assertActor(client, actor);
    const row = (await client.query<RequestRow>(`SELECT * FROM public.sub_admin_requests WHERE id=$1::uuid
      AND (user_id=$2::uuid OR $3::boolean) FOR SHARE`, [requestId, actor.userId, actor.platformAdmin && identity.admin])).rows[0];
    const proof = row?.requested_entity_scopes?.find(scope => scope.module_key === module)?.proof;
    if (!proof) fail(404, "PROOF_NOT_FOUND", "Supporting document not found.");
    const owned = (await client.query(`SELECT id FROM public.media_upload_intents WHERE user_id=$1::uuid
      AND module='application_file' AND resource_id=$2::uuid AND object_path=$3`, [row.user_id, row.id, proof.path])).rowCount;
    const object = owned ? await headObject("application-files", proof.path) : null;
    if (!object || object.contentType !== proof.contentType || object.contentLength !== proof.size)
      fail(404, "PROOF_NOT_FOUND", "Supporting document not found.");
    return { ...await createPresignedDownloadUrl("application-files", proof.path, 300, true), fileName: proof.fileName };
  });
}
