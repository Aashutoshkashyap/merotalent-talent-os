/** Mode-aware storage boundary. Existing routes keep using Supabase until migrated. */
import { getBackendMode } from "./backend-mode";
import { getAdminClient } from "./supabase";
import {
  createPresignedDownloadUrl,
  deleteObject,
  headObject,
  uploadObject,
} from "./storage";
import {
  assertMediaObjectPath,
  mediaPolicies,
  parseMediaDownloadIntent,
  parseMediaUploadIntent,
  type MediaModule,
} from "./media-policy";
import { requireEntityAccess, type NeonActor } from "./neon-authorization";

const publicModules = new Set<MediaModule>([
  "profile_avatar", "college_logo", "college_cover", "college_gallery",
  "mentor_profile", "event_cover", "course_thumbnail", "advertisement",
]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class ApplicationStorageError extends Error {
  constructor(readonly status: 403 | 404 | 413 | 415 | 503, message: string) {
    super(message);
    this.name = "ApplicationStorageError";
  }
}

function scopedPath(module: MediaModule, resourceId: string | null, path: string, actorUserId: string) {
  // Imported legacy resumes have the older <owner-uuid>/<filename> shape.
  // The bucket remains private and the owner must still match the actor.
  if (module === "resume" && resourceId === null) {
    const parts = path.split("/");
    if (parts.length === 2 && uuidPattern.test(parts[0]) &&
        /^[A-Za-z0-9._-]{1,180}\.(pdf|doc|docx)$/i.test(parts[1]) &&
        !parts[1].includes("..")) {
      return parts[0];
    }
  }
  const owner = assertMediaObjectPath({ module, resourceId, path }, actorUserId, true);
  return owner;
}

async function authorizeObject(
  actor: NeonActor,
  module: MediaModule,
  resourceId: string | null,
  path: string,
): Promise<void> {
  const ownerId = scopedPath(module, resourceId, path, actor.userId);
  if (actor.platformAdmin) return;
  if (module === "resume" || module === "profile_avatar") {
    if (ownerId !== actor.userId) throw new ApplicationStorageError(403, "Private object belongs to another user.");
    return;
  }
  if (module.startsWith("college_") && resourceId) {
    if (ownerId !== actor.userId) {
      throw new ApplicationStorageError(403, "Institute media path belongs to another uploader.");
    }
    await requireEntityAccess(actor, "college", "college", resourceId, "media_management");
    return;
  }
  // Other cross-user document and listing-media ownership rules still depend
  // on source-specific RPC behavior. Keep them closed until ported exactly.
  throw new ApplicationStorageError(403, "Storage authorization is not yet available for this module.");
}

/** Managed media operation; public listing reads remain available separately. */
export async function managedInstituteMediaSignedUrl(
  actor: NeonActor,
  input: { module: "college_logo" | "college_cover" | "college_gallery"; instituteId: string; path: string },
): Promise<string> {
  if (getBackendMode() !== "neon-staging") {
    throw new ApplicationStorageError(503, "Legacy institute media uses the existing storage route.");
  }
  await authorizeObject(actor, input.module, input.instituteId, input.path);
  const bucket = mediaPolicies[input.module].bucket;
  if (!await headObject(bucket, input.path)) throw new ApplicationStorageError(404, "Object not found.");
  return (await createPresignedDownloadUrl(bucket, input.path, 300)).signedUrl;
}

/** Only delete an exact canonical object uploaded by this actor for this institute. */
export async function deleteInstituteMedia(
  actor: NeonActor,
  input: { module: "college_logo" | "college_cover" | "college_gallery"; instituteId: string; path: string },
): Promise<void> {
  if (getBackendMode() !== "neon-staging") {
    throw new ApplicationStorageError(503, "Legacy institute media uses the existing storage route.");
  }
  await authorizeObject(actor, input.module, input.instituteId, input.path);
  const bucket = mediaPolicies[input.module].bucket;
  if (!await headObject(bucket, input.path)) throw new ApplicationStorageError(404, "Object not found.");
  await deleteObject(bucket, input.path);
}

export async function publicObjectUrl(module: MediaModule, path: string): Promise<string> {
  if (!publicModules.has(module)) throw new ApplicationStorageError(403, "This bucket is private.");
  // Older imported public objects do not all use the four-segment upload path.
  // They are public, but traversal/URL injection is still forbidden.
  if (!path || path.length > 512 || path.includes("\\") || path.includes("%") ||
      path.includes("://") || path.split("/").some((part) => !part || part === "." || part === "..")) {
    throw new ApplicationStorageError(403, "Invalid public object path.");
  }
  const bucket = mediaPolicies[module].bucket;
  if (getBackendMode() === "legacy") {
    return getAdminClient().storage.from(bucket).getPublicUrl(path).data.publicUrl;
  }
  // Neon S3 currently returns 403 for anonymous GET even on imported buckets
  // marked public in Supabase. Sign the read until a reviewed public CDN/bucket
  // policy is configured; never return a known-broken direct S3 URL.
  return (await createPresignedDownloadUrl(bucket, path, 3600)).signedUrl;
}

export async function privateDownloadUrl(
  actor: NeonActor,
  input: { module: MediaModule; resourceId?: string | null; path: string; expiresIn?: number },
): Promise<string> {
  const intent = parseMediaDownloadIntent({ ...input, download: true });
  if (publicModules.has(intent.module)) throw new ApplicationStorageError(403, "Use the public media URL.");
  if (getBackendMode() !== "neon-staging") {
    throw new ApplicationStorageError(503, "Legacy private downloads use the existing authorized media route.");
  }
  await authorizeObject(actor, intent.module, intent.resourceId, intent.path);
  const bucket = mediaPolicies[intent.module].bucket;
  if (!await headObject(bucket, intent.path)) throw new ApplicationStorageError(404, "Object not found.");
  return (await createPresignedDownloadUrl(bucket, intent.path, intent.expiresIn, true)).signedUrl;
}

export async function uploadBytes(
  actor: NeonActor,
  input: { module: MediaModule; resourceId?: string | null; fileName: string; contentType: string; bytes: Uint8Array; path: string },
): Promise<{ bucket: string; path: string }> {
  const intent = parseMediaUploadIntent({
    module: input.module, resourceId: input.resourceId ?? null,
    fileName: input.fileName, contentType: input.contentType, sizeBytes: input.bytes.byteLength,
  });
  if (getBackendMode() !== "neon-staging") {
    throw new ApplicationStorageError(503, "Legacy uploads use the existing authorized media route.");
  }
  await authorizeObject(actor, intent.module, intent.resourceId, input.path);
  if (await headObject(mediaPolicies[intent.module].bucket, input.path)) {
    throw new ApplicationStorageError(403, "Refusing to overwrite an existing object.");
  }
  const bucket = mediaPolicies[intent.module].bucket;
  await uploadObject(bucket, input.path, input.bytes, intent.contentType);
  return { bucket, path: input.path };
}
