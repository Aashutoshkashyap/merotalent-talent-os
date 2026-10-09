import { authenticateRequest } from "@/lib/server/auth";
import { adminApiErrorResponse } from "@/lib/admin/admin-route-utils";
import { getBackendMode } from "@/lib/server/backend-mode";
import { getAdminClient } from "@/lib/server/supabase";
import { jsonApiResponse } from "@/lib/server/api-response";
import { queryRows } from "@/lib/server/db";
import { NeonPaymentsRepository } from "@/lib/server/neon-payments";
import { getAuthenticatedApplicationUser } from "@/lib/server/neon-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Returns the authenticated user's purchasable plans and assigned scopes.
 * The browser never reads the private entitlement ledger or provider settings
 * directly, and this endpoint deliberately omits all provider configuration.
 */
export async function GET(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    if (getBackendMode() === "neon-staging") {
      const actor = await getAuthenticatedApplicationUser(request);
      const repo = new NeonPaymentsRepository();
      const [payments, plans, checkouts] = await Promise.all([
        repo.listOwnPayments(actor),
        queryRows(`
          SELECT id, name, description, price::float AS price, currency,
                 billing_interval, duration_days, module_scope, features, lead_access_mode, sort_order
          FROM public.packages
          WHERE is_active = true AND is_publicly_selectable = true AND package_kind = 'paid'
            AND deleted_at IS NULL
          ORDER BY sort_order ASC`),
        queryRows(`
          SELECT id, package_id, entity_type, entity_id, provider_name, provider_reference,
                 amount::float AS amount, currency, status, expires_at, completed_at, created_at
          FROM public.payment_checkout_sessions
          WHERE user_id = $1::uuid
          ORDER BY created_at DESC LIMIT 30`, [actor.userId]),
      ]);
      return jsonApiResponse({
        data: { plans, scopes: [], entitlements: [], checkouts, payments },
        error: null,
        meta: { requestId },
      });
    }

    const authenticated = await authenticateRequest(request);
    const db = getAdminClient() as any;
    const [plans, assignments, entitlements, checkouts] = await Promise.all([
      db.from("packages")
        .select("id,name,description,price,currency,billing_interval,duration_days,module_scope,features,lead_access_mode,sort_order")
        .eq("is_active", true).eq("is_publicly_selectable", true).eq("package_kind", "paid")
        .is("deleted_at", null).order("sort_order", { ascending: true }),
      db.from("entity_admin_assignments")
        .select("id,entity_type,entity_id,status,user_module_capabilities!inner(status,module_capabilities!inner(module_key,label,is_active))")
        .eq("user_id", authenticated.user.id).eq("status", "active"),
      db.rpc("get_my_module_entitlements"),
      db.from("payment_checkout_sessions")
        .select("id,package_id,entity_type,entity_id,provider_name,provider_reference,amount,currency,status,expires_at,completed_at,created_at")
        .eq("user_id", authenticated.user.id).order("created_at", { ascending: false }).limit(30),
    ]);
    for (const result of [plans, assignments, entitlements, checkouts]) {
      if (result.error) throw result.error;
    }
    const scopes = (assignments.data ?? []).flatMap((assignment: any) => {
      const capability = assignment.user_module_capabilities;
      const moduleKey = capability?.module_capabilities?.module_key;
      return capability?.status === "active" && capability?.module_capabilities?.is_active && typeof moduleKey === "string"
        ? [{ id: assignment.id, module: moduleKey, entityType: assignment.entity_type, entityId: assignment.entity_id }]
        : [];
    });
    return jsonApiResponse({
      data: { plans: plans.data ?? [], scopes, entitlements: entitlements.data ?? [], checkouts: checkouts.data ?? [] },
      error: null,
      meta: { requestId },
    });
  } catch (error) {
    return adminApiErrorResponse(error, requestId, "load payment overview");
  }
}
