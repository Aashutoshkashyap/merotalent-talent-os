import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NeonAuthorizationError, type NeonActor } from "@/lib/server/neon-authorization";

const mocks = vi.hoisted(() => ({ actor: null as NeonActor | null,
  queryRows: vi.fn(), requireEntityAccess: vi.fn(), headObject: vi.fn(), sign: vi.fn() }));
vi.mock("@/lib/server/neon-session", async load => ({
  ...await load<typeof import("@/lib/server/neon-session")>(),
  getAuthenticatedApplicationUser: vi.fn(async () => {
    if (!mocks.actor) throw new NeonAuthorizationError(401, "AUTH_REQUIRED", "Sign in required.");
    return mocks.actor;
  }),
}));
vi.mock("@/lib/server/db", async load => ({
  ...await load<typeof import("@/lib/server/db")>(), queryRows: mocks.queryRows,
}));
vi.mock("@/lib/server/neon-authorization", async load => ({
  ...await load<typeof import("@/lib/server/neon-authorization")>(), requireEntityAccess: mocks.requireEntityAccess,
}));
vi.mock("@/lib/server/storage", () => ({ headObject: mocks.headObject, createPresignedDownloadUrl: mocks.sign }));
import { GET } from "../../app/api/v1/jobs/applications/[id]/resume/route";

const applicant = "10000000-0000-4000-8000-000000000001";
const recruiter = "20000000-0000-4000-8000-000000000002";
const company = "30000000-0000-4000-8000-000000000003";
const application = "40000000-0000-4000-8000-000000000004";
const snapshot = `${applicant}/historical-resume.pdf`;
const priorMode = process.env.MEROTALENT_BACKEND_MODE;
const get = () => GET(new Request(`https://app.test/api/v1/jobs/applications/${application}/resume`),
  { params: Promise.resolve({ id: application }) });
beforeEach(() => {
  vi.resetAllMocks(); process.env.MEROTALENT_BACKEND_MODE = "neon-staging";
  mocks.actor = { userId: recruiter, neonAuthUserId: company, roles: ["talent"], permissions: [], platformAdmin: false };
  mocks.queryRows.mockResolvedValue([{ user_id: applicant, resume_url: snapshot, job_id: application, company_id: company }]);
  mocks.requireEntityAccess.mockResolvedValue(undefined);
  mocks.headObject.mockResolvedValue({ contentType: "application/pdf", contentLength: 123 });
  mocks.sign.mockResolvedValue({ signedUrl: "https://staging.test/private-resume", expiresIn: 300 });
});
afterEach(() => {
  if (priorMode === undefined) delete process.env.MEROTALENT_BACKEND_MODE; else process.env.MEROTALENT_BACKEND_MODE = priorMode;
});

describe("application historical resume downloads", () => {
  it("accepts the assigned plan's application-management feature without changing document ownership", async () => {
    mocks.requireEntityAccess.mockRejectedValueOnce(new NeonAuthorizationError(403, "ENTITY_ACCESS_REQUIRED", "Feature unavailable."));
    expect((await get()).status).toBe(200);
    expect(mocks.requireEntityAccess).toHaveBeenLastCalledWith(mocks.actor, "jobs", "company", company, "application_management", expect.anything());
    expect(mocks.headObject).toHaveBeenCalledWith("resumes", snapshot);
  });
  it("requires a verified actor before querying private application data", async () => {
    mocks.actor = null;
    expect((await get()).status).toBe(401);
    expect(mocks.queryRows).not.toHaveBeenCalled();
    expect(mocks.headObject).not.toHaveBeenCalled();
  });
  it("denies unrelated entity scopes before revealing a missing-file state", async () => {
    mocks.requireEntityAccess.mockRejectedValue(new NeonAuthorizationError(403, "ENTITY_SCOPE_REQUIRED", "Denied."));
    mocks.headObject.mockResolvedValue(null);
    expect((await get()).status).toBe(403);
    expect(mocks.headObject).not.toHaveBeenCalled(); expect(mocks.sign).not.toHaveBeenCalled();
  });
  it("returns truthful404 for a missing historical object without substituting the latest profile resume", async () => {
    mocks.headObject.mockResolvedValue(null);
    const response = await get();
    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.json()).toEqual({ data: null, error: {
      code: "RESUME_NOT_FOUND", message: "Resume file unavailable; applicant needs to re-upload.",
    } });
    expect(mocks.headObject).toHaveBeenCalledWith("resumes", snapshot);
    expect(mocks.sign).not.toHaveBeenCalled();
    expect(mocks.queryRows).toHaveBeenCalledTimes(1);
    expect(mocks.queryRows.mock.calls[0][0]).not.toContain("profiles");
  });
  it("returns404 for an application with no submitted resume", async () => {
    mocks.queryRows.mockResolvedValue([{ user_id: applicant, resume_url: null, job_id: application, company_id: company }]);
    const response = await get(); expect(response.status).toBe(404);
    expect((await response.json()).error.message).toContain("applicant needs to re-upload");
    expect(mocks.headObject).not.toHaveBeenCalled();
  });
  it("signs only the applicant-owned historical object for an authorized reviewer", async () => {
    const response = await get(); expect(response.status).toBe(200);
    expect(mocks.requireEntityAccess).toHaveBeenCalledWith(mocks.actor, "jobs", "company", company, "job_applications", { query: mocks.queryRows });
    expect(mocks.sign).toHaveBeenCalledWith("resumes", snapshot, 300, true);
    expect((await response.json()).data.expiresIn).toBe(300);
  });
  it("refuses another owner's object even when stored on an authorized application", async () => {
    mocks.queryRows.mockResolvedValue([{ user_id: applicant, resume_url: `${recruiter}/resume/self/${company}.pdf`, job_id: application, company_id: company }]);
    expect((await get()).status).toBe(403);
    expect(mocks.headObject).not.toHaveBeenCalled(); expect(mocks.sign).not.toHaveBeenCalled();
  });
  it("keeps provider outages distinct from confirmed missing objects", async () => {
    mocks.headObject.mockRejectedValue(new Error("Provider unavailable"));
    const response = await get(); expect(response.status).toBe(503);
    expect((await response.json()).error).toBe("RESUME_UNAVAILABLE");
    expect(mocks.sign).not.toHaveBeenCalled();
  });
});
