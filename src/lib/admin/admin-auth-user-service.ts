import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  AccountStatus,
  AppRole,
  AuthUserProfileRecord,
} from "./admin-auth-users";
import { AdminRequestError, throwDatabaseError } from "./admin-route-utils";

interface UserRoleRecord {
  user_id: string;
  role: string;
}

export interface PlatformUserContext {
  profiles: Map<string, AuthUserProfileRecord>;
  roles: Map<string, string[]>;
}

export async function loadPlatformUserContext(
  userClient: SupabaseClient,
  userIds: readonly string[],
): Promise<PlatformUserContext> {
  if (userIds.length === 0) {
    return { profiles: new Map(), roles: new Map() };
  }

  const [profileResult, roleResult] = await Promise.all([
    userClient
      .from("profiles")
      .select("user_id,account_status,deleted_at,full_name,avatar_url")
      .in("user_id", [...userIds]),
    userClient
      .from("user_roles")
      .select("user_id,role")
      .in("user_id", [...userIds]),
  ]);

  if (profileResult.error) throwDatabaseError(profileResult.error);
  if (roleResult.error) throwDatabaseError(roleResult.error);

  const profiles = new Map<string, AuthUserProfileRecord>();
  for (const profile of (profileResult.data ?? []) as AuthUserProfileRecord[]) {
    profiles.set(profile.user_id, profile);
  }

  const roles = new Map<string, string[]>();
  for (const assignment of (roleResult.data ?? []) as UserRoleRecord[]) {
    const assigned = roles.get(assignment.user_id) ?? [];
    assigned.push(assignment.role);
    roles.set(assignment.user_id, assigned);
  }
  return { profiles, roles };
}

export async function updatePlatformUserAccess(
  userClient: SupabaseClient,
  userId: string,
  role: AppRole | null,
  accountStatus: AccountStatus | null,
): Promise<void> {
  const rpcClient = userClient as unknown as {
    rpc: (
      name: string,
      args: Record<string, unknown>,
    ) => Promise<{
      data: unknown;
      error: { code?: string; message?: string } | null;
    }>;
  };
  const { error } = await rpcClient.rpc("admin_update_user_access", {
    p_account_status: accountStatus,
    p_role: role,
    p_user_id: userId,
  });

  if (!error) return;
  if (error.code === "P0002") {
    throw new AdminRequestError(
      409,
      "PROFILE_NOT_READY",
      "This Auth user does not have a platform profile yet.",
    );
  }
  throwDatabaseError(error);
}
