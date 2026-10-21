import { NextResponse } from "next/server";
import { getBackendMode } from "@/lib/server/backend-mode";
import { getAuthenticatedApplicationUser, NeonSessionUnavailable } from "@/lib/server/neon-session";
import { NeonAuthorizationError } from "@/lib/server/neon-authorization";
import { neonAdminOptions } from "@/lib/server/neon-admin-resources";
export const dynamic="force-dynamic";
export const runtime="nodejs";
export async function GET(request: Request) {
  if (getBackendMode() === "legacy") return new Response(null,{status:404});
  const headers={"Cache-Control":"private, no-store"};
  try {
    const data=await neonAdminOptions(await getAuthenticatedApplicationUser(request),new URL(request.url).searchParams.get("kind")??"");
    return NextResponse.json({data,error:null},{headers});
  } catch(error) {
    return NextResponse.json({data:null,error:{code:error instanceof NeonAuthorizationError ? error.code : "SERVICE_UNAVAILABLE",
      message:error instanceof NeonAuthorizationError || error instanceof NeonSessionUnavailable ? error.message : "Options are unavailable."}},
    {status:error instanceof NeonAuthorizationError ? error.status : 503,headers});
  }
}
