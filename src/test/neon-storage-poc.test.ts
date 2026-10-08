import { describe, expect, it } from "vitest";
import {
  NeonStorageService,
  STORAGE_BUCKET_DEFINITIONS,
} from "@/lib/neon/neon-storage";

describe("Neon Object Storage S3 Presigned URL POC (Phase 8)", () => {
  const storage = new NeonStorageService("https://storage.summer-sky-63693897.neon.tech");

  it("configures exact bucket permissions and allowed MIME types", () => {
    expect(STORAGE_BUCKET_DEFINITIONS["college-media"].isPublic).toBe(true);
    expect(STORAGE_BUCKET_DEFINITIONS["resumes"].isPublic).toBe(false);
    expect(STORAGE_BUCKET_DEFINITIONS["payment-proofs"].isPublic).toBe(false);
    expect(STORAGE_BUCKET_DEFINITIONS["job-files"].isPublic).toBe(false);
  });

  it("validates uploads but never fabricates a presigned URL", async () => {
    await expect(storage.createPresignedUploadUrl(
      "college-media",
      "campuses/kathmandu-main.jpg",
      "image/jpeg",
      1024 * 500,
    )).rejects.toThrow("real S3 signature");

    // Invalid MIME type rejected
    await expect(
      storage.createPresignedUploadUrl(
        "college-media",
        "script.exe",
        "application/x-msdownload",
        1000
      )
    ).rejects.toThrow("File type 'application/x-msdownload' is not permitted in bucket 'college-media'.");

    // File exceeding limit rejected
    await expect(
      storage.createPresignedUploadUrl(
        "college-media",
        "huge.jpg",
        "image/jpeg",
        10 * 1024 * 1024 // 10MB exceeds 5MB limit
      )
    ).rejects.toThrow("File size exceeds maximum permitted");
  });

  it("never fabricates private download URLs", async () => {
    await expect(storage.createPresignedDownloadUrl(
      "resumes",
      "user_123/cv.pdf",
      3600
    )).rejects.toThrow("real S3 signature");
  });
});
