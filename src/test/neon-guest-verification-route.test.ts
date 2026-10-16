import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ start: vi.fn(), check: vi.fn(), admin: vi.fn() }));
vi.mock("@/lib/server/supabase", () => ({ getAdminClient: mocks.admin, ServerConfigurationError: class extends Error {} }));
vi.mock("@/lib/server/neon-guest-college-verification", () => ({ startNeonGuestVerification: mocks.start, checkNeonGuestVerification: mocks.check }));
import { POST } from "../../app/api/v1/guest-college-verification/route";
const identity = { guestToken: "11111111-1111-4111-8111-111111111111", collegeId: "22222222-2222-4222-8222-222222222222", email: "guest@example.test", whatsappNumber: "+9779800000001" };
const request = (origin = "http://localhost:3210") => new Request("http://localhost:3210/api/v1/guest-college-verification", {
  method: "POST", headers: { origin, "Content-Type": "application/json" }, body: JSON.stringify({ ...identity, action: "start", channel: "email" }),
});
beforeEach(() => { vi.clearAllMocks(); vi.stubEnv("MEROTALENT_BACKEND_MODE", "neon-staging"); vi.stubEnv("VERCEL_ENV", "preview");
  mocks.start.mockResolvedValue({ verificationId: identity.guestToken, channel: "email", status: "code_requested" }); });
describe("Neon guest verification public route", () => {
  it("routes the real public caller to the Neon proof service without using Supabase", async () => {
    expect((await POST(request())).status).toBe(200); expect(mocks.start).toHaveBeenCalledWith(identity, "email");
    expect(mocks.admin).not.toHaveBeenCalled();
  });
  it("rejects cross-origin requests before provider or database work", async () => {
    expect((await POST(request("https://unrelated.example"))).status).toBe(403); expect(mocks.start).not.toHaveBeenCalled();
  });
});
