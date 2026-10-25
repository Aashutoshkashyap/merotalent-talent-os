import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getBackendMode } from "@/lib/server/backend-mode";
import { NeonAuthorizationError } from "@/lib/server/neon-authorization";
import { getAuthenticatedApplicationUser, requireSameOrigin } from "@/lib/server/neon-session";
import { NeonRoleWorkspaces } from "@/lib/server/neon-role-workspaces";
import { AdminRequestError, readAdminJsonBody } from "@/lib/admin/admin-route-utils";
export const dynamic="force-dynamic";
export const runtime="nodejs";
type Context={ params:Promise<{id:string}> };
async function handle(request:Request,context:Context,write:boolean) {
  if(getBackendMode()==="legacy")return new Response(null,{status:404});
  try {
    if(write)requireSameOrigin(request);
    const actor=await getAuthenticatedApplicationUser(request), {id}=await context.params;
    const body=write ? await readAdminJsonBody(request) : undefined;
    const data=await new NeonRoleWorkspaces().ticketConfiguration(actor,id,body,
      request.method==="PATCH" ? new URL(request.url).searchParams.get("ticketId") ?? "" : undefined);
    return NextResponse.json({data},{headers:{"Cache-Control":"private, no-store"}});
  }catch(error){const known=error instanceof NeonAuthorizationError || error instanceof AdminRequestError;
    return NextResponse.json({error:known ? error.code : "TICKET_CONFIGURATION_UNAVAILABLE",
    message:known ? error.message : "Review ticket configuration and try again."},
    {status:known ? error.status : error instanceof ZodError ? 400 : 503});}
}
export const GET=(request:Request,context:Context)=>handle(request,context,false);
export const POST=(request:Request,context:Context)=>handle(request,context,true);
export const PATCH=(request:Request,context:Context)=>handle(request,context,true);
