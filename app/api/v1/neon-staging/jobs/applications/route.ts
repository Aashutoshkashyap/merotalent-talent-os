import { NextResponse } from "next/server";
import { getBackendMode } from "@/lib/server/backend-mode";
import { NeonAuthorizationError } from "@/lib/server/neon-authorization";
import { getAuthenticatedApplicationUser, NeonSessionUnavailable } from "@/lib/server/neon-session";
import { NeonJobsRepository, type SubmitApplicationInput } from "@/lib/server/neon-jobs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function stagingOnly() {
  try { return getBackendMode() === "neon-staging"; } catch { return false; }
}

function failure(error: unknown) {
  if (error instanceof NeonAuthorizationError) {
    return NextResponse.json({ error: error.code, message: error.message }, { status: error.status });
  }
  if (error instanceof NeonSessionUnavailable) {
    return NextResponse.json({ error: "AUTH_UNAVAILABLE", message: error.message }, { status: 503 });
  }
  return NextResponse.json({ error: "JOB_APPLICATION_UNAVAILABLE" }, { status: 503 });
}

export async function GET(request: Request) {
  if (!stagingOnly()) return new Response(null, { status: 404 });
  try {
    const actor = await getAuthenticatedApplicationUser(request);
    const url = new URL(request.url);
    const jobId = url.searchParams.get("jobId");
    const repo = new NeonJobsRepository();

    if (jobId) {
      const applications = await repo.listRecruiterApplications(actor, jobId);
      return NextResponse.json({ data: applications });
    }

    const applications = await repo.listOwnApplications(actor);
    return NextResponse.json({ data: applications });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  if (!stagingOnly()) return new Response(null, { status: 404 });
  try {
    const actor = await getAuthenticatedApplicationUser(request);
    const body: unknown = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
    }

    const payload = body as Partial<SubmitApplicationInput>;
    if (!payload.jobId || !payload.fullName || !payload.email || !payload.phone) {
      return NextResponse.json({ error: "MISSING_REQUIRED_FIELDS" }, { status: 400 });
    }

    const repo = new NeonJobsRepository();
    const result = await repo.submitJobApplication(actor, {
      jobId: payload.jobId,
      fullName: payload.fullName,
      email: payload.email,
      phone: payload.phone,
      coverLetter: payload.coverLetter,
      portfolioUrl: payload.portfolioUrl,
      resumeUrl: payload.resumeUrl,
      skills: payload.skills,
      education: payload.education,
      experience: payload.experience,
      certifications: payload.certifications,
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    return failure(error);
  }
}
