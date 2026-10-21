import { z } from "zod";
import { jsonApiResponse } from "@/lib/server/api-response";
import { authenticateRequest } from "@/lib/server/auth";
import { getAdminClient } from "@/lib/server/supabase";
import { getBackendMode } from "@/lib/server/backend-mode";
import { getAuthenticatedApplicationUser, NeonSessionUnavailable, requireSameOrigin } from "@/lib/server/neon-session";
import { NeonAuthorizationError } from "@/lib/server/neon-authorization";
import { NeonJobsRepository } from "@/lib/server/neon-jobs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const preferenceList = z.array(z.string().trim().min(1).max(100)).max(30).optional();
const jobPreferencesSchema = z.object({
  preferred_categories: preferenceList,
  preferred_industries: preferenceList,
  preferred_job_titles: preferenceList,
  preferred_locations: preferenceList,
  preferred_job_levels: preferenceList,
  preferred_job_types: preferenceList,
  min_salary: z.number().finite().min(0).max(1_000_000_000).nullable().optional(),
  max_salary: z.number().finite().min(0).max(1_000_000_000).nullable().optional(),
  is_salary_negotiable: z.boolean().optional(),
}).strict();

export async function GET(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const isStaging = getBackendMode() !== "legacy";

    if (isStaging) {
      const actor = await getAuthenticatedApplicationUser(request);
      const repo = new NeonJobsRepository();
      const prefs = await repo.getStudentJobPreferences(actor);
      return jsonApiResponse({
        data: prefs,
        error: null,
        meta: { requestId },
      });
    }

    const authenticated = await authenticateRequest(request);
    const db = getAdminClient() as any;

    const { data: profile, error } = await db
      .from("profiles")
      .select("id, job_preferences, skills, location, experience_level")
      .eq("id", authenticated.user.id)
      .maybeSingle();

    if (error) throw error;

    return jsonApiResponse({
      data: profile?.job_preferences || {},
      error: null,
      meta: { requestId },
    });
  } catch (err: any) {
    if (getBackendMode() !== "legacy") {
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
          code: err.code || "PREFERENCES_FETCH_FAILED",
          message: err.message || "Failed to load job preferences.",
        },
        meta: { requestId },
      },
      err.status || 500
    );
  }
}

export async function PUT(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const isStaging = getBackendMode() !== "legacy";
    const body = await request.json().catch(() => ({}));

    if (isStaging) {
      requireSameOrigin(request);
      const parsed = jobPreferencesSchema.safeParse(body);
      if (!parsed.success || (parsed.data.min_salary != null && parsed.data.max_salary != null &&
          parsed.data.min_salary > parsed.data.max_salary)) {
        return jsonApiResponse({ data: null, error: { code: "INVALID_JOB_PREFERENCES", message: "Check your job preferences." }, meta: { requestId } }, 422);
      }
      const actor = await getAuthenticatedApplicationUser(request);
      const repo = new NeonJobsRepository();
      const updated = await repo.updateStudentJobPreferences(actor, parsed.data);
      return jsonApiResponse({
        data: updated,
        error: null,
        meta: { requestId },
      });
    }

    const authenticated = await authenticateRequest(request);
    const db = getAdminClient() as any;

    const { data: updated, error } = await db
      .from("profiles")
      .update({
        job_preferences: body,
        updated_at: new Date().toISOString(),
      })
      .eq("id", authenticated.user.id)
      .select("id, job_preferences")
      .single();

    if (error) throw error;

    return jsonApiResponse({
      data: updated.job_preferences,
      error: null,
      meta: { requestId },
    });
  } catch (err: any) {
    if (getBackendMode() !== "legacy") {
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
          code: err.code || "PREFERENCES_UPDATE_FAILED",
          message: err.message || "Failed to update job preferences.",
        },
        meta: { requestId },
      },
      err.status || 500
    );
  }
}
