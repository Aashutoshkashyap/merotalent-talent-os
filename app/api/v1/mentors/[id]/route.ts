/**
 * Single mentor detail endpoint (by UUID).
 * Mode-aware: uses NeonMentorsRepository in staging, Supabase in legacy.
 */
import { jsonApiResponse } from "@/lib/server/api-response";
import { getBackendMode } from "@/lib/server/backend-mode";
import { getAdminClient } from "@/lib/server/supabase";
import { NeonMentorsRepository } from "@/lib/server/neon-mentors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = crypto.randomUUID();
  try {
    const { id } = await params;

    if (getBackendMode() === "neon-staging") {
      const repo = new NeonMentorsRepository();
      const mentor = await repo.getPublicMentor(id);
      if (!mentor) {
        return jsonApiResponse(
          {
            data: null,
            error: {
              code: "MENTOR_NOT_FOUND",
              message: "The requested mentor was not found or is no longer available.",
            },
            meta: { requestId },
          },
          404
        );
      }

      const services = await repo.getMentorServices(id);

      return jsonApiResponse({
        data: {
          ...mentor,
          services,
        },
        error: null,
        meta: { requestId },
      });
    }

    // Legacy Supabase path
    const db = getAdminClient() as any;
    const { data: mentor, error } = await db
      .from("mentors")
      .select("*")
      .eq("id", id)
      .eq("approval_status", "approved")
      .eq("is_available", true)
      .is("deleted_at", null)
      .maybeSingle();

    if (error || !mentor) {
      return jsonApiResponse(
        {
          data: null,
          error: {
            code: "MENTOR_NOT_FOUND",
            message: "The requested mentor was not found or is no longer available.",
          },
          meta: { requestId },
        },
        404
      );
    }

    const [{ data: profile }, { data: services }] = await Promise.all([
      db
        .from("public_profile_directory")
        .select("user_id,full_name,avatar_url,bio")
        .eq("user_id", mentor.user_id)
        .maybeSingle(),
      db
        .from("mentor_services")
        .select("id,title,description,session_type,duration_minutes,capacity,price,currency")
        .eq("mentor_id", id)
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("price"),
    ]);

    return jsonApiResponse({
      data: {
        ...mentor,
        profiles: profile || null,
        full_name: profile?.full_name || mentor.full_name,
        avatar_url: profile?.avatar_url || mentor.profile_image_url,
        services: services || [],
      },
      error: null,
      meta: { requestId },
    });
  } catch (err) {
    return jsonApiResponse(
      {
        data: null,
        error: {
          code: "MENTOR_FETCH_FAILED",
          message: err instanceof Error ? err.message : "Failed to load mentor details.",
        },
        meta: { requestId },
      },
      500
    );
  }
}
