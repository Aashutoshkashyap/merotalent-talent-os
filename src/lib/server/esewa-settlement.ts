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
  const { data: pkg, error: packageError } = await db.from("packages").select("id,price,currency,billing_interval,duration_days,module_scope,features").eq("id", checkout.package_id).maybeSingle();
  if (packageError || !pkg || Number(pkg.price) !== Number(checkout.amount)) throw new Error("Subscription package does not match this payment session.");
  const terminal = input.status === "successful" ? "success" : "failed";
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
