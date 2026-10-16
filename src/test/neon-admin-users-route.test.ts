import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NeonActor } from "@/lib/server/neon-authorization";

const mocks = vi.hoisted(() => ({ actor: null as NeonActor | null, list: vi.fn(), status: vi.fn() }));
vi.mock("@/lib/server/neon-session", async original => ({
  ...await original<typeof import("@/lib/server/neon-session")>(),
  getAuthenticatedApplicationUser: vi.fn(async () => {
    if (!mocks.actor) throw new (await import("@/lib/server/neon-authorization"))
      .NeonAuthorizationError(401, "AUTH_REQUIRED", "No session");
    return mocks.actor;
  }),
}));
vi.mock("@/lib/server/neon-admin-users", () => ({
  listNeonAdminUsers: mocks.list, setNeonUserStatus: mocks.status,
}));
import { GET, PATCH } from "../../app/api/v1/neon-staging/admin/users/route";

const oldMode = process.env.MEROTALENT_BACKEND_MODE;
const endpoint = "https://app.test/api/v1/neon-staging/admin/users";
const admin: NeonActor = { userId: "10000000-0000-4000-8000-000000000001",
  neonAuthUserId: "20000000-0000-4000-8000-000000000002", roles: ["admin"], permissions: [], platformAdmin: true };
const other = "30000000-0000-4000-8000-000000000003";
beforeEach(() => {
  process.env.MEROTALENT_BACKEND_MODE = "neon-staging";
  mocks.actor = admin;
  mocks.list.mockResolvedValue({ data: [], page: 1, pageSize: 25, total: 0, totalPages: 1, hasNextPage: false });
  mocks.status.mockResolvedValue({ user_id: other, account_status: "suspended" });
});
afterEach(() => {
  if (oldMode === undefined) delete process.env.MEROTALENT_BACKEND_MODE;
  else process.env.MEROTALENT_BACKEND_MODE = oldMode;
  vi.clearAllMocks();
});

describe("Neon Super Admin users HTTP boundary", () => {
  it("requires a session and limits responses to private no-store", async () => {
    mocks.actor = null;
    expect((await GET(new Request(endpoint))).status).toBe(401);
    mocks.actor = admin;
    const response = await GET(new Request(endpoint));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
  it("rejects cross-origin and extra-field status writes", async () => {
    const post = (origin: string, body: object) => new Request(endpoint, { method: "PATCH",
      headers: { origin, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    expect((await PATCH(post("https://evil.test", { userId: other, status: "suspended" }))).status).toBe(403);
    expect((await PATCH(post("https://app.test", { userId: other, status: "suspended", admin: true }))).status).toBe(400);
    expect((await PATCH(post("https://app.test", { userId: other, status: "suspended" }))).status).toBe(200);
    expect(mocks.status).toHaveBeenCalledWith(admin, other, "suspended");
    expect((await PATCH(post("https://app.test", { userId: other, status: "deactivated" }))).status).toBe(200);
    expect(mocks.status).toHaveBeenCalledWith(admin, other, "deactivated");
  });
});
