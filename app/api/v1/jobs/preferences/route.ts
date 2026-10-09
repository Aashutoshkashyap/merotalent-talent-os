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
    const authenticated = await authenticateRequest(request);
    const body = await request.json().catch(() => ({}));
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
