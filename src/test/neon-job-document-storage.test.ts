import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NeonAuthorizationError } from "@/lib/server/neon-authorization";

const mocks = vi.hoisted(() => ({
  actor: { userId: "10000000-0000-4000-8000-000000000001", neonAuthUserId: "20000000-0000-4000-8000-000000000002", platformAdmin: false, roles: ["talent"], permissions: [] } as any,
  queryRows: vi.fn(), transactionQuery: vi.fn(), uploadBytes: vi.fn(), headObject: vi.fn(), deleteObject: vi.fn(),
  requireEntityAccess: vi.fn(), signedUrl: vi.fn(),
}));
vi.mock("@/lib/server/neon-session", async (load) => ({
  ...await load<typeof import("@/lib/server/neon-session")>(),
  getAuthenticatedApplicationUser: vi.fn(async () => {
    if (!mocks.actor) throw new NeonAuthorizationError(401, "AUTH_REQUIRED", "No session");
    return mocks.actor;
  }),
}));
vi.mock("@/lib/server/db", async (load) => ({
  ...await load<typeof import("@/lib/server/db")>(), queryRows: mocks.queryRows,
  withTransaction: vi.fn((callback: (client: { query: typeof mocks.transactionQuery }) => Promise<unknown>) =>
    callback({ query: mocks.transactionQuery })),
}));
vi.mock("@/lib/server/application-storage", async (load) => ({
  ...await load<typeof import("@/lib/server/application-storage")>(), uploadBytes: mocks.uploadBytes,
}));
vi.mock("@/lib/server/neon-authorization", async (load) => ({
  ...await load<typeof import("@/lib/server/neon-authorization")>(), requireEntityAccess: mocks.requireEntityAccess,
}));
vi.mock("@/lib/server/storage", () => ({ headObject: mocks.headObject, deleteObject: mocks.deleteObject, createPresignedDownloadUrl: mocks.signedUrl }));

import { POST, DELETE } from "../../app/api/v1/neon-staging/jobs/documents/route";
import { GET } from "../../app/api/v1/jobs/applications/[id]/documents/route";

const userId = "10000000-0000-4000-8000-000000000001";
const otherId = "20000000-0000-4000-8000-000000000002";
const jobId = "30000000-0000-4000-8000-000000000003";
const appId = "40000000-0000-4000-8000-000000000004";
const path = `${userId}/job_attachment/${jobId}/50000000-0000-4000-8000-000000000005.pdf`;
const priorMode = process.env.MEROTALENT_BACKEND_MODE;

function upload(file: File, origin = "https://app.test") {
  const form = new FormData(); form.set("file", file); form.set("jobId", jobId); form.set("kind", "experience");
  const request = new Request("https://app.test/api/v1/neon-staging/jobs/documents", { method: "POST", headers: { origin, "content-length": String(file.size + 512) } });
  Object.defineProperty(request, "formData", { value: async () => form });
  return POST(request);
}
function download(kind = "experience") {
  return GET(new Request(`https://app.test/api/v1/jobs/applications/${appId}/documents?kind=${kind}`), { params: Promise.resolve({ id: appId }) });
}

beforeEach(() => {
  process.env.MEROTALENT_BACKEND_MODE = "neon-staging";
  mocks.actor = { userId, neonAuthUserId: otherId, platformAdmin: false, roles: ["talent"], permissions: [] };
  mocks.queryRows.mockImplementation(async (sql: string) => sql.includes("FROM public.jobs") ? [{ id: jobId }] : [{ user_id: userId, job_id: jobId, company_id: jobId, form_data: { experienceLetterUrl: path } }]);
  mocks.transactionQuery.mockImplementation(async (sql: string) =>
    sql.includes("FROM public.neon_job_document_drafts") ? { rows: [{ state: "submitted" }] } : { rows: [] });
  mocks.uploadBytes.mockResolvedValue({ bucket: "job-files", path });
  mocks.headObject.mockResolvedValue({});
  mocks.deleteObject.mockResolvedValue(undefined);
  mocks.requireEntityAccess.mockResolvedValue(undefined);
  mocks.signedUrl.mockResolvedValue({ signedUrl: "https://isolated-staging.test/signed", expiresIn: 300 });
});
afterEach(() => {
  if (priorMode === undefined) delete process.env.MEROTALENT_BACKEND_MODE; else process.env.MEROTALENT_BACKEND_MODE = priorMode;
  vi.clearAllMocks();
});

describe("isolated staging job supporting documents", () => {
  it("is unavailable in legacy mode and denies cross-site or unauthenticated uploads", async () => {
    process.env.MEROTALENT_BACKEND_MODE = "legacy";
    expect((await upload(new File(["%PDF-valid"], "letter.pdf", { type: "application/pdf" }))).status).toBe(404);
    process.env.MEROTALENT_BACKEND_MODE = "neon-staging";
    expect((await upload(new File(["%PDF-valid"], "letter.pdf", { type: "application/pdf" }), "https://attacker.test")).status).toBe(403);
    mocks.actor = null;
    expect((await upload(new File(["%PDF-valid"], "letter.pdf", { type: "application/pdf" }))).status).toBe(401);
    expect(mocks.uploadBytes).not.toHaveBeenCalled();
  });

  it("accepts an own PDF only for an open job and rejects forged content", async () => {
    expect((await upload(new File(["%PDF-valid"], "letter.pdf", { type: "application/pdf" }))).status).toBe(201);
    expect(mocks.uploadBytes).toHaveBeenCalledWith(expect.objectContaining({ userId }), expect.objectContaining({ module: "job_attachment", resourceId: jobId }));
    expect((await upload(new File(["not-pdf"], "letter.pdf", { type: "application/pdf" }))).status).toBe(415);
    mocks.queryRows.mockResolvedValueOnce([]);
    expect((await upload(new File(["%PDF-valid"], "letter.pdf", { type: "application/pdf" }))).status).toBe(403);
  });

  it("downloads only the exact document persisted on an application within recruiter scope", async () => {
    expect((await download()).status).toBe(200);
    expect(mocks.requireEntityAccess).toHaveBeenCalledWith(expect.objectContaining({ userId }), "jobs", "company", jobId, "job_applications", expect.anything());
    expect((await download("training")).status).toBe(404);
    mocks.requireEntityAccess.mockRejectedValueOnce(new NeonAuthorizationError(403, "ENTITY_SCOPE_REQUIRED", "Denied"));
    expect((await download()).status).toBe(403);
    expect(mocks.signedUrl).toHaveBeenCalledTimes(1);
  });

  it("refuses guessed or foreign-owner paths and submitted-object deletion", async () => {
    mocks.queryRows.mockResolvedValueOnce([{ user_id: userId, job_id: jobId, company_id: jobId,
      form_data: { experienceLetterUrl: `${otherId}/job_attachment/${jobId}/50000000-0000-4000-8000-000000000005.pdf` } }]);
    expect((await download()).status).toBe(403);
    const request = (target: string) => new Request("https://app.test/api/v1/neon-staging/jobs/documents", {
      method: "DELETE", headers: { origin: "https://app.test", "content-type": "application/json" },
      body: JSON.stringify({ jobId, path: target }),
    });
    expect((await DELETE(request(`${otherId}/job_attachment/${jobId}/50000000-0000-4000-8000-000000000005.pdf`))).status).toBe(403);
    expect((await DELETE(request(path))).status).toBe(409);
    expect(mocks.deleteObject).not.toHaveBeenCalled();
  });
});
