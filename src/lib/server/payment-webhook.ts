import { createHmac, timingSafeEqual } from "node:crypto";

export type TrustedPaymentEvent = {
  eventId: string;
  reference: string;
  status: "successful" | "failed" | "cancelled";
  amount: number;
  transactionId: string;
};

export class PaymentWebhookError extends Error {
  constructor(message: string) { super(message); this.name = "PaymentWebhookError"; }
}

export const verifyHmacPaymentWebhook = (rawBody: string, signature: string | null, secret: string): TrustedPaymentEvent => {
  if (!signature) throw new PaymentWebhookError("Missing payment signature.");
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const actual = Buffer.from(signature, "hex"); const expectedBuffer = Buffer.from(expected, "hex");
  if (actual.byteLength !== expectedBuffer.byteLength || !timingSafeEqual(actual, expectedBuffer)) throw new PaymentWebhookError("Invalid payment signature.");
  let payload: unknown;
  try { payload = JSON.parse(rawBody); } catch { throw new PaymentWebhookError("Invalid payment event."); }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new PaymentWebhookError("Invalid payment event.");
  const event = payload as Record<string, unknown>;
  if (typeof event.eventId !== "string" || typeof event.reference !== "string" || typeof event.transactionId !== "string" || !["successful", "failed", "cancelled"].includes(String(event.status)) || !Number.isFinite(event.amount)) throw new PaymentWebhookError("Invalid payment event.");
  return { eventId: event.eventId, reference: event.reference, transactionId: event.transactionId, status: event.status as TrustedPaymentEvent["status"], amount: Number(event.amount) };
};
