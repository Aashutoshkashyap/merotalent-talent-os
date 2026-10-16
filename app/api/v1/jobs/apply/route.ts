import { z } from "zod";
import { jsonApiResponse } from "@/lib/server/api-response";
import { authenticateRequest } from "@/lib/server/auth";
import { getBackendMode } from "@/lib/server/backend-mode";
import { getAuthenticatedApplicationUser, NeonSessionUnavailable, requireSameOrigin } from "@/lib/server/neon-session";
import { NeonAuthorizationError } from "@/lib/server/neon-authorization";
import { NeonJobsRepository } from "@/lib/server/neon-jobs";
import { submitJobApplication } from "@/lib/server/jobs-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const applicationSchema = z.object({
  jobId: z.string().uuid(),
  fullName: z.string().max(180).optional(),
  email: z.string().max(255).optional(),
  phone: z.string().max(50).optional(),
  coverLetter: z.string().max(5000).optional(),
  portfolioUrl: z.union([z.string().url().max(500), z.literal("")]).optional(),
  resumeUrl: z.string().max(500).optional(),
  experienceLetterUrl: z.string().max(500).optional(),
  trainingDocumentUrl: z.string().max(500).optional(),
  skills: z.array(z.string().trim().min(1).max(100)).max(50).optional(),
  expectedSalary: z.number().finite().min(0).max(1_000_000_000).optional(),
  answers: z.record(z.string(), z.unknown()).optional(),
  education: z.array(z.record(z.string(), z.unknown())).max(20).optional(),
  experience: z.array(z.record(z.string(), z.unknown())).max(20).optional(),
  certifications: z.array(z.record(z.string(), z.unknown())).max(20).optional(),
}).strict();

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
      requireSameOrigin(request);
      const parsed = applicationSchema.safeParse(body);
      if (!parsed.success || JSON.stringify(body).length > 32_768) {
        return jsonApiResponse({ data: null, error: {
          code: "INVALID_APPLICATION_PAYLOAD", message: "Check your application details.",
        }, meta: { requestId } }, 422);
      }
      const actor = await getAuthenticatedApplicationUser(request);
      const repo = new NeonJobsRepository();
      const result = await repo.submitJobApplication(actor, {
        jobId: parsed.data.jobId,
        fullName: parsed.data.fullName || "",
        email: parsed.data.email || "",
        phone: parsed.data.phone || "",
        coverLetter: parsed.data.coverLetter,
        portfolioUrl: parsed.data.portfolioUrl,
        resumeUrl: parsed.data.resumeUrl,
        experienceLetterUrl: parsed.data.experienceLetterUrl,
        trainingDocumentUrl: parsed.data.trainingDocumentUrl,
        skills: parsed.data.skills,
        expectedSalary: parsed.data.expectedSalary,
        answers: parsed.data.answers,
        education: parsed.data.education,
        experience: parsed.data.experience,
        certifications: parsed.data.certifications,
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
