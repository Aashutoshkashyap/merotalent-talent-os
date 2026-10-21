import { NextResponse } from "next/server";
import { getBackendMode } from "@/lib/server/backend-mode";
import { NeonAuthorizationError } from "@/lib/server/neon-authorization";
import { getAuthenticatedApplicationUser, NeonSessionUnavailable } from "@/lib/server/neon-session";
import { getNeonStudentActivity } from "@/lib/server/neon-student-activity";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  if (getBackendMode() === "legacy") return new Response(null, { status: 404 });
  try {
    const actor = await getAuthenticatedApplicationUser(request);
    const data = await getNeonStudentActivity(actor);
    return NextResponse.json({ data }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof NeonAuthorizationError) {
      return NextResponse.json({ error: error.code }, { status: error.status });
    }
    if (error instanceof NeonSessionUnavailable) {
      return NextResponse.json({ error: "AUTH_UNAVAILABLE" }, { status: 503 });
    }
    return NextResponse.json({ error: "ACTIVITY_UNAVAILABLE" }, { status: 503 });
  }
}
