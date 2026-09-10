import { adminApiErrorResponse, AdminRequestError, readAdminJsonBody } from "@/lib/admin/admin-route-utils";
import { isAIModule, requireAIAccess } from "@/lib/server/ai-access";
import { authenticateRequest } from "@/lib/server/auth";
import { encryptProviderSecret, isSecretStorageConfigured } from "@/lib/server/secret-store";
import { getAdminClient } from "@/lib/server/supabase";
import { jsonApiResponse } from "@/lib/server/api-response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const authenticated = await authenticateRequest(request);
    const url = new URL(request.url);
    const moduleKey = url.searchParams.get("module"); const entityType = url.searchParams.get("entity_type"); const entityId = url.searchParams.get("entity_id");
    if (!isAIModule(moduleKey)) throw new AdminRequestError(422, "INVALID_AI_REQUEST", "Choose a supported module.");
    await requireAIAccess({ context: authenticated, module: moduleKey, entityType: entityType ?? "", entityId: entityId ?? "" });
    const { data, error } = await (getAdminClient() as any).from("module_ai_credentials")
      .select("provider_name,is_enabled,configured_at,updated_at,disabled_at")
      .eq("user_id", authenticated.user.id).eq("module_key", moduleKey).eq("entity_type", entityType).eq("entity_id", entityId).maybeSingle();
    if (error) throw error;
    return jsonApiResponse({ data: { configured: Boolean(data), enabled: Boolean(data?.is_enabled), providerName: data?.provider_name ?? null, secretStorageReady: isSecretStorageConfigured() }, error: null, meta: { requestId } });
  } catch (error) { return adminApiErrorResponse(error, requestId, "read AI BYOK status"); }
}

export async function PUT(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const authenticated = await authenticateRequest(request); const body = await readAdminJsonBody(request);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new AdminRequestError(400, "INVALID_AI_REQUEST", "AI key configuration must be an object.");
    const value = body as Record<string, unknown>;
    if (!isAIModule(value.module) || typeof value.entityType !== "string" || typeof value.entityId !== "string" || typeof value.providerName !== "string" || typeof value.secret !== "string") throw new AdminRequestError(422, "INVALID_AI_REQUEST", "Module, entity, provider, and key are required.");
    await requireAIAccess({ context: authenticated, module: value.module, entityType: value.entityType, entityId: value.entityId });
    const encrypted = encryptProviderSecret(value.secret.trim());
    const { error } = await (getAdminClient() as any).from("module_ai_credentials").upsert({
      user_id: authenticated.user.id, module_key: value.module, entity_type: value.entityType, entity_id: value.entityId,
      provider_name: value.providerName, is_enabled: value.enabled !== false, secret_ciphertext: encrypted.ciphertext, secret_iv: encrypted.iv, secret_tag: encrypted.tag, updated_at: new Date().toISOString(), disabled_at: value.enabled === false ? new Date().toISOString() : null,
    }, { onConflict: "user_id,module_key,entity_type,entity_id" });
    if (error) throw error;
    const { error: auditError } = await (getAdminClient() as any).from("audit_logs").insert({
      actor_user_id: authenticated.user.id,
      action: "configure_module_ai_byok",
      entity_type: value.entityType,
      entity_id: value.entityId,
      metadata: { module: value.module, provider_name: value.providerName, enabled: value.enabled !== false },
    });
    if (auditError) throw auditError;
    return jsonApiResponse({ data: { configured: true, providerName: value.providerName, enabled: value.enabled !== false }, error: null, meta: { requestId } });
  } catch (error) { return adminApiErrorResponse(error, requestId, "write AI BYOK"); }
}
