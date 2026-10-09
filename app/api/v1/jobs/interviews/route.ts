import { jsonApiResponse } from "@/lib/server/api-response";
import { authenticateRequest } from "@/lib/server/auth";
import { getStudentInterviews } from "@/lib/server/jobs-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const authenticated = await authenticateRequest(request);
    const interviews = await getStudentInterviews(authenticated.user.id);

    return jsonApiResponse({
      data: interviews,
      error: null,
      meta: { requestId, count: interviews.length },
    });
  } catch (err: any) {
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
