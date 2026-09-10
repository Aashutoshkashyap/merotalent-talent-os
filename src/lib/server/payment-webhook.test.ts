import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyHmacPaymentWebhook } from "./payment-webhook";

describe("payment webhook verification", () => {
  const secret = "webhook-secret";
  const body = JSON.stringify({ eventId: "evt-1", reference: "ref-1", status: "successful", amount: 1499, transactionId: "tx-1" });
  const signature = createHmac("sha256", secret).update(body).digest("hex");
  it("accepts a signed trusted event", () => expect(verifyHmacPaymentWebhook(body, signature, secret).reference).toBe("ref-1"));
  it("rejects a forged signature", () => expect(() => verifyHmacPaymentWebhook(body, "00", secret)).toThrow(/signature/i));
});
