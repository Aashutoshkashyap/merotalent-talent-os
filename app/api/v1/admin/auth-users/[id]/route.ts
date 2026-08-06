import type { AdminUserAttributes, User } from "@supabase/supabase-js";

import {
  buildMergedAuthMetadata,
  parseDeleteAuthUserInput,
  parsePatchAuthUserInput,
  sanitizeAuthUser,
  type AccountStatus,
} from "@/lib/admin/admin-auth-users";
import {
  loadPlatformUserContext,
  updatePlatformUserAccess,
} from "@/lib/admin/admin-auth-user-service";
import {
  authUserApiErrorResponse,
  throwAuthProviderError,
} from "@/lib/admin/admin-auth-user-route-utils";
import {
  AdminRequestError,
  readAdminJsonBody,
  throwDatabaseError,
} from "@/lib/admin/admin-route-utils";
import { validateAdminResourceId } from "@/lib/admin/admin-resource-service";
import { jsonApiResponse } from "@/lib/server/api-response";
import { authenticateAdminRequest } from "@/lib/server/auth";
import { getAdminClient } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function resolveUserId(context: RouteContext) {
  const { id } = await context.params;
  return validateAdminResourceId(id);
}

async function loadAuthUser(
  userId: string,
  requestId: string,
): Promise<{ user: User; adminClient: ReturnType<typeof getAdminClient> }> {
  const adminClient = getAdminClient();
  const { data, error } = await adminClient.auth.admin.getUserById(userId);
  if (error) throwAuthProviderError(error, "get user", requestId);
  if (!data.user) throwAuthProviderError({ status: 404 }, "get user", requestId);
  return { user: data.user, adminClient };
}

async function safeUserResponse(
  user: User,
  userClient: Parameters<typeof loadPlatformUserContext>[0],
) {
  const platform = await loadPlatformUserContext(userClient, [user.id]);
  return sanitizeAuthUser(
    user,
    platform.profiles.get(user.id),
    platform.roles.get(user.id) ?? [],
  );
}

export async function GET(request: Request, context: RouteContext) {
  const requestId = crypto.randomUUID();
  let authenticated;
  try {
    authenticated = await authenticateAdminRequest(request);
  } catch (error) {
    return authUserApiErrorResponse(error, requestId, "authenticate Auth user read");
  }

  try {
    const userId = await resolveUserId(context);
    const { user } = await loadAuthUser(userId, requestId);
    return jsonApiResponse(
      { data: await safeUserResponse(user, authenticated.userClient), error: null, meta: { requestId } },
      200,
    );
  } catch (error) {
    return authUserApiErrorResponse(error, requestId, "read Auth user");
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const requestId = crypto.randomUUID();
  let authenticated;
  try {
    authenticated = await authenticateAdminRequest(request);
  } catch (error) {
    return authUserApiErrorResponse(error, requestId, "authenticate Auth user update");
  }

  try {
    const userId = await resolveUserId(context);
    const input = parsePatchAuthUserInput(await readAdminJsonBody(request));
    const { user: originalUser, adminClient } = await loadAuthUser(userId, requestId);

    if (input.action === "set_access") {
      const locksOutCaller =
        userId === authenticated.user.id &&
        ((input.role !== undefined && input.role !== "admin") ||
          (input.accountStatus !== undefined && input.accountStatus !== "active") ||
          input.banned === true);
      if (locksOutCaller) {
        throw new AdminRequestError(
          409,
          "SELF_LOCKOUT_NOT_ALLOWED",
          "Use another active Super Admin account for changes that would lock out your own account.",
        );
      }

      const effectiveStatus: AccountStatus | null =
        input.accountStatus ??
        (input.banned === true
          ? "suspended"
          : input.banned === false
            ? "active"
            : null);
      await updatePlatformUserAccess(
        authenticated.userClient,
        userId,
        input.role ?? null,
        effectiveStatus,
      );

      let updatedUser = originalUser;
      if (input.banned !== undefined) {
        const { data, error } = await adminClient.auth.admin.updateUserById(userId, {
          // Supabase Auth does not expose an infinite duration. This value is
          // effectively permanent and can only be removed by an explicit unban.
          ban_duration: input.banned ? "876000h" : "none",
        });
        if (error) throwAuthProviderError(error, "update user ban", requestId);
        if (!data.user) throwAuthProviderError({}, "update user ban", requestId);
        updatedUser = data.user;
      }

      return jsonApiResponse(
        { data: await safeUserResponse(updatedUser, authenticated.userClient), error: null, meta: { requestId } },
        200,
      );
    }

    const authAttributes: AdminUserAttributes = {};
    authAttributes.user_metadata = buildMergedAuthMetadata(
      originalUser.user_metadata,
      input.metadata,
    );

    const { data, error } = await adminClient.auth.admin.updateUserById(
      userId,
      authAttributes,
    );
    if (error) throwAuthProviderError(error, "update user identity", requestId);
    if (!data.user) throwAuthProviderError({}, "update user identity", requestId);

    const profilePatch: Record<string, unknown> = {};
    if ("fullName" in input.metadata) {
      profilePatch.full_name = input.metadata.fullName;
    }
    if ("avatarUrl" in input.metadata) {
      profilePatch.avatar_url = input.metadata.avatarUrl;
    }

    const { data: profile, error: profileError } = await authenticated.userClient
      .from("profiles")
      .update(profilePatch)
      .eq("user_id", userId)
      .select("user_id")
      .maybeSingle();
    if (profileError || !profile) {
      // Compensate the Auth change when the mirrored profile could not be
      // updated. Never log either the old or new email/metadata.
      const rollback: AdminUserAttributes = {
        user_metadata: originalUser.user_metadata,
      };
      const rollbackResult = await adminClient.auth.admin.updateUserById(
        userId,
        rollback,
      );
      if (rollbackResult.error) {
        console.error("[admin-auth-users] Failed to roll back an identity/profile sync", {
          code: rollbackResult.error.code,
          requestId,
          userId,
        });
      }
      if (profileError) throwDatabaseError(profileError);
      throw new AdminRequestError(
        409,
        "PROFILE_NOT_READY",
        "This Auth user does not have a platform profile yet.",
      );
    }

    return jsonApiResponse(
      { data: await safeUserResponse(data.user, authenticated.userClient), error: null, meta: { requestId } },
      200,
    );
  } catch (error) {
    return authUserApiErrorResponse(error, requestId, "update Auth user");
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const requestId = crypto.randomUUID();
  let authenticated;
  try {
    authenticated = await authenticateAdminRequest(request);
  } catch (error) {
    return authUserApiErrorResponse(error, requestId, "authenticate Auth user deletion");
  }

  try {
    const userId = await resolveUserId(context);
    if (userId === authenticated.user.id) {
      throw new AdminRequestError(
        409,
        "SELF_DELETE_NOT_ALLOWED",
        "Use another active Super Admin account to deactivate or delete your own account.",
      );
    }
    const rawBody = request.body ? await readAdminJsonBody(request) : undefined;
    const input = parseDeleteAuthUserInput(rawBody, userId);
    const { adminClient } = await loadAuthUser(userId, requestId);

    // This transaction invokes the last-active-admin protection before any
    // irreversible Auth deletion is attempted.
    await updatePlatformUserAccess(
      authenticated.userClient,
      userId,
      null,
      "deactivated",
    );

    if (input.action === "soft_delete") {
      return jsonApiResponse(
        {
          data: { id: userId, deleted: true, mode: "profile_soft_delete" },
          error: null,
          meta: { requestId },
        },
        200,
      );
    }

    const { error } = await adminClient.auth.admin.deleteUser(userId, false);
    if (error) throwAuthProviderError(error, "delete user", requestId);
    return jsonApiResponse(
      {
        data: { id: userId, deleted: true, mode: "auth_hard_delete" },
        error: null,
        meta: { requestId },
      },
      200,
    );
  } catch (error) {
    return authUserApiErrorResponse(error, requestId, "delete Auth user");
  }
}
