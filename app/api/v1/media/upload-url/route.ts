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
import {
  getAdminClient,
  ServerConfigurationError,
} from "@/lib/server/supabase";

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
  const requestId = crypto.randomUUID();

  try {
    const context = await authenticateRequest(request);
    const body = await readJsonObject(request, 8 * 1024);
    const intent = parseMediaUploadIntent(body);

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
    const { data, error } = await getAdminClient()
      .storage.from(policy.bucket)
      .createSignedUploadUrl(path, { upsert: false });

    if (error || !data) {
      console.error("[media:upload-url] Supabase signing failed", {
        bucket: policy.bucket,
        code: error?.name,
        module: intent.module,
        requestId,
      });
      return jsonApiResponse(
        {
          data: null,
          error: {
            code: "STORAGE_UNAVAILABLE",
            message: "The upload URL could not be created.",
          },
          meta: { requestId },
        },
        503,
      );
    }

    return jsonApiResponse(
      {
        data: {
          bucket: policy.bucket,
          path: data.path,
          signedUrl: data.signedUrl,
          token: data.token,
          expiresIn: 7200,
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
