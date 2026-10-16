import type { QueryResultRow } from "pg";
import type { PoolClient } from "pg";
import { queryRows, withTransaction } from "./db";
import { NeonAuthorizationError, requireSuperAdmin, type NeonActor, type NeonQueryExecutor } from "./neon-authorization";

export interface AdminUserRow extends QueryResultRow {
  user_id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  account_status: string;
  email_verified_at: Date | null;
  created_at: Date;
  roles: string[];
  identity_linked: boolean;
  total_count: number;
}

export interface AdminUserPage {
  data: Array<{
    id: string; user_id: string; email: string; full_name: string | null;
    phone: string | null; account_status: string; email_verified: boolean;
    created_at: Date; roles: string[];
    identity_linked: boolean;
  }>;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
}

const defaultDb: NeonQueryExecutor = { query: queryRows };

/** The linked active Super Admin guard is repeated in SQL, not just in the route. */
export async function listNeonAdminUsers(
  actor: NeonActor,
  input: { page: number; pageSize: number; search: string },
  db: NeonQueryExecutor = defaultDb,
): Promise<AdminUserPage> {
  requireSuperAdmin(actor);
  const { page, pageSize } = input;
  const search = input.search.trim();
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(pageSize) ||
      pageSize < 1 || pageSize > 100 || search.length > 160) {
    throw new NeonAuthorizationError(400, "INVALID_USER_QUERY", "Invalid user search or page.");
  }
  const offset = (page - 1) * pageSize;
  if (!Number.isSafeInteger(offset)) {
    throw new NeonAuthorizationError(400, "INVALID_USER_QUERY", "Invalid user page.");
  }
  const guard = `EXISTS (
    SELECT 1 FROM public.profiles ap
    JOIN public.user_roles ar ON ar.user_id=ap.user_id
    JOIN public.neon_application_accounts aa ON aa.legacy_user_id=ap.user_id AND aa.status='active'
    JOIN public.neon_identity_links al ON al.application_account_id=aa.id AND al.status='verified'
    WHERE ap.user_id=$1::uuid AND ap.account_status='active' AND ap.deleted_at IS NULL
      AND ar.role IN ('admin','super_admin') AND al.neon_auth_user_id=$2::uuid
  )`;
  const parameters = [actor.userId, actor.neonAuthUserId, search, pageSize, offset];
  const rows = await db.query<AdminUserRow>(`
    WITH authorized AS (SELECT 1 WHERE ${guard}),
    matches AS (
      SELECT p.user_id,p.email,p.full_name,p.phone,p.account_status,p.email_verified_at,p.created_at
      FROM public.profiles p CROSS JOIN authorized
      WHERE p.deleted_at IS NULL AND ($3::text='' OR p.email ILIKE '%' || $3 || '%'
        OR p.full_name ILIKE '%' || $3 || '%')
    ),
    counted AS (SELECT count(*)::integer AS total_count FROM matches),
    paged AS (SELECT * FROM matches ORDER BY created_at DESC,user_id DESC LIMIT $4 OFFSET $5)
    SELECT p.*,c.total_count,COALESCE((SELECT array_agg(DISTINCT ur.role::text)
      FROM public.user_roles ur WHERE ur.user_id=p.user_id),ARRAY[]::text[]) AS roles,
      EXISTS (SELECT 1 FROM public.neon_application_accounts aa
        JOIN public.neon_identity_links l ON l.application_account_id=aa.id AND l.status='verified'
        WHERE aa.legacy_user_id=p.user_id AND aa.status='active') AS identity_linked
    FROM counted c LEFT JOIN paged p ON true
    ORDER BY p.created_at DESC NULLS LAST,p.user_id DESC NULLS LAST`, parameters);
  const total = Number(rows[0]?.total_count ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return {
    data: rows.filter(row => row.user_id).map(row => ({
      id: row.user_id, user_id: row.user_id, email: row.email, full_name: row.full_name,
      phone: row.phone, account_status: row.account_status,
      email_verified: row.email_verified_at !== null,
      created_at: row.created_at, roles: row.roles ?? [], identity_linked: row.identity_linked,
    })),
    page, pageSize, total, totalPages, hasNextPage: page < totalPages,
  };
}

type Run = <T>(operation: (client: PoolClient) => Promise<T>) => Promise<T>;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function setNeonUserStatus(
  actor: NeonActor,
  targetUserId: string,
  status: "active" | "suspended" | "deactivated",
  run: Run = withTransaction,
): Promise<{ user_id: string; account_status: string }> {
  requireSuperAdmin(actor);
  if (!uuid.test(targetUserId) || !["active", "suspended", "deactivated"].includes(status)) {
    throw new NeonAuthorizationError(400, "INVALID_USER_STATUS", "Invalid account status update.");
  }
  if (actor.userId === targetUserId) {
    throw new NeonAuthorizationError(403, "SELF_STATUS_CHANGE_DENIED", "You cannot change your own status.");
  }
  return run(async client => {
    const [authorized] = (await client.query<{ allowed: boolean }>(`
      SELECT EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.user_roles ur ON ur.user_id=p.user_id
        JOIN public.neon_application_accounts aa ON aa.legacy_user_id=p.user_id AND aa.status='active'
        JOIN public.neon_identity_links l ON l.application_account_id=aa.id AND l.status='verified'
        WHERE p.user_id=$1::uuid AND p.account_status='active' AND p.deleted_at IS NULL
          AND ur.role IN ('admin','super_admin') AND l.neon_auth_user_id=$2::uuid
      ) AS allowed`, [actor.userId, actor.neonAuthUserId])).rows;
    if (!authorized?.allowed) throw new NeonAuthorizationError(403, "ADMIN_REQUIRED", "Admin access is required.");
    const [target] = (await client.query<{ user_id: string; account_status: string }>(`
      SELECT user_id,account_status FROM public.profiles
      WHERE user_id=$1::uuid AND deleted_at IS NULL FOR UPDATE`, [targetUserId])).rows;
    if (!target) throw new NeonAuthorizationError(404, "USER_NOT_FOUND", "User not found.");
    if (!["active", "suspended", "deactivated"].includes(target.account_status)) {
      throw new NeonAuthorizationError(409, "INVALID_STATUS_TRANSITION", "This account cannot be changed from its current state.");
    }
    if (target.account_status === status) return target;
    if (target.account_status === "deactivated" && status !== "active") {
      throw new NeonAuthorizationError(409, "INVALID_STATUS_TRANSITION", "Reactivate a deactivated account before changing its access.");
    }
    if (status === "deactivated") {
      const [privileged] = (await client.query<{ is_admin: boolean }>(`
        SELECT EXISTS (SELECT 1 FROM public.user_roles
          WHERE user_id=$1::uuid AND role IN ('admin','super_admin')) AS is_admin`,
      [targetUserId])).rows;
      if (privileged?.is_admin) {
        throw new NeonAuthorizationError(403, "ADMIN_RETIREMENT_DENIED", "Super Admin accounts cannot be deactivated here.");
      }
    }
    const [updated] = (await client.query<{ user_id: string; account_status: string }>(`
      UPDATE public.profiles SET account_status=$2,updated_at=now()
      WHERE user_id=$1::uuid AND deleted_at IS NULL
      RETURNING user_id,account_status`, [targetUserId, status])).rows;
    await client.query(`INSERT INTO public.audit_logs(actor_user_id,action,entity_type,entity_id,metadata)
      VALUES ($1::uuid,'UPDATE_USER_STATUS','profiles',$2::text,
        jsonb_build_object('old_status',$3::text,'new_status',$4::text))`,
    [actor.userId, targetUserId, target.account_status, status]);
    return updated;
  });
}
