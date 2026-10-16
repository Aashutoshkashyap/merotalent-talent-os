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
      const [payments, plans, checkouts, scopes, entitlements, collegeRequests] = await Promise.all([
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
        queryRows(`SELECT a.id,'college' AS module,a.entity_type AS "entityType",a.entity_id AS "entityId"
          FROM public.entity_admin_assignments a
          JOIN public.user_module_capabilities umc ON umc.id=a.user_capability_id AND umc.status='active'
            AND (umc.expires_at IS NULL OR umc.expires_at>now())
          JOIN public.module_capabilities mc ON mc.id=umc.capability_id AND mc.module_key='college' AND mc.is_active
          WHERE a.user_id=$1::uuid AND a.entity_type='college' AND a.status='active'`, [actor.userId]),
        queryRows(`SELECT e.id,e.module_key,e.entity_type,e.entity_id,e.source,e.status,e.expires_at,e.features,
          p.name AS package_name FROM public.module_entitlements e LEFT JOIN public.packages p ON p.id=e.package_id
          WHERE e.user_id=$1::uuid AND e.module_key='college' ORDER BY e.created_at DESC LIMIT 100`, [actor.userId]),
        queryRows(`SELECT r.id,r.status,r.payment_status,r.entity_id,r.request_kind,
          COALESCE(i.name,r.request_data->>'name','College request') AS college_name
          FROM public.entity_scope_requests r LEFT JOIN public.institutes i ON i.id=r.entity_id
          WHERE r.user_id=$1::uuid AND r.module_key='college' AND r.entity_type='college'
          ORDER BY r.created_at DESC LIMIT 30`, [actor.userId]),
      ]);
      return jsonApiResponse({
        data: { plans, scopes, entitlements, collegeRequests, checkouts, payments },
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
