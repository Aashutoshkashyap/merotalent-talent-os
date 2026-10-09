import { beforeEach, describe, expect, it, vi } from "vitest";
import { NeonAuthorizationError, type NeonActor } from "@/lib/server/neon-authorization";
import { NeonSessionUnavailable } from "@/lib/server/neon-session";

const mocks = vi.hoisted(() => ({
  getBackendMode: vi.fn(),
  getAuthenticatedApplicationUser: vi.fn(),
  listOwnSavedJobs: vi.fn(),
}));

vi.mock("@/lib/server/backend-mode", () => ({ getBackendMode: mocks.getBackendMode }));
vi.mock("@/lib/server/neon-session", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/server/neon-session")>();
  return { ...original, getAuthenticatedApplicationUser: mocks.getAuthenticatedApplicationUser };
});
vi.mock("@/lib/server/neon-saved-jobs", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/server/neon-saved-jobs")>();
  return { ...original, listOwnSavedJobs: mocks.listOwnSavedJobs };
});

import { GET } from "../../app/api/v1/neon-staging/jobs/saved/route";

const actor: NeonActor = {
  userId: "10000000-0000-4000-8000-000000000001",
  neonAuthUserId: "20000000-0000-4000-8000-000000000002",
  roles: ["talent"], permissions: [], platformAdmin: false,
};
const request = (query = "") => new Request(`https://staging.example/api/v1/neon-staging/jobs/saved${query}`);

describe("Neon staging own saved Jobs read", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getBackendMode.mockReturnValue("neon-staging");
    mocks.getAuthenticatedApplicationUser.mockResolvedValue(actor);
    mocks.listOwnSavedJobs.mockResolvedValue([]);
  });

  it("is absent in production/legacy mode before any authentication or query", async () => {
    mocks.getBackendMode.mockReturnValue("legacy");
    expect((await GET(request())).status).toBe(404);
    expect(mocks.getAuthenticatedApplicationUser).not.toHaveBeenCalled();
    expect(mocks.listOwnSavedJobs).not.toHaveBeenCalled();
  });

  it("rejects an unauthenticated or unlinked session before querying Jobs", async () => {
    mocks.getAuthenticatedApplicationUser.mockRejectedValueOnce(new NeonAuthorizationError(401, "AUTH_REQUIRED", "No session"));
    const unauthenticated = await GET(request());
    expect(unauthenticated.status).toBe(401);
    expect(await unauthenticated.json()).toEqual({ error: "AUTH_REQUIRED" });
    mocks.getAuthenticatedApplicationUser.mockRejectedValueOnce(new NeonAuthorizationError(403, "IDENTITY_NOT_LINKED", "No link"));
    const unlinked = await GET(request());
    expect(unlinked.status).toBe(403);
    expect(mocks.listOwnSavedJobs).not.toHaveBeenCalled();
  });

  it("returns only the verified actor's own page with bounded pagination", async () => {
    mocks.listOwnSavedJobs.mockResolvedValue([{ id: "job-1", title: "Engineer", saved_at: "2026-10-09T00:00:00Z" }]);
    const response = await GET(request("?limit=10&offset=2"));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ data: [{ id: "job-1" }], meta: { count: 1, limit: 10, offset: 2 } });
    expect(mocks.listOwnSavedJobs).toHaveBeenCalledWith(actor, 10, 2);
  });

  it("rejects user ID injection, duplicate fields, and unbounded pagination", async () => {
    for (const query of ["?userId=someone-else", "?limit=1&limit=2", "?limit=51", "?offset=-1", "?limit=1e2"]) {
      const response = await GET(request(query));
      expect(response.status).toBe(400);
    }
    expect(mocks.listOwnSavedJobs).not.toHaveBeenCalled();
  });

  it("fails closed when Managed Auth or Neon is unavailable", async () => {
    mocks.getAuthenticatedApplicationUser.mockRejectedValueOnce(new NeonSessionUnavailable());
    expect((await GET(request())).status).toBe(503);
    mocks.listOwnSavedJobs.mockRejectedValueOnce(new Error("database unavailable"));
    const response = await GET(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "SAVED_JOBS_UNAVAILABLE" });
  });
});
