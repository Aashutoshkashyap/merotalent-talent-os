import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/neon/neon-config", () => ({ getNeonAuthBaseUrl: () => "https://managed.test/auth" }));
import { managedSessionVerifier } from "@/lib/server/neon-session";

const id = "10000000-0000-4000-8000-000000000001";
const request = new Request("https://app.test/", { headers: { cookie: "better-auth.session_token=session" } });
afterEach(() => vi.unstubAllGlobals());

describe("trusted Managed Auth session validation", () => {
  it("rejects malformed, expired and mismatched sessions before any application identity lookup", async () => {
    const upstream = vi.fn(); vi.stubGlobal("fetch", upstream);
    for (const session of [
      { userId: id, expiresAt: "not-a-date" },
      { userId: id, expiresAt: "2000-01-01T00:00:00Z" },
      { userId: "other-subject", expiresAt: "2099-01-01T00:00:00Z" },
    ]) {
      upstream.mockResolvedValueOnce(new Response(JSON.stringify({ user: { id, emailVerified: true }, session }), { status: 200 }));
      expect(await managedSessionVerifier.verify(request)).toBeNull();
    }
  });

  it("accepts a matching, current provider-issued session through the configured Auth endpoint", async () => {
    const valid = { user: { id, emailVerified: true }, session: { userId: id, expiresAt: "2099-01-01T00:00:00Z" } };
    const upstream = vi.fn().mockResolvedValue(new Response(JSON.stringify(valid), { status: 200 }));
    vi.stubGlobal("fetch", upstream);
    expect(await managedSessionVerifier.verify(request)).toEqual(valid);
    expect(upstream.mock.calls[0][0]).toBe("https://managed.test/auth/get-session");
    expect(upstream.mock.calls[0][1]).toMatchObject({ cache: "no-store", redirect: "manual" });
  });
});
