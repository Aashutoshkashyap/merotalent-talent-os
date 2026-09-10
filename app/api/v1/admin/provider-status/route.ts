import { jsonApiResponse } from "@/lib/server/api-response";
import { authenticateAdminRequest } from "@/lib/server/auth";
import { getPaymentProvider } from "@/lib/server/payment-provider";
import { getTransactionalEmailProvider } from "@/lib/server/email-provider";
import { getProviderStatus } from "@/lib/server/provider-config-service";
import { adminApiErrorResponse } from "@/lib/admin/admin-route-utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Provider health is deliberately an admin-only, secret-free snapshot. It
 * reports whether a concrete server-side adapter exists; it never serializes
 * a provider key, callback secret, or environment value to the browser.
 */
export async function GET(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    await authenticateAdminRequest(request);
  } catch (error) {
    return adminApiErrorResponse(error, requestId, "authenticate provider status");
  }

  const payment = getPaymentProvider();
  const email = getTransactionalEmailProvider();
  const ai = await getProviderStatus("ai");
  const paymentConfigured = payment.name !== "unconfigured";
  const emailConfigured = email.name !== "unconfigured";

  return jsonApiResponse({
    data: {
      payment: {
        status: paymentConfigured ? "configured" : "not_configured",
        deliveryAvailable: paymentConfigured,
      },
      email: {
        status: emailConfigured ? "configured" : "not_configured",
        deliveryAvailable: emailConfigured,
      },
      ai: {
        status: ai.enabled && ai.configured ? "configured" : "not_configured",
        deliveryAvailable: ai.enabled && ai.configured,
      },
    },
    error: null,
    meta: { requestId },
  }, 200);
}
