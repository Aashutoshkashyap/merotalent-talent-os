import { ApiAuthError, type AuthenticatedRequestContext } from "./auth";

export const AI_MODULES = ["college", "jobs", "mentor", "events"] as const;
export type AIModule = (typeof AI_MODULES)[number];

export const isAIModule = (value: unknown): value is AIModule =>
  typeof value === "string" && (AI_MODULES as readonly string[]).includes(value);

const validEntityType = (module: AIModule, entityType: string) =>
  (module === "college" && entityType === "college") ||
  (module === "jobs" && ["company", "job"].includes(entityType)) ||
  (module === "mentor" && entityType === "mentor") ||
  (module === "events" && entityType === "event");

const callBooleanRpc = async (
  context: AuthenticatedRequestContext,
  name: string,
  args: Record<string, unknown>,
) => {
  const { data, error } = await (context.userClient as any).rpc(name, args);
  if (error || data !== true) return false;
  return true;
};

export async function requireAIAccess(input: {
  context: AuthenticatedRequestContext;
  module: AIModule;
  entityType?: string;
  entityId?: string;
}) {
  const { context, module, entityType, entityId } = input;
  const platformAdmin = context.actor.roles.includes("admin") || context.actor.roles.includes("super_admin");
  if (platformAdmin && !entityId) return;
  if (!entityId || !entityType || !validEntityType(module, entityType)) {
    throw new ApiAuthError(422, "AI_SCOPE_REQUIRED", "Choose an authorized module entity before generating AI content.");
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(entityId)) {
    throw new ApiAuthError(422, "AI_SCOPE_REQUIRED", "The selected entity is invalid.");
  }
  const capability = await callBooleanRpc(context, "has_active_module_capability", {
    p_user_id: context.user.id, p_module_key: module,
  });
  const assignment = capability && await callBooleanRpc(context, "has_active_entity_assignment", {
    p_user_id: context.user.id, p_module_key: module, p_entity_type: entityType, p_entity_id: entityId,
  });
  const feature = assignment && await callBooleanRpc(context, "has_entity_feature_access", {
    p_user_id: context.user.id, p_module_key: module, p_entity_type: entityType, p_entity_id: entityId,
    p_feature_key: "ai.description.generate",
  });
  if (!feature) {
    throw new ApiAuthError(403, "AI_NOT_ENTITLED", "AI generation is not configured or not included in your plan.");
  }
}
