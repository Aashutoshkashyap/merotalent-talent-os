import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NeonActor } from "@/lib/server/neon-authorization";

const mocks = vi.hoisted(() => ({ actor: null as NeonActor | null, rows: vi.fn(), transaction: vi.fn() }));
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
import { GET, PATCH } from "../../app/api/v1/neon-staging/admin/leads/route";

const origin = "https://app.test";
const id = "20000000-0000-4000-8000-000000000002";
const oldMode = process.env.MEROTALENT_BACKEND_MODE;
const request = (method: string, body?: object, requestOrigin = origin) => new Request(`${origin}/api/v1/neon-staging/admin/leads`, {
  method, headers: { origin: requestOrigin, "Content-Type": "application/json" },
  ...(body ? { body: JSON.stringify(body) } : {}),
});
beforeEach(() => {
  process.env.MEROTALENT_BACKEND_MODE = "neon-staging";
  mocks.actor = { userId: "10000000-0000-4000-8000-000000000001",
    neonAuthUserId: "30000000-0000-4000-8000-000000000003", roles: ["admin"], permissions: [], platformAdmin: true };
  mocks.rows.mockResolvedValue([{ id, status: "new", applicant_email: "applicant@example.test" }]);
  mocks.transaction.mockImplementation(async callback => callback({ query: vi.fn(async sql =>
    ({ rows: sql.includes("RETURNING") ? [{ id, status: "contacted" }] : [] })) }));
});
afterEach(() => {
  if (oldMode === undefined) delete process.env.MEROTALENT_BACKEND_MODE; else process.env.MEROTALENT_BACKEND_MODE = oldMode;
  vi.clearAllMocks();
});

describe("staging Super Admin lead supervision", () => {
  it("denies anonymous, ordinary users and foreign-origin status mutations", async () => {
    mocks.actor = null;
    expect((await GET(request("GET"))).status).toBe(401);
    mocks.actor = { userId: id, neonAuthUserId: id, roles: ["talent"], permissions: [], platformAdmin: false };
    expect((await GET(request("GET"))).status).toBe(403);
    expect((await PATCH(request("PATCH", { id, status: "contacted" }))).status).toBe(403);
    mocks.actor = { ...mocks.actor, platformAdmin: true };
    expect((await PATCH(request("PATCH", { id, status: "contacted" }, "https://evil.test"))).status).toBe(403);
  });
  it("reads bounded private leads and updates only an allowed status with audit", async () => {
    expect((await GET(request("GET"))).status).toBe(200);
    expect(mocks.rows).toHaveBeenCalledWith(expect.stringContaining("LIMIT 1000"), [mocks.actor!.userId]);
    expect((await PATCH(request("PATCH", { id, status: "contacted" }))).status).toBe(200);
    expect((await PATCH(request("PATCH", { id, status: "payment_success" }))).status).toBe(400);
    expect((await PATCH(request("PATCH", { id, status: "contacted", owner_user_id: id }))).status).toBe(400);
    expect(mocks.transaction).toHaveBeenCalledOnce();
  });
});
