import { jsonApiResponse } from "@/lib/server/api-response";
import { authenticateRequest } from "@/lib/server/auth";
import { getBackendMode } from "@/lib/server/backend-mode";
import { getAuthenticatedApplicationUser, NeonSessionUnavailable } from "@/lib/server/neon-session";
import { NeonAuthorizationError } from "@/lib/server/neon-authorization";
import { NeonJobsRepository } from "@/lib/server/neon-jobs";
import { getStudentInterviews } from "@/lib/server/jobs-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const isStaging = getBackendMode() === "neon-staging";

    if (isStaging) {
      const actor = await getAuthenticatedApplicationUser(request);
      const repo = new NeonJobsRepository();
      const interviews = await repo.getStudentInterviews(actor);
      return jsonApiResponse({
        data: interviews,
        error: null,
        meta: { requestId, count: interviews.length },
      });
    }

    const authenticated = await authenticateRequest(request);
    const interviews = await getStudentInterviews(authenticated.user.id);

    return jsonApiResponse({
      data: interviews,
      error: null,
      meta: { requestId, count: interviews.length },
    });
  } catch (err: any) {
    if (getBackendMode() === "neon-staging") {
      if (err instanceof NeonAuthorizationError) {
        return jsonApiResponse({ data: null, error: { code: err.code, message: err.message }, meta: { requestId } }, err.status);
      }
      if (err instanceof NeonSessionUnavailable) {
        return jsonApiResponse({ data: null, error: { code: "AUTH_UNAVAILABLE", message: err.message }, meta: { requestId } }, 503);
      }
    }
    return jsonApiResponse(
      {
        data: null,
        error: {
          code: err.code || "INTERVIEWS_FETCH_FAILED",
          message: err.message || "Failed to load scheduled interviews.",
        },
        meta: { requestId },
      },
      err.status || 500
    );
  }
}
