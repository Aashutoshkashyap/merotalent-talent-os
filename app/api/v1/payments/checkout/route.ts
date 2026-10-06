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
    const authenticated = await authenticateRequest(request);
    const body = await readAdminJsonBody(request);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new AdminRequestError(400, "INVALID_CHECKOUT", "Checkout must be an object.");
    const value = body as Record<string, unknown>;

    const configured = await loadProviderSecret("payment");
    if (!configured || configured.providerName !== "esewa") throw new AdminRequestError(503, "PAYMENT_UNAVAILABLE", "eSewa payment is not configured.");
    const db = getAdminClient() as any;
    const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || new URL(request.url).origin;

    // A college claim/addition may be paid before or after Super Admin review,
    // but verified payment never grants entity scope by itself. Settlement is
    // attached to the request and activation waits for both approval + payment.
    if (value.scopeRequestId) {
      if (!uuid(value.scopeRequestId) || !uuid(value.packageId)) {
        throw new AdminRequestError(422, "INVALID_CHECKOUT", "Choose a valid college request and plan.");
      }
      const [{ data: scopeRequest, error: scopeError }, { data: pkg, error: packageError }] = await Promise.all([
        db.from("entity_scope_requests")
          .select("id,user_id,module_key,entity_type,status,payment_status")
          .eq("id", value.scopeRequestId)
          .eq("user_id", authenticated.user.id)
          .maybeSingle(),
        db.from("packages")
          .select("id,name,price,currency,is_active,deleted_at,is_publicly_selectable,package_kind,module_scope")
          .eq("id", value.packageId)
          .maybeSingle(),
      ]);
      if (scopeError || !scopeRequest || scopeRequest.module_key !== "college" || scopeRequest.entity_type !== "college") {
        throw new AdminRequestError(404, "REQUEST_NOT_FOUND", "The college access request was not found.");
      }
      if (!["pending", "approved"].includes(scopeRequest.status)) {
        throw new AdminRequestError(409, "REQUEST_NOT_PAYABLE", "This college request can no longer be paid.");
      }
      if (scopeRequest.payment_status === "success") {
        throw new AdminRequestError(409, "PAYMENT_ALREADY_VERIFIED", "This college request has already been paid.");
      }
      const planScopes = Array.isArray(pkg?.module_scope) ? pkg.module_scope : [];
      if (packageError || !pkg || !pkg.is_active || pkg.deleted_at || !pkg.is_publicly_selectable || pkg.package_kind !== "paid" || !planScopes.includes("college")) {
        throw new AdminRequestError(404, "PLAN_UNAVAILABLE", "This college plan is unavailable.");
      }

      const reference = `mt-cr-${randomUUID().replace(/-/g, "")}`;
      const { data: session, error: sessionError } = await db.from("payment_checkout_sessions").insert({
        user_id: authenticated.user.id,
        package_id: pkg.id,
        entity_type: "college_scope_request",
        entity_id: scopeRequest.id,
        provider_name: configured.providerName,
        provider_reference: reference,
        amount: pkg.price,
        currency: pkg.currency,
        status: "initiated",
        expires_at: new Date(Date.now() + 5 * 60_000).toISOString(),
      }).select("id,provider_reference,amount,currency,status,expires_at").single();
      if (sessionError) throw sessionError;

      const provider = getPaymentProvider({ providerName: configured.providerName, secret: configured.secret, publicConfig: configured.publicConfig });
      const checkout = await provider.createCheckout({
        paymentId: reference,
        amount: Number(pkg.price),
        currency: pkg.currency,
        description: `${pkg.name || "MeroTalent College"} access request`,
        returnUrl: `${origin}/api/v1/payments/esewa/callback`,
        failureUrl: `${origin}/api/v1/payments/esewa/callback?state=failed`,
      });
      if (!checkout.checkoutUrl || !checkout.checkoutFields) {
        await Promise.all([
          db.from("payment_checkout_sessions").update({ status: "failed", updated_at: new Date().toISOString() }).eq("id", session.id),
          db.from("entity_scope_requests").update({ package_id: pkg.id, payment_status: "failed", updated_at: new Date().toISOString() }).eq("id", scopeRequest.id),
        ]);
        throw new AdminRequestError(503, "PAYMENT_UNAVAILABLE", checkout.message || "eSewa checkout could not be created.");
      }

      const { error: requestUpdateError } = await db.from("entity_scope_requests").update({
        package_id: pkg.id,
        payment_status: "pending",
        updated_at: new Date().toISOString(),
      }).eq("id", scopeRequest.id).eq("user_id", authenticated.user.id);
      if (requestUpdateError) throw requestUpdateError;

      await db.from("audit_logs").insert({
        actor_user_id: authenticated.user.id,
        action: "initiate_college_scope_request_checkout",
        entity_type: "entity_scope_request",
        entity_id: scopeRequest.id,
        metadata: { package_id: pkg.id, provider: configured.providerName, checkout_session_id: session.id },
      });

      return jsonApiResponse({
        data: { ...session, checkoutUrl: checkout.checkoutUrl, checkoutFields: checkout.checkoutFields, message: "Continue to eSewa to complete this payment." },
        error: null,
        meta: { requestId },
      }, 201);
    }

    // Handle Mentor Booking Checkout
    if (value.bookingId) {
      if (!uuid(value.bookingId)) throw new AdminRequestError(422, "INVALID_CHECKOUT", "Provide a valid booking ID.");
      const { data: booking, error: bookingError } = await db
        .from("mentor_bookings")
        .select("id, student_id, mentor_id, amount, currency, status, payment_status")
        .eq("id", value.bookingId)
        .eq("student_id", authenticated.user.id)
        .maybeSingle();

      if (bookingError || !booking) throw new AdminRequestError(404, "BOOKING_NOT_FOUND", "The requested mentor booking was not found.");
      if (Number(booking.amount) <= 0) throw new AdminRequestError(400, "PAYMENT_NOT_REQUIRED", "This booking does not require payment.");

      const reference = `mt-mb-${randomUUID().replace(/-/g, "")}`;
      const { data: session, error: sessionError } = await db.from("payment_checkout_sessions").insert({
        user_id: authenticated.user.id,
        package_id: null,
        entity_type: "mentor_booking",
        entity_id: booking.id,
        provider_name: configured.providerName,
        provider_reference: reference,
        amount: booking.amount,
        currency: booking.currency || "NPR",
        status: "initiated",
        expires_at: new Date(Date.now() + 5 * 60_000).toISOString(),
      }).select("id,provider_reference,amount,currency,status,expires_at").single();

      if (sessionError) throw sessionError;

      const provider = getPaymentProvider({ providerName: configured.providerName, secret: configured.secret, publicConfig: configured.publicConfig });
      const checkout = await provider.createCheckout({
        paymentId: reference,
        amount: Number(booking.amount),
        currency: booking.currency || "NPR",
        description: "Book Session with MeroTalent Mentor",
        returnUrl: `${origin}/api/v1/payments/esewa/callback`,
        failureUrl: `${origin}/api/v1/payments/esewa/callback?state=failed`,
      });

      if (!checkout.checkoutUrl || !checkout.checkoutFields) {
        await db.from("payment_checkout_sessions").update({ status: "failed", updated_at: new Date().toISOString() }).eq("id", session.id);
        throw new AdminRequestError(503, "PAYMENT_UNAVAILABLE", checkout.message || "eSewa checkout could not be created.");
      }

      await db.from("audit_logs").insert({
        actor_user_id: authenticated.user.id,
        action: "initiate_mentor_booking_checkout",
        entity_type: "mentor_booking",
        entity_id: booking.id,
        metadata: { provider: configured.providerName, checkout_session_id: session.id },
      });

      return jsonApiResponse({ data: { ...session, checkoutUrl: checkout.checkoutUrl, checkoutFields: checkout.checkoutFields, message: "Continue to eSewa to complete this payment." }, error: null, meta: { requestId } }, 201);
    }

    // Handle Event Registration / Ticket Checkout
    if (value.eventRegistrationId) {
      if (!uuid(value.eventRegistrationId)) throw new AdminRequestError(422, "INVALID_CHECKOUT", "Provide a valid event registration ID.");
      const { data: registration, error: regError } = await db
        .from("event_registrations")
        .select("id, user_id, event_id, total_amount, status, payment_status")
        .eq("id", value.eventRegistrationId)
        .eq("user_id", authenticated.user.id)
        .maybeSingle();

      if (regError || !registration) throw new AdminRequestError(404, "REGISTRATION_NOT_FOUND", "The event registration was not found.");
      if (Number(registration.total_amount) <= 0) throw new AdminRequestError(400, "PAYMENT_NOT_REQUIRED", "This registration does not require payment.");
      if (registration.payment_status === "success") throw new AdminRequestError(409, "PAYMENT_ALREADY_VERIFIED", "This registration is already paid.");

      const reference = `mt-er-${randomUUID().replace(/-/g, "")}`;
      const { data: session, error: sessionError } = await db.from("payment_checkout_sessions").insert({
        user_id: authenticated.user.id,
        package_id: null,
        entity_type: "event_registration",
        entity_id: registration.id,
        provider_name: configured.providerName,
        provider_reference: reference,
        amount: registration.total_amount,
        currency: "NPR",
        status: "initiated",
        expires_at: new Date(Date.now() + 5 * 60_000).toISOString(),
      }).select("id,provider_reference,amount,currency,status,expires_at").single();

      if (sessionError) throw sessionError;

      const provider = getPaymentProvider({ providerName: configured.providerName, secret: configured.secret, publicConfig: configured.publicConfig });
      const checkout = await provider.createCheckout({
        paymentId: reference,
        amount: Number(registration.total_amount),
        currency: "NPR",
        description: "Event Registration Ticket",
        returnUrl: `${origin}/api/v1/payments/esewa/callback`,
        failureUrl: `${origin}/api/v1/payments/esewa/callback?state=failed`,
      });

      if (!checkout.checkoutUrl || !checkout.checkoutFields) {
        await db.from("payment_checkout_sessions").update({ status: "failed", updated_at: new Date().toISOString() }).eq("id", session.id);
        throw new AdminRequestError(503, "PAYMENT_UNAVAILABLE", checkout.message || "eSewa checkout could not be created.");
      }

      await db.from("audit_logs").insert({
        actor_user_id: authenticated.user.id,
        action: "initiate_event_registration_checkout",
        entity_type: "event_registration",
        entity_id: registration.id,
        metadata: { provider: configured.providerName, checkout_session_id: session.id },
      });

      return jsonApiResponse({ data: { ...session, checkoutUrl: checkout.checkoutUrl, checkoutFields: checkout.checkoutFields, message: "Continue to eSewa to complete this payment." }, error: null, meta: { requestId } }, 201);
    }

    // Handle Subscription Package Checkout
    if (!uuid(value.packageId) || typeof value.entityType !== "string" || !uuid(value.entityId)) throw new AdminRequestError(422, "INVALID_CHECKOUT", "Choose a valid plan and entitled entity.");
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
    // eSewa's documented ePay session has a five-minute completion window.
    // Persist that deadline so a late signed response cannot activate access.
    const { data: session, error } = await db.from("payment_checkout_sessions").insert({ user_id: authenticated.user.id, package_id: pkg.id, entity_type: value.entityType, entity_id: value.entityId, provider_name: configured.providerName, provider_reference: reference, amount: pkg.price, currency: pkg.currency, status: "initiated", expires_at: new Date(Date.now() + 5 * 60_000).toISOString() }).select("id,provider_reference,amount,currency,status,expires_at").single();
    if (error) throw error;
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
