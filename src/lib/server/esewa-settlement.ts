import { getAdminClient } from "./supabase";

type SettlementStatus = "successful" | "failed" | "cancelled" | "pending" | "expired";

const durationDays = (pkg: any) => Number(pkg.duration_days) || ({ month: 30, quarter: 90, year: 365, one_time: 30 }[pkg.billing_interval] ?? 30);
const moduleForEntity = (entityType: string) => ({ college: "college", mentor: "mentor", company: "jobs", job: "jobs", organizer: "events", event: "events" } as Record<string, string | undefined>)[entityType];

/** Called only after a provider signature and provider-side status check succeed. */
export async function settleVerifiedCheckout(input: { provider: "esewa"; reference: string; amount: number; status: SettlementStatus; transactionId: string }) {
  const db = getAdminClient() as any;
  const { data: checkout, error: checkoutError } = await db.from("payment_checkout_sessions").select("*").eq("provider_reference", input.reference).eq("provider_name", input.provider).maybeSingle();
  if (checkoutError || !checkout) throw new Error("Payment session was not found.");
  if (checkout.status !== "initiated" && checkout.status !== "pending") return { checkoutId: checkout.id, duplicate: true, status: checkout.status };
  if (Number(checkout.amount) !== input.amount) throw new Error("eSewa payment amount did not match the checkout session.");
  const now = new Date();
  if (checkout.expires_at && new Date(checkout.expires_at).getTime() <= now.getTime()) {
    const { error } = await db.from("payment_checkout_sessions").update({ status: "expired", completed_at: now.toISOString(), updated_at: now.toISOString() }).eq("id", checkout.id);
    if (error) throw error;
    return { checkoutId: checkout.id, duplicate: false, status: "expired", subscriptionId: null };
  }

  const terminal = input.status === "successful" ? "success" : "failed";

  if (checkout.entity_type === "module_access_request") {
    const [{ data: requestRecord, error: requestError }, { data: pkg, error: packageError }] = await Promise.all([
      db.from("sub_admin_requests")
        .select("id,user_id,requested_modules,status,payment_status")
        .eq("id", checkout.entity_id)
        .eq("user_id", checkout.user_id)
        .maybeSingle(),
      db.from("packages")
        .select("id,price,currency,module_scope")
        .eq("id", checkout.package_id)
        .maybeSingle(),
    ]);
    if (requestError || !requestRecord) throw new Error("Module access request was not found.");
    const requestedModules = Array.isArray(requestRecord.requested_modules) ? requestRecord.requested_modules : [];
    const planScopes = Array.isArray(pkg?.module_scope) ? pkg.module_scope : [];
    if (packageError || !pkg || Number(pkg.price) !== Number(checkout.amount) || requestedModules.length === 0 || requestedModules.some((module: string) => !planScopes.includes(module))) {
      throw new Error("Module access plan does not match this payment session.");
    }

    const { data: existingPayment, error: existingError } = await db.from("payments")
      .select("id")
      .eq("reference_id", requestRecord.id)
      .eq("payment_type", "module_access_request")
      .maybeSingle();
    if (existingError) throw existingError;

    let paymentId = existingPayment?.id as string | undefined;
    const paymentValues = {
      status: terminal,
      gateway: input.provider,
      gateway_transaction_id: input.transactionId,
      paid_at: input.status === "successful" ? now.toISOString() : null,
      failed_at: input.status === "successful" ? null : now.toISOString(),
      metadata: { checkout_session_id: checkout.id, package_id: checkout.package_id, requested_modules: requestedModules },
    };
    if (paymentId) {
      const { error } = await db.from("payments").update(paymentValues).eq("id", paymentId);
      if (error) throw error;
    } else {
      const { data: payment, error } = await db.from("payments").insert({
        user_id: checkout.user_id,
        payment_type: "module_access_request",
        reference_id: requestRecord.id,
        amount: checkout.amount,
        currency: checkout.currency,
        ...paymentValues,
      }).select("id").single();
      if (error) throw error;
      paymentId = payment.id;
    }

    const requestPaymentStatus = input.status === "successful"
      ? "success"
      : (["cancelled", "expired"].includes(input.status) ? input.status : "failed");
    const { error: requestUpdateError } = await db.from("sub_admin_requests").update({
      package_id: checkout.package_id,
      payment_id: paymentId,
      payment_status: requestPaymentStatus,
      paid_at: input.status === "successful" ? now.toISOString() : null,
      updated_at: now.toISOString(),
    }).eq("id", requestRecord.id).eq("user_id", checkout.user_id);
    if (requestUpdateError) throw requestUpdateError;

    const { error: checkoutUpdateError } = await db.from("payment_checkout_sessions").update({
      status: input.status,
      completed_at: now.toISOString(),
      updated_at: now.toISOString(),
    }).eq("id", checkout.id);
    if (checkoutUpdateError) throw checkoutUpdateError;

    const { error: auditError } = await db.from("audit_logs").insert({
      actor_user_id: null,
      action: input.status === "successful" ? "MODULE_ACCESS_PAYMENT_VERIFIED" : "MODULE_ACCESS_PAYMENT_FAILED",
      entity_type: "sub_admin_request",
      entity_id: requestRecord.id,
      metadata: { provider: input.provider, checkout_session_id: checkout.id, payment_id: paymentId },
    });
    if (auditError) throw auditError;

    if (input.status === "successful") {
      const { error: notificationError } = await db.from("notifications").insert({
        recipient_id: checkout.user_id,
        title: "Module access payment verified",
        message: "Your eSewa payment was verified. Your module access request is awaiting Super Admin review.",
        type: "success",
        category: "payment",
        channel: "dashboard",
        status: "queued",
        entity_type: "sub_admin_request",
        entity_id: requestRecord.id,
        action_url: "/request-access",
        metadata: { payment_id: paymentId, requested_modules: requestedModules },
      });
      if (notificationError) throw notificationError;
    }

    return { checkoutId: checkout.id, duplicate: false, status: input.status, subscriptionId: null };
  }

  if (checkout.entity_type === "college_scope_request") {
    const [{ data: requestRecord, error: requestError }, { data: pkg, error: packageError }] = await Promise.all([
      db.from("entity_scope_requests")
        .select("id,user_id,status,entity_id,payment_status")
        .eq("id", checkout.entity_id)
        .eq("user_id", checkout.user_id)
        .maybeSingle(),
      db.from("packages")
        .select("id,price,currency,module_scope")
        .eq("id", checkout.package_id)
        .maybeSingle(),
    ]);
    if (requestError || !requestRecord) throw new Error("College access request was not found.");
    if (packageError || !pkg || Number(pkg.price) !== Number(checkout.amount) || !Array.isArray(pkg.module_scope) || !pkg.module_scope.includes("college")) {
      throw new Error("College plan does not match this payment session.");
    }

    const { data: payment, error: paymentError } = await db.from("payments").insert({
      user_id: checkout.user_id,
      payment_type: "module_access_request",
      reference_id: requestRecord.id,
      amount: checkout.amount,
      currency: checkout.currency,
      status: terminal,
      gateway: input.provider,
      gateway_transaction_id: input.transactionId,
      paid_at: input.status === "successful" ? now.toISOString() : null,
      failed_at: input.status === "successful" ? null : now.toISOString(),
      metadata: { checkout_session_id: checkout.id, package_id: checkout.package_id, module: "college" },
    }).select("id").single();
    if (paymentError) throw paymentError;

    const requestPaymentStatus = input.status === "successful"
      ? "success"
      : (["cancelled", "expired"].includes(input.status) ? input.status : "failed");
    const { error: requestUpdateError } = await db.from("entity_scope_requests").update({
      package_id: checkout.package_id,
      payment_id: payment.id,
      payment_status: requestPaymentStatus,
      paid_at: input.status === "successful" ? now.toISOString() : null,
      updated_at: now.toISOString(),
    }).eq("id", requestRecord.id).eq("user_id", checkout.user_id);
    if (requestUpdateError) throw requestUpdateError;

    let activation: Record<string, unknown> = { activated: false, reason: "awaiting_approval" };
    if (input.status === "successful") {
      const { data, error } = await db.rpc("activate_verified_college_scope_request", { p_request_id: requestRecord.id });
      if (error) throw error;
      if (data && typeof data === "object" && !Array.isArray(data)) activation = data as Record<string, unknown>;
    }

    const { error: checkoutUpdateError } = await db.from("payment_checkout_sessions").update({
      status: input.status,
      completed_at: now.toISOString(),
      updated_at: now.toISOString(),
    }).eq("id", checkout.id);
    if (checkoutUpdateError) throw checkoutUpdateError;

    const { error: auditError } = await db.from("audit_logs").insert({
      actor_user_id: null,
      action: input.status === "successful" ? "COLLEGE_SCOPE_PAYMENT_VERIFIED" : "COLLEGE_SCOPE_PAYMENT_FAILED",
      entity_type: "entity_scope_request",
      entity_id: requestRecord.id,
      metadata: { provider: input.provider, checkout_session_id: checkout.id, payment_id: payment.id, activation },
    });
    if (auditError) throw auditError;

    return {
      checkoutId: checkout.id,
      duplicate: false,
      status: input.status,
      subscriptionId: typeof activation.subscription_id === "string" ? activation.subscription_id : null,
    };
  }

  if (checkout.entity_type === "mentor_booking") {
    const { data: booking } = await db.from("mentor_bookings").select("id,mentor_id").eq("id", checkout.entity_id).maybeSingle();
    let commissionRate = 0;
    if (booking?.mentor_id) {
      const { data: mentor } = await db.from("mentors").select("commission_rate").eq("id", booking.mentor_id).maybeSingle();
      commissionRate = Number(mentor?.commission_rate) || 0;
    }
    const commissionAmount = (Number(checkout.amount) * commissionRate) / 100;
    const mentorPayable = Number(checkout.amount) - commissionAmount;

    const { data: existingPayment } = await db.from("payments").select("id").eq("reference_id", checkout.entity_id).eq("payment_type", "mentor_booking").maybeSingle();
    let paymentId = existingPayment?.id;
    if (existingPayment) {
      const { error } = await db.from("payments").update({
        status: terminal,
        gateway: input.provider,
        gateway_transaction_id: input.transactionId,
        paid_at: input.status === "successful" ? now.toISOString() : null,
        failed_at: input.status === "successful" ? null : now.toISOString(),
        commission_amount: commissionAmount,
        payout_status: input.status === "successful" ? "pending" : "not_applicable",
        payout_amount: mentorPayable,
      }).eq("id", existingPayment.id);
      if (error) throw error;
    } else {
      const { data: created, error } = await db.from("payments").insert({
        user_id: checkout.user_id,
        payment_type: "mentor_booking",
        reference_id: checkout.entity_id,
        amount: checkout.amount,
        currency: checkout.currency,
        status: terminal,
        gateway: input.provider,
        gateway_transaction_id: input.transactionId,
        paid_at: input.status === "successful" ? now.toISOString() : null,
        failed_at: input.status === "successful" ? null : now.toISOString(),
        commission_amount: commissionAmount,
        payout_status: input.status === "successful" ? "pending" : "not_applicable",
        payout_amount: mentorPayable,
        metadata: { checkout_session_id: checkout.id, commission_rate: commissionRate, mentor_id: booking?.mentor_id },
      }).select("id").single();
      if (error) throw error;
      paymentId = created.id;
    }

    const bookingUpdate = input.status === "successful"
      ? { payment_status: "success", status: "confirmed", ...(paymentId ? { payment_id: paymentId } : {}) }
      : { payment_status: "failed", status: "cancelled" };
    const { error: bookingError } = await db.from("mentor_bookings").update(bookingUpdate).eq("id", checkout.entity_id);
    if (bookingError) throw bookingError;

    const { error: checkoutUpdateError } = await db.from("payment_checkout_sessions").update({ status: input.status, completed_at: now.toISOString(), updated_at: now.toISOString() }).eq("id", checkout.id);
    if (checkoutUpdateError) throw checkoutUpdateError;

    const auditPayload = { actor_user_id: null, action: input.status === "successful" ? "PAYMENT_VERIFIED" : "PAYMENT_FAILED", entity_type: "mentor_booking", entity_id: checkout.entity_id, metadata: { provider: input.provider, checkout_session_id: checkout.id, payment_id: paymentId, commission_amount: commissionAmount } };
    const { error: auditError } = await db.from("audit_logs").insert(auditPayload);
    if (auditError) throw auditError;
    return { checkoutId: checkout.id, duplicate: false, status: input.status, subscriptionId: null };
  }

  if (checkout.entity_type === "event_registration") {
    const { data: existingPayment } = await db.from("payments").select("id").eq("reference_id", checkout.entity_id).eq("payment_type", "event_ticket").maybeSingle();
    let paymentId = existingPayment?.id;
    if (existingPayment) {
      const { error } = await db.from("payments").update({
        status: terminal,
        gateway: input.provider,
        gateway_transaction_id: input.transactionId,
        paid_at: input.status === "successful" ? now.toISOString() : null,
        failed_at: input.status === "successful" ? null : now.toISOString(),
      }).eq("id", existingPayment.id);
      if (error) throw error;
    } else {
      const { data: created, error } = await db.from("payments").insert({
        user_id: checkout.user_id,
        payment_type: "event_ticket",
        reference_id: checkout.entity_id,
        amount: checkout.amount,
        currency: checkout.currency,
        status: terminal,
        gateway: input.provider,
        gateway_transaction_id: input.transactionId,
        paid_at: input.status === "successful" ? now.toISOString() : null,
        failed_at: input.status === "successful" ? null : now.toISOString(),
        metadata: { checkout_session_id: checkout.id },
      }).select("id").single();
      if (error) throw error;
      paymentId = created.id;
    }

    const regUpdate = input.status === "successful"
      ? { payment_status: "success", status: "confirmed", ...(paymentId ? { payment_id: paymentId } : {}) }
      : { payment_status: "failed", status: "cancelled" };
    const { error: regError } = await db.from("event_registrations").update(regUpdate).eq("id", checkout.entity_id);
    if (regError) throw regError;

    // Upon verified settlement, authoritatively issue digital QR tickets and notify user
    if (input.status === "successful") {
      try {
        const { generateTicketsForRegistration } = await import("./events-service");
        const tickets = await generateTicketsForRegistration(checkout.entity_id);

        const { data: regInfo } = await db
          .from("event_registrations")
          .select("id, registration_number, events(id, title, start_date, location)")
          .eq("id", checkout.entity_id)
          .maybeSingle();

        const { error: notifErr } = await db.from("notifications").insert({
          recipient_id: checkout.user_id,
          title: `Payment Verified & Tickets Issued: ${regInfo?.events?.title || "Event"}`,
          message: `Your payment of NPR ${checkout.amount} was verified. Your digital passes (${tickets.length || 1}) are ready!`,
          type: "success",
          category: "event",
          channel: "dashboard",
          status: "queued",
          entity_type: "event_registration",
          entity_id: checkout.entity_id,
          action_url: `/events/${regInfo?.events?.id || ""}`,
          metadata: { payment_id: paymentId, registration_number: regInfo?.registration_number },
        });
        if (notifErr) console.error("Settlement notification error:", notifErr);
      } catch (ticketError) {
        console.error("Ticket issuance on settlement encountered an error:", ticketError);
      }
    }

    const { error: checkoutUpdateError } = await db.from("payment_checkout_sessions").update({ status: input.status, completed_at: now.toISOString(), updated_at: now.toISOString() }).eq("id", checkout.id);
    if (checkoutUpdateError) throw checkoutUpdateError;

    const auditPayload = { actor_user_id: null, action: input.status === "successful" ? "EVENT_TICKET_PAYMENT_VERIFIED" : "EVENT_TICKET_PAYMENT_FAILED", entity_type: "event_registration", entity_id: checkout.entity_id, metadata: { provider: input.provider, checkout_session_id: checkout.id, payment_id: paymentId } };
    const { error: auditError } = await db.from("audit_logs").insert(auditPayload);
    if (auditError) throw auditError;
    return { checkoutId: checkout.id, duplicate: false, status: input.status, subscriptionId: null };
  }

  const { data: pkg, error: packageError } = await db.from("packages").select("id,price,currency,billing_interval,duration_days,module_scope,features").eq("id", checkout.package_id).maybeSingle();
  if (packageError || !pkg || Number(pkg.price) !== Number(checkout.amount)) throw new Error("Subscription package does not match this payment session.");
  const paymentPayload = {
    user_id: checkout.user_id, payment_type: "subscription", reference_id: checkout.package_id,
    amount: checkout.amount, currency: checkout.currency, status: terminal, gateway: input.provider,
    gateway_transaction_id: input.transactionId, paid_at: input.status === "successful" ? now.toISOString() : null,
    failed_at: input.status === "successful" ? null : now.toISOString(), metadata: { checkout_session_id: checkout.id },
  };
  const { data: payment, error: paymentError } = await db.from("payments").insert(paymentPayload).select("id").single();
  if (paymentError) throw paymentError;
  let subscriptionId: string | null = null;
  if (input.status === "successful") {
    const { data: existing } = await db.from("subscriptions").select("id,expiry_date").eq("user_id", checkout.user_id).eq("entity_type", checkout.entity_type).is("entity_id", checkout.entity_id).in("status", ["trialing", "active"]).is("deleted_at", null).maybeSingle();
    const base = existing?.expiry_date && new Date(existing.expiry_date).getTime() > now.getTime() ? new Date(existing.expiry_date).getTime() : now.getTime();
    const expiry = new Date(base + durationDays(pkg) * 86_400_000).toISOString();
    const payload = { package_id: checkout.package_id, start_date: now.toISOString(), expiry_date: expiry, status: "active", payment_status: "success", metadata: { payment_id: payment.id, provider_reference: input.reference } };
    const result = existing ? await db.from("subscriptions").update(payload).eq("id", existing.id).select("id").single() : await db.from("subscriptions").insert({ user_id: checkout.user_id, entity_type: checkout.entity_type, entity_id: checkout.entity_id, ...payload }).select("id").single();
    if (result.error) throw result.error;
    subscriptionId = result.data.id;
    const { error: paymentSubscriptionError } = await db.from("payments").update({ subscription_id: subscriptionId }).eq("id", payment.id);
    if (paymentSubscriptionError) throw paymentSubscriptionError;
    const moduleKey = moduleForEntity(checkout.entity_type);
    if (moduleKey) {
      const entitlementPayload = {
        user_id: checkout.user_id, module_key: moduleKey, entity_type: checkout.entity_type, entity_id: checkout.entity_id,
        package_id: checkout.package_id, source: "ESEWA_PURCHASE", status: "active", start_at: now.toISOString(), expires_at: expiry,
        features: pkg.features || {}, payment_id: payment.id, reason: "Verified eSewa purchase",
      };
      const { error: entitlementError } = await db.from("module_entitlements").insert(entitlementPayload);
      if (entitlementError) throw entitlementError;
    }
  }
  const { error: checkoutUpdateError } = await db.from("payment_checkout_sessions").update({ status: input.status, completed_at: now.toISOString(), updated_at: now.toISOString() }).eq("id", checkout.id);
  if (checkoutUpdateError) throw checkoutUpdateError;
  const auditPayload = { actor_user_id: null, action: input.status === "successful" ? "PAYMENT_VERIFIED" : "PAYMENT_FAILED", entity_type: "payment", entity_id: payment.id, metadata: { provider: input.provider, checkout_session_id: checkout.id, subscription_id: subscriptionId } };
  const { error: auditError } = await db.from("audit_logs").insert(auditPayload);
  if (auditError) throw auditError;
  return { checkoutId: checkout.id, duplicate: false, status: input.status, subscriptionId };
}
