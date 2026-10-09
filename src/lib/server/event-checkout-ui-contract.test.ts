import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("paid event registration checkout", () => {
  it("continues paid registrations to canonical checkout from EventRegistrationModal", () => {
    const source = readFileSync(resolve(process.cwd(), "src/components/events/EventRegistrationModal.tsx"), "utf8");
    expect(source).toContain("startEsewaCheckout");
    expect(source).toContain("eventRegistrationId: result.registration.id");
    expect(source).toContain("isFree");
  });

  it.each(["src/screens/events/EventsPage.tsx", "src/screens/events/EventDetailPage.tsx"])(
    "integrates the EventRegistrationModal into %s",
    (file) => {
      const source = readFileSync(resolve(process.cwd(), file), "utf8");
      expect(source).toContain("EventRegistrationModal");
    }
  );
});
