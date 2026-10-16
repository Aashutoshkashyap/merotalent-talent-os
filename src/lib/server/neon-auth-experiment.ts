/**
 * Experimental Neon request authentication (not wired into production)
 *
 * Validates incoming API requests using Better Auth + Neon.
 * The public surface is identical to the previous Supabase-backed version
 * so all API routes calling `authenticateRequest()` require zero changes.
 *
 * Identity model:
 *   1. Extract `Bearer <token>` from Authorization header
 *   2. Validate JWT via Better Auth (backed by Neon Postgres)
 *   3. Load roles/permissions via `get_my_access_context()` Postgres function
 *   4. Return an `AuthenticatedRequestContext` identical to the legacy shape
 *
 * The `userClient` field (formerly a SupabaseClient) is now a lightweight
 * wrapper that exposes a compatible `.rpc()` interface backed by Neon SQL.
 * This keeps the media-authorization layer (authorizeMediaAccess,
 * claimMediaUploadIntent) working without further changes.
 */

import { headers } from "next/headers";

import { getAuth } from "./better-auth";
import { withUserContext } from "./db";
import { ServerConfigurationError } from "./server-configuration-error";

// ---------------------------------------------------------------------------
// Error types — identical to legacy surface
// ---------------------------------------------------------------------------

export class ApiAuthError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiAuthError";
  }
}

// ---------------------------------------------------------------------------
// Stable user identity type
//
// We no longer import `User` from `@supabase/supabase-js`. All downstream
// code that touches `user.id` and `user.email` will continue to work
// because our NeonUser satisfies that minimal surface.
// ---------------------------------------------------------------------------

export interface NeonUser {
  id: string;
  email: string;
  emailVerified: boolean;
  name?: string | null;
  image?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthenticatedActor {
  user: NeonUser;
  accountStatus: string;
  roles: readonly string[];
  permissions: readonly string[];
}

/**
 * Minimal RPC-compatible shim for code that calls `context.userClient.rpc()`.
 * Backed by Neon SQL with the actor's user context set via SET LOCAL.
 */
export interface UserScopedClient {
  rpc: (
    name: string,
    args?: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { code?: string; message?: string } | null }>;
}

export interface AuthenticatedRequestContext {
  accessToken: string;
  actor: AuthenticatedActor;
  user: NeonUser;
  /** Neon-backed RPC shim — replaces the Supabase userClient */
  userClient: UserScopedClient;
}

export type AuthenticatedAdminContext = AuthenticatedRequestContext;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function getBearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  if (!authorization || authorization.length > 8192) return null;

  const match = /^Bearer ([^\s]+)$/.exec(authorization);
  return match?.[1] ?? null;
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === "string"))];
}

interface AccessContextPayload {
  account_status?: unknown;
  accountStatus?: unknown;
  roles?: unknown;
  permissions?: unknown;
}

function normalizeAccessContext(
  value: unknown,
): Omit<AuthenticatedActor, "user"> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const payload = value as AccessContextPayload;
  const accountStatus = payload.account_status ?? payload.accountStatus;
  if (typeof accountStatus !== "string") return null;

  return {
    accountStatus,
    roles: stringArray(payload.roles),
    permissions: stringArray(payload.permissions),
  };
}

export function hasAnyRole(
  actor: AuthenticatedActor,
  roles: readonly string[],
): boolean {
  const ownedRoles = new Set(actor.roles);
  return roles.some((role) => ownedRoles.has(role));
}

export function hasAnyPermission(
  actor: AuthenticatedActor,
  permissions: readonly string[],
): boolean {
  const ownedPermissions = new Set(actor.permissions);
  return permissions.some((permission) => ownedPermissions.has(permission));
}

export function requireAnyRole(
  actor: AuthenticatedActor,
  roles: readonly string[],
): void {
  if (!hasAnyRole(actor, roles)) {
    throw new ApiAuthError(
      403,
      "INSUFFICIENT_ROLE",
      "Your account role cannot perform this action.",
    );
  }
}

export function requireAnyPermission(
  actor: AuthenticatedActor,
  permissions: readonly string[],
): void {
  if (!hasAnyPermission(actor, permissions)) {
    throw new ApiAuthError(
      403,
      "INSUFFICIENT_PERMISSION",
      "Your account does not have permission to perform this action.",
    );
  }
}

// ---------------------------------------------------------------------------
// Build the Neon-backed userClient RPC shim
// ---------------------------------------------------------------------------

function buildUserClient(userId: string): UserScopedClient {
  return {
    rpc: async (name: string, args: Record<string, unknown> = {}) => {
      try {
        const argKeys = Object.keys(args);
        let result: unknown;

        if (argKeys.length === 0) {
          // e.g. get_my_access_context() — no args, user context via SET LOCAL
          const rows = await withUserContext(userId, (client) =>
            client.query(`SELECT ${name}() AS result`),
          );
          result = rows.rows[0]?.result ?? null;
        } else {
          // Build parameterised call: authorize_media_access(p_action => $1, ...)
          const params = argKeys.map((k, i) => `${k} => $${i + 1}`).join(", ");
          const values = argKeys.map((k) => args[k]);
          const rows = await withUserContext(userId, (client) =>
            client.query(`SELECT ${name}(${params}) AS result`, values),
          );
          result = rows.rows[0]?.result ?? null;
        }

        return { data: result, error: null };
      } catch (err: any) {
        return {
          data: null,
          error: {
            code: err?.code ?? "DB_ERROR",
            message: err?.message ?? "Database RPC failed.",
          },
        };
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Core authenticator — identical public signature to legacy version
// ---------------------------------------------------------------------------

export async function authenticateRequest(
  request: Request,
): Promise<AuthenticatedRequestContext> {
  const accessToken = getBearerToken(request);
  if (!accessToken) {
    throw new ApiAuthError(401, "AUTH_REQUIRED", "A valid bearer token is required.");
  }

  // Validate the session token via Better Auth
  let auth: ReturnType<typeof getAuth>;
  try {
    auth = getAuth();
  } catch (err) {
    if (err instanceof ServerConfigurationError || err instanceof Error) {
      throw new ApiAuthError(
        503,
        "AUTH_NOT_CONFIGURED",
        "Authentication is temporarily unavailable.",
      );
    }
    throw err;
  }

  // Better Auth validates the session via the database — no JWKS round-trip
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user) {
    throw new ApiAuthError(
      401,
      "INVALID_TOKEN",
      "Your session is invalid or has expired.",
    );
  }

  const user: NeonUser = {
    id: session.user.id,
    email: session.user.email,
    emailVerified: session.user.emailVerified,
    name: session.user.name,
    image: session.user.image,
    createdAt: new Date(session.user.createdAt),
    updatedAt: new Date(session.user.updatedAt),
  };

  if (user.email && !user.emailVerified) {
    throw new ApiAuthError(
      403,
      "EMAIL_NOT_VERIFIED",
      "Verify your email address before using this feature.",
    );
  }

  // Load roles/permissions/capabilities from Neon
  const userClient = buildUserClient(user.id);
  const { data: accessData, error: accessError } = await userClient.rpc(
    "get_my_access_context",
  );

  if (accessError) {
    console.error("[auth] Unable to load account access context", {
      code: accessError.code,
      userId: user.id,
    });
    throw new ApiAuthError(
      503,
      "AUTHORIZATION_UNAVAILABLE",
      "Account permissions are temporarily unavailable.",
    );
  }

  const access = normalizeAccessContext(accessData);
  if (!access) {
    console.error("[auth] Access context was malformed", { userId: user.id });
    throw new ApiAuthError(
      503,
      "AUTHORIZATION_UNAVAILABLE",
      "Account permissions are temporarily unavailable.",
    );
  }

  if (access.accountStatus !== "active") {
    throw new ApiAuthError(403, "ACCOUNT_INACTIVE", "This account is not currently active.");
  }

  const actor: AuthenticatedActor = { user, ...access };

  return {
    accessToken,
    actor,
    user,
    userClient,
  };
}

export async function authenticateAdminRequest(
  request: Request,
): Promise<AuthenticatedAdminContext> {
  const context = await authenticateRequest(request);
  requireAnyRole(context.actor, ["super_admin", "admin"]);
  return context;
}
