import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { privateDownloadUrl, uploadBytes } from "@/lib/server/application-storage";

const mocks = vi.hoisted(() => ({ head: vi.fn(), upload: vi.fn(), signed: vi.fn() }));
vi.mock("@/lib/server/storage", () => ({
  headObject: mocks.head, uploadObject: mocks.upload, createPresignedDownloadUrl: mocks.signed,
  deleteObject: vi.fn(),
}));
const userId = "10000000-0000-4000-8000-000000000001";
const otherId = "20000000-0000-4000-8000-000000000002";
const jobId = "30000000-0000-4000-8000-000000000003";
const objectId = "40000000-0000-4000-8000-000000000004";
const ownPath = `${userId}/job_attachment/${jobId}/${objectId}.pdf`;
const otherPath = `${otherId}/job_attachment/${jobId}/${objectId}.pdf`;
const actor = { userId, neonAuthUserId: otherId, platformAdmin: false, roles: ["talent"], permissions: [] };
const oldMode = process.env.MEROTALENT_BACKEND_MODE;
beforeEach(() => {
  process.env.MEROTALENT_BACKEND_MODE = "neon-staging";
  mocks.head.mockResolvedValue(null); mocks.upload.mockResolvedValue(undefined);
});
afterEach(() => {
  if (oldMode === undefined) delete process.env.MEROTALENT_BACKEND_MODE; else process.env.MEROTALENT_BACKEND_MODE = oldMode;
  vi.clearAllMocks();
});

describe("private staging job document storage boundary", () => {
  it("accepts only the signed-in applicant's generated key", async () => {
    const input = { module: "job_attachment" as const, resourceId: jobId, fileName: "letter.pdf",
      contentType: "application/pdf", bytes: new TextEncoder().encode("%PDF-test"), path: ownPath };
    await expect(uploadBytes(actor, input)).resolves.toEqual({ bucket: "job-files", path: ownPath });
    await expect(uploadBytes(actor, { ...input, path: otherPath })).rejects.toMatchObject({ status: 403 });
    await expect(uploadBytes(actor, { ...input, resourceId: otherId })).rejects.toMatchObject({ status: 403 });
    expect(mocks.upload).toHaveBeenCalledTimes(1);
  });
  it("never signs another applicant's object for a normal user", async () => {
    await expect(privateDownloadUrl(actor, { module: "job_attachment", resourceId: jobId, path: otherPath }))
      .rejects.toMatchObject({ status: 403 });
    expect(mocks.signed).not.toHaveBeenCalled();
  });
});
