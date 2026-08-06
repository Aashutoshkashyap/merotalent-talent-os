import { jsonApiResponse } from "@/lib/server/api-response";
import { ApiAuthError, authenticateRequest } from "@/lib/server/auth";
import { authorizeMediaAccess } from "@/lib/server/media-authorization";
import {
  assertMediaCapability,
  assertMediaObjectPath,
  canReadForeignOwnerMedia,
  isAllowedStoredFile,
  mediaPolicies,
  MediaPolicyError,
  parseMediaDownloadIntent,
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
    console.error("[media:download-url] Storage is not configured", { requestId });
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

  console.error("[media:download-url] Unexpected request failure", { requestId });
  return jsonApiResponse(
    {
      data: null,
      error: {
        code: "DOWNLOAD_URL_FAILED",
        message: "The download URL could not be created.",
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
    const intent = parseMediaDownloadIntent(body);

    const objectOwnerUserId = assertMediaObjectPath(
      intent,
      context.user.id,
      canReadForeignOwnerMedia(context.actor, intent.module),
    );
    assertMediaCapability(context.actor, intent.module);
    await authorizeMediaAccess(
      context.userClient,
      intent.module,
      intent.resourceId,
      "download",
      objectOwnerUserId,
    );

    const policy = mediaPolicies[intent.module];
    const storage = getAdminClient().storage.from(policy.bucket);
    const separator = intent.path.lastIndexOf("/");
    const directory = intent.path.slice(0, separator);
    const fileName = intent.path.slice(separator + 1);
    const { data: files, error: listError } = await storage.list(directory, {
      limit: 2,
      search: fileName,
    });

    if (listError) {
      console.error("[media:download-url] Storage lookup failed", {
        bucket: policy.bucket,
        code: listError.name,
        module: intent.module,
        requestId,
      });
      return jsonApiResponse(
        {
          data: null,
          error: {
            code: "STORAGE_UNAVAILABLE",
            message: "The media object could not be checked.",
          },
          meta: { requestId },
        },
        503,
      );
    }

    const file = files?.find((candidate) => candidate.name === fileName);
    if (!file) {
      return jsonApiResponse(
        {
          data: null,
          error: {
            code: "MEDIA_NOT_FOUND",
            message: "The requested media object was not found.",
          },
          meta: { requestId },
        },
        404,
      );
    }
    if (!isAllowedStoredFile(intent.module, file.metadata)) {
      console.error("[media:download-url] Stored media metadata was rejected", {
        bucket: policy.bucket,
        module: intent.module,
        requestId,
      });
      return jsonApiResponse(
        {
          data: null,
          error: {
            code: "MEDIA_POLICY_VIOLATION",
            message: "The requested media object failed its security checks.",
          },
          meta: { requestId },
        },
        422,
      );
    }

    const forceAttachment = [
      "application_file",
      "job_attachment",
      "resume",
    ].includes(intent.module);
    const download = forceAttachment || intent.download;
    const { data, error } = await storage.createSignedUrl(
      intent.path,
      intent.expiresIn,
      { download },
    );
    if (error || !data) {
      console.error("[media:download-url] Supabase signing failed", {
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
            message: "The download URL could not be created.",
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
          path: intent.path,
          signedUrl: data.signedUrl,
          download,
          expiresIn: intent.expiresIn,
          expiresAt: new Date(Date.now() + intent.expiresIn * 1000).toISOString(),
        },
        error: null,
        meta: { requestId },
      },
      200,
    );
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
