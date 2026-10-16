import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NeonActor } from "@/lib/server/neon-authorization";

const mocks = vi.hoisted(() => ({ actor: null as NeonActor | null, assign: vi.fn(),
  entities: vi.fn(), access: vi.fn(), revoke: vi.fn(), payments: vi.fn(), review: vi.fn() }));
vi.mock("@/lib/server/neon-session", async original => ({
  ...await original<typeof import("@/lib/server/neon-session")>(),
  getAuthenticatedApplicationUser: vi.fn(async () => {
    if (!mocks.actor) throw new (await import("@/lib/server/neon-authorization"))
      .NeonAuthorizationError(401, "AUTH_REQUIRED", "No session");
    return mocks.actor;
  }),
}));
vi.mock("@/lib/server/neon-admin-access", () => ({
  assignNeonModuleAccess: mocks.assign, listNeonAssignableEntities: mocks.entities,
  listNeonUserAccess: mocks.access, revokeNeonAccess: mocks.revoke,
  listNeonManualPayments: mocks.payments, reviewNeonManualPayment: mocks.review,
}));
import { GET as accessGet, POST as accessPost, DELETE as accessDelete } from
  "../../app/api/v1/neon-staging/admin/access/route";
import { GET as paymentGet, PATCH as paymentPatch } from
  "../../app/api/v1/neon-staging/admin/manual-payments/route";

const oldMode = process.env.MEROTALENT_BACKEND_MODE;
const admin: NeonActor = { userId: "10000000-0000-4000-8000-000000000001",
  neonAuthUserId: "20000000-0000-4000-8000-000000000002", roles: ["admin"],
  permissions: [], platformAdmin: true };
const endpoint = "https://app.test/api/v1/neon-staging/admin/access";
const paymentEndpoint = "https://app.test/api/v1/neon-staging/admin/manual-payments";
const target = "30000000-0000-4000-8000-000000000003";
const submit = (url: string, method: string, body: object, origin = "https://app.test") =>
  new Request(url, { method, headers: { origin, "Content-Type": "application/json" },
    body: JSON.stringify(body) });
beforeEach(() => {
  process.env.MEROTALENT_BACKEND_MODE = "neon-staging";
  mocks.actor = admin;
  mocks.entities.mockResolvedValue([]);
  mocks.access.mockResolvedValue([]);
  mocks.payments.mockResolvedValue([]);
  mocks.assign.mockResolvedValue({ duplicate: false, paymentStatus: "pending" });
  mocks.revoke.mockResolvedValue({ status: "revoked" });
  mocks.review.mockResolvedValue({ status: "success" });
});
afterEach(() => {
  if (oldMode === undefined) delete process.env.MEROTALENT_BACKEND_MODE;
  else process.env.MEROTALENT_BACKEND_MODE = oldMode;
  vi.clearAllMocks();
});

describe("Neon Super Admin assignment HTTP boundary", () => {
  it("keeps entity, access and payment listings private and session-bound", async () => {
    expect((await accessGet(new Request(`${endpoint}?mode=entities&module=college`))).headers
      .get("cache-control")).toBe("private, no-store");
    expect((await accessGet(new Request(`${endpoint}?mode=user&userId=${target}`))).status).toBe(200);
    expect((await paymentGet(new Request(`${paymentEndpoint}?userId=${target}`))).status).toBe(200);
    mocks.actor = null;
    expect((await paymentGet(new Request(`${paymentEndpoint}?userId=${target}`))).status).toBe(401);
    expect((await accessGet(new Request(`${endpoint}?mode=user&userId=${target}`))).status).toBe(401);
  });
  it("rejects cross-origin and malformed assignment/review mutations", async () => {
    const input = { userId: target, module: "college", entityId: target,
      startAt: "2026-10-13T00:00:00Z", expiresAt: "2026-11-13T00:00:00Z",
      amount: 100, idempotencyKey: target };
    expect((await accessPost(submit(endpoint, "POST", input, "https://evil.test"))).status).toBe(403);
    expect((await accessPost(submit(endpoint, "POST", { ...input, platformAdmin: true }))).status).toBe(400);
    expect((await accessPost(submit(endpoint, "POST", input))).status).toBe(201);
    expect((await accessDelete(submit(endpoint, "DELETE", { userId: target,
      kind: "scope", id: target }))).status).toBe(200);
    expect((await paymentPatch(submit(paymentEndpoint, "PATCH", { paymentId: target,
      decision: "confirm", note: "verified receipt" }, "https://evil.test"))).status).toBe(403);
    expect((await paymentPatch(submit(paymentEndpoint, "PATCH", { paymentId: target,
      decision: "confirm", note: "verified receipt", status: "success" }))).status).toBe(400);
    expect((await paymentPatch(submit(paymentEndpoint, "PATCH", { paymentId: target,
      decision: "confirm", note: "verified receipt" }))).status).toBe(200);
    expect(mocks.review).toHaveBeenCalledWith(admin, target, "confirm", "verified receipt");
  });
});
