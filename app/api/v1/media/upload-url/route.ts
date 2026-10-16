import { jsonApiResponse } from "@/lib/server/api-response";
import { ApiAuthError, authenticateRequest } from "@/lib/server/auth";
import {
  authorizeMediaAccess,
  claimMediaUploadIntent,
} from "@/lib/server/media-authorization";
import {
  assertMediaCapability,
  buildMediaObjectPath,
  mediaPolicies,
  MediaPolicyError,
  parseMediaUploadIntent,
} from "@/lib/server/media-policy";
import { ApiRequestError, readJsonObject } from "@/lib/server/request";
import { ServerConfigurationError } from "@/lib/server/supabase";
import { createPresignedUploadUrl } from "@/lib/server/storage";
import {getBackendMode} from "@/lib/server/backend-mode";
import {handleManagedMediaUpload as uploadNeonMedia} from "@/lib/server/neon-managed-media-route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

function errorResponse(error: unknown, requestId: string) {
  if (
    error instanceof ApiAuthError ||
    error instanceof ApiRequestError ||
    error instanceof MediaPolicyError
  ) {
    return jsonApiResponse(
      {
        data: null,
        error: {
          code: error.code,
          message: error.message,
          ...(error instanceof MediaPolicyError && error.fields
            ? { fields: error.fields }
            : {}),
        },
        meta: { requestId },
      },
      error.status,
    );
  }

  if (error instanceof ServerConfigurationError) {
    console.error("[media:upload-url] Storage is not configured", { requestId });
    return jsonApiResponse(
      {
        data: null,
        error: {
          code: "STORAGE_NOT_CONFIGURED",
          message: "Media storage is temporarily unavailable.",
        },
        meta: { requestId },
      },
      503,
    );
  }

  console.error("[media:upload-url] Unexpected request failure", { requestId });
  return jsonApiResponse(
    {
      data: null,
      error: {
        code: "UPLOAD_URL_FAILED",
        message: "The upload URL could not be created.",
      },
      meta: { requestId },
    },
    500,
  );
}

export async function POST(request: Request) {
  if(getBackendMode()==="neon-staging")return uploadNeonMedia(request);
  const requestId = crypto.randomUUID();

  try {
    const context = await authenticateRequest(request);
    const body = await readJsonObject(request, 8 * 1024);
    const intent = parseMediaUploadIntent(body);
    // Chat objects are message-bound, not generic media intents. Keep this
    // legacy route closed even though staging shares the validation policy.
    if (intent.module === "chat_attachment") {
      throw new MediaPolicyError(403, "MEDIA_ACCESS_DENIED", "Use the authorized chat attachment flow.");
    }

    assertMediaCapability(context.actor, intent.module);
    await authorizeMediaAccess(
      context.userClient,
      intent.module,
      intent.resourceId,
      "upload",
      context.user.id,
    );

    const policy = mediaPolicies[intent.module];
    const path = buildMediaObjectPath(intent, context.user.id);
    await claimMediaUploadIntent(
      context.userClient,
      intent.module,
      intent.resourceId,
      path,
      intent.sizeBytes,
    );

    // Generate presigned PUT URL via Neon S3 (replaces Supabase storage)
    const { uploadUrl, expiresIn } = await createPresignedUploadUrl(
      policy.bucket,
      path,
      intent.contentType,
      7200,
    );

    return jsonApiResponse(
      {
        data: {
          bucket: policy.bucket,
          path,
          signedUrl: uploadUrl,
          // `token` field no longer exists in S3 presigned PUT model.
          // Clients should PUT directly to `signedUrl`.
          token: null,
          expiresIn,
          contentType: intent.contentType,
          maxBytes: policy.maxBytes,
        },
        error: null,
        meta: { requestId },
      },
      201,
    );
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
