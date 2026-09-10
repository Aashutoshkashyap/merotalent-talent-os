import { adminApiErrorResponse, AdminRequestError, readAdminJsonBody } from "@/lib/admin/admin-route-utils";
import { authenticateAdminRequest } from "@/lib/server/auth";
import { getProviderStatus, isProviderKind, saveProviderConfiguration } from "@/lib/server/provider-config-service";
import { jsonApiResponse } from "@/lib/server/api-response";

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
    const data = await saveProviderConfiguration({
      kind: await resolveKind(context), providerName: value.providerName, enabled: value.enabled,
      publicConfig: value.publicConfig, secret: value.secret as string | null | undefined, actorUserId: authenticated.user.id,
    });
    return jsonApiResponse({ data, error: null, meta: { requestId } });
  } catch (error) {
    return adminApiErrorResponse(error, requestId, "write provider configuration");
  }
}
