import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NeonActor } from "@/lib/server/neon-authorization";

const mocks = vi.hoisted(() => ({ actor: null as NeonActor | null, rows: vi.fn(), transaction: vi.fn(), query: vi.fn() }));
vi.mock("@/lib/server/neon-session", async original => ({
  ...await original<typeof import("@/lib/server/neon-session")>(),
  getAuthenticatedApplicationUser: vi.fn(async () => {
    if (!mocks.actor) throw new (await import("@/lib/server/neon-authorization")).NeonAuthorizationError(401, "AUTH_REQUIRED", "No session");
    return mocks.actor;
  }),
}));
vi.mock("@/lib/server/db", async original => ({
  ...await original<typeof import("@/lib/server/db")>(), queryRows: mocks.rows, withTransaction: mocks.transaction,
}));
import { GET, PATCH } from "../../app/api/v1/neon-staging/admin/mentor-bookings/route";

const origin = "https://app.test";
const id = "20000000-0000-4000-8000-000000000002";
const oldMode = process.env.MEROTALENT_BACKEND_MODE;
const request = (method: string, body?: object, requestOrigin = origin) => new Request(`${origin}/api/v1/neon-staging/admin/mentor-bookings`, {
  method, headers: { origin: requestOrigin, "Content-Type": "application/json" },
  ...(body ? { body: JSON.stringify(body) } : {}),
});
beforeEach(() => {
  process.env.MEROTALENT_BACKEND_MODE = "neon-staging";
  mocks.actor = { userId: "10000000-0000-4000-8000-000000000001",
    neonAuthUserId: "30000000-0000-4000-8000-000000000003", roles: ["admin"], permissions: [], platformAdmin: true };
  mocks.rows.mockResolvedValue([{ id, payment_status: "pending", students: { full_name: "Student" } }]);
  mocks.query.mockImplementation(async (sql: string) => ({ rows: sql.includes("RETURNING") ? [{ id, status: "declined" }] : [] }));
  mocks.transaction.mockImplementation(async callback => callback({ query: mocks.query }));
});
afterEach(() => {
  if (oldMode === undefined) delete process.env.MEROTALENT_BACKEND_MODE; else process.env.MEROTALENT_BACKEND_MODE = oldMode;
  vi.clearAllMocks();
});

describe("staging Super Admin mentor booking supervision", () => {
  it("denies anonymous, ordinary users and foreign-origin mutations", async () => {
    mocks.actor = null;
    expect((await GET(request("GET"))).status).toBe(401);
    mocks.actor = { userId: id, neonAuthUserId: id, roles: ["talent"], permissions: [], platformAdmin: false };
    expect((await GET(request("GET"))).status).toBe(403);
    expect((await PATCH(request("PATCH", { id, status: "declined" }))).status).toBe(403);
    mocks.actor = { ...mocks.actor, platformAdmin: true };
    expect((await PATCH(request("PATCH", { id, status: "declined" }, "https://evil.test"))).status).toBe(403);
  });
  it("returns scoped booking details and permits only audited, payment-safe transitions", async () => {
    const response = await GET(request("GET"));
    expect(response.status).toBe(200);
    expect((await response.json()).data[0].students.full_name).toBe("Student");
    expect((await PATCH(request("PATCH", { id, status: "confirmed" }))).status).toBe(400);
    expect((await PATCH(request("PATCH", { id, status: "declined", payment_status: "success" }))).status).toBe(400);
    expect((await PATCH(request("PATCH", { id, status: "declined" }))).status).toBe(200);
    expect(mocks.query.mock.calls[0][0]).toContain("b.payment_status IN ('pending','failed')");
    expect(mocks.query.mock.calls[0][0]).toContain("b.scheduled_end<=now()");
    expect(mocks.query.mock.calls[1][0]).toContain("audit_logs");
  });
  it("rejects transition when the database predicate does not match", async () => {
    mocks.query.mockResolvedValue({ rows: [] });
    expect((await PATCH(request("PATCH", { id, status: "completed" }))).status).toBe(409);
    expect(mocks.query).toHaveBeenCalledOnce();
  });
});
