import type { QueryResultRow } from "pg";
import { queryRows } from "./db";

export class NeonAuthorizationError extends Error {
  constructor(readonly status: 400 | 401 | 403 | 404 | 409 | 503, readonly code: string, message: string) {
    super(message);
    this.name = "NeonAuthorizationError";
  }
}

export interface NeonQueryExecutor {
  query<T extends QueryResultRow>(sql: string, params: readonly unknown[]): Promise<T[]>;
}

export const neonQueryExecutor: NeonQueryExecutor = { query: queryRows };

/** This ID must come from a verified Managed Auth identity mapping, never a request body. */
export interface VerifiedApplicationIdentity {
  neonAuthUserId: string;
  legacyUserId: string;
  linkVerified: true;
}

export interface NeonActor {
  readonly userId: string;
  readonly neonAuthUserId: string;
  readonly roles: readonly string[];
  readonly permissions: readonly string[];
  readonly platformAdmin: boolean;
}

export type ModuleKey = "college" | "jobs" | "mentor" | "events" | "courses";
export type EntityType = "college" | "company" | "job" | "mentor" | "event" | "course";

const moduleAliases: Record<string, ModuleKey> = {
  college: "college", colleges: "college",
  mentor: "mentor", mentors: "mentor", job: "jobs", jobs: "jobs",
  company: "jobs", companies: "jobs", event: "events", events: "events",
  competition: "events", competitions: "events", course: "courses", courses: "courses", lms: "courses",
};

export function normalizeModuleKey(value: string): ModuleKey {
  const moduleKey = moduleAliases[value.toLowerCase()];
  if (!moduleKey) throw new NeonAuthorizationError(403, "INVALID_MODULE", "Unknown module.");
  return moduleKey;
}

function deny(code = "FORBIDDEN"): never {
  throw new NeonAuthorizationError(403, code, "You cannot access this resource.");
}

interface AccessRow extends QueryResultRow {
  account_status: string;
  deleted_at: Date | null;
  roles: string[];
  permissions: string[];
}

interface BooleanRow extends QueryResultRow { allowed: boolean }

/** Matches the active-profile part of Supabase is_account_active/get_my_access_context. */
export async function requireAuthenticatedUser(
  identity: VerifiedApplicationIdentity | null,
  db: NeonQueryExecutor = neonQueryExecutor,
): Promise<NeonActor> {
  if (!identity?.neonAuthUserId || !identity.legacyUserId || identity.linkVerified !== true) {
    throw new NeonAuthorizationError(401, "AUTH_REQUIRED", "A verified session is required.");
  }
  const rows = await db.query<AccessRow>(`
    SELECT p.account_status, p.deleted_at,
      COALESCE((SELECT array_agg(DISTINCT ur.role::text) FROM public.user_roles ur
                WHERE ur.user_id = p.user_id), ARRAY[]::text[]) AS roles,
      COALESCE((SELECT array_agg(DISTINCT permission.code)
                FROM public.permissions permission
                WHERE EXISTS (
                  SELECT 1 FROM public.user_roles ur
                  JOIN public.role_permissions rp ON rp.role = ur.role
                  WHERE ur.user_id = p.user_id AND rp.permission_id = permission.id
                ) OR EXISTS (
                  SELECT 1 FROM public.user_permissions up
                  WHERE up.user_id = p.user_id AND up.permission_id = permission.id
                    AND (up.expires_at IS NULL OR up.expires_at > now())
                )), ARRAY[]::text[]) AS permissions
    FROM public.profiles p WHERE p.user_id = $1::uuid
    LIMIT 1`, [identity.legacyUserId]);
  const row = rows[0];
  if (!row || row.deleted_at || row.account_status !== "active") deny("ACCOUNT_INACTIVE");
  const roles = row.roles ?? [];
  return {
    userId: identity.legacyUserId,
    neonAuthUserId: identity.neonAuthUserId,
    roles,
    permissions: row.permissions ?? [],
    platformAdmin: roles.includes("admin") || roles.includes("super_admin"),
  };
}

export function requireRole(actor: NeonActor, role: string): void {
  if (!actor.roles.includes(role) && !actor.platformAdmin) deny("INSUFFICIENT_ROLE");
}

export function requirePermission(actor: NeonActor, permission: string): void {
  if (!actor.permissions.includes(permission) && !actor.platformAdmin) deny("INSUFFICIENT_PERMISSION");
}

export function requireSuperAdmin(actor: NeonActor): void {
  if (!actor.platformAdmin) deny("ADMIN_REQUIRED");
}

export async function requireModuleCapability(
  actor: NeonActor,
  moduleInput: string,
  db: NeonQueryExecutor = neonQueryExecutor,
): Promise<void> {
  const moduleKey = normalizeModuleKey(moduleInput);
  if (actor.platformAdmin) return;
  const [row] = await db.query<BooleanRow>(`
    SELECT EXISTS (
      SELECT 1 FROM public.user_module_capabilities umc
      JOIN public.module_capabilities mc ON mc.id = umc.capability_id
      WHERE umc.user_id = $1::uuid AND mc.module_key = $2 AND mc.is_active
        AND umc.status = 'active'
        AND (umc.expires_at IS NULL OR umc.expires_at > now())
    ) AS allowed`, [actor.userId, moduleKey]);
  if (!row?.allowed) deny("MODULE_CAPABILITY_REQUIRED");
}

/** Exact entity assignment AND active entitlement, matching authorize_module_access. */
export async function requireEntityAccess(
  actor: NeonActor,
  moduleInput: string,
  entityType: EntityType,
  entityId: string,
  feature: string | null,
  db: NeonQueryExecutor = neonQueryExecutor,
): Promise<void> {
  const moduleKey = normalizeModuleKey(moduleInput);
  if (actor.platformAdmin) return;
  await requireModuleCapability(actor, moduleKey, db);
  const [row] = await db.query<BooleanRow>(`
    SELECT EXISTS (
      SELECT 1 FROM public.entity_admin_assignments ea
      JOIN public.user_module_capabilities umc ON umc.id = ea.user_capability_id
      JOIN public.module_capabilities mc ON mc.id = umc.capability_id
      WHERE ea.user_id = $1::uuid AND ea.entity_type = $3 AND ea.entity_id = $4::uuid
        AND ea.status = 'active' AND umc.status = 'active'
        AND mc.is_active AND mc.module_key = $2
        AND (umc.expires_at IS NULL OR umc.expires_at > now())
    ) AND EXISTS (
      SELECT 1 FROM public.module_entitlements e
      LEFT JOIN public.packages p ON p.id = e.package_id
      WHERE e.user_id = $1::uuid AND e.module_key = $2
        AND e.entity_type = $3 AND e.entity_id = $4::uuid
        AND e.status = 'active' AND e.start_at <= now()
        AND (e.expires_at IS NULL OR e.expires_at > now())
        AND ($5::text IS NULL OR e.features ->> $5 = 'true'
          OR p.features ->> $5 = 'true'
          OR EXISTS (
            SELECT 1 FROM public.entity_feature_grants g
            WHERE g.user_id = $1::uuid AND g.module_key = $2
              AND g.entity_type = $3 AND g.entity_id = $4::uuid
              AND g.feature_key = $5 AND g.status = 'active'
          ))
    ) AS allowed`, [actor.userId, moduleKey, entityType, entityId, feature]);
  if (!row?.allowed) deny("ENTITY_ACCESS_REQUIRED");
}

export async function requireEntityAdmin(
  actor: NeonActor,
  module: string,
  entityType: EntityType,
  entityId: string,
  feature: string,
  db: NeonQueryExecutor = neonQueryExecutor,
): Promise<void> {
  await requireEntityAccess(actor, module, entityType, entityId, feature, db);
}

export function requireOwnUserOrAdmin(actor: NeonActor, targetUserId: string): void {
  if (actor.userId !== targetUserId && !actor.platformAdmin) deny("USER_SCOPE_REQUIRED");
}
