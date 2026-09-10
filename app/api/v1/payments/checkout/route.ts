import { randomUUID } from "node:crypto";
import { AdminRequestError, adminApiErrorResponse, readAdminJsonBody } from "@/lib/admin/admin-route-utils";
import { authenticateRequest } from "@/lib/server/auth";
import { loadProviderSecret } from "@/lib/server/provider-config-service";
import { getPaymentProvider } from "@/lib/server/payment-provider";
import { getAdminClient } from "@/lib/server/supabase";
import { jsonApiResponse } from "@/lib/server/api-response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const uuid = (value: unknown) => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const moduleScopeByEntityType: Record<string, { module: string; entityTypes: string[] }> = {
  college: { module: "college", entityTypes: ["college"] },
  mentor: { module: "mentor", entityTypes: ["mentor"] },
  company: { module: "jobs", entityTypes: ["company", "job"] },
  event: { module: "events", entityTypes: ["event"] },
};

const isPlatformAdmin = (roles: readonly string[]) =>
  roles.some((role) => ["super_admin", "superadmin", "admin"].includes(role.toLowerCase()));

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const authenticated = await authenticateRequest(request); const body = await readAdminJsonBody(request);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new AdminRequestError(400, "INVALID_CHECKOUT", "Checkout must be an object.");
    const value = body as Record<string, unknown>;
    if (!uuid(value.packageId) || typeof value.entityType !== "string" || !uuid(value.entityId)) throw new AdminRequestError(422, "INVALID_CHECKOUT", "Choose a valid plan and entitled entity.");
    const configured = await loadProviderSecret("payment");
    if (!configured || configured.providerName !== "esewa") throw new AdminRequestError(503, "PAYMENT_UNAVAILABLE", "eSewa payment is not configured.");
    const db = getAdminClient() as any;
    const { data: pkg, error: packageError } = await db.from("packages").select("id,name,price,currency,is_active,deleted_at,is_publicly_selectable,package_kind,module_scope").eq("id", value.packageId).maybeSingle();
    if (packageError || !pkg || !pkg.is_active || pkg.deleted_at || !pkg.is_publicly_selectable || pkg.package_kind !== "paid") throw new AdminRequestError(404, "PLAN_UNAVAILABLE", "This subscription plan is unavailable.");

    // A checkout changes an entity's entitlement. The browser cannot select an
    // arbitrary entity ID: a non-platform administrator must hold both the
    // relevant module capability and an active assignment to that exact entity.
    if (!isPlatformAdmin(authenticated.actor.roles)) {
      const expectedScope = moduleScopeByEntityType[value.entityType];
      const planScopes = Array.isArray(pkg.module_scope) ? pkg.module_scope : [];
      if (!expectedScope || !planScopes.includes(expectedScope.module) || !expectedScope.entityTypes.includes(value.entityType)) {
        throw new AdminRequestError(422, "INVALID_CHECKOUT_SCOPE", "This plan cannot be used for the selected entity.");
      }
      const [{ data: hasCapability, error: capabilityError }, { data: hasAssignment, error: assignmentError }] = await Promise.all([
        (authenticated.userClient as any).rpc("has_active_module_capability", { p_user_id: authenticated.user.id, p_module_key: expectedScope.module }),
        (authenticated.userClient as any).rpc("has_active_entity_assignment", { p_user_id: authenticated.user.id, p_module_key: expectedScope.module, p_entity_type: value.entityType, p_entity_id: value.entityId }),
      ]);
      if (capabilityError || assignmentError || hasCapability !== true || hasAssignment !== true) {
        throw new AdminRequestError(403, "ENTITY_ACCESS_DENIED", "You are not authorized to purchase a subscription for this entity.");
      }
    }
    // The amount and provider reference are derived only from the selected plan.
    // eSewa permits alphanumeric characters and hyphens in transaction_uuid.
    const reference = `mt-${randomUUID().replace(/-/g, "")}`;
    const { data: session, error } = await db.from("payment_checkout_sessions").insert({ user_id: authenticated.user.id, package_id: pkg.id, entity_type: value.entityType, entity_id: value.entityId, provider_name: configured.providerName, provider_reference: reference, amount: pkg.price, currency: pkg.currency, status: "initiated", expires_at: new Date(Date.now() + 30 * 60_000).toISOString() }).select("id,provider_reference,amount,currency,status,expires_at").single();
    if (error) throw error;
    const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || new URL(request.url).origin;
    const provider = getPaymentProvider({ providerName: configured.providerName, secret: configured.secret, publicConfig: configured.publicConfig });
    const checkout = await provider.createCheckout({
      paymentId: reference,
      amount: Number(pkg.price),
      currency: pkg.currency,
      description: pkg.name || "MeroTalent subscription",
      returnUrl: `${origin}/api/v1/payments/esewa/callback`,
      failureUrl: `${origin}/api/v1/payments/esewa/callback?state=failed`,
    });
    if (!checkout.checkoutUrl || !checkout.checkoutFields) {
      await db.from("payment_checkout_sessions").update({ status: "failed", updated_at: new Date().toISOString() }).eq("id", session.id);
      throw new AdminRequestError(503, "PAYMENT_UNAVAILABLE", checkout.message || "eSewa checkout could not be created.");
    }
    await db.from("audit_logs").insert({ actor_user_id: authenticated.user.id, action: "initiate_subscription_checkout", entity_type: value.entityType, entity_id: value.entityId, metadata: { package_id: pkg.id, provider: configured.providerName, checkout_session_id: session.id } });
    return jsonApiResponse({ data: { ...session, checkoutUrl: checkout.checkoutUrl, checkoutFields: checkout.checkoutFields, message: "Continue to eSewa to complete this payment." }, error: null, meta: { requestId } }, 201);
  } catch (error) { return adminApiErrorResponse(error, requestId, "initiate subscription checkout"); }
}
