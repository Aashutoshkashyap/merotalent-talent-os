import { jsonApiResponse } from "@/lib/server/api-response";
import { authenticateAdminRequest } from "@/lib/server/auth";
import { getProviderStatus } from "@/lib/server/provider-config-service";
import { adminApiErrorResponse } from "@/lib/admin/admin-route-utils";
import { getTransactionalEmailProvider } from "@/lib/server/email-provider";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ProviderHealthStatus =
  | "not_configured"
  | "configured_disabled"
  | "configured_active"
  | "storage_unavailable";

const providerHealth = (
  provider: Awaited<ReturnType<typeof getProviderStatus>>,
  expectedProviderName: string,
  environmentConfigured = false,
): {
  status: ProviderHealthStatus;
  credentialConfigured: boolean;
  integrationEnabled: boolean;
  secretStorageReady: boolean;
  deliveryAvailable: boolean;
} => {
  const credentialConfigured = provider.configured || environmentConfigured;
  const integrationEnabled = provider.enabled || environmentConfigured;
  const secretStorageReady = provider.secretStorageReady || environmentConfigured;
  const adapterSelected = provider.providerName === expectedProviderName || environmentConfigured;

  if (!secretStorageReady) {
    return {
      status: "storage_unavailable",
      credentialConfigured,
      integrationEnabled,
      secretStorageReady,
      deliveryAvailable: false,
    };
  }
  if (!credentialConfigured) {
    return {
      status: "not_configured",
      credentialConfigured: false,
      integrationEnabled,
      secretStorageReady,
      deliveryAvailable: false,
    };
  }
  if (!integrationEnabled) {
    return {
      status: "configured_disabled",
      credentialConfigured: true,
      integrationEnabled: false,
      secretStorageReady,
      deliveryAvailable: false,
    };
  }
  return {
    status: "configured_active",
    credentialConfigured: true,
    integrationEnabled: true,
    secretStorageReady,
    // A selected adapter is required in addition to an enabled configuration.
    deliveryAvailable: adapterSelected,
  };
};

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
  return jsonApiResponse({
    data: {
      payment: providerHealth(payment, "esewa"),
      email: providerHealth(email, "resend", getTransactionalEmailProvider().name === "resend"),
      ai: providerHealth(ai, "openai-compatible"),
    },
    error: null,
    meta: { requestId },
  }, 200);
}
