import { jsonApiResponse } from "@/lib/server/api-response";
import { ServerConfigurationError } from "@/lib/server/supabase";
import { AdminRequestError, adminApiErrorResponse } from "./admin-route-utils";

interface AuthProviderErrorLike {
  code?: unknown;
  status?: unknown;
}

interface InviteRedirectEnvironment {
  AUTH_INVITE_REDIRECT_URL?: string;
}

export function getAuthInviteRedirectUrl(
  environment: InviteRedirectEnvironment = process.env as InviteRedirectEnvironment,
): string {
  const configured = environment.AUTH_INVITE_REDIRECT_URL?.trim();
  if (!configured) {
    throw new ServerConfigurationError(
      "The administrator invitation redirect URL is not configured.",
    );
  }

  let redirect: URL;
  try {
    redirect = new URL(configured);
  } catch {
    throw new ServerConfigurationError(
      "The administrator invitation redirect URL is invalid.",
    );
  }

  const hostname = redirect.hostname.toLowerCase();
  const isLocalOrIpHost =
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.includes(":") ||
    /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname);
  if (
    redirect.protocol !== "https:" ||
    redirect.username ||
    redirect.password ||
    redirect.port ||
    redirect.pathname !== "/reset-password" ||
    redirect.search ||
    redirect.hash ||
    isLocalOrIpHost ||
    !hostname.includes(".")
  ) {
    throw new ServerConfigurationError(
      "The administrator invitation redirect URL must be a production HTTPS /reset-password URL.",
    );
  }

  return redirect.toString();
}

export function throwAuthProviderError(
  error: AuthProviderErrorLike,
  operation: string,
  requestId: string,
): never {
  const code = typeof error.code === "string" ? error.code : "unknown";
  const status = typeof error.status === "number" ? error.status : undefined;
  console.error(`[admin-auth-users] ${operation} was rejected by Supabase Auth`, {
    code,
    requestId,
    status,
  });

  if (["email_exists", "user_already_exists"].includes(code)) {
    throw new AdminRequestError(
      409,
      "AUTH_USER_EXISTS",
      "An Auth user already uses this email address.",
    );
  }
  if (code === "user_not_found" || status === 404) {
    throw new AdminRequestError(
      404,
      "AUTH_USER_NOT_FOUND",
      "The requested Auth user does not exist.",
    );
  }
  if (status === 429) {
    throw new AdminRequestError(
      429,
      "AUTH_RATE_LIMITED",
      "The Auth service is temporarily rate limited. Try again later.",
    );
  }
  if (status !== undefined && status >= 500) {
    throw new AdminRequestError(
      503,
      "AUTH_SERVICE_UNAVAILABLE",
      "The Auth service is temporarily unavailable.",
    );
  }
  throw new AdminRequestError(
    502,
    "AUTH_OPERATION_REJECTED",
    "The Auth service could not complete this request.",
  );
}

export function authUserApiErrorResponse(
  error: unknown,
  requestId: string,
  operation: string,
) {
  if (error instanceof ServerConfigurationError) {
    console.error(`[admin-auth-users] ${operation} is not configured`, {
      requestId,
    });
    return jsonApiResponse(
      {
        data: null,
        error: {
          code: "AUTH_ADMIN_NOT_CONFIGURED",
          message: "Administrative Auth operations are temporarily unavailable.",
        },
        meta: { requestId },
      },
      503,
    );
  }
  return adminApiErrorResponse(error, requestId, operation);
}
