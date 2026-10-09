import { NextResponse } from "next/server";
import { getBackendMode } from "@/lib/server/backend-mode";
import { NeonAuthorizationError } from "@/lib/server/neon-authorization";
import { getAuthenticatedApplicationUser, NeonSessionUnavailable } from "@/lib/server/neon-session";
import { listOwnSavedJobs } from "@/lib/server/neon-saved-jobs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function pagination(request: Request): { limit: number; offset: number } | null {
  const params = new URL(request.url).searchParams;
  if ([...params.keys()].some((key) => key !== "limit" && key !== "offset") ||
      params.getAll("limit").length > 1 || params.getAll("offset").length > 1) return null;
  const limitText = params.get("limit") ?? "20";
  const offsetText = params.get("offset") ?? "0";
  if (!/^[1-9]\d*$/.test(limitText) || !/^(0|[1-9]\d*)$/.test(offsetText)) return null;
  const limit = Number(limitText);
  const offset = Number(offsetText);
  if (!Number.isSafeInteger(limit) || limit > 50 || !Number.isSafeInteger(offset) || offset > 5000) return null;
  return { limit, offset };
}

/** Staging-only vertical slice. Existing production Jobs endpoints are untouched. */
export async function GET(request: Request) {
  let mode: string;
  try { mode = getBackendMode(); } catch { return new Response(null, { status: 404 }); }
  if (mode !== "neon-staging") return new Response(null, { status: 404 });

  try {
    const actor = await getAuthenticatedApplicationUser(request);
    const page = pagination(request);
    if (!page) return NextResponse.json({ error: "INVALID_QUERY" }, { status: 400 });
    const rows = await listOwnSavedJobs(actor, page.limit, page.offset);
    return NextResponse.json({ data: rows, meta: { count: rows.length, ...page } },
      { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof NeonAuthorizationError) {
      return NextResponse.json({ error: error.code }, { status: error.status });
    }
    if (error instanceof NeonSessionUnavailable) {
      return NextResponse.json({ error: "AUTH_UNAVAILABLE" }, { status: 503 });
    }
    return NextResponse.json({ error: "SAVED_JOBS_UNAVAILABLE" }, { status: 503 });
  }
}
