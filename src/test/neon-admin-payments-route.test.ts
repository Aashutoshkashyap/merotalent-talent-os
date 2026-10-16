import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NeonActor } from "@/lib/server/neon-authorization";
const mocks = vi.hoisted(() => ({ actor: null as NeonActor | null, list: vi.fn(), subscriptions: vi.fn(),
  proof: vi.fn(), reconcile: vi.fn(), payout: vi.fn(), free: vi.fn() }));
vi.mock("@/lib/server/neon-session", async original => ({ ...await original<typeof import("@/lib/server/neon-session")>(),
  getAuthenticatedApplicationUser: vi.fn(async () => { if (!mocks.actor) throw new (await import("@/lib/server/neon-authorization")).NeonAuthorizationError(401, "AUTH_REQUIRED", "Sign in"); return mocks.actor; }) }));
vi.mock("@/lib/server/neon-admin-payments", () => ({ listNeonAdminPayments: mocks.list,
  listNeonAdminSubscriptions: mocks.subscriptions, reviewNeonAdminPaymentProof: mocks.proof,
  reconcileNeonAdminPayment: mocks.reconcile, recordNeonMentorPayout: mocks.payout, changeNeonDefaultFreeTier: mocks.free }));
import { GET, PATCH } from "../../app/api/v1/neon-staging/admin/payments/route";
import { GET as subscriptionsGet, POST, DELETE } from "../../app/api/v1/neon-staging/admin/subscriptions/route";
const admin: NeonActor = { userId: "10000000-0000-4000-8000-000000000001", neonAuthUserId: "20000000-0000-4000-8000-000000000002", roles: ["super_admin"], permissions: [], platformAdmin: true };
const url = "https://app.test/api/v1/neon-staging/admin/payments";
const send = (body: object, method = "PATCH", origin = "https://app.test") => new Request(url, { method,
  headers: { origin, "Content-Type": "application/json" }, body: JSON.stringify(body) });
const oldMode = process.env.MEROTALENT_BACKEND_MODE;
beforeEach(() => { process.env.MEROTALENT_BACKEND_MODE = "neon-staging"; mocks.actor = admin;
  for (const key of ["list", "subscriptions", "proof", "reconcile", "payout", "free"] as const) mocks[key].mockResolvedValue({}); });
afterEach(() => { vi.clearAllMocks(); if (oldMode === undefined) delete process.env.MEROTALENT_BACKEND_MODE; else process.env.MEROTALENT_BACKEND_MODE = oldMode; });
describe("Neon billing HTTP boundary", () => {
  it("keeps financial reads private, authenticated and Super Admin only", async () => {
    expect((await GET(new Request(url))).headers.get("cache-control")).toBe("private, no-store");
    mocks.actor = { ...admin, platformAdmin: false };
    expect((await GET(new Request(url))).status).toBe(403);
    expect((await subscriptionsGet(new Request(url))).status).toBe(403);
    mocks.actor = null;
    expect((await GET(new Request(url))).status).toBe(401);
    expect((await subscriptionsGet(new Request(url))).status).toBe(401);
  });
  it("rejects origin attacks, scope/status injection and malformed mutations", async () => {
    const body = { action: "proof", id: admin.userId, paymentId: admin.userId, status: "accepted", note: "Reviewed pending proof" };
    expect((await PATCH(send(body, "PATCH", "https://evil.test"))).status).toBe(403);
    expect((await PATCH(send({ ...body, userId: admin.userId }))).status).toBe(400);
    expect((await PATCH(send({ ...body, status: "success" }))).status).toBe(400);
    expect((await PATCH(send(body))).status).toBe(200);
    expect(mocks.proof).toHaveBeenCalledWith(admin, { id: admin.userId, paymentId: admin.userId, status: "accepted", note: body.note });
    expect((await PATCH(send({ action: "reconcile", id: admin.userId, status: "pending", reconciliation: "disputed", note: "Investigating transaction" }))).status).toBe(200);
    expect((await PATCH(send({ action: "payout", id: admin.userId, amount: 100, commission: 5, reference: "External-123", note: "Bank transfer verified" }))).status).toBe(200);
    const free = { userId: admin.userId, module: "student", entityType: "user", entityId: null };
    expect((await POST(send({ ...free, role: "super_admin" }, "POST"))).status).toBe(400);
    expect((await POST(send(free, "POST"))).status).toBe(200);
    expect((await DELETE(send(free, "DELETE"))).status).toBe(200);
  });
  it("disables staging billing endpoints under production mode", async () => {
    process.env.MEROTALENT_BACKEND_MODE = "legacy";
    expect((await GET(new Request(url))).status).toBe(404);
    expect((await PATCH(send({}))).status).toBe(404);
    expect((await POST(send({}, "POST"))).status).toBe(404);
  });
});
