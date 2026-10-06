import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

describe("mentor booking eSewa payment contracts", () => {
  it("includes mentor_booking settlement handling in esewa-settlement.ts", () => {
    const code = readFileSync(
      resolve(process.cwd(), "src/lib/server/esewa-settlement.ts"),
      "utf8",
    );
    expect(code).toContain('checkout.entity_type === "mentor_booking"');
    expect(code).toContain('payment_type", "mentor_booking"');
    expect(code).toContain('from("mentor_bookings").update');
  });

  it("includes bookingId checkout handling in app/api/v1/payments/checkout/route.ts", () => {
    const code = readFileSync(
      resolve(process.cwd(), "app/api/v1/payments/checkout/route.ts"),
      "utf8",
    );
    expect(code).toContain("value.bookingId");
    expect(code).toContain('entity_type: "mentor_booking"');
    expect(code).toContain('from("mentor_bookings")');
  });

  it("configures eSewa as the single default payment option in BookingDialog", () => {
    const code = readFileSync(
      resolve(process.cwd(), "src/components/mentors/BookingDialog.tsx"),
      "utf8",
    );
    expect(code).toContain('useState("esewa")');
    expect(code).toContain("eSewa Mobile Wallet");
    expect(code).not.toContain("khalti");
    expect(code).toContain('postToCheckout');
  });
});
