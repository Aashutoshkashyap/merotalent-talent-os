/**
 * Neon Object Storage — S3-Compatible Client
 *
 * Replaces `getAdminClient().storage` (Supabase Storage SDK) for all
 * server-side presigned URL operations. Uses the AWS SDK v3 against the
 * Neon S3-compatible endpoint.
 *
 * Credentials are read from environment:
 *   AWS_ENDPOINT_URL_S3   — Neon storage endpoint
 *   AWS_ACCESS_KEY_ID     — Neon object storage key ID
 *   AWS_SECRET_ACCESS_KEY — Neon object storage secret
 *   AWS_REGION            — e.g. ap-southeast-1
 */

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { requireNeonBackend } from "./backend-mode";
import { getNeonConfig } from "@/lib/neon/neon-config";

import { ServerConfigurationError } from "./server-configuration-error";

// ---------------------------------------------------------------------------
// Client singleton
// ---------------------------------------------------------------------------

let _s3Client: S3Client | undefined;

function getS3Client(): S3Client {
  requireNeonBackend();
  // Reject a production-branch storage endpoint even when staging mode is set.
  getNeonConfig();
  if (_s3Client) return _s3Client;

  const endpoint = process.env.AWS_ENDPOINT_URL_S3;
  const region = process.env.AWS_REGION ?? "ap-southeast-1";
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new ServerConfigurationError(
      "Neon object storage is not configured. Set AWS_ENDPOINT_URL_S3, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY.",
    );
  }

  _s3Client = new S3Client({
    endpoint,
    region,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true, // Required for Neon S3-compatible API
    requestHandler: { connectionTimeout: 5000, requestTimeout: 15000 },
    maxAttempts: 2,
  });

  return _s3Client;
}

/** Server-buffered upload keeps actual size and MIME checks under our control. */
export async function uploadObject(
  bucket: string,
  path: string,
  bytes: Uint8Array,
  contentType: string,
): Promise<void> {
  await getS3Client().send(new PutObjectCommand({
    Bucket: bucket,
    Key: path,
    Body: bytes,
    ContentType: contentType,
    ContentLength: bytes.byteLength,
  }));
}

/** Bounded server read for validated private certificate backgrounds. */
export async function readObjectBytes(bucket: string, path: string, maxBytes = 20 * 1024 * 1024): Promise<Uint8Array> {
  const result = await getS3Client().send(new GetObjectCommand({ Bucket: bucket, Key: path }));
  if (!result.Body || !result.ContentLength || result.ContentLength > maxBytes) throw new Error("Object exceeds the permitted size.");
  const bytes = await result.Body.transformToByteArray();
  if (bytes.byteLength > maxBytes) throw new Error("Object exceeds the permitted size.");
  return bytes;
}

// ---------------------------------------------------------------------------
// Public surface
// ---------------------------------------------------------------------------

export interface PresignedUploadResult {
  /** The presigned PUT URL the client should upload to directly */
  uploadUrl: string;
  /** The canonical object path within the bucket */
  path: string;
  /** Expiry in seconds */
  expiresIn: number;
}

export interface PresignedDownloadResult {
  /** The presigned GET URL */
  signedUrl: string;
  /** Whether the response is a forced attachment download */
  download: boolean;
  expiresIn: number;
  expiresAt: string;
}

/**
 * Generate a presigned PUT URL for client-direct upload.
 * Replaces: `getAdminClient().storage.from(bucket).createSignedUploadUrl(path)`
 */
export async function createPresignedUploadUrl(
  bucket: string,
  path: string,
  contentType: string,
  expiresIn = 7200,
): Promise<PresignedUploadResult> {
  const s3 = getS3Client();
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: path,
    ContentType: contentType,
  });
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn });
  return { uploadUrl, path, expiresIn };
}

/**
 * Generate a presigned GET URL for private file access.
 * Replaces: `getAdminClient().storage.from(bucket).createSignedUrl(path, expiresIn)`
 */
export async function createPresignedDownloadUrl(
  bucket: string,
  path: string,
  expiresIn = 300,
  forceDownload = false,
): Promise<PresignedDownloadResult> {
  const s3 = getS3Client();
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: path,
    ...(forceDownload
      ? { ResponseContentDisposition: `attachment; filename="${path.split("/").pop()}"` }
      : {}),
  });
  const signedUrl = await getSignedUrl(s3, command, { expiresIn });
  return {
    signedUrl,
    download: forceDownload,
    expiresIn,
    expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
  };
}

/**
 * Check if an object exists and return its metadata.
 * Replaces: `getAdminClient().storage.from(bucket).list(directory, { search: fileName })`
 */
export async function headObject(
  bucket: string,
  path: string,
): Promise<{ contentType?: string; contentLength?: number } | null> {
  try {
    const s3 = getS3Client();
    const result = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: path }));
    return {
      contentType: result.ContentType,
      contentLength: result.ContentLength,
    };
  } catch (err: any) {
    // NoSuchKey / 404 → object does not exist
    if (err?.name === "NotFound" || err?.$metadata?.httpStatusCode === 404) {
      return null;
    }
    throw err;
  }
}

/**
 * Get a public URL for a publicly-accessible bucket object.
 * Replaces: `getAdminClient().storage.from(bucket).getPublicUrl(path)`
 */
export function getPublicUrl(bucket: string, path: string): string {
  requireNeonBackend();
  const endpoint = process.env.AWS_ENDPOINT_URL_S3;
  if (!endpoint) {
    throw new ServerConfigurationError(
      "Neon object storage endpoint is not configured.",
    );
  }
  return `${endpoint.replace(/\/$/, "")}/${encodeURIComponent(bucket)}/${path.split("/").map(encodeURIComponent).join("/")}`;
}

/**
 * Delete an object from storage.
 * Replaces: `getAdminClient().storage.from(bucket).remove([path])`
 */
export async function deleteObject(bucket: string, path: string): Promise<void> {
  const s3 = getS3Client();
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: path }));
}
