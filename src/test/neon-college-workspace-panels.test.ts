import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NeonActor } from "@/lib/server/neon-authorization";

const mocks = vi.hoisted(() => ({ actor: null as NeonActor | null, access: vi.fn(), transaction: vi.fn(), rows: vi.fn() }));
vi.mock("@/lib/server/neon-session", async (original) => ({
  ...await original<typeof import("@/lib/server/neon-session")>(),
  getAuthenticatedApplicationUser: vi.fn(async () => {
    if (!mocks.actor) throw new (await import("@/lib/server/neon-authorization")).NeonAuthorizationError(401, "AUTH_REQUIRED", "No session");
    return mocks.actor;
  }),
}));
vi.mock("@/lib/server/neon-authorization", async (original) => ({
  ...await original<typeof import("@/lib/server/neon-authorization")>(), requireEntityAccess: mocks.access,
}));
vi.mock("@/lib/server/db", async (original) => ({
  ...await original<typeof import("@/lib/server/db")>(), withTransaction: mocks.transaction, queryRows: mocks.rows,
}));

import { GET as noticesGet, POST as noticesPost, PATCH as noticesPatch, DELETE as noticesDelete } from
  "../../app/api/v1/neon-staging/college-workspaces/[id]/notices/route";
import { PATCH as applicationPatch } from "../../app/api/v1/neon-staging/institutes/[id]/applications/route";
import { GET as blogsGet, POST as blogsPost, PATCH as blogsPatch, DELETE as blogsDelete } from
  "../../app/api/v1/neon-staging/college-workspaces/[id]/blogs/route";

const collegeId = "20000000-0000-4000-8000-000000000002";
const recordId = "30000000-0000-4000-8000-000000000003";
const origin = "https://app.test";
const context = { params: Promise.resolve({ id: collegeId }) };
const originalMode = process.env.MEROTALENT_BACKEND_MODE;
const makeRequest = (path: string, method: string, body?: object, requestOrigin = origin) =>
  new Request(`${origin}${path}`, { method, headers: { origin: requestOrigin, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}) });
const notice = { title: "Admissions open", content: "Apply now", notice_type: "admission", is_pinned: false };
const blog = { title: "Campus update", slug: "campus-update", excerpt: "News", content: "A new campus update.", featured_image_url: "", status: "draft" };

beforeEach(() => {
  process.env.MEROTALENT_BACKEND_MODE = "neon-staging";
  mocks.actor = { userId: "10000000-0000-4000-8000-000000000001",
    neonAuthUserId: "40000000-0000-4000-8000-000000000004", roles: ["talent"], permissions: [], platformAdmin: false };
  mocks.access.mockResolvedValue(undefined);
  mocks.rows.mockResolvedValue([{ id: recordId, ...notice }]);
  mocks.transaction.mockImplementation(async callback => callback({ query: vi.fn(async (sql: string) => {
    if (sql.includes("RETURNING")) return { rows: [{ id: recordId, ...notice }] };
    return { rows: [] };
  }) }));
});
afterEach(() => {
  if (originalMode === undefined) delete process.env.MEROTALENT_BACKEND_MODE;
  else process.env.MEROTALENT_BACKEND_MODE = originalMode;
  vi.clearAllMocks();
});

describe("College workspace notice and application panels", () => {
  it("keeps the notice panel staging-only and denies anonymous and foreign-origin writes", async () => {
    process.env.MEROTALENT_BACKEND_MODE = "legacy";
    expect((await noticesGet(makeRequest("/", "GET"), context)).status).toBe(404);
    process.env.MEROTALENT_BACKEND_MODE = "neon-staging";
    mocks.actor = null;
    expect((await noticesGet(makeRequest("/", "GET"), context)).status).toBe(401);
    expect((await noticesPost(makeRequest("/", "POST", notice, "https://evil.test"), context)).status).toBe(403);
  });
  it("reads only selected-college notices under an active assignment and entitlement", async () => {
    expect((await noticesGet(makeRequest("/", "GET"), context)).status).toBe(200);
    expect(mocks.rows).toHaveBeenCalledWith(expect.stringContaining("institute_id=$1::uuid"), [collegeId]);
    mocks.access.mockRejectedValueOnce(new (await import("@/lib/server/neon-authorization")).NeonAuthorizationError(403, "ENTITY_ACCESS_REQUIRED", "Denied"));
    expect((await noticesGet(makeRequest("/", "GET"), context)).status).toBe(403);
  });
  it("validates notice fields, scopes create/edit/delete, and denies an unrelated college", async () => {
    expect((await noticesPost(makeRequest("/", "POST", { ...notice, is_pinned: "yes" }), context)).status).toBe(400);
    expect((await noticesPost(makeRequest("/", "POST", notice), context)).status).toBe(201);
    expect((await noticesPatch(makeRequest("/", "PATCH", { ...notice, id: recordId }), context)).status).toBe(200);
    expect((await noticesDelete(makeRequest("/", "DELETE", { id: recordId }), context)).status).toBe(200);
    mocks.access.mockRejectedValueOnce(new (await import("@/lib/server/neon-authorization")).NeonAuthorizationError(403, "ENTITY_ACCESS_REQUIRED", "Denied"));
    expect((await noticesPost(makeRequest("/", "POST", notice), context)).status).toBe(403);
  });
  it("updates applications only for the selected college, valid status, and lead entitlement", async () => {
    expect((await applicationPatch(makeRequest("/", "PATCH", { id: recordId, status: "accepted" }), context)).status).toBe(200);
    expect(mocks.access).toHaveBeenCalledWith(mocks.actor, "college", "college", collegeId, "college_applications", expect.anything());
    expect((await applicationPatch(makeRequest("/", "PATCH", { id: recordId, status: "paid" }), context)).status).toBe(400);
    expect((await applicationPatch(makeRequest("/", "PATCH", { id: recordId, status: "accepted", applicant_id: recordId }), context)).status).toBe(400);
    mocks.access.mockRejectedValueOnce(new (await import("@/lib/server/neon-authorization")).NeonAuthorizationError(403, "ENTITY_ACCESS_REQUIRED", "Denied"));
    expect((await applicationPatch(makeRequest("/", "PATCH", { id: recordId, status: "accepted" }), context)).status).toBe(403);
  });
  it("scopes college blog CRUD to an active profile-editing entitlement", async () => {
    expect((await blogsGet(makeRequest("/", "GET"), context)).status).toBe(200);
    expect(mocks.access).toHaveBeenCalledWith(mocks.actor, "college", "college", collegeId, "profile_editing");
    expect((await blogsPost(makeRequest("/", "POST", blog), context)).status).toBe(201);
    expect((await blogsPatch(makeRequest("/", "PATCH", { ...blog, id: recordId, status: "published" }), context)).status).toBe(200);
    expect((await blogsDelete(makeRequest("/", "DELETE", { id: recordId }), context)).status).toBe(200);
    expect((await blogsPost(makeRequest("/", "POST", { ...blog, slug: "../other" }), context)).status).toBe(400);
    mocks.access.mockRejectedValueOnce(new (await import("@/lib/server/neon-authorization")).NeonAuthorizationError(403, "ENTITY_ACCESS_REQUIRED", "Denied"));
    expect((await blogsPost(makeRequest("/", "POST", blog), context)).status).toBe(403);
  });
});
