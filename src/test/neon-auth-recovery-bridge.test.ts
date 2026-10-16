import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/neon/neon-config", () => ({
  getNeonAuthBaseUrl: () => "https://staging.neonauth.example/auth",
}));
import { POST } from "../../app/api/v1/neon-staging/auth/[...action]/route";

const oldMode = process.env.MEROTALENT_BACKEND_MODE;
const oldRecoveryMode = process.env.NEON_STAGING_IDENTITY_LINK_MODE;
const endpoint = "https://app.test/api/v1/neon-staging/auth/";
const send = (action: string, body: object, origin = "https://app.test") =>
  POST(new Request(endpoint + action, { method: "POST", headers: { origin,
    "Content-Type": "application/json" }, body: JSON.stringify(body) }),
  { params: Promise.resolve({ action: [action] }) });

beforeEach(() => { process.env.MEROTALENT_BACKEND_MODE = "neon-staging"; });
afterEach(() => {
  if (oldMode === undefined) delete process.env.MEROTALENT_BACKEND_MODE;
  else process.env.MEROTALENT_BACKEND_MODE = oldMode;
  if (oldRecoveryMode === undefined) delete process.env.NEON_STAGING_IDENTITY_LINK_MODE;
  else process.env.NEON_STAGING_IDENTITY_LINK_MODE = oldRecoveryMode;
  vi.unstubAllGlobals();
});

describe("Neon Managed Auth recovery bridge", () => {
  it.each(["http://localhost:3210", "https://app.test"])("preserves browser-valid secure session prefixes at %s", async origin => {
    const headers = new Headers();
    headers.append("set-cookie", "__Secure-neon-auth.session_token=opaque; Path=/; HttpOnly; Secure; SameSite=Lax; Domain=provider.test");
    headers.append("set-cookie", "__Host-neon-auth.session_data=opaque; Path=/; HttpOnly; Secure; SameSite=Lax");
    headers.append("set-cookie", "unrelated=value; Path=/");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { headers })));
    const response = await POST(new Request(`${origin}/api/v1/neon-staging/auth/sign-in/email`, {
      method: "POST", headers: { origin, "content-type": "application/json" },
      body: JSON.stringify({ email: "test@example.test", password: "test-password" }),
    }), { params: Promise.resolve({ action: ["sign-in", "email"] }) });
    const cookies = response.headers.getSetCookie();
    expect(cookies).toHaveLength(2);
    for (const cookie of cookies) {
      expect(cookie).toMatch(/; Secure(?:;|$)/);
      expect(cookie).toContain("HttpOnly");
      expect(cookie).not.toContain("Domain=");
    }
  });

  it("uses a fixed same-origin reset URL and never trusts a supplied redirect", async () => {
    const upstream = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: true }), { status: 200 }));
    vi.stubGlobal("fetch", upstream);
    expect((await send("request-password-reset", { email: "User@Example.test", redirectTo: "https://evil.test" })).status).toBe(400);
    expect((await send("request-password-reset", { email: "User@Example.test" })).status).toBe(200);
    expect(upstream).toHaveBeenCalledOnce();
    const request = upstream.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(request.body as string)).toEqual({ email: "user@example.test",
      redirectTo: "https://app.test/reset-password" });
    expect(upstream.mock.calls[0][0]).toBe("https://staging.neonauth.example/auth/request-password-reset");
  });

  it("rejects cross-origin, malformed and extra-field token resets without calling Auth", async () => {
    const upstream = vi.fn();
    vi.stubGlobal("fetch", upstream);
    expect((await send("reset-password", { token: "secret", newPassword: "validpass123" }, "https://evil.test")).status).toBe(403);
    expect((await send("reset-password", { token: "secret", newPassword: "validpass123" }, "not-a-valid-origin")).status).toBe(403);
    expect((await send("reset-password", { token: "secret", newPassword: "short" })).status).toBe(400);
    expect((await send("reset-password", { token: "secret", newPassword: "validpass123", userId: "other" })).status).toBe(400);
    expect(upstream).not.toHaveBeenCalled();
  });

  it("passes a well-formed token reset to Managed Auth and preserves provider failure", async () => {
    const upstream = vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: "INVALID_TOKEN" }), { status: 400 }));
    vi.stubGlobal("fetch", upstream);
    const response = await send("reset-password", { token: "one-use-token", newPassword: "validpass123" });
    expect(response.status).toBe(400);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(upstream).toHaveBeenCalledOnce();
  });

  it("creates only a standard recovery sign-in with a fixed callback and rejects role or ownership fields", async () => {
    process.env.NEON_STAGING_IDENTITY_LINK_MODE = "verified-source";
    const upstream = vi.fn().mockResolvedValue(new Response(JSON.stringify({ user: { emailVerified: false } }), { status: 200 }));
    vi.stubGlobal("fetch", upstream);
    expect((await send("sign-up/email", { email: "Student@Example.test", name: "Student One", password: "newaccountpass123", role: "admin" })).status).toBe(400);
    expect((await send("sign-up/email", { email: "Student@Example.test", name: "Student One", password: "newaccountpass123" })).status).toBe(200);
    expect(upstream).toHaveBeenCalledOnce();
    expect(JSON.parse(upstream.mock.calls[0][1].body)).toEqual({ email: "student@example.test", name: "Student One",
      password: "newaccountpass123", callbackURL: "https://app.test/account-recovery" });
  });

  it("keeps signup and email proof disabled outside explicitly enabled staging recovery", async () => {
    delete process.env.NEON_STAGING_IDENTITY_LINK_MODE;
    const upstream = vi.fn(); vi.stubGlobal("fetch", upstream);
    expect((await send("sign-up/email", { email: "student@example.test", name: "Student One", password: "validpass123" })).status).toBe(503);
    expect((await send("email-otp/verify-email", { email: "student@example.test", otp: "123456" })).status).toBe(503);
    expect(upstream).not.toHaveBeenCalled();
  });

  it("forwards only supported verification fields and never fabricates verification", async () => {
    process.env.NEON_STAGING_IDENTITY_LINK_MODE = "verified-source";
    const upstream = vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: "INVALID_OTP" }), { status: 400 }));
    vi.stubGlobal("fetch", upstream);
    expect((await send("email-otp/verify-email", { email: "student@example.test", otp: "123456", emailVerified: true })).status).toBe(400);
    expect((await send("email-otp/verify-email", { email: "student@example.test", otp: "123456" })).status).toBe(400);
    expect(upstream).toHaveBeenCalledOnce();
    expect(upstream.mock.calls[0][0]).toBe("https://staging.neonauth.example/auth/email-otp/verify-email");
  });
});
