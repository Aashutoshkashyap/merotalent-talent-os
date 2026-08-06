import type { SupabaseClient } from "@supabase/supabase-js";

import { MediaPolicyError, type MediaAction, type MediaModule } from "./media-policy";

export async function authorizeMediaAccess(
  userClient: SupabaseClient,
  module: MediaModule,
  resourceId: string | null,
  action: MediaAction,
  objectOwnerUserId: string,
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
  const { data, error } = await rpcClient.rpc("authorize_media_access", {
    p_action: action,
    p_module: module,
    p_owner_user_id: objectOwnerUserId,
    p_resource_id: resourceId,
  });

  if (error) {
    console.error("[media] Database authorization failed", {
      action,
      code: error.code,
      module,
    });
    throw new MediaPolicyError(
      503,
      "MEDIA_AUTHORIZATION_UNAVAILABLE",
      "Media authorization is temporarily unavailable.",
    );
  }

  const allowed =
    data === true ||
    (data !== null &&
      typeof data === "object" &&
      !Array.isArray(data) &&
      (data as { allowed?: unknown }).allowed === true);

  if (!allowed) {
    throw new MediaPolicyError(
      403,
      "MEDIA_ACCESS_DENIED",
      "You do not have access to media for this resource.",
    );
  }
}

export async function claimMediaUploadIntent(
  userClient: SupabaseClient,
  module: MediaModule,
  resourceId: string | null,
  path: string,
  sizeBytes: number,
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
  const { data, error } = await rpcClient.rpc("claim_media_upload_intent", {
    p_module: module,
    p_object_path: path,
    p_resource_id: resourceId,
    p_declared_size: sizeBytes,
  });

  if (error) {
    console.error("[media] Upload quota check failed", {
      code: error.code,
      module,
    });
    throw new MediaPolicyError(
      503,
      "MEDIA_QUOTA_UNAVAILABLE",
      "The upload quota could not be checked.",
    );
  }

  if (data !== true) {
    throw new MediaPolicyError(
      429,
      "MEDIA_RATE_LIMITED",
      "The hourly upload limit has been reached. Try again later.",
    );
  }
}
