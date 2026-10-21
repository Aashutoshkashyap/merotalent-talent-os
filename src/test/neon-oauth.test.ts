import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const sdk = vi.hoisted(() => ({ start: vi.fn(), finish: vi.fn() }));
vi.mock("@neondatabase/auth/server", () => ({ handleAuthProxyRequest: sdk.start, processAuthMiddleware: sdk.finish }));
vi.mock("@/lib/neon/neon-config", () => ({ getNeonAuthBaseUrl: () => "https://approved.neonauth.example/auth" }));
import { startNeonGoogleOAuth, finishNeonGoogleOAuth } from "@/lib/server/neon-oauth";
const origin = "https://www.merotalent.com";
const start = (body: object, from = origin) => new Request(`${origin}/api/v1/neon-staging/auth/sign-in/social`, {
  method: "POST", headers: { origin: from, "content-type": "application/json" }, body: JSON.stringify(body) });
beforeEach(() => {
  vi.stubEnv("NEON_GOOGLE_OAUTH_ENABLED", "true");
  vi.stubEnv("NEON_AUTH_COOKIE_SECRET", "unit-test-only-cookie-secret-long-enough");
  sdk.start.mockResolvedValue(Response.json({ url: "https://accounts.google.com/o/oauth2/v2/auth" }));
});
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
describe("Managed OAuth transport retains application authorization boundaries", () => {
  it("accepts only Google with a fixed same-origin callback and never a requested role or redirect", async () => {
    for (const body of [{ provider: "google", role: "admin" }, { provider: "google", callbackURL: "https://evil.test" },
      { provider: "apple" }, { provider: "google", userId: "forged" }]) {
      expect((await startNeonGoogleOAuth(start(body))).status).toBe(400);
    }
    expect(sdk.start).not.toHaveBeenCalled();
    expect((await startNeonGoogleOAuth(start({ provider: "google" }))).status).toBe(200);
    const passed = sdk.start.mock.calls[0][0];
    expect(passed.baseUrl).toBe("https://approved.neonauth.example/auth");
    expect(JSON.parse(await passed.request.text())).toEqual({ provider: "google", disableRedirect: true,
      callbackURL: `${origin}/auth/neon/callback`, errorCallbackURL: `${origin}/login` });
  });
  it("denies cross-origin requests and missing opt-in or cookie secret before calling Auth", async () => {
    await expect(startNeonGoogleOAuth(start({ provider: "google" }, "https://evil.test"))).rejects.toMatchObject({ code: "CROSS_ORIGIN_WRITE_DENIED" });
    vi.stubEnv("NEON_GOOGLE_OAUTH_ENABLED", "false");
    await expect(startNeonGoogleOAuth(start({ provider: "google" }))).rejects.toThrow("UNAVAILABLE");
    vi.stubEnv("NEON_GOOGLE_OAUTH_ENABLED", "true"); vi.stubEnv("NEON_AUTH_COOKIE_SECRET", "short");
    await expect(startNeonGoogleOAuth(start({ provider: "google" }))).rejects.toThrow("UNAVAILABLE");
    expect(sdk.start).not.toHaveBeenCalled();
  });
  it("accepts the SDK's branch-bound PKCE wrapper but rejects external or cross-branch URLs", async () => {
    sdk.start.mockResolvedValue(Response.json({ url: "https://approved.neonauth.example/auth/oauth-proxy?state=opaque" }));
    expect((await startNeonGoogleOAuth(start({ provider: "google" }))).status).toBe(200);
    for (const url of ["https://evil.test", "https://other.neonauth.example/auth/oauth-proxy", "https://approved.neonauth.example/other", "http://accounts.google.com/"]) {
      sdk.start.mockResolvedValue(Response.json({ url }));
      await expect(startNeonGoogleOAuth(start({ provider: "google" }))).rejects.toThrow("INVALID_OAUTH_DESTINATION");
    }
  });
  it("uses the SDK token exchange and preserves every cleanup/session cookie on its redirect", async () => {
    sdk.finish.mockResolvedValue({ action: "redirect_oauth", redirectUrl: new URL(`${origin}/auth/neon/callback`),
      cookies: ["__Secure-neon-auth.session_token=opaque; Secure; HttpOnly; Path=/", "neon-auth.session_challange=; Max-Age=0; Path=/"] });
    const response = await finishNeonGoogleOAuth(new Request(`${origin}/auth/neon/callback?code=one-use-provider-code`));
    expect(response.status).toBe(303);
    expect(response.headers.getSetCookie()).toHaveLength(2);
    expect(response.headers.get("location")).not.toContain("code=");
    expect(response.headers.get("location")).toBe(`${origin}/auth/callback`);
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(sdk.finish.mock.calls[0][0].skipRoutes).toEqual(["/auth/neon/callback"]);
    sdk.finish.mockResolvedValue({ action: "allow" });
    expect((await finishNeonGoogleOAuth(new Request(`${origin}/auth/neon/callback`))).headers.get("location"))
      .toBe(`${origin}/auth/callback`);
  });
  it("consumes an SDK root callback without forwarding its one-use verifier to the client", async () => {
    sdk.finish.mockResolvedValue({ action: "redirect_oauth", redirectUrl: new URL(origin),
      cookies: ["__Secure-neon-auth.session_token=verified-opaque; Secure; HttpOnly; Path=/"] });
    const result = await finishNeonGoogleOAuth(new Request(`${origin}/?neon_auth_session_verifier=unit-only`));
    expect(result.headers.get("location")).toBe(`${origin}/auth/callback`);
    expect(result.headers.getSetCookie()).toHaveLength(1);
  });
  it("rejects an external or unexpected callback destination even if returned by the adapter", async () => {
    for (const destination of ["https://evil.test/auth/neon/callback", `${origin}/admin`]) {
      sdk.finish.mockResolvedValue({ action: "redirect_oauth", redirectUrl: new URL(destination), cookies: [] });
      expect((await finishNeonGoogleOAuth(new Request(`${origin}/auth/neon/callback?code=opaque`))).status).toBe(400);
    }
  });
});
