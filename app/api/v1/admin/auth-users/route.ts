import type { User } from "@supabase/supabase-js";

import {
  parseAuthUserListQuery,
  parseInviteAuthUserInput,
  sanitizeAuthUser,
} from "@/lib/admin/admin-auth-users";
import {
  loadPlatformUserContext,
  updatePlatformUserAccess,
} from "@/lib/admin/admin-auth-user-service";
import {
  authUserApiErrorResponse,
  getAuthInviteRedirectUrl,
  throwAuthProviderError,
} from "@/lib/admin/admin-auth-user-route-utils";
import { readAdminJsonBody } from "@/lib/admin/admin-route-utils";
import { jsonApiResponse } from "@/lib/server/api-response";
import { authenticateAdminRequest } from "@/lib/server/auth";
import { getAdminClient } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(request: Request) {
  const requestId = crypto.randomUUID();
  let authenticated;
  try {
    // Never construct a service-role client until the caller's JWT and active
    // administrator role have both been verified.
    authenticated = await authenticateAdminRequest(request);
  } catch (error) {
    return authUserApiErrorResponse(error, requestId, "authenticate Auth user list");
  }

  try {
    const list = parseAuthUserListQuery(new URL(request.url).searchParams);
    const adminClient = getAdminClient();
    const { data, error } = await adminClient.auth.admin.listUsers({
      page: list.page,
      perPage: list.pageSize,
    });
    if (error) throwAuthProviderError(error, "list users", requestId);

    const users = data.users as User[];
    const platform = await loadPlatformUserContext(
      authenticated.userClient,
      users.map((user) => user.id),
    );
    const total = "total" in data && typeof data.total === "number" ? data.total : 0;

    return jsonApiResponse(
      {
        data: users.map((user) =>
          sanitizeAuthUser(
            user,
            platform.profiles.get(user.id),
            platform.roles.get(user.id) ?? [],
          ),
        ),
        error: null,
        meta: {
          requestId,
          page: list.page,
          pageSize: list.pageSize,
          total,
          totalPages: Math.ceil(total / list.pageSize),
        },
      },
      200,
    );
  } catch (error) {
    return authUserApiErrorResponse(error, requestId, "list Auth users");
  }
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  let authenticated;
  try {
    authenticated = await authenticateAdminRequest(request);
  } catch (error) {
    return authUserApiErrorResponse(error, requestId, "authenticate Auth user invitation");
  }

  try {
    const input = parseInviteAuthUserInput(await readAdminJsonBody(request));
    // This server-owned value is validated independently of request headers.
    // Never derive an Auth email redirect from Host or forwarded-host values.
    const redirectTo = getAuthInviteRedirectUrl();
    const adminClient = getAdminClient();
    const invitationMetadata: Record<string, unknown> = {
      account_type: input.role,
    };
    if ("fullName" in input.metadata) {
      invitationMetadata.full_name = input.metadata.fullName;
    }
    if ("avatarUrl" in input.metadata) {
      invitationMetadata.avatar_url = input.metadata.avatarUrl;
    }

    const { data, error } = await adminClient.auth.admin.inviteUserByEmail(
      input.email,
      { data: invitationMetadata, redirectTo },
    );
    if (error) throwAuthProviderError(error, "invite user", requestId);
    if (!data.user) {
      throwAuthProviderError({}, "invite user", requestId);
    }

    try {
      // Auth metadata is never authorization. Replace the trigger-created role
      // through the caller-bound, audited database function instead.
      await updatePlatformUserAccess(
        authenticated.userClient,
        data.user.id,
        input.role,
        null,
      );
    } catch (roleError) {
      // Roll back the just-created identity when database role assignment did
      // not complete. If cleanup itself fails the orphan remains unprivileged.
      const cleanup = await adminClient.auth.admin.deleteUser(data.user.id, false);
      if (cleanup.error) {
        console.error("[admin-auth-users] Failed to roll back an incomplete invitation", {
          code: cleanup.error.code,
          requestId,
          userId: data.user.id,
        });
      }
      throw roleError;
    }

    const platform = await loadPlatformUserContext(authenticated.userClient, [
      data.user.id,
    ]);
    return jsonApiResponse(
      {
        data: sanitizeAuthUser(
          data.user,
          platform.profiles.get(data.user.id),
          platform.roles.get(data.user.id) ?? [],
        ),
        error: null,
        meta: { requestId, invitationSent: true },
      },
      201,
    );
  } catch (error) {
    return authUserApiErrorResponse(error, requestId, "invite Auth user");
  }
}
