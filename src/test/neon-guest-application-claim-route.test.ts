import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ session: vi.fn(), actor: vi.fn(), claim: vi.fn() }));
vi.mock("@/lib/server/neon-session", async importOriginal => ({
  ...await importOriginal<object>(), managedSessionVerifier: { verify: mocks.session },
  getAuthenticatedApplicationUser: mocks.actor,
}));
vi.mock("@/lib/server/neon-guest-college-verification", () => ({ claimNeonGuestCollegeApplications: mocks.claim }));
import { POST } from "../../app/api/v1/neon-staging/guest-college-applications/claim/route";
const token = "11111111-1111-4111-8111-111111111111";
const actor = { userId: token, neonAuthUserId: "22222222-2222-4222-8222-222222222222", roles: [], permissions: [], platformAdmin: false };
const request = (body: unknown = { guestToken: token }, origin = "http://localhost:3210") => new Request("http://localhost:3210/api/v1/neon-staging/guest-college-applications/claim", {
  method: "POST", headers: { origin, "Content-Type": "application/json" }, body: JSON.stringify(body),
});
beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv("MEROTALENT_BACKEND_MODE", "neon-staging"); vi.stubEnv("VERCEL_ENV", "preview");
  mocks.session.mockResolvedValue({ user: { id: actor.neonAuthUserId, email: "verified@example.test", emailVerified: true }, session: { userId: actor.neonAuthUserId } });
  mocks.actor.mockResolvedValue(actor); mocks.claim.mockResolvedValue({ claimed_count: 1 });
});
describe("verified-session guest application claim endpoint", () => {
  it("denies unverified, missing and cross-origin sessions without mutation", async () => {
    expect((await POST(request(undefined, "https://other.example"))).status).toBe(403);
    mocks.session.mockResolvedValue(null);
    expect((await POST(request())).status).toBe(403);
    mocks.session.mockResolvedValue({ user: { email: "verified@example.test", emailVerified: false } });
    expect((await POST(request())).status).toBe(403); expect(mocks.claim).not.toHaveBeenCalled();
  });
  it("uses only the trusted Managed Auth email and existing actor link", async () => {
    expect((await POST(request())).status).toBe(200);
    expect(mocks.claim).toHaveBeenCalledWith(actor, token, "verified@example.test");
    expect((await POST(request({ guestToken: token, email: "attacker@example.test" }))).status).toBe(422);
    expect(mocks.claim).toHaveBeenCalledTimes(1);
  });
});
