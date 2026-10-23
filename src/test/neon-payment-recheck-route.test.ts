import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ actor: vi.fn(), verify: vi.fn(), mode: "neon-production" }));
vi.mock("@/lib/server/backend-mode", () => ({ getBackendMode: () => mocks.mode }));
vi.mock("@/lib/server/neon-session", async original => ({ ...await original<typeof import("@/lib/server/neon-session")>(), getAuthenticatedApplicationUser: mocks.actor }));
vi.mock("@/lib/server/neon-checkout", () => ({ NeonCheckoutService: class { recheckOwnPayment = mocks.verify; } }));
import { POST } from "../../app/api/v1/neon-staging/payments/[reference]/verify/route";
import { NeonAuthorizationError } from "@/lib/server/neon-authorization";
const reference = "10000000-0000-4000-8000-000000000003";
const actor = { userId: "10000000-0000-4000-8000-000000000001" };
const request = (origin = "https://www.merotalent.test", body?: string) => new Request(`https://www.merotalent.test/api/v1/neon-staging/payments/${reference}/verify`, { method: "POST", headers: { origin }, body });
const context = { params: Promise.resolve({ reference }) };
beforeEach(() => { vi.clearAllMocks(); mocks.mode = "neon-production"; mocks.actor.mockResolvedValue(actor); mocks.verify.mockResolvedValue({ status: "pending", duplicate: false }); });
describe("eSewa payment recovery route", () => {
  it('accepts a transport-provided empty POST stream', async () => {
    expect((await POST(request(undefined, ''), context)).status).toBe(200);
    expect(mocks.verify).toHaveBeenCalledWith(actor, reference);
  });
  it("requires an authenticated same-origin payer", async () => {
    expect((await POST(request("https://other.test"), context)).status).toBe(403);
    expect(mocks.actor).not.toHaveBeenCalled();
    mocks.actor.mockRejectedValue(new NeonAuthorizationError(401, "AUTH_REQUIRED", "Sign in"));
    expect((await POST(request(), context)).status).toBe(401);
    expect(mocks.verify).not.toHaveBeenCalled();
  });
  it.each(['{"amount":1}', '{"status":"success"}', '{"userId":"other"}'])("rejects client assertions %s", async body => {
    expect((await POST(request(undefined, body), context)).status).toBe(422);
    expect(mocks.verify).not.toHaveBeenCalled();
  });
  it("denies invalid references and cross-user recovery", async () => {
    expect((await POST(request(), { params: Promise.resolve({ reference: "not-an-order" }) })).status).toBe(422);
    mocks.verify.mockRejectedValue(new NeonAuthorizationError(404, "CHECKOUT_NOT_FOUND", "Not found"));
    expect((await POST(request(), context)).status).toBe(404);
  });
  it("allows existing-order verification while new production payments are disabled", async () => {
    vi.stubEnv("NEON_PRODUCTION_PAYMENTS_ENABLED", "false");
    try {
      const response = await POST(request(), context);
      expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toBe("private, no-store");
      expect(await response.json()).toEqual({ data: { status: "pending", duplicate: false } });
      expect(mocks.verify).toHaveBeenCalledWith(actor, reference);
    } finally { vi.unstubAllEnvs(); }
  });
  it("reports provider failure as retryable without leaking credentials or activating access", async () => {
    mocks.verify.mockRejectedValue(new Error("private provider detail"));
    const response = await POST(request(), context);
    expect(response.status).toBe(503); expect(await response.json()).toEqual({ error: "VERIFICATION_UNAVAILABLE" });
  });
});
