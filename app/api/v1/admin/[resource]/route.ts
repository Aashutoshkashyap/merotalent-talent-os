import { authenticateAdminRequest } from "@/lib/server/auth";
import { getBackendMode } from "@/lib/server/backend-mode";
import { handleNeonAdminResource } from "@/lib/server/neon-admin-resource-route";
import { jsonApiResponse } from "@/lib/server/api-response";
import {
  getAdminResource,
  isAdminResourceName,
} from "@/lib/admin/admin-resources";
import {
  parseAdminListQuery,
  sanitizeAdminWrite,
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
  params: Promise<{ resource: string }>;
}

const resolveResource = async (context: RouteContext) => {
  const { resource } = await context.params;
  return resource !== "companies" && isAdminResourceName(resource) ? getAdminResource(resource) : null;
};

export async function GET(request: Request, context: RouteContext) {
  if (getBackendMode() === "neon-staging") return handleNeonAdminResource(request,(await context.params).resource);
  const requestId = crypto.randomUUID();
  let authenticated;
  try {
    authenticated = await authenticateAdminRequest(request);
  } catch (error) {
    return adminApiErrorResponse(error, requestId, "authenticate admin resource list");
  }

  const definition = await resolveResource(context);
  if (!definition) {
    return jsonApiResponse(
      {
        data: null,
        error: { code: "ADMIN_RESOURCE_NOT_FOUND", message: "The requested admin resource does not exist." },
        meta: { requestId },
      },
      404,
    );
  }
  try {
    const { userClient } = authenticated;
    const list = parseAdminListQuery(definition, new URL(request.url).searchParams);
    let query = userClient
      .from(definition.table)
      .select(definition.select, { count: "exact" });

    if (definition.softDelete && !list.includeDeleted) {
      query = definition.softDelete.mode === "timestamp"
        ? query.is(definition.softDelete.column, null)
        : query.neq(definition.softDelete.column, definition.softDelete.value);
    }
    for (const [column, value] of Object.entries(definition.scope ?? {})) {
      query = query.eq(column, value);
    }
    for (const [column, value] of Object.entries(list.filters)) {
      query = query.eq(column, value);
    }
    if (list.search && definition.searchColumn) {
      const escapedSearch = list.search.replace(/[\\%_]/g, (character) => `\\${character}`);
      query = query.ilike(definition.searchColumn, `%${escapedSearch}%`);
    }

    const { data, count, error } = await query
      .order(list.sortBy, { ascending: list.ascending })
      .range(list.offset, list.offset + list.pageSize - 1);
    if (error) throwDatabaseError(error);

    return jsonApiResponse(
      {
        data: data ?? [],
        error: null,
        meta: {
          requestId,
          page: list.page,
          pageSize: list.pageSize,
          total: count ?? 0,
          totalPages: Math.ceil((count ?? 0) / list.pageSize),
          sortBy: list.sortBy,
          sortDirection: list.ascending ? "asc" : "desc",
        },
      },
      200,
    );
  } catch (error) {
    return adminApiErrorResponse(error, requestId, `list ${definition.resource}`);
  }
}

export async function POST(request: Request, context: RouteContext) {
  if (getBackendMode() === "neon-staging") return handleNeonAdminResource(request,(await context.params).resource);
  const requestId = crypto.randomUUID();
  let authenticated;
  try {
    authenticated = await authenticateAdminRequest(request);
  } catch (error) {
    return adminApiErrorResponse(error, requestId, "authenticate admin resource create");
  }

  const definition = await resolveResource(context);
  if (!definition) {
    return jsonApiResponse(
      {
        data: null,
        error: { code: "ADMIN_RESOURCE_NOT_FOUND", message: "The requested admin resource does not exist." },
        meta: { requestId },
      },
      404,
    );
  }
  if (definition.creatable === false) {
    return jsonApiResponse(
      {
        data: null,
        error: {
          code: "CREATE_NOT_ALLOWED",
          message: "This resource must be created through its dedicated secure workflow.",
        },
        meta: { requestId },
      },
      405,
    );
  }

  try {
    const { userClient, user } = authenticated;
    const payload = sanitizeAdminWrite(
      definition,
      "create",
      await readAdminJsonBody(request),
    );
    Object.assign(payload, definition.scope ?? {});
    applyAdminServerFields(definition, payload, user.id, "create");

    const { data, error } = await userClient
      .from(definition.table)
      .insert(payload)
      .select(definition.select)
      .single();
    if (error) throwDatabaseError(error);

    return jsonApiResponse(
      { data, error: null, meta: { requestId } },
      201,
    );
  } catch (error) {
    return adminApiErrorResponse(error, requestId, `create ${definition.resource}`);
  }
}
