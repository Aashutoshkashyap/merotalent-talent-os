import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) =>
  readFileSync(resolve(process.cwd(), file), "utf8");

describe("Phase 5 payment-administration boundary", () => {
  it("does not let the browser create a successful payment or paid subscription", () => {
    const payments = read("src/screens/admin/AdminPayments.tsx");
    const subscriptions = read("src/screens/admin/AdminSubscriptions.tsx");

    expect(payments).not.toContain('status: "success"');
    expect(subscriptions).not.toContain('payment_status: "success"');
    expect(subscriptions).not.toContain("Grant paid plan");
  });

  it("keeps provider verification responsible for a terminal payment result", () => {
    const provider = read("src/lib/server/payment-provider.ts");

    expect(provider).toContain("verifyCallback");
    expect(provider).toContain('status: "failed"');
    expect(provider).toContain("A payment provider has not been configured.");
  });
});
