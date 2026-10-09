import { jsonApiResponse } from "@/lib/server/api-response";
import { authenticateRequest } from "@/lib/server/auth";
import { getAdminClient } from "@/lib/server/supabase";
import { getBackendMode } from "@/lib/server/backend-mode";
import { getAuthenticatedApplicationUser, NeonSessionUnavailable } from "@/lib/server/neon-session";
import { NeonAuthorizationError } from "@/lib/server/neon-authorization";
import { NeonJobsRepository } from "@/lib/server/neon-jobs";
import { calculateJobMatch } from "@/lib/jobs/job-matching";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const isStaging = getBackendMode() === "neon-staging";

    if (isStaging) {
      const actor = await getAuthenticatedApplicationUser(request);
      const repo = new NeonJobsRepository();
      const scoredJobs = await repo.getMatchingJobs(actor);
      return jsonApiResponse({
        data: scoredJobs,
        error: null,
        meta: { requestId, count: scoredJobs.length },
      });
    }

    const authenticated = await authenticateRequest(request);
    const db = getAdminClient() as any;

    // 1. Fetch Student Profile
    const { data: profile } = await db
      .from("profiles")
      .select("id, skills, location, experience_level, job_preferences")
      .eq("id", authenticated.user.id)
      .maybeSingle();

    // 2. Fetch Active Jobs
    const { data: jobs, error } = await db
      .from("jobs")
      .select("*, company:company_id(id, name, logo_url)")
      .in("status", ["published", "approved"])
      .eq("approval_status", "approved")
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    // 3. Score and Rank Jobs
    const scoredJobs = (jobs || []).map((job: any) => {
      const match = calculateJobMatch(
        {
          skills: profile?.skills || [],
          location: profile?.location,
          experience_level: profile?.experience_level,
          job_preferences: profile?.job_preferences,
        },
        job
      );

      return {
        ...job,
        matchScore: match.matchScore,
        matchReasons: match.matchReasons,
      };
    });

    // Sort descending by match score
    scoredJobs.sort((a: any, b: any) => b.matchScore - a.matchScore);

    return jsonApiResponse({
      data: scoredJobs,
      error: null,
      meta: { requestId, count: scoredJobs.length },
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
          code: err.code || "MATCHING_FAILED",
          message: err.message || "Failed to calculate matching jobs.",
        },
        meta: { requestId },
      },
      err.status || 500
    );
  }
}
