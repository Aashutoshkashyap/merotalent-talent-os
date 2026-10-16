import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NeonActor } from "@/lib/server/neon-authorization";

const mocks = vi.hoisted(() => ({ actor: null as NeonActor | null,
  list: vi.fn(), options: vi.fn(), save: vi.fn(), remove: vi.fn() }));
vi.mock("@/lib/server/neon-session", async original => ({
  ...await original<typeof import("@/lib/server/neon-session")>(),
  getAuthenticatedApplicationUser: vi.fn(async () => {
    if (!mocks.actor) throw new (await import("@/lib/server/neon-authorization"))
      .NeonAuthorizationError(401, "AUTH_REQUIRED", "No session");
    return mocks.actor;
  }),
}));
vi.mock("@/lib/server/neon-featured-admin", () => ({
  listFeaturedAdmin: mocks.list, listFeaturedOptions: mocks.options,
  saveFeaturedAdmin: mocks.save, removeFeaturedAdmin: mocks.remove,
}));
import { DELETE, GET, POST } from "../../app/api/v1/neon-staging/admin/featured/route";

const endpoint = "https://app.test/api/v1/neon-staging/admin/featured";
const admin: NeonActor = { userId: "10000000-0000-4000-8000-000000000001",
  neonAuthUserId: "20000000-0000-4000-8000-000000000002", roles: ["admin"], permissions: [], platformAdmin: true };
const oldMode = process.env.MEROTALENT_BACKEND_MODE;
beforeEach(() => {
  process.env.MEROTALENT_BACKEND_MODE = "neon-staging";
  mocks.actor = admin;
  mocks.list.mockResolvedValue([]);
  mocks.options.mockResolvedValue([]);
  mocks.save.mockResolvedValue({ id: "saved" });
  mocks.remove.mockResolvedValue({ id: "removed" });
});
afterEach(() => {
  if (oldMode === undefined) delete process.env.MEROTALENT_BACKEND_MODE;
  else process.env.MEROTALENT_BACKEND_MODE = oldMode;
  vi.clearAllMocks();
});

describe("Neon featured admin HTTP boundary", () => {
  it("requires a linked session and routes option reads without caching", async () => {
    mocks.actor = null;
    expect((await GET(new Request(endpoint))).status).toBe(401);
    mocks.actor = admin;
    const response = await GET(new Request(`${endpoint}?options=college`));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.options).toHaveBeenCalledWith(admin, "college");
  });
  it("rejects cross-origin writes and handles same-origin create/remove", async () => {
    const post = (origin: string) => new Request(endpoint, { method: "POST",
      headers: { origin, "Content-Type": "application/json" }, body: JSON.stringify({ entity_type: "college" }) });
    expect((await POST(post("https://evil.test"))).status).toBe(403);
    expect(mocks.save).not.toHaveBeenCalled();
    expect((await POST(post("https://app.test"))).status).toBe(201);
    const remove = new Request(`${endpoint}?id=123`, { method: "DELETE", headers: { origin: "https://app.test" } });
    expect((await DELETE(remove)).status).toBe(200);
    expect(mocks.remove).toHaveBeenCalledWith(admin, "123");
  });
});
