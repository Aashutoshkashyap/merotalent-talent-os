import { jsonApiResponse } from "@/lib/server/api-response";
import { authenticateRequest } from "@/lib/server/auth";
import { getBackendMode } from "@/lib/server/backend-mode";
import { getAuthenticatedApplicationUser, NeonSessionUnavailable } from "@/lib/server/neon-session";
import { NeonAuthorizationError } from "@/lib/server/neon-authorization";
import { NeonJobsRepository } from "@/lib/server/neon-jobs";
import { submitJobApplication } from "@/lib/server/jobs-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const isStaging = getBackendMode() === "neon-staging";
    const body = await request.json().catch(() => ({}));

    if (!body || typeof body !== "object" || !body.jobId) {
      return jsonApiResponse(
        {
          data: null,
          error: {
            code: "INVALID_APPLICATION_PAYLOAD",
            message: "A valid jobId and application details are required.",
          },
          meta: { requestId },
        },
        400
      );
    }

    if (isStaging) {
      const actor = await getAuthenticatedApplicationUser(request);
      const repo = new NeonJobsRepository();
      const result = await repo.submitJobApplication(actor, {
        jobId: body.jobId,
        fullName: body.fullName || "",
        email: body.email || "",
        phone: body.phone || "",
        coverLetter: body.coverLetter,
        portfolioUrl: body.portfolioUrl,
        resumeUrl: body.resumeUrl,
        skills: Array.isArray(body.skills) ? body.skills : undefined,
        expectedSalary: typeof body.expectedSalary === "number" ? body.expectedSalary : undefined,
        answers: body.answers,
        education: Array.isArray(body.education) ? body.education : undefined,
        experience: Array.isArray(body.experience) ? body.experience : undefined,
        certifications: Array.isArray(body.certifications) ? body.certifications : undefined,
      });

      return jsonApiResponse(
        {
          data: {
            application: result,
            matchScore: result.skills_match_score,
          },
          error: null,
          meta: { requestId },
        },
        201
      );
    }

    // Legacy Supabase path
    const authenticated = await authenticateRequest(request);

    const result = await submitJobApplication({
      userId: authenticated.user.id,
      jobId: body.jobId,
      fullName: body.fullName || "",
      email: body.email || "",
      phone: body.phone || "",
      coverLetter: body.coverLetter,
      portfolioUrl: body.portfolioUrl,
      resumeUrl: body.resumeUrl,
      skills: Array.isArray(body.skills) ? body.skills : undefined,
      expectedSalary: typeof body.expectedSalary === "number" ? body.expectedSalary : undefined,
      answers: body.answers,
      education: Array.isArray(body.education) ? body.education : undefined,
      experience: Array.isArray(body.experience) ? body.experience : undefined,
      certifications: Array.isArray(body.certifications) ? body.certifications : undefined,
    });

    return jsonApiResponse(
      {
        data: result,
        error: null,
        meta: { requestId },
      },
      201
    );
  } catch (err: any) {
    if (getBackendMode() === "neon-staging") {
      if (err instanceof NeonAuthorizationError) {
        return jsonApiResponse(
          { data: null, error: { code: err.code, message: err.message }, meta: { requestId } },
          err.status
        );
      }
      if (err instanceof NeonSessionUnavailable) {
        return jsonApiResponse(
          { data: null, error: { code: "AUTH_UNAVAILABLE", message: err.message }, meta: { requestId } },
          503
        );
      }
    }
    const status = err.status || (err.message?.includes("not found") ? 404 : 400);
    return jsonApiResponse(
      {
        data: null,
        error: {
          code: err.code || "APPLICATION_SUBMISSION_FAILED",
          message: err.message || "Failed to submit job application.",
        },
        meta: { requestId },
      },
      status
    );
  }
}
