import { describe, expect, it } from "vitest";

import { getAuthInviteRedirectUrl } from "./admin-auth-user-route-utils";

describe("administrator invitation redirect configuration", () => {
  it("accepts only a fixed production HTTPS reset-password URL", () => {
    expect(
      getAuthInviteRedirectUrl({
        AUTH_INVITE_REDIRECT_URL:
          "https://merotalent.vercel.app/reset-password",
      }),
    ).toBe("https://merotalent.vercel.app/reset-password");
  });

  it.each([
    undefined,
    "",
    "http://merotalent.vercel.app/reset-password",
    "https://localhost/reset-password",
    "https://127.0.0.1/reset-password",
    "https://merotalent.vercel.app:8443/reset-password",
    "https://user:password@merotalent.vercel.app/reset-password",
    "https://merotalent.vercel.app/",
    "https://merotalent.vercel.app/reset-password/",
    "https://merotalent.vercel.app/reset-password?next=https://evil.example",
    "https://merotalent.vercel.app/reset-password#token",
  ])("rejects a missing or unsafe redirect: %s", (value) => {
    expect(() =>
      getAuthInviteRedirectUrl({ AUTH_INVITE_REDIRECT_URL: value }),
    ).toThrowError(/invitation redirect URL/i);
  });
});
