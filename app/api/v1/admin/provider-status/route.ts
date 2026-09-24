import { jsonApiResponse } from "@/lib/server/api-response";
import { authenticateAdminRequest } from "@/lib/server/auth";
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

  const [payment, email, ai] = await Promise.all([
    getProviderStatus("payment"),
    getProviderStatus("email"),
    getProviderStatus("ai"),
  ]);
  // Provider Center needs to remain readable when the server encryption key is
  // absent. Report stored ciphertext separately from runtime delivery readiness;
  // do not decrypt or serialize a provider credential in this endpoint.
  const paymentConfigured = payment.providerName === "esewa" && payment.enabled && payment.configured;
  const emailConfigured = email.providerName === "resend" && email.enabled && email.configured;
  const aiConfigured = ai.enabled && ai.configured;

  return jsonApiResponse({
    data: {
      payment: {
        status: paymentConfigured ? "configured" : "not_configured",
        deliveryAvailable: paymentConfigured && payment.secretStorageReady,
      },
      email: {
        status: emailConfigured ? "configured" : "not_configured",
        deliveryAvailable: emailConfigured && email.secretStorageReady,
      },
      ai: {
        status: aiConfigured ? "configured" : "not_configured",
        deliveryAvailable: aiConfigured && ai.secretStorageReady,
      },
    },
    error: null,
    meta: { requestId },
  }, 200);
}
