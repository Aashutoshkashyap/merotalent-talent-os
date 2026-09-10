import { authenticateAdminRequest } from "@/lib/server/auth";
import { adminApiErrorResponse, AdminRequestError, readAdminJsonBody } from "@/lib/admin/admin-route-utils";
import { getAdminClient } from "@/lib/server/supabase";
import { jsonApiResponse } from "@/lib/server/api-response";

const isUuid = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export async function GET(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    await authenticateAdminRequest(request);
    const db = getAdminClient() as any;
    const [profiles, capabilities, assignments, entitlements, grants, settings] = await Promise.all([
      db.from("profiles").select("user_id,email,full_name,account_status,created_at").order("created_at", { ascending: false }).limit(500),
      db.from("user_module_capabilities").select("id,user_id,status,expires_at,module_capabilities(module_key,label)").limit(1500),
      db.from("entity_admin_assignments").select("id,user_id,user_capability_id,entity_type,entity_id,status,scopes,created_at").limit(2000),
      db.from("module_entitlements").select("id,user_id,module_key,entity_type,entity_id,package_id,source,status,start_at,expires_at,features,reason,created_at").order("created_at", { ascending: false }).limit(2000),
      db.from("entity_feature_grants").select("id,user_id,module_key,entity_type,entity_id,feature_key,status,granted_at,revoked_at,note").limit(2000),
      db.from("platform_module_trial_settings").select("module_key,is_enabled,duration_days,allow_indefinite_manual"),
    ]);
    for (const result of [profiles, capabilities, assignments, entitlements, grants, settings]) if (result.error) throw result.error;
    return jsonApiResponse({ data: { users: profiles.data, capabilities: capabilities.data, assignments: assignments.data, entitlements: entitlements.data, featureGrants: grants.data, trialSettings: settings.data }, error: null, meta: { requestId } });
  } catch (error) { return adminApiErrorResponse(error, requestId, "load access matrix"); }
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const context = await authenticateAdminRequest(request);
    const body = await readAdminJsonBody(request);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new AdminRequestError(400, "INVALID_ACCESS_ACTION", "Access action must be an object.");
    const value = body as Record<string, unknown>;
    if (value.action === "trial_settings") {
      if (typeof value.module !== "string" || !Number.isInteger(value.durationDays) || Number(value.durationDays) < 1 || Number(value.durationDays) > 365 || typeof value.enabled !== "boolean") throw new AdminRequestError(422, "INVALID_TRIAL_SETTINGS", "Choose a module, an enabled state and a trial duration from 1 to 365 days.");
      const db = getAdminClient() as any;
      const { error } = await db.from("platform_module_trial_settings").update({ is_enabled: value.enabled, duration_days: value.durationDays, allow_indefinite_manual: value.allowIndefiniteManual === true, updated_by: context.user.id, updated_at: new Date().toISOString() }).eq("module_key", value.module);
      if (error) throw error;
      await db.from("audit_logs").insert({ actor_user_id: context.user.id, action: "TRIAL_SETTINGS_UPDATED", entity_type: "module", entity_id: value.module, metadata: { enabled: value.enabled, duration_days: value.durationDays, allow_indefinite_manual: value.allowIndefiniteManual === true } });
      return jsonApiResponse({ data: { updated: true }, error: null, meta: { requestId } });
    }
    if (!isUuid(value.userId) || typeof value.module !== "string" || typeof value.entityType !== "string" || !isUuid(value.entityId)) throw new AdminRequestError(422, "INVALID_ACCESS_SCOPE", "Choose a user, module and valid entity.");
    const rpc = context.userClient as any;
    if (value.action === "feature") {
      if (typeof value.feature !== "string" || typeof value.active !== "boolean") throw new AdminRequestError(422, "INVALID_FEATURE", "Choose a feature state.");
      const { error } = await rpc.rpc("admin_set_entity_feature_grant", { p_user_id: value.userId, p_module_key: value.module, p_entity_type: value.entityType, p_entity_id: value.entityId, p_feature_key: value.feature, p_active: value.active, p_note: typeof value.note === "string" ? value.note.slice(0, 1000) : null });
      if (error) throw error;
    } else if (value.action === "trial") {
      const { error } = await rpc.rpc("admin_start_module_trial", { p_target_user_id: value.userId, p_module_key: value.module, p_entity_type: value.entityType, p_entity_id: value.entityId, p_reason: typeof value.note === "string" ? value.note.slice(0, 1000) : null });
      if (error) throw error;
    } else if (value.action === "enroll") {
      const expiresAt = typeof value.expiresAt === "string" && !Number.isNaN(Date.parse(value.expiresAt)) ? value.expiresAt : null;
      const features = value.features && typeof value.features === "object" && !Array.isArray(value.features) ? value.features : {};
      const source = ["ADMIN_MANUAL", "SUPER_ADMIN_PACKAGE", "ADMIN_PACKAGE", "PROMOTIONAL"].includes(String(value.source)) ? value.source : "ADMIN_MANUAL";
      const { error } = await rpc.rpc("admin_manage_module_entitlement", { p_target_user_id: value.userId, p_module_key: value.module, p_entity_type: value.entityType, p_entity_id: value.entityId, p_source: source, p_start_at: new Date().toISOString(), p_expires_at: expiresAt, p_package_id: isUuid(value.packageId) ? value.packageId : null, p_features: features, p_reason: typeof value.note === "string" ? value.note.slice(0, 1000) : null });
      if (error) throw error;
    } else throw new AdminRequestError(422, "INVALID_ACCESS_ACTION", "Unsupported access action.");
    return jsonApiResponse({ data: { updated: true }, error: null, meta: { requestId } });
  } catch (error) { return adminApiErrorResponse(error, requestId, "update access matrix"); }
}
