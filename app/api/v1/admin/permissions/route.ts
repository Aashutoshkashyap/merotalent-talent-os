import { authenticateAdminRequest } from "@/lib/server/auth";
import { jsonApiResponse } from "@/lib/server/api-response";
import {
  adminApiErrorResponse,
  throwDatabaseError,
} from "@/lib/admin/admin-route-utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const { userClient } = await authenticateAdminRequest(request);
    const { data, error } = await userClient
      .from("permissions")
      .select("id,code,description")
      .order("code", { ascending: true });
    if (error) throwDatabaseError(error);
    return jsonApiResponse(
      {
        data: data ?? [],
        error: null,
        meta: { requestId },
      },
      200,
    );
  } catch (error) {
    return adminApiErrorResponse(error, requestId, "list permission catalog");
  }
}

const methodNotAllowed = async (request: Request) => {
  const requestId = crypto.randomUUID();
  try {
    await authenticateAdminRequest(request);
  } catch (error) {
    return adminApiErrorResponse(error, requestId, "authenticate permission catalog write");
  }

  return jsonApiResponse(
    {
      data: null,
      error: {
        code: "PERMISSION_CATALOG_IMMUTABLE",
        message: "Permission definitions are managed by audited database migrations.",
      },
      meta: { requestId },
    },
    405,
  );
};

export const POST = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
