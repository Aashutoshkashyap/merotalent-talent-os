import { jsonApiResponse } from "@/lib/server/api-response";
import { authenticateRequest } from "@/lib/server/auth";
import { getAdminClient } from "@/lib/server/supabase";
import { getBackendMode } from "@/lib/server/backend-mode";
import { getAuthenticatedApplicationUser, NeonSessionUnavailable, requireSameOrigin } from "@/lib/server/neon-session";
import { NeonAuthorizationError } from "@/lib/server/neon-authorization";
import { listOwnSavedJobs, saveJob, unsaveJob } from "@/lib/server/neon-saved-jobs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function handleNeonError(err: unknown, requestId: string) {
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
  return jsonApiResponse(
    { data: null, error: { code: "SAVED_JOBS_UNAVAILABLE", message: "Saved jobs service unavailable." }, meta: { requestId } },
    503
  );
}

export async function GET(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const isStaging = getBackendMode() !== "legacy";

    if (isStaging) {
      const actor = await getAuthenticatedApplicationUser(request);
      const url = new URL(request.url);
      const limitParam = url.searchParams.get("limit");
      const offsetParam = url.searchParams.get("offset");
      const limit = Number(limitParam ?? 50);
      const offset = Number(offsetParam ?? 0);
      if (!Number.isInteger(limit) || limit < 1 || limit > 100 ||
          !Number.isInteger(offset) || offset < 0 || offset > 100000) {
        return jsonApiResponse({ data: null, error: { code: "INVALID_PAGINATION", message: "Invalid page." }, meta: { requestId } }, 400);
      }

      const saved = await listOwnSavedJobs(actor, limit, offset);
      return jsonApiResponse({
        data: saved,
        error: null,
        meta: { requestId, count: saved.length },
      });
    }

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
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return jsonApiResponse({
      data: (saved || []).map((s: any) => ({ ...s.job, saved_at: s.created_at })),
      error: null,
      meta: { requestId, count: saved?.length || 0 },
    });
  } catch (err: any) {
    if (getBackendMode() !== "legacy") return handleNeonError(err, requestId);
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
    const isStaging = getBackendMode() !== "legacy";
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

    if (isStaging) {
      requireSameOrigin(request);
      if (typeof body.jobId !== "string" || !uuid.test(body.jobId)) {
        return jsonApiResponse({ data: null, error: { code: "INVALID_JOB_ID", message: "A valid job ID is required." }, meta: { requestId } }, 400);
      }
      const actor = await getAuthenticatedApplicationUser(request);
      const res = await saveJob(actor, body.jobId);
      return jsonApiResponse({
        data: res,
        error: null,
        meta: { requestId },
      });
    }

    const authenticated = await authenticateRequest(request);
    const db = getAdminClient() as any;
    const { error } = await db
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
    if (getBackendMode() !== "legacy") return handleNeonError(err, requestId);
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
    const isStaging = getBackendMode() !== "legacy";
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

    if (isStaging) {
      requireSameOrigin(request);
      if (!uuid.test(jobId)) {
        return jsonApiResponse({ data: null, error: { code: "INVALID_JOB_ID", message: "A valid job ID is required." }, meta: { requestId } }, 400);
      }
      const actor = await getAuthenticatedApplicationUser(request);
      const res = await unsaveJob(actor, jobId);
      return jsonApiResponse({
        data: res,
        error: null,
        meta: { requestId },
      });
    }

    const authenticated = await authenticateRequest(request);
    const db = getAdminClient() as any;
    const { error } = await db
      .from("saved_jobs")
      .update({ deleted_at: new Date().toISOString() })
      .eq("user_id", authenticated.user.id)
      .eq("job_id", jobId);

    if (error) throw error;

    return jsonApiResponse({
      data: { saved: false, jobId },
      error: null,
      meta: { requestId },
    });
  } catch (err: any) {
    if (getBackendMode() !== "legacy") return handleNeonError(err, requestId);
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
