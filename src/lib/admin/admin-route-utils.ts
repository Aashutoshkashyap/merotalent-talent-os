import { ApiAuthError } from "@/lib/server/auth";
import { jsonApiResponse } from "@/lib/server/api-response";
import { AdminResourceValidationError } from "./admin-resource-service";
import type { AdminResourceDefinition } from "./admin-resources";

const MAX_ADMIN_BODY_BYTES = 128 * 1024;

export class AdminRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "AdminRequestError";
  }
}

export const readAdminJsonBody = async (request: Request): Promise<unknown> => {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/json")) {
    throw new AdminRequestError(
      415,
      "UNSUPPORTED_MEDIA_TYPE",
      "Administrative writes must use application/json.",
    );
  }

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_ADMIN_BODY_BYTES) {
    throw new AdminRequestError(413, "PAYLOAD_TOO_LARGE", "The request body is too large.");
  }

  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_ADMIN_BODY_BYTES) {
    throw new AdminRequestError(413, "PAYLOAD_TOO_LARGE", "The request body is too large.");
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw new AdminRequestError(400, "INVALID_JSON", "The request body must be valid JSON.");
  }
};

export const adminApiErrorResponse = (
  error: unknown,
  requestId: string,
  operation: string,
) => {
  if (error instanceof ApiAuthError || error instanceof AdminRequestError) {
    return jsonApiResponse(
      {
        data: null,
        error: { code: error.code, message: error.message },
        meta: { requestId },
      },
      error.status,
    );
  }

  if (error instanceof AdminResourceValidationError) {
    return jsonApiResponse(
      {
        data: null,
        error: {
          code: "VALIDATION_FAILED",
          message: error.message,
          fields: error.fields,
        },
        meta: { requestId },
      },
      422,
    );
  }

  const databaseCode =
    error && typeof error === "object" && "code" in error
      ? String(error.code)
      : undefined;
  if (databaseCode === "23505") {
    return jsonApiResponse(
      {
        data: null,
        error: { code: "CONFLICT", message: "A record with these unique values already exists." },
        meta: { requestId },
      },
      409,
    );
  }
  if (databaseCode === "23503") {
    return jsonApiResponse(
      {
        data: null,
        error: { code: "RELATED_RECORD_NOT_FOUND", message: "A referenced record does not exist." },
        meta: { requestId },
      },
      409,
    );
  }
  if (databaseCode === "P0001") {
    return jsonApiResponse(
      {
        data: null,
        error: { code: "BUSINESS_RULE_CONFLICT", message: "This change would violate a platform safety rule." },
        meta: { requestId },
      },
      409,
    );
  }
  if (databaseCode === "42501" || databaseCode === "PGRST301") {
    return jsonApiResponse(
      {
        data: null,
        error: { code: "DATABASE_PERMISSION_DENIED", message: "This administrative action is not permitted." },
        meta: { requestId },
      },
      403,
    );
  }
  if (["23502", "23514"].includes(databaseCode ?? "") || databaseCode?.startsWith("22")) {
    return jsonApiResponse(
      {
        data: null,
        error: { code: "DATABASE_VALIDATION_FAILED", message: "The record violates a data rule." },
        meta: { requestId },
      },
      422,
    );
  }
  if (["42P01", "42703", "PGRST202", "PGRST204"].includes(databaseCode ?? "")) {
    console.error(`[admin-api] ${operation} requires an unavailable schema object`, {
      requestId,
      databaseCode,
    });
    return jsonApiResponse(
      {
        data: null,
        error: { code: "SERVICE_UNAVAILABLE", message: "This administrative resource is temporarily unavailable." },
        meta: { requestId },
      },
      503,
    );
  }

  console.error(`[admin-api] ${operation} failed`, { requestId, databaseCode });
  return jsonApiResponse(
    {
      data: null,
      error: { code: "ADMIN_OPERATION_FAILED", message: "The administrative operation could not be completed." },
      meta: { requestId },
    },
    500,
  );
};

export const throwDatabaseError = (error: unknown): never => {
  throw error;
};

export const applyAdminServerFields = (
  definition: AdminResourceDefinition,
  payload: Record<string, unknown>,
  actorUserId: string,
  operation: "create" | "update",
) => {
  const now = new Date().toISOString();
  if (definition.resource === "user-permissions" && operation === "create") {
    payload.granted_by = actorUserId;
  }
  if (definition.resource === "notifications" && operation === "create") {
    payload.sender_id = actorUserId;
  }
  if (
    ["partnered-courses", "advertisements", "featured-items"].includes(
      definition.resource,
    ) &&
    operation === "create"
  ) {
    payload.created_by = actorUserId;
  }

  if (definition.resource === "jobs") {
    if (payload.status === "published") {
      payload.approval_status = "approved";
      payload.approved_by = actorUserId;
      payload.approved_at = now;
      payload.rejection_reason = null;
      payload.is_active = true;
    } else if (payload.status === "rejected") {
      payload.approval_status = "rejected";
      payload.approved_by = null;
      payload.approved_at = null;
      payload.is_active = false;
    } else if (["draft", "pending_approval"].includes(String(payload.status))) {
      payload.approval_status = "pending";
      payload.approved_by = null;
      payload.approved_at = null;
      payload.rejection_reason = null;
      payload.is_active = false;
    } else if (["closed", "expired"].includes(String(payload.status))) {
      payload.is_active = false;
    }
  }
  if (definition.resource === "events") {
    if (payload.status === "approved" || payload.status === "published") {
      payload.approval_status = "approved";
      payload.approved_by = actorUserId;
      payload.approved_at = now;
      payload.rejection_reason = null;
    }
    if (payload.status === "published") payload.is_active = true;
    if (["rejected", "cancelled", "completed"].includes(String(payload.status))) {
      payload.is_active = false;
    }
    if (payload.status === "rejected") {
      payload.approval_status = "rejected";
      payload.approved_by = null;
      payload.approved_at = null;
    }
    if (payload.status === "draft" || payload.status === "pending_approval") {
      payload.approval_status = "pending";
      payload.approved_by = null;
      payload.approved_at = null;
      payload.rejection_reason = null;
      payload.is_active = false;
    }
  }
  if (definition.resource === "colleges" && typeof payload.status === "string") {
    payload.is_verified = payload.status === "approved";
  }
  if (definition.resource === "partnered-courses" && typeof payload.status === "string") {
    payload.is_published = payload.status === "published";
  }
  if (definition.resource === "advertisements" && typeof payload.status === "string") {
    payload.is_active = payload.status === "scheduled" || payload.status === "active";
  }
  if (definition.resource === "advertisements" && "destination_url" in payload) {
    payload.target_url = payload.destination_url;
  }
  if (definition.resource === "notifications" && typeof payload.status === "string") {
    if (payload.status === "sent") payload.sent_at = now;
    if (payload.status === "read") {
      payload.is_read = true;
      payload.read_at = now;
    }
  }
  if (definition.resource === "subscriptions" && payload.status === "cancelled") {
    payload.cancelled_at = now;
    payload.auto_renew = false;
  }
  if (definition.resource === "payments" && typeof payload.status === "string") {
    if (payload.status === "success") payload.paid_at = now;
    if (payload.status === "failed") payload.failed_at = now;
    if (payload.status === "refunded") payload.refunded_at = now;
  }

  return payload;
};
