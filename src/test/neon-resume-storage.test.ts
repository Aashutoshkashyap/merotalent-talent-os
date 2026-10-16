import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NeonAuthorizationError, type NeonActor } from "@/lib/server/neon-authorization";

const mocks = vi.hoisted(() => ({
  actor: null as NeonActor | null,
  uploadObject: vi.fn(),
  headObject: vi.fn(),
  createPresignedDownloadUrl: vi.fn(),
  deleteObject: vi.fn(),
  withTransaction: vi.fn(),
}));
vi.mock("@/lib/server/db", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/server/db")>(),
  withTransaction: mocks.withTransaction,
}));

vi.mock("@/lib/server/neon-session", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/server/neon-session")>(),
  getAuthenticatedApplicationUser: vi.fn(async () => {
    if (!mocks.actor) throw new NeonAuthorizationError(401, "AUTH_REQUIRED", "No session");
    return mocks.actor;
  }),
}));
vi.mock("@/lib/server/storage", () => ({
  uploadObject: mocks.uploadObject,
  headObject: mocks.headObject,
  createPresignedDownloadUrl: mocks.createPresignedDownloadUrl,
  deleteObject: mocks.deleteObject,
}));

import { DELETE, GET, POST } from "../../app/api/v1/neon-staging/resume/route";
import { privateDownloadUrl } from "@/lib/server/application-storage";

const userId = "10000000-0000-4000-8000-000000000001";
const otherId = "20000000-0000-4000-8000-000000000002";
const objectId = "30000000-0000-4000-8000-000000000003";
const ownPath = `${userId}/resume/self/${objectId}.pdf`;
const foreignPath = `${otherId}/resume/self/${objectId}.pdf`;
const previousMode = process.env.MEROTALENT_BACKEND_MODE;

function upload(file: File, origin = "https://app.test") {
  const form = new FormData();
  form.append("file", file);
  const request = new Request("https://app.test/api/v1/neon-staging/resume", {
    method: "POST", headers: { origin, "content-length": String(file.size + 512) },
  });
  // jsdom FormData and Node Request use different multipart implementations.
  // Keep the route parser's supplied result realistic without a transport hang.
  Object.defineProperty(request, "formData", { value: async () => form });
  return POST(request);
}
function download(path: string) {
  return GET(new Request(`https://app.test/api/v1/neon-staging/resume?path=${encodeURIComponent(path)}`));
}

beforeEach(() => {
  process.env.MEROTALENT_BACKEND_MODE = "neon-staging";
  mocks.actor = { userId, neonAuthUserId: otherId, roles: ["talent"], permissions: [], platformAdmin: false };
  mocks.uploadObject.mockResolvedValue(undefined);
  mocks.headObject.mockResolvedValue(null);
  mocks.createPresignedDownloadUrl.mockResolvedValue({ signedUrl: "https://isolated-staging.test/signed", expiresIn: 300 });
  mocks.deleteObject.mockResolvedValue(undefined);
  mocks.withTransaction.mockImplementation(async (callback) => callback({
    query: vi.fn(async (sql: string) => sql.includes("SELECT p.resume_url")
      ? { rows: [{ resume_url: null }] } : { rows: [] }),
  }));
});

afterEach(() => {
  if (previousMode === undefined) delete process.env.MEROTALENT_BACKEND_MODE;
  else process.env.MEROTALENT_BACKEND_MODE = previousMode;
  mocks.actor = null;
  vi.clearAllMocks();
});

describe("isolated Neon resume storage route", () => {
  it("is absent in legacy mode and denies missing identity or cross-site upload", async () => {
    process.env.MEROTALENT_BACKEND_MODE = "legacy";
    expect((await download(ownPath)).status).toBe(404);
    process.env.MEROTALENT_BACKEND_MODE = "neon-staging";
    mocks.actor = null;
    expect((await download(ownPath)).status).toBe(401);
    mocks.actor = { userId, neonAuthUserId: otherId, roles: ["talent"], permissions: [], platformAdmin: false };
    expect((await upload(new File(["%PDF-test"], "resume.pdf", { type: "application/pdf" }), "https://attacker.test")).status).toBe(403);
    expect(mocks.uploadObject).not.toHaveBeenCalled();
  });

  it("accepts only a valid own PDF and uses the existing policy/storage boundary", async () => {
    const response = await upload(new File(["%PDF-staging fixture"], "resume.pdf", { type: "application/pdf" }));
    expect(response.status).toBe(201);
    const payload = await response.json();
    expect(payload.data.bucket).toBe("resumes");
    expect(payload.data.path).toMatch(new RegExp(`^${userId}/resume/self/[0-9a-f-]+\\.pdf$`));
    expect(mocks.uploadObject).toHaveBeenCalledWith("resumes", payload.data.path, expect.any(Uint8Array), "application/pdf");
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("rejects mislabeled PDF bytes and unsupported content types before storage", async () => {
    expect((await upload(new File(["not-a-pdf"], "resume.pdf", { type: "application/pdf" }))).status).toBe(415);
    expect((await upload(new File(["%PDF-test"], "resume.doc", { type: "application/msword" }))).status).toBe(415);
    expect(mocks.uploadObject).not.toHaveBeenCalled();
  });

  it("rejects unbounded or oversized request bodies before multipart parsing", async () => {
    const endpoint = "https://app.test/api/v1/neon-staging/resume";
    const noLength = new Request(endpoint, { method: "POST", headers: { origin: "https://app.test" } });
    const tooLarge = new Request(endpoint, { method: "POST", headers: {
      origin: "https://app.test", "content-length": String(6 * 1024 * 1024),
    } });
    expect((await POST(noLength)).status).toBe(411);
    expect((await POST(tooLarge)).status).toBe(413);
    expect(mocks.uploadObject).not.toHaveBeenCalled();
  });

  it("denies another user's private resume without consulting storage", async () => {
    const response = await download(foreignPath);
    expect(response.status).toBe(403);
    expect(mocks.headObject).not.toHaveBeenCalled();
    expect(mocks.createPresignedDownloadUrl).not.toHaveBeenCalled();
  });

  it("denies another user's payment proof before issuing a storage URL", async () => {
    const proofId = "40000000-0000-4000-8000-000000000004";
    await expect(privateDownloadUrl(mocks.actor!, {
      module: "payment_proof", resourceId: proofId,
      path: `${otherId}/payment_proof/${proofId}/${objectId}.pdf`,
    })).rejects.toMatchObject({ status: 403 });
    expect(mocks.createPresignedDownloadUrl).not.toHaveBeenCalled();
  });

  it("returns a short-lived signed URL only for an existing own resume", async () => {
    expect((await download(ownPath)).status).toBe(404);
    mocks.headObject.mockResolvedValue({ contentType: "application/pdf", contentLength: 100 });
    const response = await download(ownPath);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: { signedUrl: "https://isolated-staging.test/signed", expiresIn: 300 } });
    expect(mocks.headObject).toHaveBeenCalledWith("resumes", ownPath);
    expect(mocks.createPresignedDownloadUrl).toHaveBeenCalledWith("resumes", ownPath, 300, true);
  });

  it("requires a live owner session and same-origin request for deletion", async () => {
    const request = () => new Request("https://app.test/api/v1/neon-staging/resume", {
      method: "DELETE", headers: { origin: "https://app.test" },
    });
    mocks.actor = null;
    expect((await DELETE(request())).status).toBe(401);
    expect(mocks.deleteObject).not.toHaveBeenCalled();
    mocks.actor = { userId, neonAuthUserId: otherId, roles: ["talent"], permissions: [], platformAdmin: false };
    expect((await DELETE(new Request("https://app.test/api/v1/neon-staging/resume", {
      method: "DELETE", headers: { origin: "https://attacker.test" },
    }))).status).toBe(403);
    expect((await DELETE(request())).status).toBe(200);
  });

  it.each([true, false])("replacement preserves submitted snapshots when referenced=%s", async (referenced) => {
    const query = vi.fn(async (sql: string) => sql.includes("SELECT p.resume_url")
      ? { rows: [{ resume_url: ownPath }] }
      : sql.includes("AS referenced") ? { rows: [{ referenced }] } : { rows: [] });
    mocks.withTransaction.mockImplementation(async callback => callback({ query }));
    const response = await upload(new File(["%PDF-replacement"], "replacement.pdf", { type: "application/pdf" }));
    expect(response.status).toBe(201);
    if (referenced) expect(mocks.deleteObject).not.toHaveBeenCalled();
    else expect(mocks.deleteObject).toHaveBeenCalledWith("resumes", ownPath);
    expect(query.mock.calls.map(call=>call[0]).join("\n")).toContain("FOR UPDATE OF p");
    expect(query.mock.calls.find(call=>call[0].includes("AS referenced"))?.[0]).not.toContain("deleted_at IS NULL");
  });

  it.each([true, false])("profile deletion preserves submitted snapshots when referenced=%s", async (referenced) => {
    const query = vi.fn(async (sql: string) => sql.includes("SELECT p.resume_url")
      ? { rows: [{ resume_url: ownPath }] }
      : sql.includes("AS referenced") ? { rows: [{ referenced }] } : { rows: [] });
    mocks.withTransaction.mockImplementation(async callback => callback({ query }));
    const response = await DELETE(new Request("https://app.test/api/v1/neon-staging/resume", {
      method: "DELETE", headers: { origin: "https://app.test" },
    }));
    expect(response.status).toBe(200);
    if (referenced) expect(mocks.deleteObject).not.toHaveBeenCalled();
    else expect(mocks.deleteObject).toHaveBeenCalledWith("resumes", ownPath);
    expect(query.mock.calls.some(call=>call[0].includes("SET resume_url=NULL"))).toBe(true);
  });

  it("preserves an old object if reference state cannot be confirmed", async () => {
    mocks.withTransaction.mockImplementation(async callback => callback({
      query: vi.fn(async (sql: string) => sql.includes("SELECT p.resume_url")
        ? { rows: [{ resume_url: ownPath }] } : { rows: [] }),
    }));
    expect((await upload(new File(["%PDF-new"], "new.pdf", { type: "application/pdf" }))).status).toBe(201);
    expect(mocks.deleteObject).not.toHaveBeenCalled();
  });
});
