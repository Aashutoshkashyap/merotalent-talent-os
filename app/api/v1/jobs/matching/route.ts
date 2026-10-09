import { jsonApiResponse } from "@/lib/server/api-response";
import { authenticateRequest } from "@/lib/server/auth";
import { getAdminClient } from "@/lib/server/supabase";
import { calculateJobMatch } from "@/lib/jobs/job-matching";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestId = crypto.randomUUID();
  try {
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
