import { NextResponse } from "next/server";
import { getBackendMode } from "@/lib/server/backend-mode";
import { listNeonAdministrators } from "@/lib/server/neon-admin-directory";
import { NeonAuthorizationError } from "@/lib/server/neon-authorization";
import { getAuthenticatedApplicationUser } from "@/lib/server/neon-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(request: Request) {
  if (getBackendMode() !== "neon-staging") return new Response(null, { status: 404 });
  const headers = { "Cache-Control": "private, no-store" };
  try { return NextResponse.json({ data: await listNeonAdministrators(await getAuthenticatedApplicationUser(request)) }, { headers }); }
  catch (error) { return NextResponse.json({ error: error instanceof NeonAuthorizationError ? error.code : "DIRECTORY_UNAVAILABLE" },
    { status: error instanceof NeonAuthorizationError ? error.status : 503, headers }); }
}
