import { NextResponse } from "next/server";
import { EsewaV2PaymentProvider, getPaymentProvider } from "@/lib/server/payment-provider";
import { loadProviderSecret } from "@/lib/server/provider-config-service";
import { settleVerifiedCheckout } from "@/lib/server/esewa-settlement";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const redirect = (request: Request, status: string) => {
  const destination = new URL("/dashboard/subscription", request.url);
  destination.searchParams.set("payment", status);
  return NextResponse.redirect(destination, 303);
};

const decodePayload = (data: string) => {
  const text = Buffer.from(data, "base64").toString("utf8");
  const value = JSON.parse(text);
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid eSewa response.");
  return value as Record<string, unknown>;
};

async function handle(request: Request) {
  const configured = await loadProviderSecret("payment");
  if (!configured || configured.providerName !== "esewa") return redirect(request, "unavailable");
  const input = request.method === "POST" ? Object.fromEntries((await request.formData()).entries()) : Object.fromEntries(new URL(request.url).searchParams.entries());
  if (input.state === "failed") return redirect(request, "failed");
  const encoded = typeof input.data === "string" ? input.data : "";
  if (!encoded || encoded.length > 16_384) return redirect(request, "pending");
  try {
    const payload = decodePayload(encoded);
    const provider = getPaymentProvider({ providerName: configured.providerName, secret: configured.secret, publicConfig: configured.publicConfig });
    if (!(provider instanceof EsewaV2PaymentProvider) || !provider.verifyRedirectPayload(payload)) return redirect(request, "unverified");
    const reference = typeof payload.transaction_uuid === "string" ? payload.transaction_uuid : "";
    const amount = Number(payload.total_amount);
    if (!reference || !Number.isFinite(amount)) return redirect(request, "unverified");
    const verified = await provider.lookupStatus({ reference, amount });
    if (verified.status !== "pending") await settleVerifiedCheckout({ provider: "esewa", reference, status: verified.status, transactionId: verified.transactionId });
    return redirect(request, verified.status);
  } catch {
    return redirect(request, "pending");
  }
}

export const GET = handle;
export const POST = handle;
