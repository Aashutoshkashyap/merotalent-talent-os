/** Administrative identity summaries, without granting or changing access. */
import type { QueryResultRow } from "pg";
import { queryRows } from "./db";
import { NeonAuthorizationError, requireSuperAdmin, type NeonActor, type NeonQueryExecutor } from "./neon-authorization";
import { publicObjectUrl } from "./application-storage";

export interface AdministratorRecord {
  roleId: string; userId: string; role: "admin"; addedAt: string;
  profile: { email: string; fullName: string | null; avatarUrl: string | null } | null;
}
export interface DirectoryProfile { user_id: string; email: string | null; full_name: string | null }
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const guard = `EXISTS(SELECT 1 FROM public.profiles p JOIN public.user_roles r ON r.user_id=p.user_id
  JOIN public.neon_application_accounts a ON a.legacy_user_id=p.user_id AND a.status='active'
  JOIN public.neon_identity_links l ON l.application_account_id=a.id AND l.status='verified'
  WHERE p.user_id=$1::uuid AND p.account_status='active' AND p.deleted_at IS NULL
    AND r.role IN ('admin','super_admin') AND l.neon_auth_user_id=$2::uuid)`;

async function adminRead<T>(actor: NeonActor, sql: string, params: unknown[], db: NeonQueryExecutor): Promise<T[]> {
  requireSuperAdmin(actor);
  const [result] = await db.query<QueryResultRow & { allowed: boolean; records: T[] }>(`
    WITH access AS (SELECT ${guard} AS allowed)
    SELECT allowed,CASE WHEN allowed THEN COALESCE((SELECT jsonb_agg(to_jsonb(v)) FROM (${sql}) v),'[]'::jsonb)
      ELSE '[]'::jsonb END AS records FROM access`, [actor.userId, actor.neonAuthUserId, ...params]);
  if (!result?.allowed) throw new NeonAuthorizationError(403, "ADMIN_REQUIRED", "An active linked administrator is required.");
  return result.records;
}

export async function listNeonAdministrators(actor: NeonActor, db: NeonQueryExecutor = { query: queryRows }): Promise<AdministratorRecord[]> {
  const rows = await adminRead<AdministratorRecord>(actor, `SELECT r.id AS "roleId",r.user_id AS "userId",
    'admin' AS role,r.created_at AS "addedAt",CASE WHEN p.user_id IS NULL THEN NULL
    ELSE jsonb_build_object('email',p.email,'fullName',p.full_name,'avatarUrl',p.avatar_url) END AS profile
    FROM public.user_roles r LEFT JOIN public.profiles p ON p.user_id=r.user_id AND p.deleted_at IS NULL
    WHERE r.role IN ('admin','super_admin') ORDER BY r.created_at,r.id`, [], db);
  await Promise.all(rows.map(async row => {
    const value = row.profile?.avatarUrl;
    if (!row.profile || !value) return;
    let path = value;
    if (/^https?:\/\//.test(value)) {
      const url = new URL(value);
      if (url.hostname !== "dtirpilgzlsfryucanlg.supabase.co") {
        row.profile.avatarUrl = url.protocol === "https:" ? value : null; return;
      }
      const prefix = "/storage/v1/object/public/profile-media/";
      if (!url.pathname.startsWith(prefix)) { row.profile.avatarUrl = null; return; }
      path = decodeURIComponent(url.pathname.slice(prefix.length));
    }
    try { row.profile.avatarUrl = await publicObjectUrl("profile_avatar", path); }
    catch { row.profile.avatarUrl = null; }
  }));
  return rows;
}

export async function loadNeonDirectoryProfiles(actor: NeonActor, ids: unknown, db: NeonQueryExecutor = { query: queryRows }): Promise<DirectoryProfile[]> {
  requireSuperAdmin(actor);
  if (!Array.isArray(ids) || ids.length > 100 || ids.some(id => typeof id !== "string" || !uuid.test(id))) {
    throw new NeonAuthorizationError(400, "INVALID_PROFILE_IDS", "At most 100 valid profile IDs are required.");
  }
  return adminRead<DirectoryProfile>(actor, `SELECT user_id,email,full_name FROM public.profiles
    WHERE user_id=ANY($3::uuid[]) AND deleted_at IS NULL ORDER BY user_id`, [[...new Set(ids)]], db);
}
