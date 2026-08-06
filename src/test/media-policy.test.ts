import { describe, expect, it } from "vitest";

import {
  assertMediaCapability,
  assertMediaObjectPath,
  buildMediaObjectPath,
  canReadForeignOwnerMedia,
  isAllowedStoredFile,
  MediaPolicyError,
  parseMediaDownloadIntent,
  parseMediaUploadIntent,
} from "@/lib/server/media-policy";

const ownerId = "a70c51ac-e25e-42fd-b596-a2972836ca9e";
const resourceId = "95920411-b7dd-48c7-95d4-a3fba9cd7f75";
const objectId = "150c3fb5-a401-4d24-9527-2d6e577fb716";

describe("media policy", () => {
  it("lets an active applicant upload a job-bound attachment while reserving foreign reads for lead owners", () => {
    const applicant = {
      user: { id: ownerId },
      accountStatus: "active",
      roles: ["talent"],
      permissions: [],
    } as never;
    const jobOwner = {
      user: { id: resourceId },
      accountStatus: "active",
      roles: ["company"],
      permissions: ["job.post", "lead.view"],
    } as never;

    expect(() => assertMediaCapability(applicant, "job_attachment")).not.toThrow();
    expect(canReadForeignOwnerMedia(applicant, "job_attachment")).toBe(false);
    expect(canReadForeignOwnerMedia(jobOwner, "job_attachment")).toBe(true);
  });

  it("validates an allowed upload and creates a server-owned path", () => {
    const intent = parseMediaUploadIntent({
      module: "college_logo",
      resourceId,
      fileName: "logo.JPG",
      contentType: "IMAGE/JPEG",
      sizeBytes: 512_000,
    });

    expect(buildMediaObjectPath(intent, ownerId, objectId)).toBe(
      `${ownerId}/college_logo/${resourceId}/${objectId}.jpg`,
    );
  });

  it("rejects executable image formats, oversized files, and extension spoofing", () => {
    expect(() =>
      parseMediaUploadIntent({
        module: "profile_avatar",
        fileName: "avatar.svg",
        contentType: "image/svg+xml",
        sizeBytes: 10_000,
      }),
    ).toThrow(MediaPolicyError);

    expect(() =>
      parseMediaUploadIntent({
        module: "resume",
        fileName: "resume.pdf",
        contentType: "application/pdf",
        sizeBytes: 6 * 1024 * 1024,
      }),
    ).toThrow(MediaPolicyError);

    expect(() =>
      parseMediaUploadIntent({
        module: "resume",
        fileName: "resume.exe",
        contentType: "application/pdf",
        sizeBytes: 10_000,
      }),
    ).toThrow(MediaPolicyError);
  });

  it("requires resource media to stay inside its canonical path", () => {
    const validPath = `${ownerId}/college_gallery/${resourceId}/${objectId}.webp`;
    const intent = parseMediaDownloadIntent({
      module: "college_gallery",
      resourceId,
      path: validPath,
    });

    expect(() => assertMediaObjectPath(intent, ownerId)).not.toThrow();
    expect(() =>
      assertMediaObjectPath(
        {
          ...intent,
          path: `${ownerId}/college_gallery/a638378a-42c8-49d6-a995-ab3184e730e2/${objectId}.webp`,
        },
        ownerId,
      ),
    ).toThrow(MediaPolicyError);
    expect(() =>
      assertMediaObjectPath({ ...intent, path: "../../secret" }, ownerId),
    ).toThrow(MediaPolicyError);
  });

  it("does not let one user sign another user's self-scoped file", () => {
    const intent = parseMediaDownloadIntent({
      module: "resume",
      path: `${ownerId}/resume/self/${objectId}.pdf`,
    });

    expect(() =>
      assertMediaObjectPath(
        intent,
        "a638378a-42c8-49d6-a995-ab3184e730e2",
      ),
    ).toThrow(MediaPolicyError);
  });

  it("keeps applicant files owner-scoped unless delegated access is explicit", () => {
    const intent = parseMediaDownloadIntent({
      module: "application_file",
      resourceId,
      path: `${ownerId}/application_file/${resourceId}/${objectId}.pdf`,
    });
    const otherUser = "a638378a-42c8-49d6-a995-ab3184e730e2";

    expect(() => assertMediaObjectPath(intent, otherUser)).toThrow(
      MediaPolicyError,
    );
    expect(() => assertMediaObjectPath(intent, otherUser, true)).not.toThrow();
  });

  it("checks stored size and MIME metadata before signing a download", () => {
    expect(
      isAllowedStoredFile("resume", {
        size: 256_000,
        mimetype: "application/pdf",
      }),
    ).toBe(true);
    expect(
      isAllowedStoredFile("resume", {
        size: 256_000,
        mimetype: "text/html",
      }),
    ).toBe(false);
    expect(
      isAllowedStoredFile("resume", {
        size: 6 * 1024 * 1024,
        mimetype: "application/pdf",
      }),
    ).toBe(false);
  });
});
