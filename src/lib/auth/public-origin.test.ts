import { afterEach, describe, expect, it, vi } from "vitest";

import { getAuthCallbackUrl, getPasswordResetUrl, getPublicOrigin } from "./public-origin";

describe("canonical public auth origin", () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    vi.unstubAllGlobals();
  });

  it("uses the configured production origin", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://www.merotalent.com";
    expect(getAuthCallbackUrl()).toBe("https://www.merotalent.com/auth/callback");
    expect(getPasswordResetUrl()).toBe("https://www.merotalent.com/reset-password");
  });

  it("does not inherit the Vercel alias in production", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    vi.stubGlobal("window", { location: { hostname: "merotalent.vercel.app", origin: "https://merotalent.vercel.app" } });
    expect(getPublicOrigin()).toBe("https://www.merotalent.com");
  });

  it("keeps localhost callbacks local during development", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    vi.stubGlobal("window", { location: { hostname: "localhost", origin: "http://localhost:3100" } });
    expect(getAuthCallbackUrl()).toBe("http://localhost:3100/auth/callback");
  });
});
