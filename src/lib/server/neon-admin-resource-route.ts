import { jsonApiResponse } from "./api-response";
import { isAdminResourceName } from "@/lib/admin/admin-resources";
import { adminApiErrorResponse, readAdminJsonBody } from "@/lib/admin/admin-route-utils";
import { NeonDatabaseError } from "./db";
import { NeonAuthorizationError } from "./neon-authorization";
import { getAuthenticatedApplicationUser, NeonSessionUnavailable, requireSameOrigin } from "./neon-session";
import { deleteNeonAdminResource, listNeonAdminResource, readNeonAdminResource, saveNeonAdminResource } from "./neon-admin-resources";

export async function handleNeonAdminResource(request: Request, resource: string, id?: string) {
  const requestId = crypto.randomUUID();
  const respond = (data: unknown, status=200, meta: Record<string,unknown>={}) =>
    jsonApiResponse({ data,error:null,meta:{ requestId,...meta } },status);
  const fail = (code: string,message: string,status: number) =>
    jsonApiResponse({ data:null,error:{ code,message },meta:{ requestId } },status);
  try {
    if (!isAdminResourceName(resource)) return fail("ADMIN_RESOURCE_NOT_FOUND","The requested admin resource does not exist.",404);
    if (request.method !== "GET") requireSameOrigin(request);
    const actor = await getAuthenticatedApplicationUser(request);
    if (request.method === "GET") {
      if (id) return respond(await readNeonAdminResource(actor,resource,id));
      const result = await listNeonAdminResource(actor,resource,new URL(request.url).searchParams);
      return respond(result.data,200,result.meta);
    }
    if (request.method === "POST" && !id) return respond(await saveNeonAdminResource(actor,resource,await readAdminJsonBody(request)),201);
    if (request.method === "PATCH" && id) return respond(await saveNeonAdminResource(actor,resource,await readAdminJsonBody(request),id));
    if (request.method === "DELETE" && id) return respond(await deleteNeonAdminResource(actor,resource,id));
    return fail("METHOD_NOT_ALLOWED","This operation is unavailable.",405);
  } catch (error) {
    if (error instanceof NeonAuthorizationError) return fail(error.code,error.message,error.status);
    if (error instanceof NeonSessionUnavailable) return fail("AUTH_UNAVAILABLE",error.message,503);
    // pg errors are inspected for safe conflict/validation codes only; no SQL or connection details leave the server.
    return adminApiErrorResponse(error instanceof NeonDatabaseError ? error.cause : error,requestId,`Neon ${request.method} ${resource}`);
  }
}
