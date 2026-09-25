import { adminApiErrorResponse, AdminRequestError, readAdminJsonBody } from "@/lib/admin/admin-route-utils";
import { authenticateAdminRequest } from "@/lib/server/auth";
import { getProviderStatus, isProviderKind, ProviderConfigurationPersistenceError, saveProviderConfiguration } from "@/lib/server/provider-config-service";
import { jsonApiResponse } from "@/lib/server/api-response";
import { ServerConfigurationError } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface RouteContext { params: Promise<{ kind: string }> }

async function resolveKind(context: RouteContext) {
  const { kind } = await context.params;
  if (!isProviderKind(kind)) throw new AdminRequestError(404, "PROVIDER_NOT_FOUND", "This provider configuration does not exist.");
  return kind;
}

export async function GET(request: Request, context: RouteContext) {
  const requestId = crypto.randomUUID();
  try {
    await authenticateAdminRequest(request);
    return jsonApiResponse({ data: await getProviderStatus(await resolveKind(context)), error: null, meta: { requestId } });
  } catch (error) {
    return adminApiErrorResponse(error, requestId, "read provider configuration");
  }
}

export async function PUT(request: Request, context: RouteContext) {
  const requestId = crypto.randomUUID();
  try {
    const authenticated = await authenticateAdminRequest(request);
    const body = await readAdminJsonBody(request);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new AdminRequestError(400, "INVALID_PROVIDER_CONFIGURATION", "Provider configuration must be an object.");
    const value = body as Record<string, unknown>;
    if (typeof value.providerName !== "string" || typeof value.enabled !== "boolean") throw new AdminRequestError(422, "INVALID_PROVIDER_CONFIGURATION", "Provider name and enabled state are required.");
    if (value.secret !== undefined && value.secret !== null && typeof value.secret !== "string") throw new AdminRequestError(422, "INVALID_PROVIDER_CONFIGURATION", "Provider secret must be text.");
    const kind = await resolveKind(context);
    if (kind === "payment") {
      const config = value.publicConfig;
      const merchantCode = config && typeof config === "object" && !Array.isArray(config) ? (config as Record<string, unknown>).merchant_code : null;
      const environment = config && typeof config === "object" && !Array.isArray(config) ? (config as Record<string, unknown>).environment : null;
      if (value.providerName !== "esewa") throw new AdminRequestError(422, "INVALID_ESEWA_CONFIGURATION", "Choose eSewa as the payment provider.");
      if (typeof merchantCode !== "string" || !merchantCode.trim()) throw new AdminRequestError(422, "ESEWA_MERCHANT_CODE_REQUIRED", "eSewa merchant code is required.");
      if (!/^[A-Za-z0-9-]{2,128}$/.test(merchantCode.trim())) throw new AdminRequestError(422, "INVALID_ESEWA_MERCHANT_CODE", "Enter a valid eSewa merchant code.");
      if (!["uat", "production"].includes(String(environment))) throw new AdminRequestError(422, "INVALID_ESEWA_ENVIRONMENT", "Choose eSewa UAT or Production.");
    }
    const data = await saveProviderConfiguration({
      kind, providerName: value.providerName, enabled: value.enabled,
      publicConfig: value.publicConfig, secret: value.secret as string | null | undefined, actorUserId: authenticated.user.id,
    });
    return jsonApiResponse({ data, error: null, meta: { requestId } });
  } catch (error) {
    if (error instanceof ProviderConfigurationPersistenceError) {
      return jsonApiResponse({
        data: null,
        error: { code: error.code, message: error.message },
        meta: { requestId },
      }, error.code === "PROVIDER_AUDIT_UNAVAILABLE" ? 503 : 500);
    }
    if (error instanceof ServerConfigurationError && error.message.includes("provider-secret storage")) {
      return jsonApiResponse({
        data: null,
        error: {
          code: "PROVIDER_SECRET_STORAGE_UNAVAILABLE",
          message: "Secure provider-secret storage is unavailable. Configure PROVIDER_CONFIG_ENCRYPTION_KEY on the server before saving a provider secret.",
        },
        meta: { requestId },
      }, 503);
    }
    return adminApiErrorResponse(error, requestId, "write provider configuration");
  }
}
