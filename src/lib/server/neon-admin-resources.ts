/** Declarative Super Admin CRUD backed by the isolated Neon database. */
import type { PoolClient, QueryResultRow } from "pg";
import { getAdminResource, type AdminResourceDefinition, type AdminResourceName } from "@/lib/admin/admin-resources";
import { AdminResourceValidationError, parseAdminListQuery, sanitizeAdminWrite, validateAdminResourceId } from "@/lib/admin/admin-resource-service";
import { AdminRequestError, applyAdminServerFields } from "@/lib/admin/admin-route-utils";
import { queryRows, withTransaction } from "./db";
import { NeonAuthorizationError, requireSuperAdmin, type NeonActor } from "./neon-authorization";
import { assertMediaObjectPath, mediaPolicies, type MediaModule } from "./media-policy";
import { headObject } from "./storage";
import { z } from "zod";

type Row = QueryResultRow & Record<string, unknown>;
type Query = <T extends QueryResultRow>(sql: string, params: readonly unknown[]) => Promise<T[]>;
type Run = <T>(operation: (client: PoolClient) => Promise<T>) => Promise<T>;

// Capability, payment, and booking mutations must use their own atomic workflows.
const dedicatedWrites = new Set<AdminResourceName>(["user-roles", "user-permissions", "access-requests", "subscriptions", "payments", "mentor-bookings", "event-registrations", "featured-items", "notifications"]);
const adminGuard = `EXISTS (SELECT 1 FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id=p.user_id
  JOIN public.neon_application_accounts aa ON aa.legacy_user_id=p.user_id AND aa.status='active'
  JOIN public.neon_identity_links l ON l.application_account_id=aa.id AND l.status='verified'
  WHERE p.user_id=$1::uuid AND l.neon_auth_user_id=$2::uuid
    AND p.account_status='active' AND p.deleted_at IS NULL AND ur.role IN ('admin','super_admin'))`;
const ident = (value: string) => {
  if (!/^[a-z][a-z0-9_]*$/.test(value)) throw new Error("Invalid declarative SQL identifier.");
  return `"${value}"`;
};
const mediaFields: Partial<Record<AdminResourceName, Record<string, MediaModule>>> = {
  companies: { logo_url: "company_logo" },
  colleges: { logo_url: "college_logo", cover_image_url: "college_cover", gallery_urls: "college_gallery" },
  mentors: { profile_image_url: "mentor_profile", cover_image_url: "mentor_profile" },
  events: { cover_image_url: "event_cover", attachment_path: "event_attachment" },
  "partnered-courses": { thumbnail_url: "course_thumbnail" }, advertisements: { image_url: "advertisement" },
};

/** Match existing UI fields and schema without extending the legacy write API. */
export function neonAdminDefinition(resource: AdminResourceName): AdminResourceDefinition {
  const original = getAdminResource(resource);
  if (resource === "colleges") return { ...original,
    select: `${original.select},institution_category,affiliation,level,applications_enabled,chairperson_name,chairperson_designation,chairperson_message,chairperson_image_url,principal_name,principal_designation,principal_message,principal_image_url`,
    fields: { ...original.fields, owner_user_id: { ...original.fields.owner_user_id, requiredOnCreate: false, nullable: true },
      institution_category: { kind: "string", create: true, update: true, values: ["college", "school", "plus_two"] },
      affiliation: { kind: "string", create: true, update: true, nullable: true, maxLength: 240 },
      level: { kind: "string", create: true, update: true, nullable: true, maxLength: 240 },
      applications_enabled: { kind: "boolean", create: true, update: true } } };
  if (resource === "events") return { ...original,
    select: `${original.select},category_id,short_description,lifecycle_status,registration_open_at,registration_close_at,is_multi_program,terms_and_conditions`,
    fields: { ...original.fields,
      category_id: { kind: "uuid", create: true, update: true, nullable: true },
      short_description: { kind: "string", create: true, update: true, nullable: true, maxLength: 1000 },
      lifecycle_status: { kind: "string", create: true, update: true, values: ["draft", "published", "registration_open", "registration_closed", "ongoing", "completed", "cancelled", "postponed"] },
      registration_open_at: { kind: "timestamp", create: true, update: true, nullable: true },
      registration_close_at: { kind: "timestamp", create: true, update: true, nullable: true },
      is_multi_program: { kind: "boolean", create: true, update: true },
      terms_and_conditions: { kind: "string", create: true, update: true, nullable: true, maxLength: 20_000 },
      status: { ...original.fields.status, values: [...original.fields.status.values!, "postponed"] } } };
  return original;
}

function projection(definition: AdminResourceDefinition): string {
  const columns = definition.select.replace(",institutes(name)", "").split(",").map(column => `r.${ident(column)}`).join(",");
  const college = definition.resource === "colleges" ? `,COALESCE((SELECT d.payment_verified
    FROM public.institute_directory d WHERE d.id=r.id),false) AS payment_verified` : "";
  const application = definition.resource === "college-applications" ? `,(SELECT jsonb_build_object('name',i.name) FROM public.institutes i WHERE i.id=r.institute_id) AS institutes` : "";
  const mentor = definition.resource === "mentors" ? `,(SELECT p.full_name FROM public.profiles p WHERE p.user_id=r.user_id LIMIT 1) AS full_name,
    (SELECT p.email FROM public.profiles p WHERE p.user_id=r.user_id LIMIT 1) AS email,
    (SELECT p.location FROM public.profiles p WHERE p.user_id=r.user_id LIMIT 1) AS location` : "";
  return `${columns}${college}${application}${mentor}`;
}

async function assertAdmin(actor: NeonActor, query: Query, lock = false) {
  requireSuperAdmin(actor);
  const rows = await query<{ allowed: boolean }>(lock ? `SELECT true AS allowed FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id=p.user_id
    JOIN public.neon_application_accounts aa ON aa.legacy_user_id=p.user_id AND aa.status='active'
    JOIN public.neon_identity_links l ON l.application_account_id=aa.id AND l.status='verified'
    WHERE p.user_id=$1::uuid AND l.neon_auth_user_id=$2::uuid
      AND p.account_status='active' AND p.deleted_at IS NULL AND ur.role IN ('admin','super_admin')
    FOR SHARE OF p,ur,aa,l` : `SELECT ${adminGuard} AS allowed`,
  [actor.userId, actor.neonAuthUserId]);
  if (!rows[0]?.allowed) throw new NeonAuthorizationError(403, "ADMIN_REQUIRED", "Super Admin access required.");
}

function where(definition: AdminResourceDefinition, params: unknown[], includeDeleted = false) {
  const clauses = [adminGuard];
  for (const [column, value] of Object.entries(definition.scope ?? {})) {
    params.push(value); clauses.push(`r.${ident(column)}=$${params.length}`);
  }
  if (definition.softDelete && !includeDeleted) {
    const rule = definition.softDelete;
    if (rule.mode === "timestamp") clauses.push(`r.${ident(rule.column)} IS NULL`);
    else { params.push(rule.value); clauses.push(`r.${ident(rule.column)} IS DISTINCT FROM $${params.length}`); }
  }
  return clauses;
}

export async function listNeonAdminResource(actor: NeonActor, resource: AdminResourceName,
  search: URLSearchParams, query: Query = queryRows) {
  const definition = neonAdminDefinition(resource);
  const list = parseAdminListQuery(definition, search);
  await assertAdmin(actor, query);
  const params: unknown[] = [actor.userId, actor.neonAuthUserId];
  const clauses = where(definition, params, list.includeDeleted);
  for (const [column, value] of Object.entries(list.filters)) {
    params.push(value); clauses.push(`r.${ident(column)}=$${params.length}`);
  }
  if (list.search && definition.searchColumn) {
    params.push(`%${list.search.replace(/[\\%_]/g, "\\$&")}%`);
    clauses.push(`r.${ident(definition.searchColumn)} ILIKE $${params.length}`);
  }
  const filter = clauses.join(" AND ");
  const [count] = await query<{ count: string }>(`SELECT count(*)::text AS count FROM public.${ident(definition.table)} r WHERE ${filter}`, params);
  const data = await query<Row>(`SELECT ${projection(definition)} FROM public.${ident(definition.table)} r
    WHERE ${filter} ORDER BY r.${ident(list.sortBy)} ${list.ascending ? "ASC" : "DESC"},r.id
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, list.pageSize, list.offset]);
  const total = Number(count?.count ?? 0);
  return { data, meta: { page: list.page, pageSize: list.pageSize, total, totalPages: Math.ceil(total/list.pageSize),
    sortBy: list.sortBy, sortDirection: list.ascending ? "asc" : "desc" } };
}

export async function readNeonAdminResource(actor: NeonActor, resource: AdminResourceName, rawId: string,
  query: Query = queryRows) {
  const id = validateAdminResourceId(rawId);
  const definition = neonAdminDefinition(resource);
  await assertAdmin(actor, query);
  const params: unknown[] = [actor.userId, actor.neonAuthUserId, id];
  const clauses = [...where(definition, params), "r.id=$3::uuid"];
  const [row] = await query<Row>(`SELECT ${projection(definition)} FROM public.${ident(definition.table)} r
    WHERE ${clauses.join(" AND ")} LIMIT 1`, params);
  if (!row) throw new NeonAuthorizationError(404, "RECORD_NOT_FOUND", "The requested record does not exist.");
  return row;
}

function sanitize(definition: AdminResourceDefinition, operation: "create" | "update", raw: unknown) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return sanitizeAdminWrite(definition, operation, raw);
  const fields = { ...definition.fields };
  for (const [field] of Object.entries(mediaFields[definition.resource] ?? {})) {
    // Canonical object references are validated against upload ownership below.
    fields[field] = field === "gallery_urls" ? fields[field] : { ...fields[field], kind: "string", maxLength: 2048 };
  }
  return sanitizeAdminWrite({ ...definition, fields }, operation, raw);
}

function validation(field: string, message: string): never {
  throw new AdminResourceValidationError("The request body is invalid.", { [field]: [message] });
}

async function validateRelationships(client: PoolClient, definition: AdminResourceDefinition, row: Row) {
  const resource = definition.resource;
  const ownerField = resource === "colleges" || resource === "jobs" ? "owner_user_id"
    : resource === "mentors" || resource === "companies" ? "user_id" : resource === "events" ? "organizer_user_id" : null;
  if (ownerField && row[ownerField]) {
    const profile = await client.query(`SELECT user_id FROM public.profiles WHERE user_id=$1::uuid
      AND account_status='active' AND deleted_at IS NULL`, [row[ownerField]]);
    if (!profile.rowCount) validation(ownerField, "Choose an active platform account.");
  }
  if (resource === "jobs" && row.company_id) {
    const company = await client.query(`SELECT id FROM public.companies WHERE id=$1::uuid
      AND user_id=$2::uuid AND deleted_at IS NULL`, [row.company_id,row.owner_user_id]);
    if (!company.rowCount) validation("company_id", "The company must belong to the selected listing owner.");
  }
  if (resource === "events" && row.organizer_type !== "user" && row.organizer_id) {
    const tables: Record<string, { table: string; owner: string }> = {
      college: { table: "institutes", owner: "owner_user_id" }, mentor: { table: "mentors", owner: "user_id" }, company: { table: "companies", owner: "user_id" } };
    const relation = tables[String(row.organizer_type)];
    const target = relation && await client.query(`SELECT id FROM public.${ident(relation.table)}
      WHERE id=$1::uuid AND ${ident(relation.owner)}=$2::uuid AND deleted_at IS NULL`, [row.organizer_id,row.organizer_user_id]);
    if (!target?.rowCount) validation("organizer_id", "The organization must belong to the selected organizer.");
  }
  if (resource === "colleges" && typeof row.total_seats === "number" && typeof row.available_seats === "number" && row.available_seats>row.total_seats)
    validation("available_seats", "Available seats cannot exceed total seats.");
  if (resource === "jobs" && row.salary_min != null && row.salary_max != null && Number(row.salary_min)>Number(row.salary_max))
    validation("salary_max", "Maximum salary must be at least minimum salary.");
  if (["events","advertisements"].includes(resource) && new Date(String(row.end_date))<=new Date(String(row.start_date)))
    validation("end_date", "End date must follow the start date.");
  if (resource === "events" && ((row.organizer_type !== "user" && !row.organizer_id) ||
    (row.registration_open_at && row.registration_close_at && new Date(String(row.registration_close_at))<=new Date(String(row.registration_open_at)))))
    validation("organizer_id", "Choose an organization and valid registration dates.");
  if (resource === "packages") {
    const scope = row.module_scope;
    if (!Array.isArray(scope) || scope.some(module => !["student","college","mentor","jobs","events","partnered_courses"].includes(String(module))) || new Set(scope).size !== scope.length)
      validation("module_scope", "Choose valid, distinct modules.");
    if ((row.package_kind === "free" || row.package_kind === "complimentary") && Number(row.price)!==0)
      validation("price", "Free or complimentary plans must have zero price.");
    if (row.is_default_free && (row.package_kind!=="free" || Number(row.price)!==0 || !row.duration_days || !scope.length || row.is_publicly_selectable))
      validation("is_default_free", "Default free plans need a duration and module scope and must be hidden from public selection.");
  }
}

async function validateMedia(client: PoolClient, actor: NeonActor, definition: AdminResourceDefinition,
  id: string | undefined, payload: Row, existing: Row | undefined) {
  for (const [field, module] of Object.entries(mediaFields[definition.resource] ?? {})) {
    if (!(field in payload) || payload[field] == null) continue;
    const values = Array.isArray(payload[field]) ? payload[field] as string[] : [String(payload[field])];
    const previous = Array.isArray(existing?.[field]) ? existing[field] as string[] : [String(existing?.[field] ?? "")];
    for (const value of values) {
      if (previous.includes(value)) continue;
      if (field !== "attachment_path" && (/^https?:\/\//.test(value) || value.startsWith("/"))) {
        try {
          const url = new URL(value, "https://www.merotalent.com");
          if (!["http:","https:"].includes(url.protocol) || url.username || url.password || value.startsWith("//") || value.includes("\\")) throw new Error();
        } catch { validation(field, "Choose an allowed public image URL."); }
        continue;
      }
      if (!id) validation(field, "Save the listing before uploading its media.");
      try { assertMediaObjectPath({ module, resourceId: id!, path: value }, actor.userId, false); }
      catch { validation(field, "Choose an image uploaded for this listing."); }
      const intent = await client.query(`SELECT id FROM public.media_upload_intents
        WHERE user_id=$1::uuid AND resource_id=$2::uuid AND module=$3 AND object_path=$4`, [actor.userId,id,module,value]);
      if (!intent.rowCount || !await headObject(mediaPolicies[module].bucket, value))
        validation(field, "The uploaded media object is unavailable.");
    }
  }
}

export async function saveNeonAdminResource(actor: NeonActor, resource: AdminResourceName, raw: unknown,
  id?: string, run: Run = withTransaction) {
  requireSuperAdmin(actor);
  const definition = neonAdminDefinition(resource);
  if (dedicatedWrites.has(resource) || (!id && definition.creatable === false))
    throw new AdminRequestError(405, "DEDICATED_WORKFLOW_REQUIRED", "Use this resource's secure management workflow.");
  if (id) validateAdminResourceId(id);
  const payload = sanitize(definition, id ? "update" : "create", raw);
  Object.assign(payload, definition.scope ?? {});
  applyAdminServerFields(definition, payload, actor.userId, id ? "update" : "create");
  if (resource === "events" && typeof payload.status === "string")
    payload.is_active=payload.status === "approved" || payload.status === "published";
  return run(async client => {
    const query: Query = (sql, params) => client.query(sql, [...params]).then(result => result.rows);
    await assertAdmin(actor, query, true);
    let existing: Row | undefined;
    if (id) {
      const params: unknown[] = [actor.userId,actor.neonAuthUserId,id];
      existing = (await client.query<Row>(`SELECT r.* FROM public.${ident(definition.table)} r
        WHERE r.id=$3::uuid AND ${where(definition,params).join(" AND ")} FOR UPDATE OF r`, params)).rows[0];
      if (!existing) throw new NeonAuthorizationError(404, "RECORD_NOT_FOUND", "The requested record does not exist.");
    }
    const next: Row = { ...(resource === "events" ? {organizer_type:"user"} : {}),
      ...(resource === "packages" ? {module_scope:[]} : {}), ...existing, ...payload };
    await validateRelationships(client,definition,next);
    await validateMedia(client,actor,definition,id,payload,existing);
    const columns = Object.keys(payload);
    const values = columns.map(column => definition.fields[column]?.kind === "json" ? JSON.stringify(payload[column]) : payload[column]);
    const result = id ? await client.query<Row>(`UPDATE public.${ident(definition.table)} SET
      ${columns.map((column,index) => `${ident(column)}=$${index+1}`).join(",")},updated_at=now()
      WHERE id=$${values.length+1}::uuid RETURNING id`, [...values,id])
      : await client.query<Row>(`INSERT INTO public.${ident(definition.table)}(${columns.map(ident).join(",")})
        VALUES(${values.map((_,index) => `$${index+1}`).join(",")}) RETURNING id`, values);
    const targetId = String(result.rows[0]?.id);
    await client.query(`INSERT INTO public.audit_logs(actor_user_id,action,entity_type,entity_id,metadata)
      VALUES ($1::uuid,$2,$3,$4,jsonb_build_object('fields',$5::text[]))`,
    [actor.userId,id ? "admin_update_resource" : "admin_create_resource",definition.table,targetId,columns]);
    return readNeonAdminResource(actor,resource,targetId,query);
  });
}

export async function deleteNeonAdminResource(actor: NeonActor, resource: AdminResourceName, rawId: string,
  run: Run = withTransaction) {
  requireSuperAdmin(actor);
  const definition = neonAdminDefinition(resource);
  if (dedicatedWrites.has(resource) || !definition.deletable || !definition.softDelete)
    throw new AdminRequestError(405,"DEDICATED_WORKFLOW_REQUIRED","Use this resource's secure management workflow.");
  const id = validateAdminResourceId(rawId);
  return run(async client => {
    const query: Query = (sql,params) => client.query(sql,[...params]).then(result => result.rows);
    await assertAdmin(actor,query,true);
    const params: unknown[] = [actor.userId,actor.neonAuthUserId,id];
    const clauses = [...where(definition,params),"r.id=$3::uuid"];
    const rule = definition.softDelete!;
    const patch: Record<string,unknown> = { ...rule.patch, [rule.column]: rule.mode === "timestamp" ? new Date().toISOString() : rule.value };
    if (resource === "jobs" || resource === "events" || resource === "advertisements") patch.is_active=false;
    const assignments = Object.entries(patch).map(([key,value]) => { params.push(value); return `${ident(key)}=$${params.length}`; });
    const [row] = (await client.query<Row>(`UPDATE public.${ident(definition.table)} r SET ${assignments.join(",")}
      WHERE ${clauses.join(" AND ")} RETURNING id`,params)).rows;
    if (!row) throw new NeonAuthorizationError(404,"RECORD_NOT_FOUND","The requested record does not exist.");
    await client.query(`INSERT INTO public.audit_logs(actor_user_id,action,entity_type,entity_id)
      VALUES ($1::uuid,'admin_delete_resource',$2,$3)`,[actor.userId,definition.table,id]);
    return { id, deleted: true };
  });
}

export async function neonAdminOptions(actor: NeonActor, kind: string, query: Query = queryRows) {
  await assertAdmin(actor,query);
  const queries: Record<string,string> = {
    owners: `SELECT p.user_id,p.full_name,p.email FROM public.profiles p WHERE p.account_status='active' AND p.deleted_at IS NULL ORDER BY p.full_name,p.user_id LIMIT 1000`,
    companies: `SELECT id,user_id,name FROM public.companies WHERE deleted_at IS NULL ORDER BY name,id LIMIT 1000`,
    mentors: `SELECT p.user_id AS id,p.full_name,p.email FROM public.profiles p WHERE p.account_status='active' AND p.deleted_at IS NULL AND (
      EXISTS(SELECT 1 FROM public.user_roles ur WHERE ur.user_id=p.user_id AND ur.role='mentor') OR
      EXISTS(SELECT 1 FROM public.mentors m WHERE m.user_id=p.user_id AND m.deleted_at IS NULL) OR
      EXISTS(SELECT 1 FROM public.user_module_capabilities umc JOIN public.module_capabilities mc ON mc.id=umc.capability_id
        WHERE umc.user_id=p.user_id AND mc.module_key='mentor' AND mc.is_active AND umc.status='active' AND (umc.expires_at IS NULL OR umc.expires_at>now()))) ORDER BY p.full_name,p.user_id LIMIT 1000`,
    "event-categories": `SELECT id,name,slug FROM public.event_categories ORDER BY display_order,id`,
  };
  if (!queries[kind]) throw new NeonAuthorizationError(400,"INVALID_OPTIONS","Choose a supported option list.");
  return query<Row>(`SELECT options.* FROM (${queries[kind]}) options WHERE ${adminGuard}`,[actor.userId,actor.neonAuthUserId]);
}

export async function listNeonAdminEventChildren(actor: NeonActor, rawId: string, kind: string,
  query: Query = queryRows) {
  const id=validateAdminResourceId(rawId);
  await readNeonAdminResource(actor,"events",id,query);
  const statements: Record<string,string>={
    programs: `SELECT id,event_id,title,slug,description,start_time,end_time,venue,capacity,requires_registration,speaker_or_organizer,status,display_order
      FROM public.event_programs WHERE event_id=$1::uuid AND deleted_at IS NULL ORDER BY start_time,id`,
    tickets: `SELECT id,event_id,program_id,name,description,ticket_kind,min_team_size,max_team_size,price,currency,total_quantity,quantity_sold,min_per_order,max_per_order,sales_start_at,sales_end_at,eligibility_rules,is_active
      FROM public.event_ticket_types WHERE event_id=$1::uuid AND deleted_at IS NULL ORDER BY price,id`,
    registrations: `SELECT r.id,r.registration_number,r.team_name,r.status,r.payment_status,r.ticket_quantity,r.attendee_count,r.total_amount,r.registered_at,
      jsonb_build_object('id',p.user_id,'email',p.email,'full_name',p.full_name) AS "user",
      jsonb_build_object('name',tt.name) AS ticket_type,
      COALESCE((SELECT jsonb_agg(jsonb_build_object('id',ep.id,'full_name',ep.full_name,'email',ep.email,'phone',ep.phone,'student_id',ep.student_id,'role_in_team',ep.role_in_team))
        FROM public.event_participants ep WHERE ep.registration_id=r.id),'[]'::jsonb) AS participants
      FROM public.event_registrations r LEFT JOIN public.profiles p ON p.user_id=r.user_id
      LEFT JOIN public.event_ticket_types tt ON tt.id=r.ticket_type_id
      WHERE r.event_id=$1::uuid AND r.deleted_at IS NULL ORDER BY r.registered_at DESC,r.id`,
  };
  if (!statements[kind]) throw new NeonAuthorizationError(400,"INVALID_EVENT_PANEL","Choose a supported event panel.");
  return query<Row>(`SELECT panels.* FROM (${statements[kind].replace(/\$1/g,"$3")}) panels WHERE ${adminGuard}`,
    [actor.userId,actor.neonAuthUserId,id]);
}

const programSchema=z.object({title:z.string().trim().min(1).max(240),start_time:z.string().datetime({offset:true}),end_time:z.string().datetime({offset:true}),
  venue:z.string().trim().max(240).nullable(),capacity:z.number().int().min(1).nullable(),speaker_or_organizer:z.string().trim().max(240).nullable()}).strict();
export const ticketSchema=z.object({name:z.string().trim().min(1).max(180),ticket_kind:z.enum(["individual","team","group"]),price:z.number().min(0).max(10_000_000).multipleOf(0.01),currency:z.literal("NPR"),
  description:z.string().trim().max(2000).nullable().optional(),sales_start_at:z.string().datetime({offset:true}).nullable().optional(),sales_end_at:z.string().datetime({offset:true}).nullable().optional(),
  eligibility_rules:z.object({benefits:z.array(z.string().trim().min(1).max(200)).max(20)}).strict().optional(),
  total_quantity:z.number().int().min(1).nullable(),min_team_size:z.number().int().min(1).max(100),max_team_size:z.number().int().min(1).max(100),
  min_per_order:z.number().int().min(1).max(10),max_per_order:z.number().int().min(1).max(10),is_active:z.boolean()}).strict();
export async function createNeonAdminEventChild(actor: NeonActor, rawId: string, kind: string, raw: unknown,
  run: Run=withTransaction) {
  requireSuperAdmin(actor);
  const id=validateAdminResourceId(rawId);
  const parsed=kind === "programs" ? programSchema.safeParse(raw) : kind === "tickets" ? ticketSchema.safeParse(raw) : null;
  if (!parsed?.success) throw new NeonAuthorizationError(400,"INVALID_EVENT_PANEL_RECORD","Provide valid event panel fields.");
  const value=parsed.data as Row;
  if (kind === "programs" && new Date(String(value.end_time))<=new Date(String(value.start_time))) validation("end_time","Session end must follow its start.");
  if (kind === "tickets" && (Number(value.max_team_size)<Number(value.min_team_size) || Number(value.max_per_order)<Number(value.min_per_order)))
    validation("max_per_order","Maximum team and order sizes must be at least their minimums.");
  if (kind === "tickets" && value.sales_start_at && value.sales_end_at && new Date(String(value.sales_end_at))<=new Date(String(value.sales_start_at)))
    validation("sales_end_at","Sale end must follow sale start.");
  if (kind === "tickets" && value.ticket_kind !== "individual" && (value.min_per_order !== 1 || value.max_per_order !== 1))
    validation("max_per_order","Group tickets are priced per whole group; one group per order.");
  return run(async client=> {
    const query: Query=(sql,params)=>client.query(sql,[...params]).then(result=>result.rows);
    await assertAdmin(actor,query,true);
    const event=(await client.query<{id:string;start_date:Date;end_date:Date}>(`SELECT id,start_date,end_date FROM public.events
      WHERE id=$1::uuid AND deleted_at IS NULL FOR SHARE`,[id])).rows[0];
    if (!event) throw new NeonAuthorizationError(404,"EVENT_NOT_FOUND","Event unavailable.");
    if (kind === "programs" && (new Date(String(value.start_time))<event.start_date || new Date(String(value.end_time))>event.end_date))
      validation("start_time","Sessions must fall within the event's dates.");
    const table=kind === "programs" ? "event_programs" : "event_ticket_types";
    const payload={event_id:id,...value};
    const columns=Object.keys(payload);
    const result=(await client.query<Row>(`INSERT INTO public.${ident(table)}(${columns.map(ident).join(",")})
      VALUES (${columns.map((_,index)=>`$${index+1}`).join(",")}) RETURNING *`,Object.values(payload))).rows[0];
    await client.query(`INSERT INTO public.audit_logs(actor_user_id,action,entity_type,entity_id,metadata)
      VALUES ($1::uuid,'admin_create_event_panel_record',$2,$3,jsonb_build_object('event_id',$4::uuid))`,[actor.userId,table,result.id,id]);
    return result;
  });
}
