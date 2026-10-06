import { z } from "zod";

import {
  hasAnyPermission,
  hasAnyRole,
  type AuthenticatedActor,
} from "./auth";

const megabyte = 1024 * 1024;

const imageMimeTypes = [
  "image/avif",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

const documentMimeTypes = [
  "application/msword",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

const mimeExtensions: Record<string, readonly string[]> = {
  "application/msword": ["doc"],
  "application/pdf": ["pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    "docx",
  ],
  "image/avif": ["avif"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
};

export const mediaModuleNames = [
  "profile_avatar",
  "resume",
  "college_logo",
  "college_cover",
  "college_gallery",
  "mentor_profile",
  "job_attachment",
  "application_file",
  "event_cover",
  "event_attachment",
  "course_thumbnail",
  "advertisement",
] as const;

export type MediaModule = (typeof mediaModuleNames)[number];
export type MediaAction = "upload" | "download";

interface MediaPolicy {
  bucket: string;
  maxBytes: number;
  mimeTypes: readonly string[];
  resourceRequired: boolean;
  permission?: string;
}

export const mediaPolicies: Record<MediaModule, MediaPolicy> = {
  profile_avatar: {
    bucket: "profile-media",
    maxBytes: 5 * megabyte,
    mimeTypes: imageMimeTypes,
    resourceRequired: false,
  },
  resume: {
    bucket: "resumes",
    maxBytes: 5 * megabyte,
    mimeTypes: documentMimeTypes,
    resourceRequired: false,
  },
  college_logo: {
    bucket: "college-media",
    maxBytes: 3 * megabyte,
    mimeTypes: imageMimeTypes,
    resourceRequired: true,
    permission: "college.manage",
  },
  college_cover: {
    bucket: "college-media",
    maxBytes: 8 * megabyte,
    mimeTypes: imageMimeTypes,
    resourceRequired: true,
    permission: "college.manage",
  },
  college_gallery: {
    bucket: "college-media",
    maxBytes: 8 * megabyte,
    mimeTypes: imageMimeTypes,
    resourceRequired: true,
    permission: "college.manage",
  },
  mentor_profile: {
    bucket: "mentor-media",
    maxBytes: 5 * megabyte,
    mimeTypes: imageMimeTypes,
    resourceRequired: true,
    permission: "mentor.manage",
  },
  job_attachment: {
    bucket: "job-files",
    maxBytes: 5 * megabyte,
    mimeTypes: documentMimeTypes,
    resourceRequired: true,
  },
  application_file: {
    bucket: "application-files",
    maxBytes: 5 * megabyte,
    mimeTypes: documentMimeTypes,
    resourceRequired: true,
  },
  event_cover: {
    bucket: "event-media",
    maxBytes: 8 * megabyte,
    mimeTypes: imageMimeTypes,
    resourceRequired: true,
    permission: "event.organize",
  },
  event_attachment: {
    bucket: "event-attachments",
    maxBytes: 10 * megabyte,
    mimeTypes: documentMimeTypes,
    resourceRequired: true,
    permission: "event.organize",
  },
  course_thumbnail: {
    bucket: "course-media",
    maxBytes: 5 * megabyte,
    mimeTypes: imageMimeTypes,
    resourceRequired: true,
    permission: "course.manage",
  },
  advertisement: {
    bucket: "ad-media",
    maxBytes: 5 * megabyte,
    mimeTypes: imageMimeTypes,
    resourceRequired: true,
    permission: "media.manage",
  },
};

const uploadIntentSchema = z
  .object({
    module: z.enum(mediaModuleNames),
    resourceId: z.string().uuid().optional().nullable(),
    fileName: z
      .string()
      .trim()
      .min(1)
      .max(180)
      .refine(
        (value) => !/[\\/\u0000-\u001f\u007f]/.test(value),
        "The file name contains unsupported characters.",
      ),
    contentType: z.string().trim().toLowerCase().max(160),
    sizeBytes: z.number().int().positive(),
  })
  .strict();

const downloadIntentSchema = z
  .object({
    module: z.enum(mediaModuleNames),
    resourceId: z.string().uuid().optional().nullable(),
    path: z.string().min(1).max(512),
    expiresIn: z.number().int().min(60).max(3600).optional().default(300),
    download: z.boolean().optional().default(false),
  })
  .strict();

export interface MediaUploadIntent {
  module: MediaModule;
  resourceId: string | null;
  fileName: string;
  contentType: string;
  sizeBytes: number;
}

export interface MediaDownloadIntent {
  module: MediaModule;
  resourceId: string | null;
  path: string;
  expiresIn: number;
  download: boolean;
}

export class MediaPolicyError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "MediaPolicyError";
  }
}

function zodFields(error: z.ZodError): Record<string, string[]> {
  const fields: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "body";
    fields[key] = [...(fields[key] ?? []), issue.message];
  }
  return fields;
}

function fileExtension(fileName: string): string | null {
  const match = /\.([a-zA-Z0-9]+)$/.exec(fileName);
  return match?.[1].toLowerCase() ?? null;
}

function validateResourceRequirement(
  module: MediaModule,
  resourceId: string | null,
) {
  const policy = mediaPolicies[module];
  if (policy.resourceRequired && !resourceId) {
    throw new MediaPolicyError(
      422,
      "RESOURCE_REQUIRED",
      "A resource ID is required for this media module.",
      { resourceId: ["A resource ID is required for this media module."] },
    );
  }
  if (!policy.resourceRequired && resourceId) {
    throw new MediaPolicyError(
      422,
      "RESOURCE_NOT_ALLOWED",
      "This media module is scoped to the signed-in user.",
      { resourceId: ["Do not provide a resource ID for this media module."] },
    );
  }
}

export function parseMediaUploadIntent(input: unknown): MediaUploadIntent {
  const parsed = uploadIntentSchema.safeParse(input);
  if (!parsed.success) {
    throw new MediaPolicyError(
      422,
      "VALIDATION_FAILED",
      "The media upload request is invalid.",
      zodFields(parsed.error),
    );
  }

  const resourceId = parsed.data.resourceId ?? null;
  const policy = mediaPolicies[parsed.data.module];
  validateResourceRequirement(parsed.data.module, resourceId);

  if (!policy.mimeTypes.includes(parsed.data.contentType)) {
    throw new MediaPolicyError(
      415,
      "FILE_TYPE_NOT_ALLOWED",
      "This file type is not allowed for the selected media module.",
      { contentType: ["Choose one of the allowed file types."] },
    );
  }
  if (parsed.data.sizeBytes > policy.maxBytes) {
    throw new MediaPolicyError(
      413,
      "FILE_TOO_LARGE",
      "The file exceeds the size limit for the selected media module.",
      { sizeBytes: [`The maximum size is ${policy.maxBytes} bytes.`] },
    );
  }

  const extension = fileExtension(parsed.data.fileName);
  const allowedExtensions = mimeExtensions[parsed.data.contentType] ?? [];
  if (!extension || !allowedExtensions.includes(extension)) {
    throw new MediaPolicyError(
      422,
      "FILE_EXTENSION_MISMATCH",
      "The file extension does not match its content type.",
      { fileName: ["The file extension and content type must match."] },
    );
  }

  return {
    module: parsed.data.module as MediaModule,
    resourceId,
    fileName: parsed.data.fileName as string,
    contentType: parsed.data.contentType as string,
    sizeBytes: parsed.data.sizeBytes as number,
  };
}

export function parseMediaDownloadIntent(input: unknown): MediaDownloadIntent {
  const parsed = downloadIntentSchema.safeParse(input);
  if (!parsed.success) {
    throw new MediaPolicyError(
      422,
      "VALIDATION_FAILED",
      "The media download request is invalid.",
      zodFields(parsed.error),
    );
  }

  const resourceId = parsed.data.resourceId ?? null;
  validateResourceRequirement(parsed.data.module, resourceId);
  return {
    module: parsed.data.module as MediaModule,
    resourceId,
    path: parsed.data.path as string,
    expiresIn: parsed.data.expiresIn as number,
    download: parsed.data.download as boolean,
  };
}

export function assertMediaCapability(
  actor: AuthenticatedActor,
  module: MediaModule,
): void {
  if (
    hasAnyRole(actor, ["super_admin", "admin"]) ||
    hasAnyPermission(actor, ["media.manage"])
  ) {
    return;
  }

  const permission = mediaPolicies[module].permission;
  if (permission && !hasAnyPermission(actor, [permission])) {
    throw new MediaPolicyError(
      403,
      "MEDIA_PERMISSION_REQUIRED",
      "Your account cannot manage this type of media.",
    );
  }
}

export function canReadForeignOwnerMedia(
  actor: AuthenticatedActor,
  module: MediaModule,
): boolean {
  if (hasAnyRole(actor, ["super_admin", "admin"])) {
    return true;
  }

  if (module === "job_attachment") {
    return (
      hasAnyPermission(actor, ["job.post"]) &&
      hasAnyPermission(actor, ["lead.view"])
    );
  }
  if (module === "application_file") {
    return (
      hasAnyPermission(actor, ["college.manage"]) &&
      hasAnyPermission(actor, ["lead.view"])
    );
  }

  const permission = mediaPolicies[module].permission;
  return permission ? hasAnyPermission(actor, [permission]) : false;
}

export function buildMediaObjectPath(
  intent: MediaUploadIntent,
  ownerUserId: string,
  objectId = crypto.randomUUID(),
): string {
  const extension = mimeExtensions[intent.contentType]?.[0];
  if (!extension) {
    throw new MediaPolicyError(
      415,
      "FILE_TYPE_NOT_ALLOWED",
      "This file type is not allowed.",
    );
  }

  return [
    ownerUserId,
    intent.module,
    intent.resourceId ?? "self",
    `${objectId}.${extension}`,
  ].join("/");
}

export function assertMediaObjectPath(
  intent: Pick<MediaDownloadIntent, "module" | "resourceId" | "path">,
  actorUserId: string,
  allowForeignOwner = false,
): string {
  if (
    intent.path.includes("\\") ||
    intent.path.includes("%") ||
    intent.path.includes("\u0000")
  ) {
    throw new MediaPolicyError(422, "INVALID_MEDIA_PATH", "The media path is invalid.");
  }

  const parts = intent.path.split("/");
  if (parts.length !== 4 || parts.some((part) => !part)) {
    throw new MediaPolicyError(422, "INVALID_MEDIA_PATH", "The media path is invalid.");
  }

  const [ownerId, module, resourceScope, objectName] = parts;
  const uuid = z.string().uuid();
  if (!uuid.safeParse(ownerId).success || module !== intent.module) {
    throw new MediaPolicyError(422, "INVALID_MEDIA_PATH", "The media path is invalid.");
  }

  const expectedScope = intent.resourceId ?? "self";
  if (resourceScope !== expectedScope) {
    throw new MediaPolicyError(
      403,
      "MEDIA_SCOPE_MISMATCH",
      "The media object does not belong to the requested resource.",
    );
  }
  if (ownerId !== actorUserId && !allowForeignOwner) {
    throw new MediaPolicyError(
      403,
      "MEDIA_OWNER_MISMATCH",
      "The media object does not belong to the signed-in user.",
    );
  }

  const objectMatch = /^([0-9a-f-]{36})\.([a-z0-9]+)$/i.exec(objectName);
  if (!objectMatch || !uuid.safeParse(objectMatch[1]).success) {
    throw new MediaPolicyError(422, "INVALID_MEDIA_PATH", "The media path is invalid.");
  }

  const allowedExtensions = new Set(
    mediaPolicies[intent.module].mimeTypes.flatMap(
      (mimeType) => mimeExtensions[mimeType] ?? [],
    ),
  );
  if (!allowedExtensions.has(objectMatch[2].toLowerCase())) {
    throw new MediaPolicyError(
      415,
      "FILE_TYPE_NOT_ALLOWED",
      "This file type is not allowed for the selected media module.",
    );
  }

  return ownerId;
}

export function isAllowedStoredFile(
  module: MediaModule,
  metadata: Record<string, unknown> | null | undefined,
): boolean {
  if (!metadata) return false;
  const size = Number(metadata.size);
  const mimeType =
    typeof metadata.mimetype === "string"
      ? metadata.mimetype.toLowerCase()
      : typeof metadata.contentType === "string"
        ? metadata.contentType.toLowerCase()
        : null;
  const policy = mediaPolicies[module];
  return (
    Number.isFinite(size) &&
    size > 0 &&
    size <= policy.maxBytes &&
    mimeType !== null &&
    policy.mimeTypes.includes(mimeType)
  );
}
