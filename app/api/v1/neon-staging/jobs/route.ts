import { NextResponse } from "next/server";
import { getBackendMode } from "@/lib/server/backend-mode";
import { NeonAuthorizationError } from "@/lib/server/neon-authorization";
import { getAuthenticatedApplicationUser, NeonSessionUnavailable } from "@/lib/server/neon-session";
import { NeonJobsRepository } from "@/lib/server/neon-jobs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function stagingOnly() {
  try { return getBackendMode() !== "legacy"; } catch { return false; }
}

function failure(error: unknown) {
  if (error instanceof NeonAuthorizationError) {
    return NextResponse.json({ error: error.code, message: error.message }, { status: error.status });
  }
  if (error instanceof NeonSessionUnavailable) {
    return NextResponse.json({ error: "AUTH_UNAVAILABLE", message: error.message }, { status: 503 });
  }
  return NextResponse.json({ error: "JOBS_UNAVAILABLE" }, { status: 503 });
}

export async function GET(request: Request) {
  if (!stagingOnly()) return new Response(null, { status: 404 });
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const repo = new NeonJobsRepository();

  try {
    if (id) {
      const job = await repo.getPublicJob(id);
      return job
        ? NextResponse.json({ data: job })
        : NextResponse.json({ error: "JOB_NOT_FOUND" }, { status: 404 });
    }

    const search = url.searchParams.get("search") ?? undefined;
    const location = url.searchParams.get("location") ?? undefined;
    const jobType = url.searchParams.get("type") ?? undefined;
    const limit = url.searchParams.get("limit") ? parseInt(url.searchParams.get("limit")!, 10) : undefined;
    const offset = url.searchParams.get("offset") ? parseInt(url.searchParams.get("offset")!, 10) : undefined;

    const jobs = await repo.listPublicJobs({ search, location, jobType, limit, offset });
    return NextResponse.json({ data: jobs });
  } catch (error) {
    return failure(error);
  }
}
