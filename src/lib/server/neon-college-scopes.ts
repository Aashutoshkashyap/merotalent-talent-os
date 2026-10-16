/** College claim/addition governance for the isolated Neon runtime. */
import type { PoolClient } from "pg";
import { withTransaction } from "./db";
import { NeonAuthorizationError, type NeonActor } from "./neon-authorization";
import { activateVerifiedCollegeScope } from "./neon-college-scope-activation";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const invalid = (code: string, message: string): never => { throw new NeonAuthorizationError(400, code, message); };
const denied = (): never => { throw new NeonAuthorizationError(403, "ACCESS_DENIED", "Access is not permitted."); };
type Run = <T>(operation: (client: PoolClient) => Promise<T>) => Promise<T>;

export type ScopeInput = {
  kind: "claim" | "create";
  collegeId?: string;
  name?: string;
  phone?: string;
  email?: string;
  location?: string;
  description?: string;
  reason: string;
};

export class NeonCollegeScopes {
  constructor(private readonly run: Run = withTransaction) {}

  private async assertActor(client: PoolClient, actor: NeonActor, admin = false): Promise<void> {
    const result = await client.query<{ valid: boolean }>(`
      SELECT EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.neon_application_accounts a ON a.legacy_user_id = p.user_id AND a.status = 'active'
        JOIN public.neon_identity_links l ON l.application_account_id = a.id AND l.status = 'verified'
        WHERE p.user_id = $1::uuid AND p.account_status = 'active' AND p.deleted_at IS NULL
          AND l.neon_auth_user_id = $2::uuid
          AND ($3::boolean = false OR EXISTS (
            SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.user_id
              AND ur.role IN ('admin', 'super_admin')
          ))
      ) AS valid`, [actor.userId, actor.neonAuthUserId, admin]);
    if (!result.rows[0]?.valid) denied();
  }

  private async capability(client: PoolClient, userId: string): Promise<string> {
    const result = await client.query<{ id: string }>(`
      SELECT umc.id FROM public.user_module_capabilities umc
      JOIN public.module_capabilities mc ON mc.id = umc.capability_id
      JOIN public.profiles p ON p.user_id = umc.user_id
      WHERE umc.user_id = $1::uuid AND umc.status = 'active'
        AND (umc.expires_at IS NULL OR umc.expires_at > now())
        AND mc.module_key = 'college' AND mc.is_active
        AND p.account_status = 'active' AND p.deleted_at IS NULL
      LIMIT 1 FOR UPDATE OF umc`, [userId]);
    if (!result.rows[0]) denied();
    return result.rows[0].id;
  }

  async submit(actor: NeonActor, input: ScopeInput) {
    if (!['claim', 'create'].includes(input.kind) || input.reason.trim().length < 10 || input.reason.length > 2000) {
      invalid('INVALID_REQUEST', 'Provide a valid claim type and reason (10–2000 characters).');
    }
    const name = input.name?.trim() ?? '';
    if (input.kind === 'claim' && (!input.collegeId || !uuid.test(input.collegeId))) invalid('INVALID_COLLEGE', 'Select a college.');
    if (input.kind === 'create' && (name.length < 2 || name.length > 180)) invalid('INVALID_COLLEGE_NAME', 'Enter a college name (2–180 characters).');
    if (input.email && (input.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email))) invalid('INVALID_EMAIL', 'Enter a valid email.');
    if ([input.phone, input.location, input.description].some(value => value && value.length > 2000)) invalid('INVALID_REQUEST', 'Request details are too long.');
    return this.run(async client => {
      await this.assertActor(client, actor);
      await this.capability(client, actor.userId);
      if (input.kind === 'claim') {
        const target = await client.query<{ id: string }>(`
          SELECT id FROM public.institutes WHERE id = $1::uuid AND status = 'approved' AND deleted_at IS NULL
          LIMIT 1`, [input.collegeId]);
        if (!target.rows[0]) throw new NeonAuthorizationError(404, 'COLLEGE_NOT_FOUND', 'The college is not available to claim.');
        const assigned = await client.query<{ id: string }>(`
          SELECT id FROM public.entity_admin_assignments
          WHERE user_id = $1::uuid AND entity_type = 'college' AND entity_id = $2::uuid AND status = 'active'
          LIMIT 1`, [actor.userId, input.collegeId]);
        if (assigned.rows[0]) throw new NeonAuthorizationError(409, 'ALREADY_ASSIGNED', 'You already manage this college.');
      } else {
        const duplicate = await client.query<{ id: string }>(`
          SELECT id FROM public.institutes WHERE lower(btrim(name)) = lower($1) AND deleted_at IS NULL LIMIT 1`, [name]);
        if (duplicate.rows[0]) throw new NeonAuthorizationError(409, 'COLLEGE_EXISTS', 'A college with this name exists. Claim it instead.');
      }
      const data = input.kind === 'create'
        ? { name, phone: input.phone?.trim() ?? '', email: input.email?.trim().toLowerCase() ?? '', location: input.location?.trim() ?? '', description: input.description?.trim() ?? '' }
        : { phone: input.phone?.trim() ?? '', email: input.email?.trim().toLowerCase() ?? '' };
      const result = await client.query<{ id: string; status: string; request_kind: string }>(`
        INSERT INTO public.entity_scope_requests
          (user_id, module_key, entity_type, entity_id, request_kind, request_data, reason)
        VALUES ($1::uuid, 'college', 'college', $2::uuid, $3, $4::jsonb, $5)
        ON CONFLICT (user_id, module_key, entity_type,
          COALESCE(entity_id, '00000000-0000-0000-0000-000000000000'::uuid), request_kind)
          WHERE status = 'pending'
        DO UPDATE SET reason = EXCLUDED.reason, request_data = EXCLUDED.request_data, updated_at = now()
        RETURNING id, status, request_kind`,
        [actor.userId, input.kind === 'claim' ? input.collegeId : null, input.kind, JSON.stringify(data), input.reason.trim()]);
      const row = result.rows[0];
      await client.query(`INSERT INTO public.audit_logs(actor_user_id, action, entity_type, entity_id, metadata)
        VALUES ($1::uuid, 'request_entity_scope', 'entity_scope_requests', $2::text,
          jsonb_build_object('module_key', 'college', 'request_kind', $3::text, 'college_id', $4::uuid))`,
      [actor.userId, row.id, input.kind, input.kind === 'claim' ? input.collegeId : null]);
      await client.query(`INSERT INTO public.notifications(recipient_id,title,message,type,category,channel,status,entity_type,entity_id,action_url,metadata)
        SELECT DISTINCT p.user_id, 'College scope request', 'A college claim or addition request requires review.',
          'info','entity_scope_request','dashboard','queued','entity_scope_request',$1::uuid,
          '/admin/access-requests',jsonb_build_object('requester_id',$2::uuid)
        FROM public.profiles p JOIN public.user_roles ur ON ur.user_id=p.user_id
        WHERE p.account_status='active' AND p.deleted_at IS NULL AND ur.role IN ('admin','super_admin')`, [row.id, actor.userId]);
      return row;
    });
  }

  async decide(actor: NeonActor, requestId: string, approve: boolean, note?: string) {
    if (!uuid.test(requestId) || (note && note.length > 2000)) invalid('INVALID_DECISION', 'Invalid request decision.');
    return this.run(async client => {
      await this.assertActor(client, actor, true);
      const result = await client.query<{ id: string; user_id: string; status: string; request_kind: string; entity_id: string | null; request_data: Record<string, string>; payment_status: string }>(`
        SELECT id,user_id,status,request_kind,entity_id,request_data,payment_status
        FROM public.entity_scope_requests WHERE id=$1::uuid AND module_key='college' AND entity_type='college'
        FOR UPDATE`, [requestId]);
      const request = result.rows[0];
      if (!request) throw new NeonAuthorizationError(404, 'REQUEST_NOT_FOUND', 'College request not found.');
      if (request.status !== 'pending') throw new NeonAuthorizationError(409, 'REQUEST_ALREADY_DECIDED', 'This request has already been decided.');
      let collegeId = request.entity_id;
      let assignmentId: string | null = null;
      if (approve) {
        const capabilityId = await this.capability(client, request.user_id);
        if (request.request_kind === 'create') {
          const name = request.request_data.name?.trim() ?? '';
          if (name.length < 2 || name.length > 180) invalid('INVALID_COLLEGE_NAME', 'The proposed college name is invalid.');
          // Serialize approvals for the same normalized name, even when two
          // different people proposed it before either request was reviewed.
          await client.query(`SELECT pg_advisory_xact_lock(hashtextextended(lower(btrim($1::text)), 0))`, [name]);
          const duplicate = await client.query<{ id: string }>(`
            SELECT id FROM public.institutes WHERE lower(btrim(name))=lower($1) AND deleted_at IS NULL LIMIT 1`, [name]);
          if (duplicate.rows[0]) throw new NeonAuthorizationError(409, 'COLLEGE_EXISTS', 'This institution already exists. Review a claim instead.');
          const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100)}-${request.id.slice(0, 8)}`;
          const created = await client.query<{ id: string }>(`
            INSERT INTO public.institutes(name,slug,location,contact_email,contact_phone,description,owner_user_id,status,applications_enabled)
            VALUES ($1,$2,NULLIF($3,''),NULLIF($4,''),NULLIF($5,''),NULLIF($6,''),$7::uuid,'pending',false)
            RETURNING id`, [name, slug, request.request_data.location ?? '', request.request_data.email ?? '',
              request.request_data.phone ?? '', request.request_data.description ?? '', request.user_id]);
          collegeId = created.rows[0].id;
        } else {
          const exists = await client.query<{ id: string }>(`SELECT id FROM public.institutes WHERE id=$1::uuid AND deleted_at IS NULL LIMIT 1`, [collegeId]);
          if (!exists.rows[0]) throw new NeonAuthorizationError(404, 'COLLEGE_NOT_FOUND', 'The requested college is unavailable.');
        }
        const assigned = await client.query<{ id: string }>(`
          INSERT INTO public.entity_admin_assignments
            (user_id,user_capability_id,entity_type,entity_id,status,assigned_by,scopes,metadata)
          VALUES ($1::uuid,$2::uuid,'college',$3::uuid,'active',$4::uuid,'{}'::jsonb,
            jsonb_build_object('source','entity_scope_request','request_id',$5::uuid))
          ON CONFLICT (user_capability_id,entity_type,entity_id) DO UPDATE
            SET status='active',revoked_by=NULL,revoked_at=NULL,updated_at=now()
          RETURNING id`, [request.user_id, capabilityId, collegeId, actor.userId, requestId]);
        assignmentId = assigned.rows[0].id;
      }
      const updated = await client.query<{ id: string; status: string; assignment_id: string | null }>(`
        UPDATE public.entity_scope_requests SET status=$2,decision_note=NULLIF($3,''),decided_by=$4::uuid,
          decided_at=now(),assignment_id=$5::uuid,
          entity_id=CASE WHEN $2='approved' THEN $6::uuid ELSE entity_id END,updated_at=now()
        WHERE id=$1::uuid RETURNING id,status,assignment_id`,
        [requestId, approve ? 'approved' : 'rejected', note?.trim() ?? '', actor.userId, assignmentId, collegeId]);
      if (approve && request.payment_status === 'success') {
        await activateVerifiedCollegeScope(client, requestId);
      }
      await client.query(`INSERT INTO public.audit_logs(actor_user_id,action,entity_type,entity_id,metadata)
        VALUES ($1::uuid,$2,'entity_scope_requests',$3::text,
          jsonb_build_object('user_id',$4::uuid,'college_id',$5::uuid,'assignment_id',$6::uuid))`,
        [actor.userId, approve ? 'approve_entity_scope' : 'reject_entity_scope', requestId, request.user_id, collegeId, assignmentId]);
      await client.query(`INSERT INTO public.notifications(recipient_id,title,message,type,category,channel,status,entity_type,entity_id,action_url,metadata)
        VALUES ($1::uuid,$2,$3,'info','entity_scope_request','dashboard','queued','entity_scope_request',$4::uuid,
          '/institute',jsonb_build_object('status',$5::text,'assignment_id',$6::uuid,'payment_status',$7::text))`,
        [request.user_id, approve ? 'College access approved' : 'College scope request rejected',
          approve ? 'Your scope is approved. Complete a verified plan payment to unlock protected college data.' : (note?.trim() || 'Your request was not approved.'),
          requestId, approve ? 'approved' : 'rejected', assignmentId, request.payment_status]);
      return { ...updated.rows[0], college_id: collegeId };
    });
  }

  /** Super Admin-only free/trial activation; never manufactures a payment. */
  async grantComplimentary(actor: NeonActor, requestId: string, kind: "free" | "trial") {
    if (!uuid.test(requestId) || !["free", "trial"].includes(kind)) invalid("INVALID_GRANT", "Select a valid College grant.");
    return this.run(async client => {
      await this.assertActor(client, actor, true);
      const request = (await client.query<{ user_id: string; entity_id: string | null; status: string }>(`
        SELECT user_id,entity_id,status FROM public.entity_scope_requests
        WHERE id=$1::uuid AND module_key='college' AND entity_type='college' FOR UPDATE`, [requestId])).rows[0];
      if (!request || request.status !== "approved" || !request.entity_id)
        throw new NeonAuthorizationError(409, "SCOPE_NOT_APPROVED", "Approve and assign a College before granting access.");
      await this.capability(client, request.user_id);
      const assigned = (await client.query<{ allowed: boolean }>(`
        SELECT EXISTS (SELECT 1 FROM public.entity_admin_assignments a
          JOIN public.user_module_capabilities umc ON umc.id=a.user_capability_id
          JOIN public.module_capabilities mc ON mc.id=umc.capability_id
          JOIN public.profiles p ON p.user_id=a.user_id
          WHERE a.user_id=$1::uuid AND a.entity_type='college' AND a.entity_id=$2::uuid
            AND a.status='active' AND umc.status='active' AND mc.module_key='college' AND mc.is_active
            AND p.account_status='active' AND p.deleted_at IS NULL
            AND (umc.expires_at IS NULL OR umc.expires_at>now())) AS allowed`,
      [request.user_id, request.entity_id])).rows[0]?.allowed;
      if (!assigned) denied();
      const source = kind === "trial" ? "TRIAL" : "FREE";
      const prior = (await client.query<{ id: string; expires_at: Date | null }>(`
        SELECT id,expires_at FROM public.module_entitlements WHERE user_id=$1::uuid
          AND module_key='college' AND entity_type='college' AND entity_id=$2::uuid
          AND source=$3 AND status='active' AND start_at<=now()
          AND (expires_at IS NULL OR expires_at>now()) ORDER BY created_at DESC LIMIT 1`,
      [request.user_id, request.entity_id, source])).rows[0];
      if (prior) return { activated: true, duplicate: true, entitlementId: prior.id, expiresAt: prior.expires_at };
      if (kind === "trial") {
        const everUsed = (await client.query<{ id: string }>(`
          SELECT id FROM public.module_entitlements WHERE user_id=$1::uuid AND module_key='college'
            AND entity_type='college' AND entity_id=$2::uuid AND source='TRIAL' LIMIT 1`,
        [request.user_id, request.entity_id])).rows[0];
        if (everUsed) throw new NeonAuthorizationError(409, "TRIAL_ALREADY_USED", "This College trial was already used.");
      }
      const plan = (await client.query<{ id: string; duration_days: number | null; billing_interval: string; features: Record<string, unknown> }>(`
        SELECT id,duration_days,billing_interval,features FROM public.packages
        WHERE package_kind='free' AND is_active AND deleted_at IS NULL
          AND module_scope @> ARRAY['college']::text[]
        ORDER BY is_default_free DESC,sort_order ASC,id ASC LIMIT 1`, [])).rows[0];
      if (!plan) throw new NeonAuthorizationError(409, "FREE_PLAN_UNAVAILABLE", "No active College free plan is configured.");
      const trial = kind === "trial" ? (await client.query<{ duration_days: number }>(`
        SELECT duration_days FROM public.platform_module_trial_settings
        WHERE module_key='college' AND is_enabled`, [])).rows[0] : null;
      if (kind === "trial" && !trial) throw new NeonAuthorizationError(409, "TRIAL_DISABLED", "College trials are disabled.");
      const duration = kind === "trial" ? trial!.duration_days
        : plan.duration_days ?? (plan.billing_interval === "quarter" ? 90 : plan.billing_interval === "year" ? 365 : 30);
      if (!Number.isSafeInteger(duration) || duration < 1 || duration > 3650) invalid("INVALID_PLAN_DURATION", "The College grant duration is invalid.");
      const existing = (await client.query<{ id: string }>(`
        SELECT id FROM public.subscriptions WHERE user_id=$1::uuid AND entity_type='college'
          AND entity_id=$2::uuid AND status IN ('active','trialing') AND deleted_at IS NULL
          AND expiry_date>now() LIMIT 1 FOR UPDATE`, [request.user_id, request.entity_id])).rows[0];
      if (existing) throw new NeonAuthorizationError(409, "SUBSCRIPTION_ACTIVE", "This College already has an active subscription.");
      await client.query(`UPDATE public.subscriptions SET status='expired',updated_at=now()
        WHERE user_id=$1::uuid AND entity_type='college' AND entity_id=$2::uuid
          AND status IN ('active','trialing') AND expiry_date<=now() AND deleted_at IS NULL`,
      [request.user_id, request.entity_id]);
      const expiry = new Date(Date.now() + duration * 86_400_000);
      const subscription = (await client.query<{ id: string }>(`
        INSERT INTO public.subscriptions(user_id,package_id,entity_type,entity_id,start_date,expiry_date,
          status,payment_status,metadata)
        VALUES ($1::uuid,$2::uuid,'college',$3::uuid,now(),$4,$5,'not_required',
          jsonb_build_object('scope_request_id',$6::uuid,'grant_kind',$7::text)) RETURNING id`,
      [request.user_id, plan.id, request.entity_id, expiry, kind === "trial" ? "trialing" : "active", requestId, kind])).rows[0];
      const entitlement = (await client.query<{ id: string }>(`
        INSERT INTO public.module_entitlements(user_id,module_key,entity_type,entity_id,package_id,source,
          status,start_at,expires_at,features,granted_by,reason)
        VALUES ($1::uuid,'college','college',$2::uuid,$3::uuid,$4,'active',now(),$5,$6::jsonb,$7::uuid,
          'Super Admin approved College scope grant') RETURNING id`,
      [request.user_id, request.entity_id, plan.id, source, expiry, JSON.stringify(plan.features ?? {}), actor.userId])).rows[0];
      await client.query(`INSERT INTO public.audit_logs(actor_user_id,action,entity_type,entity_id,metadata)
        VALUES ($1::uuid,'COLLEGE_SCOPE_COMPLIMENTARY_ACTIVATED','college',$2::text,
          jsonb_build_object('scope_request_id',$3::uuid,'subscription_id',$4::uuid,
            'entitlement_id',$5::uuid,'kind',$6::text,'duration_days',$7::integer))`,
      [actor.userId, request.entity_id, requestId, subscription.id, entitlement.id, kind, duration]);
      return { activated: true, duplicate: false, entitlementId: entitlement.id,
        subscriptionId: subscription.id, expiresAt: expiry.toISOString() };
    });
  }

  async assign(actor: NeonActor, userId: string, collegeId: string) {
    if (!uuid.test(userId) || !uuid.test(collegeId)) invalid('INVALID_SCOPE', 'Select a valid person and college.');
    return this.run(async client => {
      await this.assertActor(client, actor, true);
      const capabilityId = await this.capability(client, userId);
      const college = await client.query<{ id: string }>(`SELECT id FROM public.institutes WHERE id=$1::uuid AND deleted_at IS NULL LIMIT 1`, [collegeId]);
      if (!college.rows[0]) throw new NeonAuthorizationError(404, 'COLLEGE_NOT_FOUND', 'The college is unavailable.');
      const result = await client.query<{ id: string; status: string }>(`
        INSERT INTO public.entity_admin_assignments
          (user_id,user_capability_id,entity_type,entity_id,status,assigned_by,scopes)
        VALUES ($1::uuid,$2::uuid,'college',$3::uuid,'active',$4::uuid,'{}'::jsonb)
        ON CONFLICT (user_capability_id,entity_type,entity_id) DO UPDATE
          SET status='active',revoked_by=NULL,revoked_at=NULL,updated_at=now()
        RETURNING id,status`, [userId, capabilityId, collegeId, actor.userId]);
      await client.query(`INSERT INTO public.audit_logs(actor_user_id,action,entity_type,entity_id,metadata)
        VALUES ($1::uuid,'assign_entity_scope','college',$2::text,
          jsonb_build_object('user_id',$3::uuid,'assignment_id',$4::uuid))`, [actor.userId, collegeId, userId, result.rows[0].id]);
      return result.rows[0];
    });
  }

  async revoke(actor: NeonActor, assignmentId: string) {
    if (!uuid.test(assignmentId)) invalid('INVALID_SCOPE', 'Select a valid assignment.');
    return this.run(async client => {
      await this.assertActor(client, actor, true);
      const result = await client.query<{ id: string; user_id: string; entity_id: string; status: string }>(`
        UPDATE public.entity_admin_assignments SET status='revoked',revoked_by=$2::uuid,
          revoked_at=now(),updated_at=now()
        WHERE id=$1::uuid AND entity_type='college' AND status='active'
        RETURNING id,user_id,entity_id,status`, [assignmentId, actor.userId]);
      const row = result.rows[0];
      if (!row) throw new NeonAuthorizationError(404, 'SCOPE_NOT_ACTIVE', 'Assignment is not active.');
      await client.query(`INSERT INTO public.audit_logs(actor_user_id,action,entity_type,entity_id,metadata)
        VALUES ($1::uuid,'revoke_entity_scope','college',$2::text,
          jsonb_build_object('user_id',$3::uuid,'assignment_id',$4::uuid))`, [actor.userId, row.entity_id, row.user_id, row.id]);
      return row;
    });
  }
}
