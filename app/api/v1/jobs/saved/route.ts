import { jsonApiResponse } from "@/lib/server/api-response";
import { authenticateRequest } from "@/lib/server/auth";
import { getAdminClient } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const authenticated = await authenticateRequest(request);
    const db = getAdminClient() as any;

    const { data: saved, error } = await db
      .from("saved_jobs")
      .select(`
        id,
        created_at,
        job:job_id (
          id,
          title,
          location,
          job_type,
          experience_level,
          salary_min,
          salary_max,
          is_remote,
          skills_required,
          application_deadline,
          company:company_id (
            id,
            name,
            logo_url
          )
        )
      `)
      .eq("user_id", authenticated.user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return jsonApiResponse({
      data: (saved || []).map((s: any) => ({ ...s.job, saved_at: s.created_at })),
      error: null,
      meta: { requestId, count: saved?.length || 0 },
    });
  } catch (err: any) {
    return jsonApiResponse(
      {
        data: null,
        error: {
          code: err.code || "SAVED_JOBS_FETCH_FAILED",
          message: err.message || "Failed to load saved jobs.",
        },
        meta: { requestId },
      },
      err.status || 500
    );
  }
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const authenticated = await authenticateRequest(request);
    const body = await request.json().catch(() => ({}));
    if (!body || !body.jobId) {
      return jsonApiResponse(
        {
          data: null,
          error: { code: "INVALID_BODY", message: "jobId is required." },
          meta: { requestId },
        },
        400
      );
    }

    const db = getAdminClient() as any;
    const { data: saved, error } = await db
      .from("saved_jobs")
      .insert({
        user_id: authenticated.user.id,
        job_id: body.jobId,
      })
      .select("*")
      .single();

    if (error && !error.message?.includes("duplicate")) throw error;

    return jsonApiResponse({
      data: { saved: true, jobId: body.jobId },
      error: null,
      meta: { requestId },
    });
  } catch (err: any) {
    return jsonApiResponse(
      {
        data: null,
        error: {
          code: err.code || "SAVE_JOB_FAILED",
          message: err.message || "Failed to save job.",
        },
        meta: { requestId },
      },
      err.status || 500
    );
  }
}

export async function DELETE(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const authenticated = await authenticateRequest(request);
    const url = new URL(request.url);
    const jobId = url.searchParams.get("jobId");
    if (!jobId) {
      return jsonApiResponse(
        {
          data: null,
          error: { code: "INVALID_QUERY", message: "jobId query parameter is required." },
          meta: { requestId },
        },
        400
      );
    }

    const db = getAdminClient() as any;
    const { error } = await db
      .from("saved_jobs")
      .delete()
      .eq("user_id", authenticated.user.id)
      .eq("job_id", jobId);

    if (error) throw error;

    return jsonApiResponse({
      data: { saved: false, jobId },
      error: null,
      meta: { requestId },
    });
  } catch (err: any) {
    return jsonApiResponse(
      {
        data: null,
        error: {
          code: err.code || "UNSAVE_JOB_FAILED",
          message: err.message || "Failed to remove saved job.",
        },
        meta: { requestId },
      },
      err.status || 500
    );
  }
}
