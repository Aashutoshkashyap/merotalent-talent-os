import { describe, expect, it } from "vitest";
import { displayedEventPrice } from "@/lib/events/price-display";

describe("event ticket price labels", () => {
  it("does not advertise free admission when active tickets cost NPR 10", () => {
    expect(displayedEventPrice({ ticket_price: 0, ticket_types: [{ price: 10, currency: "NPR", is_active: true }] }))
      .toMatchObject({ isFree: false, amount: 10, label: "From NPR 10" });
  });
  it("uses the directory's server-derived starting tier price", () => {
    expect(displayedEventPrice({ ticket_price: 0, ticket_pricing: { price: "10", currency: "NPR" } }).label).toBe("From NPR 10");
  });
  it("ignores inactive tiers and preserves genuinely free tickets", () => {
    expect(displayedEventPrice({ ticket_price: 100, ticket_types: [{ price: 0, is_active: false }, { price: 10 }] }).isFree).toBe(false);
    expect(displayedEventPrice({ ticket_price: 100, ticket_types: [{ price: 0 }] }).isFree).toBe(true);
  });
  it("preserves base prices for events with no active tiers", () => {
    expect(displayedEventPrice({ ticket_price: 0 }).label).toBe("Free");
    expect(displayedEventPrice({ ticket_price: 20, currency: "NPR" }).label).toBe("NPR 20");
  });
  it("does not compare different currencies as if they were equivalent", () => {
    expect(displayedEventPrice({ ticket_types: [{ price: 10, currency: "NPR" }, { price: 1, currency: "USD" }] }))
      .toMatchObject({ isFree: false, label: "See ticket prices" });
  });
});
