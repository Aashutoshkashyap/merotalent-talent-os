/** Company/Mentor operational panels use the existing capability/entity/entitlement model. */
import { randomUUID } from "node:crypto";
import type { PoolClient, QueryResultRow } from "pg";
import { z } from "zod";
import { withTransaction } from "./db";
import { NeonAuthorizationError, requireEntityAccess, requireModuleCapability, type EntityType, type NeonActor } from "./neon-authorization";
import { neonAdminDefinition, ticketSchema } from "./neon-admin-resources";
import { sanitizeAdminWrite, AdminResourceValidationError } from "@/lib/admin/admin-resource-service";
import { assertMediaObjectPath } from "./media-policy";
import { headObject } from "./storage";
import { appendNotificationEvent } from "./neon-application-events";
import { queueNeonReservationEmail } from "./neon-reservation-email";

type Client = Pick<PoolClient, "query">;
type Run = <T>(operation: (client: PoolClient) => Promise<T>) => Promise<T>;
type Row = QueryResultRow & Record<string, unknown>;
type Role = "company" | "mentor";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fail = (status: 400 | 403 | 404 | 409 | 503, code: string, message: string): never => { throw new NeonAuthorizationError(status, code, message); };
const executor = (client: Client) => ({ query: async <T extends QueryResultRow>(sql: string, params: readonly unknown[]) => (await client.query<T>(sql, [...params])).rows });
async function identity(client: Client, actor: NeonActor) {
  const linked = (await client.query<{ admin: boolean }>(`SELECT EXISTS(SELECT 1 FROM public.user_roles r
    WHERE r.user_id=p.user_id AND r.role IN ('admin','super_admin')) AS admin
    FROM public.profiles p JOIN public.neon_application_accounts a ON a.legacy_user_id=p.user_id AND a.status='active'
    JOIN public.neon_identity_links l ON l.application_account_id=a.id AND l.status='verified'
    WHERE p.user_id=$1::uuid AND l.neon_auth_user_id=$2::uuid AND p.account_status='active'
      AND p.deleted_at IS NULL FOR SHARE OF p,a,l`, [actor.userId, actor.neonAuthUserId])).rows[0];
  if (!linked || (actor.platformAdmin && !linked.admin)) fail(403, "ACCESS_DENIED", "Active verified account access is required.");
  if (actor.platformAdmin) {
    const roles = await client.query(`SELECT id FROM public.user_roles WHERE user_id=$1::uuid
      AND role IN ('admin','super_admin') FOR SHARE`, [actor.userId]);
    if (!roles.rowCount) fail(403, "ACCESS_DENIED", "Super Admin access is required.");
  }
}
async function guard(client: Client, actor: NeonActor, moduleKey: string, type: EntityType, id: string, feature: string | null) {
  if (actor.platformAdmin) {
    const roles = await client.query(`SELECT id FROM public.user_roles WHERE user_id=$1::uuid
      AND role IN ('admin','super_admin') FOR SHARE`, [actor.userId]);
    if (!roles.rowCount) fail(403, "ADMIN_ACCESS_REVOKED", "Super Admin access is no longer active.");
  }
  if (!actor.platformAdmin) {
    await client.query(`SELECT c.id FROM public.user_module_capabilities c JOIN public.module_capabilities m ON m.id=c.capability_id
      WHERE c.user_id=$1::uuid AND m.module_key=$2 FOR SHARE OF c,m`, [actor.userId, moduleKey]);
    await client.query(`SELECT id FROM public.entity_admin_assignments WHERE user_id=$1::uuid AND entity_type=$2 AND entity_id=$3::uuid AND status='active' FOR SHARE`, [actor.userId, type, id]);
    await client.query(`SELECT id FROM public.module_entitlements WHERE user_id=$1::uuid AND module_key=$2 AND entity_type=$3
      AND entity_id=$4::uuid AND status='active' AND start_at<=now() AND (expires_at IS NULL OR expires_at>now()) FOR SHARE`, [actor.userId, moduleKey, type, id]);
    await client.query(`SELECT p.id FROM public.packages p WHERE EXISTS (SELECT 1 FROM public.module_entitlements e
      WHERE e.package_id=p.id AND e.user_id=$1::uuid AND e.module_key=$2 AND e.entity_type=$3 AND e.entity_id=$4::uuid) FOR SHARE`,
    [actor.userId, moduleKey, type, id]);
    await client.query(`SELECT id FROM public.entity_feature_grants WHERE user_id=$1::uuid AND module_key=$2
      AND entity_type=$3 AND entity_id=$4::uuid FOR SHARE`, [actor.userId, moduleKey, type, id]);
  }
  const alternatives: Record<string, string[]> = {
    job_applications: ["job_applications", "application_management", "lead_viewing"],
    mentor_bookings: ["mentor_bookings", "bookings", "booking_management", "lead_viewing"],
    event_registrations: ["event_registrations", "registration_management", "lead_viewing"],
    booking_management: ["booking_management", "mentor_bookings", "bookings"],
    application_management: ["application_management", "job_applications"],
    registration_management: ["registration_management", "event_registrations"],
  };
  for (const candidate of feature ? alternatives[feature] ?? [feature] : [null]) {
    try { await requireEntityAccess(actor, moduleKey, type, id, candidate, executor(client)); return; }
    catch (error) { if (!(error instanceof NeonAuthorizationError && error.code === "ENTITY_ACCESS_REQUIRED")) throw error; }
  }
  fail(403, "ENTITY_ACCESS_REQUIRED", "This feature requires active access to the assigned entity.");
}
export { identity as assertRoleWorkspaceIdentity, guard as requireRoleWorkspaceAccess };
async function allowed(client: Client, actor: NeonActor, moduleKey: string, type: EntityType, id: string, feature: string) {
  try { await guard(client, actor, moduleKey, type, id, feature); return true; }
  catch (error) { if (error instanceof NeonAuthorizationError && error.status === 403) return false; throw error; }
}
const emptySnapshot = () => ({ company: null as Row | null, mentor: null as Row | null, jobs: [] as Row[], events: [] as Row[],
  services: [] as Row[], jobApplications: [] as Row[], eventRegistrations: [] as Row[], mentorBookings: [] as Row[] });
const writeSchemas = {
  "mentor-service": z.object({ mentor_id: z.string().uuid(), title: z.string().trim().min(1).max(240), description: z.string().max(10000).nullable(),
    session_type: z.enum(["one_to_one", "group"]), duration_minutes: z.number().int().min(15).max(480), capacity: z.number().int().min(1).max(1000),
    price: z.number().min(0).max(10_000_000), currency: z.literal("NPR"), is_active: z.boolean() }).strict(),
};
const fields: Record<string, readonly string[]> = {
  job: ["owner_user_id", "company_id", "title", "description", "location", "job_type", "experience_level", "is_remote", "application_deadline", "expires_at", "status"],
  event: ["organizer_user_id", "organizer_type", "organizer_id", "title", "description", "event_type", "format", "location", "meeting_url", "start_date", "end_date",
    "registration_deadline", "capacity", "ticket_price", "currency", "status", "attachment_path", "attachment_name", "attachment_mime_type"],
  mentor: ["headline", "description", "expertise", "hourly_rate", "years_experience", "is_available", "availability", "profile_image_url", "cover_image_url"],
  company: ["name", "description", "website", "location", "industry", "logo_url"],
};
export class NeonRoleWorkspaces {
  constructor(private readonly run: Run = withTransaction) {}
  async ticketConfiguration(actor: NeonActor, eventId: string, raw?: unknown, ticketId?: string) {
    if (!uuid.test(eventId) || (ticketId !== undefined && !uuid.test(ticketId))) fail(400,"INVALID_EVENT","Choose a valid event and ticket.");
    const payload = raw === undefined ? undefined : ticketSchema.parse(raw);
    if (payload && (payload.max_team_size<payload.min_team_size || payload.max_per_order<payload.min_per_order ||
      (payload.ticket_kind !== "individual" && (payload.min_per_order !== 1 || payload.max_per_order !== 1)) ||
      (payload.sales_start_at && payload.sales_end_at && new Date(payload.sales_end_at)<=new Date(payload.sales_start_at))))
      fail(400,"INVALID_TICKET","Review ticket sale dates, team size and purchase limits. Group orders contain one group.");
    return this.run(async client => {
      await identity(client,actor);
      await guard(client,actor,"events","event",eventId,"event_management");
      const event = await client.query(`SELECT id FROM public.events WHERE id=$1::uuid AND deleted_at IS NULL FOR UPDATE`,[eventId]);
      if (!event.rowCount) fail(404,"EVENT_NOT_FOUND","Event unavailable.");
      if (!payload) return (await client.query(`SELECT t.*,
        COALESCE((SELECT sum(r.ticket_quantity)::int FROM public.event_registrations r WHERE r.ticket_type_id=t.id
          AND r.status NOT IN ('cancelled','refunded') AND r.deleted_at IS NULL),0) AS reserved_quantity
        FROM public.event_ticket_types t WHERE event_id=$1::uuid AND deleted_at IS NULL ORDER BY price,id`,[eventId])).rows;
      if (ticketId) {
        const existing = await client.query<{ticket_kind:string}>(`SELECT id,ticket_kind FROM public.event_ticket_types WHERE id=$1::uuid AND event_id=$2::uuid AND deleted_at IS NULL FOR UPDATE`,[ticketId,eventId]);
        if (!existing.rowCount) fail(404,"TICKET_NOT_FOUND","Ticket unavailable for this event.");
        const reserved = (await client.query<{ count: number }>(`SELECT COALESCE(sum(ticket_quantity),0)::int AS count
          FROM public.event_registrations WHERE ticket_type_id=$1::uuid AND status NOT IN ('cancelled','refunded') AND deleted_at IS NULL`,[ticketId])).rows[0]?.count ?? 0;
        if (payload.total_quantity != null && payload.total_quantity<reserved) fail(409,"INVENTORY_RESERVED","Quantity cannot be lower than existing reservations. Let pending checkouts expire first.");
        if (reserved>0 && existing.rows[0].ticket_kind!==payload.ticket_kind) fail(409,"INVENTORY_RESERVED","The pricing unit cannot change after bookings. Create another tier instead.");
      }
      // Schema-validated keys only; event_id, ownership, sold counts and approval are never client-settable.
      const keys=Object.keys(payload), values=Object.values(payload);
      const row = ticketId ? (await client.query(`UPDATE public.event_ticket_types SET ${keys.map((key,index)=>`"${key}"=$${index+3}`).join(",")},updated_at=now()
        WHERE id=$1::uuid AND event_id=$2::uuid RETURNING *`,[ticketId,eventId,...values])).rows[0]
        : (await client.query(`INSERT INTO public.event_ticket_types(event_id,${keys.map(key=>`"${key}"`).join(",")})
          VALUES($1::uuid,${keys.map((_,index)=>`$${index+2}`).join(",")}) RETURNING *`,[eventId,...values])).rows[0];
      await client.query(`INSERT INTO public.audit_logs(actor_user_id,action,entity_type,entity_id,metadata)
        VALUES($1::uuid,$2,'event_ticket_types',$3::text,jsonb_build_object('event_id',$4::uuid))`,
      [actor.userId,ticketId ? "update_event_ticket" : "create_event_ticket",row.id,eventId]);
      return row;
    });
  }
  async events(actor: NeonActor, requestedId?: string) {
    if (requestedId && !uuid.test(requestedId)) fail(400, "INVALID_WORKSPACE", "Select a valid event.");
    return this.run(async client => {
      await identity(client, actor);
      const options = (await client.query<{ id: string; label: string }>(`SELECT DISTINCT e.id,e.title AS label
        FROM public.events e LEFT JOIN public.entity_admin_assignments a ON a.entity_type='event' AND a.entity_id=e.id
          AND a.user_id=$1::uuid AND a.status='active'
        LEFT JOIN public.user_module_capabilities c ON c.id=a.user_capability_id AND c.status='active'
        LEFT JOIN public.module_capabilities mc ON mc.id=c.capability_id AND mc.module_key='events' AND mc.is_active
        WHERE e.deleted_at IS NULL AND ($2::boolean OR (mc.id IS NOT NULL AND (c.expires_at IS NULL OR c.expires_at>now())))
        ORDER BY label,e.id LIMIT 200`, [actor.userId, actor.platformAdmin])).rows;
      const selected = requestedId ? options.find(row => row.id === requestedId) : options[0];
      if (requestedId && !selected) fail(403, "WORKSPACE_SCOPE_DENIED", "This event is not assigned to your account.");
      const snapshot = emptySnapshot();
      if (!selected) return { entityOptions: options, entityId: null, snapshot, subscription: null, locked: true, capabilities: {} };
      const subscription = (await client.query<Row>(`SELECT e.status,e.source,e.start_at,e.expires_at,e.features,p.name AS package_name
        FROM public.module_entitlements e LEFT JOIN public.packages p ON p.id=e.package_id
        WHERE e.user_id=$1::uuid AND e.module_key='events' AND e.entity_type='event' AND e.entity_id=$2::uuid
        ORDER BY (e.status='active' AND e.start_at<=now() AND (e.expires_at IS NULL OR e.expires_at>now())) DESC,e.expires_at DESC NULLS FIRST LIMIT 1`,
      [actor.userId, selected.id])).rows[0] ?? null;
      try { await guard(client, actor, "events", "event", selected.id, null); }
      catch (error) { if (error instanceof NeonAuthorizationError && error.status === 403)
        return { entityOptions: options, entityId: selected.id, snapshot, subscription, locked: true, capabilities: {} }; throw error; }
      const capabilities = { profile: await allowed(client, actor, "events", "event", selected.id, "event_management"),
        media: await allowed(client, actor, "events", "event", selected.id, "media_management"),
        registrations: await allowed(client, actor, "events", "event", selected.id, "event_registrations"),
        registrationManagement: await allowed(client, actor, "events", "event", selected.id, "registration_management") };
      snapshot.events = (await client.query<Row>(`SELECT * FROM public.events WHERE id=$1::uuid AND deleted_at IS NULL`, [selected.id])).rows;
      if (capabilities.registrations) snapshot.eventRegistrations = (await client.query<Row>(`SELECT id,event_id,user_id,status,payment_status,
        ticket_quantity,total_amount,form_data,registered_at FROM public.event_registrations WHERE event_id=$1::uuid
          AND deleted_at IS NULL ORDER BY registered_at DESC LIMIT 500`, [selected.id])).rows;
      return { entityOptions: options, entityId: selected.id, snapshot, subscription, locked: false, capabilities };
    });
  }
  async applicants(actor: NeonActor, companyId: string, offset = 0) {
    if (!uuid.test(companyId) || !Number.isInteger(offset) || offset < 0 || offset > 100000)
      fail(400, "INVALID_WORKSPACE", "Select a valid company and page.");
    return this.run(async client => {
      await identity(client, actor);
      await guard(client, actor, "jobs", "company", companyId, "job_applications");
      return (await client.query<Row>(`SELECT a.id,a.job_id,j.title AS job_title,a.user_id,a.status,a.full_name,a.email,a.phone,
        a.cover_letter,a.portfolio_url,a.resume_url,a.skills_match_score,a.form_data,a.notes,a.applied_at,a.updated_at,
        a.interview_at,a.interview_location,a.interview_duration_minutes
        FROM public.job_applications a JOIN public.jobs j ON j.id=a.job_id
        WHERE j.company_id=$1::uuid AND j.deleted_at IS NULL AND a.deleted_at IS NULL
        ORDER BY a.applied_at DESC,a.id LIMIT 100 OFFSET $2`, [companyId, offset])).rows;
    });
  }
  async snapshot(actor: NeonActor, role: Role, requestedId?: string) {
    if (!["company", "mentor"].includes(role) || (requestedId && !uuid.test(requestedId))) fail(400, "INVALID_WORKSPACE", "Select a valid workspace.");
    return this.run(async client => {
      await identity(client, actor);
      const moduleKey = role === "company" ? "jobs" : "mentor";
      const name = role === "company" ? "e.name" : "COALESCE(p.full_name,e.headline,'Mentor')";
      const join = role === "mentor" ? "LEFT JOIN public.profiles p ON p.user_id=e.user_id" : "";
      const options = (await client.query<{ id: string; label: string }>(`SELECT DISTINCT e.id,${name} AS label
        FROM public.${role === "company" ? "companies" : "mentors"} e ${join}
        LEFT JOIN public.entity_admin_assignments a ON a.entity_type=$3 AND a.entity_id=e.id AND a.user_id=$1::uuid AND a.status='active'
        LEFT JOIN public.user_module_capabilities c ON c.id=a.user_capability_id AND c.status='active'
        LEFT JOIN public.module_capabilities mc ON mc.id=c.capability_id AND mc.module_key=$4 AND mc.is_active
        WHERE e.deleted_at IS NULL AND ($2::boolean OR (mc.id IS NOT NULL AND (c.expires_at IS NULL OR c.expires_at>now())))
        ORDER BY label,e.id LIMIT 200`, [actor.userId, actor.platformAdmin, role, moduleKey])).rows;
      const entity = requestedId ? options.find(option => option.id === requestedId) : options[0];
      if (requestedId && !entity) fail(403, "WORKSPACE_SCOPE_DENIED", "This workspace is not assigned to your account.");
      const snapshot = emptySnapshot();
      if (!entity) return { entityOptions: options, entityId: null, snapshot, subscription: null, locked: true, capabilities: {} };
      const entitlement = (await client.query<Row>(`SELECT e.status,e.source,e.start_at,e.expires_at,e.features,p.name AS package_name
        FROM public.module_entitlements e LEFT JOIN public.packages p ON p.id=e.package_id
        WHERE e.user_id=$1::uuid AND e.module_key=$2 AND e.entity_type=$3 AND e.entity_id=$4::uuid
        ORDER BY (e.status='active' AND e.start_at<=now() AND (e.expires_at IS NULL OR e.expires_at>now())) DESC,e.expires_at DESC NULLS FIRST LIMIT 1`,
      [actor.userId, moduleKey, role, entity.id])).rows[0] ?? null;
      try { await guard(client, actor, moduleKey, role, entity.id, null); }
      catch (error) { if (error instanceof NeonAuthorizationError && error.status === 403)
        return { entityOptions: options, entityId: entity.id, snapshot, subscription: entitlement, locked: true, capabilities: {} }; throw error; }
      const profileFeature = role === "company" ? "job_management" : "profile_editing";
      const canEdit = await allowed(client, actor, moduleKey, role, entity.id, profileFeature);
      const profile = (await client.query<Row>(`SELECT e.* FROM public.${role === "company" ? "companies" : "mentors"} e WHERE e.id=$1::uuid AND e.deleted_at IS NULL`, [entity.id])).rows[0];
      snapshot[role] = profile;
      const capabilities: Record<string, boolean> = { profile: canEdit, events: actor.platformAdmin };
      capabilities.media = await allowed(client, actor, moduleKey, role, entity.id, "media_management");
      if (role === "company") {
        snapshot.jobs = canEdit ? (await client.query<Row>(`SELECT * FROM public.jobs WHERE company_id=$1::uuid AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 500`, [entity.id])).rows : [];
        capabilities.jobApplications = await allowed(client, actor, "jobs", "company", entity.id, "job_applications");
        if (capabilities.jobApplications) snapshot.jobApplications = (await client.query<Row>(`SELECT a.id,a.job_id,a.full_name,a.email,a.status,a.applied_at
          FROM public.job_applications a JOIN public.jobs j ON j.id=a.job_id WHERE j.company_id=$1::uuid
            AND a.deleted_at IS NULL AND j.deleted_at IS NULL ORDER BY a.applied_at DESC LIMIT 500`, [entity.id])).rows;
      } else {
        capabilities.services = await allowed(client, actor, "mentor", "mentor", entity.id, "session_management");
        capabilities.bookings = await allowed(client, actor, "mentor", "mentor", entity.id, "mentor_bookings");
        capabilities.bookingManagement = await allowed(client, actor, "mentor", "mentor", entity.id, "booking_management");
        if (capabilities.services) snapshot.services = (await client.query<Row>(`SELECT * FROM public.mentor_services WHERE mentor_id=$1::uuid AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 500`, [entity.id])).rows;
        if (capabilities.bookings) snapshot.mentorBookings = (await client.query<Row>(`SELECT b.*,jsonb_build_object('title',s.title,'session_type',s.session_type,
          'duration_minutes',s.duration_minutes) AS mentor_services FROM public.mentor_bookings b LEFT JOIN public.mentor_services s ON s.id=b.mentor_service_id
          WHERE b.mentor_id=$1::uuid AND b.deleted_at IS NULL ORDER BY b.scheduled_start DESC LIMIT 500`, [entity.id])).rows;
      }
      const events = (await client.query<Row>(`SELECT * FROM public.events WHERE organizer_type=$1 AND organizer_id=$2::uuid
        AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 200`, [role, entity.id])).rows;
      for (const event of events) {
        const canManage = await allowed(client, actor, "events", "event", String(event.id), "event_management");
        capabilities[`event:${event.id}`] = canManage;
        capabilities[`registrations:${event.id}`] = await allowed(client, actor, "events", "event", String(event.id), "registration_management");
        if (canManage) snapshot.events.push(event);
        if (await allowed(client, actor, "events", "event", String(event.id), "event_registrations")) {
          if (!snapshot.events.some(row => row.id === event.id)) snapshot.events.push(event);
          snapshot.eventRegistrations.push(...(await client.query<Row>(`SELECT id,event_id,status,payment_status,ticket_quantity,form_data,registered_at
            FROM public.event_registrations WHERE event_id=$1::uuid AND deleted_at IS NULL ORDER BY registered_at DESC LIMIT 500`, [event.id])).rows);
        }
      }
      return { entityOptions: options, entityId: entity.id, snapshot, subscription: entitlement, locked: false, capabilities };
    });
  }

  async save(actor: NeonActor, resource: "job" | "event" | "mentor" | "company" | "mentor-service", input: unknown, id?: string) {
    if ((id && !uuid.test(id)) || !["job", "event", "mentor", "company", "mentor-service"].includes(resource) || !input || typeof input !== "object" || Array.isArray(input))
      fail(400, "INVALID_RESOURCE", "Invalid workspace record.");
    const body = input as Row;
    const whitelist = resource === "mentor-service" ? Object.keys(writeSchemas[resource].shape) : fields[resource];
    if (Object.keys(body).some(key => !whitelist.includes(key))) fail(400, "PROTECTED_FIELD", "This field is controlled by Super Admin.");
    if (!Object.keys(body).length) fail(400, "INVALID_RESOURCE", "Provide fields to save.");
    return this.run(async client => {
      await identity(client, actor);
      const table = { job: "jobs", event: "events", mentor: "mentors", company: "companies", "mentor-service": "mentor_services" }[resource];
      const existing = id ? (await client.query<Row>(`SELECT * FROM public.${table} WHERE id=$1::uuid AND deleted_at IS NULL FOR UPDATE`, [id])).rows[0] : null;
      if (id && !existing) fail(404, "RECORD_NOT_FOUND", "The workspace record is unavailable.");
      let values: Row;
      if (resource === "mentor-service") {
        const parsed = writeSchemas[resource].safeParse(body);
        if (!parsed.success) fail(400, "INVALID_FIELDS", "Review the session fields.");
        values = parsed.data;
        if (existing && values.mentor_id !== existing.mentor_id) fail(403, "SCOPE_REASSIGNMENT_DENIED", "The service mentor cannot change.");
        if (values.session_type === "one_to_one" && values.capacity !== 1) fail(400, "INVALID_CAPACITY", "One-to-one sessions have one seat.");
        await guard(client, actor, "mentor", "mentor", String(values.mentor_id), "session_management");
      } else {
        const def = neonAdminDefinition(resource === "job" ? "jobs" : resource === "event" ? "events" : resource === "company" ? "companies" : "mentors");
        const safeFields = Object.fromEntries(whitelist.map(key => [key, def.fields[key]]));
        for (const key of ["logo_url", "profile_image_url", "cover_image_url"]) if (safeFields[key])
          safeFields[key] = { kind: "string", create: true, update: true, nullable: true, maxLength: 1000 };
        if (["mentor", "company"].includes(resource) && !id) fail(403, "PROFILE_ASSIGNMENT_REQUIRED", "A profile must be assigned before editing.");
        try { values = sanitizeAdminWrite({ ...def, fields: safeFields }, id ? "update" : "create", body); }
        catch (error) { if (error instanceof AdminResourceValidationError) fail(400, "INVALID_FIELDS", error.message); throw error; }
        if (resource === "mentor" || resource === "company") {
          await guard(client, actor, resource === "company" ? "jobs" : "mentor", resource, id!, resource === "company" ? "job_management" : "profile_editing");
          if (values.availability) {
            const parsed = z.object({ days: z.array(z.enum(["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"])).max(7),
              startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), timezone: z.literal("Asia/Kathmandu") }).strict().safeParse(values.availability);
            if (!parsed.success) fail(400, "INVALID_AVAILABILITY", "Review the available days and time window.");
            const availability = parsed.data;
            if (availability.endTime <= availability.startTime) fail(400, "INVALID_AVAILABILITY", "Availability must end after it starts.");
          }
        } else if (resource === "job") {
          const companyId = existing?.company_id ?? values.company_id;
          if (!companyId || !uuid.test(String(companyId)) || (existing && values.company_id !== undefined && values.company_id !== companyId))
            fail(403, "SCOPE_REASSIGNMENT_DENIED", "Use the assigned company for this listing.");
          await guard(client, actor, "jobs", "company", String(companyId), "job_management");
          values.company_id = companyId; values.owner_user_id = existing?.owner_user_id ?? actor.userId;
        } else {
          if (existing) {
            if ((values.organizer_id !== undefined && values.organizer_id !== existing.organizer_id) ||
                (values.organizer_type !== undefined && values.organizer_type !== existing.organizer_type))
              fail(403, "SCOPE_REASSIGNMENT_DENIED", "The event organizer cannot change here.");
            await guard(client, actor, "events", "event", id!, "event_management");
            values.organizer_user_id = existing.organizer_user_id;
          } else {
            await requireModuleCapability(actor, "events", executor(client));
            const type = values.organizer_type, organizer = String(values.organizer_id ?? "");
            if (!["company", "mentor"].includes(String(type)) || !uuid.test(organizer)) fail(400, "INVALID_ORGANIZER", "Choose an assigned organizer.");
            await guard(client, actor, type === "company" ? "jobs" : "mentor", type as EntityType, organizer, "event_management");
            values.organizer_user_id = actor.userId;
          }
          const merged = { ...existing, ...values };
          if (new Date(String(merged.end_date)) <= new Date(String(merged.start_date))) fail(400, "INVALID_SCHEDULE", "The event must end after it starts.");
          if (merged.event_type === "paid" && Number(merged.ticket_price) <= 0) fail(400, "INVALID_PRICE", "Paid events require a positive ticket price.");
          if (merged.attachment_path && merged.attachment_path !== existing?.attachment_path) {
            if (!id) fail(400, "SAVE_BEFORE_UPLOAD", "Save the event before attaching files.");
            assertMediaObjectPath({ module: "event_attachment", resourceId: id, path: String(merged.attachment_path) }, actor.userId);
            const owned = (await client.query(`SELECT id FROM public.media_upload_intents WHERE user_id=$1::uuid
              AND module='event_attachment' AND resource_id=$2::uuid AND object_path=$3`, [actor.userId, id, merged.attachment_path])).rowCount;
            const object = owned ? await headObject("event-attachments", String(merged.attachment_path)) : null;
            if (!object || object.contentType !== merged.attachment_mime_type) fail(403, "MEDIA_NOT_OWNED", "Use a validated event attachment.");
          }
        }
        if (resource === "mentor" || resource === "company") {
          for (const key of ["logo_url", "profile_image_url", "cover_image_url"]) {
            const path = values[key];
            if (!path || path === existing?.[key]) continue;
            const mediaModule = resource === "company" ? "company_logo" : "mentor_profile";
            await guard(client, actor, resource === "company" ? "jobs" : "mentor", resource, id!, "media_management");
            assertMediaObjectPath({ module: mediaModule, resourceId: id, path: String(path) }, actor.userId);
            const owned = (await client.query(`SELECT id FROM public.media_upload_intents WHERE user_id=$1::uuid
              AND module=$2 AND resource_id=$3::uuid AND object_path=$4`, [actor.userId, mediaModule, id, path])).rowCount;
            const object = owned ? await headObject(resource === "company" ? "profile-media" : "mentor-media", String(path)) : null;
            if (!object || !["image/png", "image/jpeg", "image/webp", "image/avif"].includes(object.contentType ?? ""))
              fail(403, "MEDIA_NOT_OWNED", "Use a validated profile image.");
          }
        }
        if (resource === "job" || resource === "event") {
          if (!["draft", "pending_approval"].includes(String(values.status))) fail(403, "ADMIN_APPROVAL_REQUIRED", "Save a draft or submit for Super Admin approval.");
          values.approval_status = "pending"; values.approved_by = null; values.approved_at = null;
          values.rejection_reason = null; values.is_active = false;
        }
      }
      const keys = Object.keys(values), params = keys.map(key => ["availability"].includes(key) ? JSON.stringify(values[key]) : values[key]);
      const safeKey = (key: string) => { if (!/^[a-z][a-z0-9_]*$/.test(key)) throw new Error("Invalid field."); return `"${key}"`; };
      const row = id ? (await client.query<Row>(`UPDATE public.${table} SET ${keys.map((key, index) => `${safeKey(key)}=$${index + 1}`).join(",")},updated_at=now()
        WHERE id=$${params.length + 1}::uuid RETURNING *`, [...params, id])).rows[0]
        : (await client.query<Row>(`INSERT INTO public.${table}(id,${keys.map(safeKey).join(",")})
          VALUES($1::uuid,${keys.map((_, index) => `$${index + 2}`).join(",")}) RETURNING *`, [randomUUID(), ...params])).rows[0];
      await client.query(`INSERT INTO public.audit_logs(actor_user_id,action,entity_type,entity_id,metadata)
        VALUES($1::uuid,$2,$3,$4::text,jsonb_build_object('fields',$5::text[]))`, [actor.userId, id ? "owner_update" : "owner_create", table, row.id, keys]);
      return row;
    });
  }

  async transition(actor: NeonActor, workflow: "event_registration" | "mentor_booking", id: string, next: string) {
    if (!uuid.test(id) || !["event_registration", "mentor_booking"].includes(workflow)) fail(400, "INVALID_WORKFLOW", "Invalid workflow.");
    return this.run(async client => {
      await identity(client, actor);
      const table = workflow === "event_registration" ? "event_registrations" : "mentor_bookings";
      const row = (await client.query<Row>(`SELECT * FROM public.${table} WHERE id=$1::uuid AND deleted_at IS NULL FOR UPDATE`, [id])).rows[0];
      if (!row) fail(404, "RECORD_NOT_FOUND", "Record unavailable.");
      await guard(client, actor, workflow === "event_registration" ? "events" : "mentor", workflow === "event_registration" ? "event" : "mentor",
        String(workflow === "event_registration" ? row.event_id : row.mentor_id), workflow === "event_registration" ? "registration_management" : "booking_management");
      if (row.status === next) return { id: row.id, status: row.status, duplicate: true };
      const transitions: Record<string, string[]> = workflow === "event_registration"
        ? { pending: ["confirmed", "cancelled"], confirmed: ["attended", "cancelled"] }
        : { pending: ["confirmed", "declined", "cancelled"], confirmed: ["completed", "no_show", "cancelled"] };
      if (!transitions[String(row.status)]?.includes(next)) fail(409, "INVALID_TRANSITION", "This status change is unavailable.");
      if (["confirmed", "attended", "completed", "no_show"].includes(next) && !["success", "not_required"].includes(String(row.payment_status)))
        fail(403, "PAYMENT_NOT_VERIFIED", "Verified payment is required for this status.");
      if (["cancelled", "declined"].includes(next) && row.payment_status === "success") fail(409, "REFUND_REQUIRED", "Paid records need a verified refund workflow.");
      if (["completed", "no_show"].includes(next) && new Date(String(row.scheduled_end)).getTime() > Date.now()) fail(409, "SESSION_NOT_FINISHED", "The session has not ended yet.");
      const updated = (await client.query<Row>(`UPDATE public.${table} SET status=$2,updated_at=now() WHERE id=$1::uuid RETURNING id,status`, [id, next])).rows[0];
      const recipient = String(workflow === "event_registration" ? row.user_id : row.student_id);
      const notification = (await client.query<{ id: string }>(`INSERT INTO public.notifications(recipient_id,title,message,type,category,channel,status,entity_type,entity_id,action_url)
        VALUES($1::uuid,'Activity status updated',$2,'info',$3,'dashboard','queued',$3,$4::uuid,$5) RETURNING id`,
      [recipient, `Your ${workflow.replaceAll("_", " ")} is now ${next.replaceAll("_", " ")}.`, workflow, id,
        workflow === "event_registration" ? "/dashboard/competitions" : "/dashboard/mentorship"])).rows[0];
      await appendNotificationEvent(client, recipient, notification.id);
      if (next === "confirmed" || next === "cancelled" || next === "completed")
        await queueNeonReservationEmail(client,workflow === "mentor_booking" ? "mentor" : "event",id,next);
      await client.query(`INSERT INTO public.audit_logs(actor_user_id,action,entity_type,entity_id,metadata)
        VALUES($1::uuid,'owner_status_changed',$2,$3::text,jsonb_build_object('from',$4::text,'to',$5::text))`, [actor.userId, table, id, row.status, next]);
      return updated;
    });
  }
}
