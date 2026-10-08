/**
 * Neon Object Storage S3-Compatible Adapter
 *
 * Bucket validation contract only. This module deliberately does not mint
 * URLs: its old query-string placeholders were not cryptographic signatures.
 * Use a server-authorized route backed by `src/lib/server/storage.ts` instead.
 */

export interface StorageBucketConfig {
  name: string;
  isPublic: boolean;
  allowedMimeTypes: string[];
  maxSizeBytes: number;
}

export const STORAGE_BUCKET_DEFINITIONS: Record<string, StorageBucketConfig> = {
  "college-media": {
    name: "college-media",
    isPublic: true,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    maxSizeBytes: 5 * 1024 * 1024,
  },
  "profile-media": {
    name: "profile-media",
    isPublic: true,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    maxSizeBytes: 5 * 1024 * 1024,
  },
  "ad-media": {
    name: "ad-media",
    isPublic: true,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    maxSizeBytes: 5 * 1024 * 1024,
  },
  "event-media": {
    name: "event-media",
    isPublic: true,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    maxSizeBytes: 5 * 1024 * 1024,
  },
  "job-files": {
    name: "job-files",
    isPublic: false,
    allowedMimeTypes: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    maxSizeBytes: 10 * 1024 * 1024,
  },
  "resumes": {
    name: "resumes",
    isPublic: false,
    allowedMimeTypes: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    maxSizeBytes: 5 * 1024 * 1024,
  },
  "payment-proofs": {
    name: "payment-proofs",
    isPublic: false,
    allowedMimeTypes: ["image/jpeg", "image/png", "application/pdf"],
    maxSizeBytes: 10 * 1024 * 1024,
  },
  "application-files": {
    name: "application-files",
    isPublic: false,
    allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png"],
    maxSizeBytes: 10 * 1024 * 1024,
  },
};

export class NeonStorageService {
  constructor(_endpoint?: string) {}

  /**
   * Generates a presigned PUT URL for client-direct upload.
   */
  async createPresignedUploadUrl(
    bucket: string,
    _key: string,
    contentType: string,
    sizeBytes: number,
    _expiresInSeconds = 300
  ): Promise<{ uploadUrl: string; key: string; publicUrl?: string }> {
    const config = STORAGE_BUCKET_DEFINITIONS[bucket];
    if (!config) {
      throw new Error(`Bucket '${bucket}' is not configured.`);
    }

    if (!config.allowedMimeTypes.includes(contentType)) {
      throw new Error(`File type '${contentType}' is not permitted in bucket '${bucket}'.`);
    }

    if (sizeBytes > config.maxSizeBytes) {
      throw new Error(`File size exceeds maximum permitted (${config.maxSizeBytes / (1024 * 1024)}MB).`);
    }

    throw new Error("Presigned uploads require server-side authorization and a real S3 signature.");
  }

  /**
   * Generates a presigned GET URL for private file access.
   */
  async createPresignedDownloadUrl(
    bucket: string,
    _key: string,
    _expiresInSeconds = 3600
  ): Promise<string> {
    const config = STORAGE_BUCKET_DEFINITIONS[bucket];
    if (!config) {
      throw new Error(`Bucket '${bucket}' does not exist.`);
    }

    throw new Error("Presigned downloads require server-side authorization and a real S3 signature.");
  }
}

export const neonStorage = new NeonStorageService();
