import { NextResponse } from "next/server";
import { getBackendMode } from "@/lib/server/backend-mode";
import { getAuthenticatedApplicationUser, requireSameOrigin } from "@/lib/server/neon-session";
import { NeonAuthorizationError } from "@/lib/server/neon-authorization";
import { AdminResourceValidationError } from "@/lib/admin/admin-resource-service";
import { readAdminJsonBody } from "@/lib/admin/admin-route-utils";
import { createNeonAdminEventChild, listNeonAdminEventChildren } from "@/lib/server/neon-admin-resources";
export const dynamic="force-dynamic";
export const runtime="nodejs";
type Context={params:Promise<{id:string}>};
const headers={"Cache-Control":"private, no-store"};
async function handle(request:Request,context:Context) {
  if(getBackendMode() === "legacy") return new Response(null,{status:404});
  try {
    if(request.method!=="GET") requireSameOrigin(request);
    const actor=await getAuthenticatedApplicationUser(request);
    const {id}=await context.params;
    const kind=new URL(request.url).searchParams.get("kind")??"";
    const data=request.method==="GET" ? await listNeonAdminEventChildren(actor,id,kind)
      : await createNeonAdminEventChild(actor,id,kind,await readAdminJsonBody(request));
    return NextResponse.json({data,error:null},{status:request.method==="GET"?200:201,headers});
  } catch(error) {
    const validation=error instanceof AdminResourceValidationError;
    return NextResponse.json({data:null,error:{code:error instanceof NeonAuthorizationError ? error.code : validation ? "VALIDATION_FAILED" : "SERVICE_UNAVAILABLE",
      message:error instanceof NeonAuthorizationError || validation ? error.message : "Event panel unavailable.",...(validation ? {fields:error.fields}: {})}},
    {status:error instanceof NeonAuthorizationError ? error.status : validation ? 422 : 503,headers});
  }
}
export const GET=handle;
export const POST=handle;
