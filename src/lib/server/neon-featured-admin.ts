import type { PoolClient, QueryResultRow } from "pg";
import { queryRows, withTransaction } from "./db";
import { NeonAuthorizationError, requireSuperAdmin, type NeonActor, type NeonQueryExecutor } from "./neon-authorization";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export type FeaturedType = "college" | "mentor" | "course" | "job" | "event";
const types: FeaturedType[] = ["college", "mentor", "course", "job", "event"];
type Run = <T>(operation: (client: PoolClient) => Promise<T>) => Promise<T>;
type FeaturedInput = { entity_type: FeaturedType; entity_id: string; title: string | null;
  placement: string; priority: number; is_active: boolean };
interface FeaturedRow extends QueryResultRow { id: string; entity_type: FeaturedType; entity_id: string;
  title: string | null; placement: string; priority: number; is_active: boolean; created_at: Date }

const adminGuard = `EXISTS (
  SELECT 1 FROM public.profiles p JOIN public.user_roles ur ON ur.user_id=p.user_id
  JOIN public.neon_application_accounts aa ON aa.legacy_user_id=p.user_id AND aa.status='active'
  JOIN public.neon_identity_links l ON l.application_account_id=aa.id AND l.status='verified'
  WHERE p.user_id=$1::uuid AND p.account_status='active' AND p.deleted_at IS NULL
    AND ur.role IN ('admin','super_admin') AND l.neon_auth_user_id=$2::uuid
)`;

const targetTable: Record<FeaturedType, string> = {
  college: `SELECT 1 FROM public.institutes WHERE id=$1::uuid AND status='approved' AND deleted_at IS NULL`,
  mentor: `SELECT 1 FROM public.mentors WHERE id=$1::uuid AND approval_status='approved' AND is_available=true AND deleted_at IS NULL`,
  course: `SELECT 1 FROM public.courses WHERE id=$1::uuid AND is_partnered=true AND is_published=true AND status='published' AND deleted_at IS NULL`,
  job: `SELECT 1 FROM public.jobs WHERE id=$1::uuid AND status='published' AND approval_status='approved' AND is_active=true AND deleted_at IS NULL AND (expires_at IS NULL OR expires_at>now())`,
  event: `SELECT 1 FROM public.events WHERE id=$1::uuid AND status IN ('approved','published') AND approval_status='approved' AND is_active=true AND deleted_at IS NULL AND end_date>now()`,
};

function validate(input: unknown): FeaturedInput {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new NeonAuthorizationError(400, "INVALID_FEATURED_ITEM", "Invalid featured item.");
  const value = input as Record<string, unknown>;
  if (Object.keys(value).sort().join(",") !== "entity_id,entity_type,is_active,placement,priority,title" ||
    !types.includes(value.entity_type as FeaturedType) || typeof value.entity_id !== "string" || !uuid.test(value.entity_id) ||
    typeof value.placement !== "string" || !/^[a-z][a-z0-9_-]{0,79}$/.test(value.placement) ||
    typeof value.priority !== "number" || !Number.isSafeInteger(value.priority) || value.priority < 0 || value.priority > 100000 ||
    typeof value.is_active !== "boolean" ||
    !(value.title === null || (typeof value.title === "string" && value.title.length <= 240))) {
    throw new NeonAuthorizationError(400, "INVALID_FEATURED_ITEM", "Invalid featured item.");
  }
  return value as FeaturedInput;
}

export async function listFeaturedAdmin(actor: NeonActor, db: NeonQueryExecutor = { query: queryRows }) {
  requireSuperAdmin(actor);
  return db.query<FeaturedRow>(`SELECT id::text,entity_type,entity_id::text,title,placement,priority,is_active,created_at
    FROM public.featured_items WHERE deleted_at IS NULL AND ${adminGuard}
    ORDER BY priority DESC,created_at DESC LIMIT 200`, [actor.userId, actor.neonAuthUserId]);
}

export async function listFeaturedOptions(actor: NeonActor, type: string,
  db: NeonQueryExecutor = { query: queryRows }) {
  requireSuperAdmin(actor);
  if (!types.includes(type as FeaturedType)) throw new NeonAuthorizationError(400, "INVALID_FEATURED_TYPE", "Invalid type.");
  const statements: Record<FeaturedType, string> = {
    college: `SELECT i.id::text,i.name AS label,i.location AS subtitle FROM public.institutes i WHERE i.status='approved' AND i.deleted_at IS NULL`,
    mentor: `SELECT m.id::text,COALESCE(p.full_name,m.headline,'Mentor') AS label,m.headline AS subtitle FROM public.mentors m LEFT JOIN public.profiles p ON p.user_id=m.user_id WHERE m.approval_status='approved' AND m.is_available=true AND m.deleted_at IS NULL`,
    course: `SELECT c.id::text,c.title AS label,c.partner_name AS subtitle FROM public.courses c WHERE c.is_partnered=true AND c.is_published=true AND c.status='published' AND c.deleted_at IS NULL`,
    job: `SELECT j.id::text,j.title AS label,co.name AS subtitle FROM public.jobs j LEFT JOIN public.companies co ON co.id=j.company_id WHERE j.status='published' AND j.approval_status='approved' AND j.is_active=true AND j.deleted_at IS NULL AND (j.expires_at IS NULL OR j.expires_at>now())`,
    event: `SELECT e.id::text,e.title AS label,e.location AS subtitle FROM public.events e WHERE e.status IN ('approved','published') AND e.approval_status='approved' AND e.is_active=true AND e.deleted_at IS NULL AND e.end_date>now()`,
  };
  return db.query<{ id: string; label: string; subtitle: string | null }>(`
    SELECT target.* FROM (${statements[type as FeaturedType]}) target
    WHERE ${adminGuard} ORDER BY target.label LIMIT 100`, [actor.userId, actor.neonAuthUserId]);
}

export async function saveFeaturedAdmin(actor: NeonActor, raw: unknown, run: Run = withTransaction) {
  requireSuperAdmin(actor);
  const value = validate(raw);
  return run(async client => {
    const [guard] = (await client.query<{ allowed: boolean }>(`SELECT ${adminGuard} AS allowed`,
      [actor.userId, actor.neonAuthUserId])).rows;
    if (!guard?.allowed) throw new NeonAuthorizationError(403, "ADMIN_REQUIRED", "Super Admin access required.");
    const target = (await client.query(targetTable[value.entity_type], [value.entity_id])).rows[0];
    if (!target) throw new NeonAuthorizationError(404, "FEATURE_TARGET_UNAVAILABLE", "The public target is unavailable.");
    const [row] = (await client.query<FeaturedRow>(`
      INSERT INTO public.featured_items(entity_type,entity_id,title,placement,priority,is_active,created_by)
      SELECT $3::text,$4::uuid,$5::text,$6::text,$7::integer,$8::boolean,$1::uuid
      WHERE ${adminGuard}
      ON CONFLICT (entity_type,entity_id,placement) DO UPDATE
      SET title=EXCLUDED.title,priority=EXCLUDED.priority,is_active=EXCLUDED.is_active,
        deleted_at=NULL,updated_at=now()
      RETURNING id::text,entity_type,entity_id::text,title,placement,priority,is_active,created_at`,
    [actor.userId,actor.neonAuthUserId,value.entity_type,value.entity_id,value.title,value.placement,value.priority,value.is_active])).rows;
    if (!row) throw new NeonAuthorizationError(403, "ADMIN_REQUIRED", "Super Admin access required.");
    await client.query(`INSERT INTO public.audit_logs(actor_user_id,action,entity_type,entity_id,metadata)
      VALUES ($1::uuid,'UPSERT_FEATURED_ITEM','featured_items',$2::text,
      jsonb_build_object('target_type',$3::text,'target_id',$4::uuid,'placement',$5::text))`,
    [actor.userId,row.id,value.entity_type,value.entity_id,value.placement]);
    return row;
  });
}

export async function removeFeaturedAdmin(actor: NeonActor, id: string, run: Run = withTransaction) {
  requireSuperAdmin(actor);
  if (!uuid.test(id)) throw new NeonAuthorizationError(400, "INVALID_FEATURED_ITEM", "Invalid featured item.");
  return run(async client => {
    const [row] = (await client.query<{ id: string }>(`
      UPDATE public.featured_items SET is_active=false,deleted_at=now(),updated_at=now()
      WHERE id=$3::uuid AND deleted_at IS NULL AND ${adminGuard} RETURNING id::text`,
    [actor.userId, actor.neonAuthUserId, id])).rows;
    if (!row) throw new NeonAuthorizationError(404, "FEATURED_ITEM_NOT_FOUND", "Featured item unavailable.");
    await client.query(`INSERT INTO public.audit_logs(actor_user_id,action,entity_type,entity_id)
      VALUES ($1::uuid,'REMOVE_FEATURED_ITEM','featured_items',$2::text)`, [actor.userId,row.id]);
    return row;
  });
}
