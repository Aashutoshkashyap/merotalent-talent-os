import type { SupabaseClient, User } from "@supabase/supabase-js";

import { getUserClient, ServerConfigurationError } from "./supabase";

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

export interface AuthenticatedActor {
  user: User;
  accountStatus: string;
  roles: readonly string[];
  permissions: readonly string[];
}

export interface AuthenticatedRequestContext {
  accessToken: string;
  actor: AuthenticatedActor;
  user: User;
  userClient: SupabaseClient;
}

export type AuthenticatedAdminContext = AuthenticatedRequestContext;

interface AccessContextPayload {
  account_status?: unknown;
  accountStatus?: unknown;
  roles?: unknown;
  permissions?: unknown;
}

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

/** Legacy Supabase remains authoritative until the Neon runtime passes UAT. */
export async function authenticateRequest(
  request: Request,
): Promise<AuthenticatedRequestContext> {
  const accessToken = getBearerToken(request);
  if (!accessToken) {
    throw new ApiAuthError(401, "AUTH_REQUIRED", "A valid bearer token is required.");
  }

  let userClient: SupabaseClient;
  try {
    userClient = getUserClient(accessToken);
  } catch (error) {
    if (error instanceof ServerConfigurationError) {
      throw new ApiAuthError(
        503,
        "AUTH_NOT_CONFIGURED",
        "Authentication is temporarily unavailable.",
      );
    }
    throw error;
  }

  const { data: authData, error: authError } =
    await userClient.auth.getUser(accessToken);
  if (authError || !authData.user) {
    throw new ApiAuthError(
      401,
      "INVALID_TOKEN",
      "Your session is invalid or has expired.",
    );
  }

  if (authData.user.email && !authData.user.email_confirmed_at) {
    throw new ApiAuthError(
      403,
      "EMAIL_NOT_VERIFIED",
      "Verify your email address before using this feature.",
    );
  }

  const rpcClient = userClient as unknown as {
    rpc: (name: string) => Promise<{
      data: unknown;
      error: { code?: string; message?: string } | null;
    }>;
  };
  const { data: accessData, error: accessError } =
    await rpcClient.rpc("get_my_access_context");

  if (accessError) {
    console.error("[auth] Unable to load the account access context", {
      code: accessError.code,
      userId: authData.user.id,
    });
    throw new ApiAuthError(
      503,
      "AUTHORIZATION_UNAVAILABLE",
      "Account permissions are temporarily unavailable.",
    );
  }

  const access = normalizeAccessContext(accessData);
  if (!access) {
    console.error("[auth] The account access context was malformed", {
      userId: authData.user.id,
    });
    throw new ApiAuthError(
      503,
      "AUTHORIZATION_UNAVAILABLE",
      "Account permissions are temporarily unavailable.",
    );
  }

  if (access.accountStatus !== "active") {
    throw new ApiAuthError(
      403,
      "ACCOUNT_INACTIVE",
      "This account is not currently active.",
    );
  }

  const actor: AuthenticatedActor = { user: authData.user, ...access };
  return { accessToken, actor, user: authData.user, userClient };
}

export async function authenticateAdminRequest(
  request: Request,
): Promise<AuthenticatedAdminContext> {
  const context = await authenticateRequest(request);
  requireAnyRole(context.actor, ["super_admin", "admin"]);
  return context;
}
