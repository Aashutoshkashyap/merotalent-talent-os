import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("paid event registration checkout", () => {
  it.each(["src/screens/events/EventsPage.tsx", "src/screens/events/EventDetailPage.tsx"])("continues paid registrations to canonical checkout from %s", (file) => {
    const source = readFileSync(resolve(process.cwd(), file), "utf8");
    expect(source).toContain("startEsewaCheckout");
    expect(source).toContain("eventRegistrationId: result.id");
    expect(source).toContain('event_type === "paid"');
  });
});
