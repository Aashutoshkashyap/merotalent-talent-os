import { authenticateAdminRequest } from "@/lib/server/auth";
import { jsonApiResponse } from "@/lib/server/api-response";
import {
  getAdminResource,
  isAdminResourceName,
} from "@/lib/admin/admin-resources";
import {
  sanitizeAdminWrite,
  validateAdminResourceId,
} from "@/lib/admin/admin-resource-service";
import {
  adminApiErrorResponse,
  applyAdminServerFields,
  readAdminJsonBody,
  throwDatabaseError,
} from "@/lib/admin/admin-route-utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ resource: string; id: string }>;
}

const resolveTarget = async (context: RouteContext) => {
  const { resource, id } = await context.params;
  return {
    definition: isAdminResourceName(resource) ? getAdminResource(resource) : null,
    id,
  };
};

const resourceNotFound = (requestId: string) =>
  jsonApiResponse(
    {
      data: null,
      error: { code: "ADMIN_RESOURCE_NOT_FOUND", message: "The requested admin resource does not exist." },
      meta: { requestId },
    },
    404,
  );

const recordNotFound = (requestId: string) =>
  jsonApiResponse(
    {
      data: null,
      error: { code: "RECORD_NOT_FOUND", message: "The requested record does not exist." },
      meta: { requestId },
    },
    404,
  );

export async function GET(request: Request, context: RouteContext) {
  const requestId = crypto.randomUUID();
  let authenticated;
  try {
    authenticated = await authenticateAdminRequest(request);
  } catch (error) {
    return adminApiErrorResponse(error, requestId, "authenticate admin resource read");
  }

  const { definition, id: rawId } = await resolveTarget(context);
  if (!definition) return resourceNotFound(requestId);

  try {
    const id = validateAdminResourceId(rawId);
    const { userClient } = authenticated;
    let query = userClient.from(definition.table).select(definition.select).eq("id", id);
    for (const [column, value] of Object.entries(definition.scope ?? {})) {
      query = query.eq(column, value);
    }
    if (definition.softDelete) {
      query = definition.softDelete.mode === "timestamp"
        ? query.is(definition.softDelete.column, null)
        : query.neq(definition.softDelete.column, definition.softDelete.value);
    }
    const { data, error } = await query.maybeSingle();
    if (error) throwDatabaseError(error);
    if (!data) return recordNotFound(requestId);
    return jsonApiResponse({ data, error: null, meta: { requestId } }, 200);
  } catch (error) {
    return adminApiErrorResponse(error, requestId, `read ${definition.resource}`);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const requestId = crypto.randomUUID();
  let authenticated;
  try {
    authenticated = await authenticateAdminRequest(request);
  } catch (error) {
    return adminApiErrorResponse(error, requestId, "authenticate admin resource update");
  }

  const { definition, id: rawId } = await resolveTarget(context);
  if (!definition) return resourceNotFound(requestId);

  try {
    const id = validateAdminResourceId(rawId);
    const { userClient, user } = authenticated;
    const payload = sanitizeAdminWrite(
      definition,
      "update",
      await readAdminJsonBody(request),
    );
    Object.assign(payload, definition.scope ?? {});
    applyAdminServerFields(definition, payload, user.id, "update");
    let mutation = userClient
      .from(definition.table)
      .update(payload)
      .eq("id", id);
    for (const [column, value] of Object.entries(definition.scope ?? {})) {
      mutation = mutation.eq(column, value);
    }
    if (definition.softDelete) {
      mutation = definition.softDelete.mode === "timestamp"
        ? mutation.is(definition.softDelete.column, null)
        : mutation.neq(definition.softDelete.column, definition.softDelete.value);
    }
    const { data, error } = await mutation.select(definition.select).maybeSingle();
    if (error) throwDatabaseError(error);
    if (!data) return recordNotFound(requestId);
    return jsonApiResponse({ data, error: null, meta: { requestId } }, 200);
  } catch (error) {
    return adminApiErrorResponse(error, requestId, `update ${definition.resource}`);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const requestId = crypto.randomUUID();
  let authenticated;
  try {
    authenticated = await authenticateAdminRequest(request);
  } catch (error) {
    return adminApiErrorResponse(error, requestId, "authenticate admin resource delete");
  }

  const { definition, id: rawId } = await resolveTarget(context);
  if (!definition) return resourceNotFound(requestId);
  if (!definition.deletable || (!definition.softDelete && !definition.hardDelete)) {
    return jsonApiResponse(
      {
        data: null,
        error: { code: "DELETE_NOT_ALLOWED", message: "This resource cannot be deleted." },
        meta: { requestId },
      },
      405,
    );
  }

  try {
    const id = validateAdminResourceId(rawId);
    const { userClient } = authenticated;
    let mutation;
    if (definition.softDelete) {
      const patch = definition.softDelete.mode === "timestamp"
        ? {
            ...definition.softDelete.patch,
            [definition.softDelete.column]: new Date().toISOString(),
          }
        : {
            ...definition.softDelete.patch,
            [definition.softDelete.column]: definition.softDelete.value,
          };
      let softDeleteMutation = userClient.from(definition.table).update(patch).eq("id", id);
      for (const [column, value] of Object.entries(definition.scope ?? {})) {
        softDeleteMutation = softDeleteMutation.eq(column, value);
      }
      softDeleteMutation = definition.softDelete.mode === "timestamp"
        ? softDeleteMutation.is(definition.softDelete.column, null)
        : softDeleteMutation.neq(definition.softDelete.column, definition.softDelete.value);
      mutation = softDeleteMutation.select("id").maybeSingle();
    } else {
      // Hard deletion is only enabled for role/permission assignment rows,
      // where deletion means explicit revocation rather than data erasure.
      let hardDeleteMutation = userClient.from(definition.table).delete().eq("id", id);
      for (const [column, value] of Object.entries(definition.scope ?? {})) {
        hardDeleteMutation = hardDeleteMutation.eq(column, value);
      }
      mutation = hardDeleteMutation.select("id").maybeSingle();
    }
    const { data, error } = await mutation;
    if (error) throwDatabaseError(error);
    if (!data) return recordNotFound(requestId);
    return jsonApiResponse(
      { data: { id, deleted: true }, error: null, meta: { requestId } },
      200,
    );
  } catch (error) {
    return adminApiErrorResponse(error, requestId, `delete ${definition.resource}`);
  }
}
