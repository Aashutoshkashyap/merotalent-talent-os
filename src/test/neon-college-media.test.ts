import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NeonActor } from "@/lib/server/neon-authorization";

const mocks = vi.hoisted(() => ({
  actor: null as NeonActor | null,
  access: vi.fn(), upload: vi.fn(), remove: vi.fn(), transaction: vi.fn(),
  previous: null as string | null, referenced: false,
}));
vi.mock("@/lib/server/neon-session", async (original) => ({
  ...await original<typeof import("@/lib/server/neon-session")>(),
  getAuthenticatedApplicationUser: vi.fn(async () => {
    if (!mocks.actor) throw new (await import("@/lib/server/neon-authorization")).NeonAuthorizationError(401, "AUTH_REQUIRED", "No session");
    return mocks.actor;
  }),
}));
vi.mock("@/lib/server/neon-authorization", async (original) => ({
  ...await original<typeof import("@/lib/server/neon-authorization")>(),
  requireEntityAccess: mocks.access,
}));
vi.mock("@/lib/server/application-storage", () => ({ uploadBytes: mocks.upload }));
vi.mock("@/lib/server/storage", () => ({ deleteObject: mocks.remove }));
vi.mock("@/lib/server/db", async (original) => ({
  ...await original<typeof import("@/lib/server/db")>(), withTransaction: mocks.transaction,
}));

import { DELETE, POST } from "../../app/api/v1/neon-staging/college-workspaces/[id]/media/route";

const userId = "10000000-0000-4000-8000-000000000001";
const collegeId = "20000000-0000-4000-8000-000000000002";
const path = `${userId}/college_logo/${collegeId}/30000000-0000-4000-8000-000000000003.png`;
const endpoint = `https://app.test/api/v1/neon-staging/college-workspaces/${collegeId}/media`;
const previousMode = process.env.MEROTALENT_BACKEND_MODE;
const png = new File([Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0])], "logo.png", { type: "image/png" });
const context = { params: Promise.resolve({ id: collegeId }) };

function upload(file = png, origin = "https://app.test") {
  const form = new FormData(); form.set("kind", "logo"); form.set("file", file);
  const request = new Request(endpoint, { method: "POST", headers: { origin, "content-length": String(file.size + 512) } });
  Object.defineProperty(request, "formData", { value: async () => form });
  return POST(request, context);
}
function remove(origin = "https://app.test") {
  return DELETE(new Request(`${endpoint}?kind=logo`, { method: "DELETE", headers: { origin } }), context);
}

beforeEach(() => {
  process.env.MEROTALENT_BACKEND_MODE = "neon-staging";
  mocks.actor = { userId, neonAuthUserId: "40000000-0000-4000-8000-000000000004",
    roles: ["talent"], permissions: [], platformAdmin: false };
  mocks.previous = null; mocks.referenced = false;
  mocks.access.mockResolvedValue(undefined);
  mocks.upload.mockResolvedValue({ bucket: "college-media", path });
  mocks.remove.mockResolvedValue(undefined);
  mocks.transaction.mockImplementation(async (callback) => callback({ query: vi.fn(async (sql: string) => {
    if (sql.includes("SELECT logo_url AS path")) return { rows: [{ path: mocks.previous }] };
    if (sql.includes("SELECT EXISTS (SELECT 1 FROM public.institutes")) return { rows: [{ used: mocks.referenced }] };
    return { rows: [] };
  }) }));
});
afterEach(() => {
  if (previousMode === undefined) delete process.env.MEROTALENT_BACKEND_MODE;
  else process.env.MEROTALENT_BACKEND_MODE = previousMode;
  vi.clearAllMocks();
});

describe("Neon staging college media", () => {
  it("does not alter legacy production and denies anonymous, cross-site and unscoped uploads", async () => {
    process.env.MEROTALENT_BACKEND_MODE = "legacy";
    expect((await upload()).status).toBe(404);
    process.env.MEROTALENT_BACKEND_MODE = "neon-staging";
    mocks.actor = null;
    expect((await upload()).status).toBe(401);
    mocks.actor = { userId, neonAuthUserId: userId, roles: [], permissions: [], platformAdmin: false };
    expect((await upload(png, "https://evil.test")).status).toBe(403);
    mocks.access.mockRejectedValueOnce(new (await import("@/lib/server/neon-authorization")).NeonAuthorizationError(403, "ENTITY_ACCESS_REQUIRED", "Denied"));
    expect((await upload()).status).toBe(403);
    expect(mocks.upload).not.toHaveBeenCalled();
  });
  it("validates image bytes and saves an authorized canonical upload", async () => {
    expect((await upload(new File(["bad"], "logo.png", { type: "image/png" }))).status).toBe(415);
    const response = await upload();
    expect(response.status).toBe(201);
    expect((await response.json()).data.path).toBe(path);
    expect(mocks.upload).toHaveBeenCalledWith(mocks.actor, expect.objectContaining({ module: "college_logo", resourceId: collegeId }));
    expect(mocks.access).toHaveBeenCalledWith(mocks.actor, "college", "college", collegeId, "media_management", expect.anything());
  });
  it("cleans a new object if the database refuses its reference", async () => {
    mocks.transaction.mockRejectedValueOnce(new (await import("@/lib/server/neon-authorization")).NeonAuthorizationError(403, "ENTITY_ACCESS_REQUIRED", "Denied"));
    expect((await upload()).status).toBe(403);
    expect(mocks.remove).toHaveBeenCalledWith("college-media", path);
  });
  it("replaces only the uploader's unreferenced old object", async () => {
    mocks.previous = `${userId}/college_logo/${collegeId}/50000000-0000-4000-8000-000000000005.png`;
    expect((await upload()).status).toBe(201);
    expect(mocks.remove).toHaveBeenCalledWith("college-media", mocks.previous);
  });
  it("preserves shared or imported old references", async () => {
    mocks.previous = `${userId}/college_logo/${collegeId}/50000000-0000-4000-8000-000000000005.png`;
    mocks.referenced = true;
    expect((await upload()).status).toBe(201);
    expect(mocks.remove).not.toHaveBeenCalled();
    mocks.previous = "imported/legacy.png"; mocks.referenced = false;
    expect((await upload()).status).toBe(201);
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it("removes an authorized reference, including a missing object, and rejects cross-site deletion", async () => {
    mocks.previous = `${userId}/college_logo/${collegeId}/50000000-0000-4000-8000-000000000005.png`;
    expect((await remove("https://evil.test")).status).toBe(403);
    mocks.remove.mockRejectedValueOnce(new Error("Object already missing"));
    const response = await remove();
    expect(response.status).toBe(200);
    expect((await response.json()).data.removed).toBe(true);
    mocks.access.mockRejectedValueOnce(new (await import("@/lib/server/neon-authorization")).NeonAuthorizationError(403, "ENTITY_ACCESS_REQUIRED", "Denied"));
    expect((await remove()).status).toBe(403);
  });
});
