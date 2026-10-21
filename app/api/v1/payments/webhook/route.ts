import { loadProviderSecret } from "@/lib/server/provider-config-service";
import { PaymentWebhookError, verifyHmacPaymentWebhook } from "@/lib/server/payment-webhook";
import { getAdminClient } from "@/lib/server/supabase";
import { jsonApiResponse } from "@/lib/server/api-response";
import {getBackendMode} from '@/lib/server/backend-mode';

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const durationDays = (pkg: any) => Number(pkg.duration_days) || ({ month: 30, quarter: 90, year: 365, one_time: 30 }[pkg.billing_interval] ?? 30);

export async function POST(request: Request) {
  if(getBackendMode()!=='legacy')return new Response(null,{status:404});
  const requestId = crypto.randomUUID();
  try {
    const configured = await loadProviderSecret("payment");
    if (!configured || configured.providerName !== "hmac-json") throw new PaymentWebhookError("Payment provider is not configured.");
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > 64 * 1024) throw new PaymentWebhookError("Payment event is too large.");
    const event = verifyHmacPaymentWebhook(raw, request.headers.get("x-merotalent-signature"), configured.secret);
    const db = getAdminClient() as any;
    const { error: claimError } = await db.from("payment_webhook_events").insert({ provider_name: configured.providerName, event_id: event.eventId });
    if (claimError?.code === "23505") return jsonApiResponse({ data: { accepted: true, duplicate: true }, error: null, meta: { requestId } });
    if (claimError) throw claimError;
    const { data: checkout, error: checkoutError } = await db.from("payment_checkout_sessions").select("*").eq("provider_reference", event.reference).maybeSingle();
    if (checkoutError || !checkout) throw new PaymentWebhookError("Payment session was not found.");
    if (Number(checkout.amount) !== event.amount || checkout.status !== "initiated") throw new PaymentWebhookError("Payment event does not match its pending session.");
    const { data: pkg, error: packageError } = await db.from("packages").select("id,price,currency,billing_interval,duration_days").eq("id", checkout.package_id).maybeSingle();
    if (packageError || !pkg) throw new PaymentWebhookError("Subscription package was not found.");
    const now = new Date(); const terminal = event.status === "successful" ? "success" : event.status;
    const { data: payment, error: paymentError } = await db.from("payments").insert({ user_id: checkout.user_id, payment_type: "subscription", reference_id: checkout.package_id, amount: checkout.amount, currency: checkout.currency, status: terminal, gateway: configured.providerName, gateway_transaction_id: event.transactionId, paid_at: event.status === "successful" ? now.toISOString() : null, failed_at: event.status === "failed" ? now.toISOString() : null, metadata: { checkout_session_id: checkout.id } }).select("id").single();
    if (paymentError) throw paymentError;
    let subscriptionId: string | null = null;
    if (event.status === "successful") {
      const { data: activeSubscription, error: activeError } = await db.from("subscriptions").select("id,expiry_date").eq("user_id", checkout.user_id).eq("entity_type", checkout.entity_type).is("entity_id", checkout.entity_id).in("status", ["trialing", "active"]).is("deleted_at", null).maybeSingle();
      if (activeError) throw activeError;
      const base = activeSubscription?.expiry_date && new Date(activeSubscription.expiry_date).getTime() > now.getTime() ? new Date(activeSubscription.expiry_date).getTime() : now.getTime();
      const expiry = new Date(base + durationDays(pkg) * 86_400_000).toISOString();
      const subscriptionPayload = { package_id: checkout.package_id, start_date: now.toISOString(), expiry_date: expiry, status: "active", payment_status: "success", metadata: { payment_id: payment.id, provider_reference: event.reference } };
      const subscriptionResult = activeSubscription
        ? await db.from("subscriptions").update(subscriptionPayload).eq("id", activeSubscription.id).select("id").single()
        : await db.from("subscriptions").insert({ user_id: checkout.user_id, entity_type: checkout.entity_type, entity_id: checkout.entity_id, ...subscriptionPayload }).select("id").single();
      if (subscriptionResult.error) throw subscriptionResult.error;
      subscriptionId = subscriptionResult.data.id;
      await db.from("payments").update({ subscription_id: subscriptionId }).eq("id", payment.id);
    }
    await db.from("payment_checkout_sessions").update({ status: event.status, completed_at: now.toISOString(), updated_at: now.toISOString() }).eq("id", checkout.id);
    await db.from("payment_webhook_events").update({ processed_at: now.toISOString(), outcome: event.status }).eq("provider_name", configured.providerName).eq("event_id", event.eventId);
    await db.from("audit_logs").insert({ actor_user_id: null, action: "payment_webhook_processed", entity_type: "payment", entity_id: payment.id, metadata: { provider: configured.providerName, status: event.status, checkout_session_id: checkout.id, subscription_id: subscriptionId } });
    return jsonApiResponse({ data: { accepted: true }, error: null, meta: { requestId } });
  } catch (error) {
    const message = error instanceof PaymentWebhookError ? error.message : "Payment webhook processing failed.";
    return jsonApiResponse({ data: null, error: { code: "PAYMENT_WEBHOOK_REJECTED", message }, meta: { requestId } }, error instanceof PaymentWebhookError ? 400 : 500);
  }
}
