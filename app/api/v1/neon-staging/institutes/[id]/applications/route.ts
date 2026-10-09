import { NextResponse } from "next/server";
import { getBackendMode } from "@/lib/server/backend-mode";
import { NeonAuthorizationError } from "@/lib/server/neon-authorization";
import { listManagedCollegeLeads } from "@/lib/server/neon-college-leads";
import { getAuthenticatedApplicationUser, NeonSessionUnavailable } from "@/lib/server/neon-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  // This route cannot expose copied private leads from a production deployment.
  try { if (getBackendMode() !== "neon-staging") return new Response(null, { status: 404 }); }
  catch { return new Response(null, { status: 404 }); }
  const { id } = await context.params;
  if (!uuid.test(id)) return NextResponse.json({ error: "INVALID_INSTITUTE_ID" }, { status: 400 });
  try {
    const actor = await getAuthenticatedApplicationUser(request);
    const applications = await listManagedCollegeLeads(actor, id);
    return applications === null
      ? NextResponse.json({ error: "INSTITUTE_NOT_FOUND" }, { status: 404 })
      : NextResponse.json({ data: applications }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof NeonAuthorizationError) {
      return NextResponse.json({ error: error.code }, { status: error.status });
    }
    if (error instanceof NeonSessionUnavailable) {
      return NextResponse.json({ error: "AUTH_UNAVAILABLE" }, { status: 503 });
    }
    // Database details and private lead contents must not enter the response.
    return NextResponse.json({ error: "APPLICATIONS_UNAVAILABLE" }, { status: 503 });
  }
}
