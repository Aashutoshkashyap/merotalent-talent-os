import { describe, expect, it } from "vitest";

import { isValidCronAuthorization } from "@/lib/server/cron-auth";

describe("isValidCronAuthorization", () => {
  it("accepts only the exact Vercel bearer credential", () => {
    expect(isValidCronAuthorization("Bearer test-secret", "test-secret")).toBe(true);
    expect(isValidCronAuthorization("Bearer wrong-secret", "test-secret")).toBe(false);
    expect(isValidCronAuthorization("bearer test-secret", "test-secret")).toBe(false);
  });

  it("fails closed when the header or configured secret is absent", () => {
    expect(isValidCronAuthorization(null, "test-secret")).toBe(false);
    expect(isValidCronAuthorization("Bearer test-secret", undefined)).toBe(false);
    expect(isValidCronAuthorization("Bearer ", "")).toBe(false);
  });
});
