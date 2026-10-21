/**
 * Canonical user profile endpoint.
 * Mode-aware: uses Neon SQL in staging, Supabase in legacy.
 */
import { jsonApiResponse } from "@/lib/server/api-response";
import { getBackendMode } from "@/lib/server/backend-mode";
import { getAdminClient } from "@/lib/server/supabase";
import { queryRows } from "@/lib/server/db";
import { getAuthenticatedApplicationUser } from "@/lib/server/neon-session";
import { authenticateRequest } from "@/lib/server/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    if (getBackendMode() !== "legacy") {
      const actor = await getAuthenticatedApplicationUser(request);
      const rows = await queryRows<Record<string, unknown>>(`
        SELECT p.user_id, p.full_name, p.email, p.phone, p.whatsapp_number,
               p.bio, p.location, p.avatar_url, p.resume_url, p.education,
               p.experience_level, p.linkedin_url, p.portfolio_url,
               p.education_history, p.experience_history, p.certifications,
               p.job_preferences, p.notification_preferences, p.language,
               p.account_status, p.created_at, p.updated_at
        FROM public.profiles p
        WHERE p.user_id = $1::uuid AND p.deleted_at IS NULL
        LIMIT 1`, [actor.userId]);

      if (rows.length === 0) {
        return jsonApiResponse(
          { data: null, error: { code: "PROFILE_NOT_FOUND", message: "Profile not found." }, meta: { requestId } },
          404
        );
      }

      return jsonApiResponse({ data: rows[0], error: null, meta: { requestId } });
    }

    const auth = await authenticateRequest(request);
    const db = getAdminClient() as any;
    const { data, error } = await db
      .from("profiles")
      .select("*")
      .eq("user_id", auth.user.id)
      .maybeSingle();

    if (error || !data) {
      return jsonApiResponse(
        { data: null, error: { code: "PROFILE_NOT_FOUND", message: "Profile not found." }, meta: { requestId } },
        404
      );
    }

    return jsonApiResponse({ data, error: null, meta: { requestId } });
  } catch (err) {
    return jsonApiResponse(
      {
        data: null,
        error: {
          code: "PROFILE_FETCH_FAILED",
          message: err instanceof Error ? err.message : "Failed to load profile.",
        },
        meta: { requestId },
      },
      500
    );
  }
}

export async function PATCH(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const body = await request.json().catch(() => ({}));

    if (getBackendMode() !== "legacy") {
      const actor = await getAuthenticatedApplicationUser(request);

      const fullName = typeof body.full_name === "string" ? body.full_name.trim().slice(0, 180) : undefined;
      const phone = typeof body.phone === "string" ? body.phone.trim().slice(0, 50) : undefined;
      const bio = typeof body.bio === "string" ? body.bio.trim().slice(0, 2000) : undefined;
      const location = typeof body.location === "string" ? body.location.trim().slice(0, 250) : undefined;
      const linkedinUrl = typeof body.linkedin_url === "string" ? body.linkedin_url.trim().slice(0, 500) : undefined;
      const education = typeof body.education === "string" ? body.education.trim().slice(0, 250) : undefined;
      const experienceLevel = typeof body.experience_level === "string" ? body.experience_level.trim().slice(0, 50) : undefined;
      const educationHistory = Array.isArray(body.education_history) ? JSON.stringify(body.education_history) : undefined;
      const experienceHistory = Array.isArray(body.experience_history) ? JSON.stringify(body.experience_history) : undefined;
      const certifications = Array.isArray(body.certifications) ? JSON.stringify(body.certifications) : undefined;
      const notificationPreferences = body.notification_preferences && typeof body.notification_preferences === "object" ? JSON.stringify(body.notification_preferences) : undefined;
      const language = typeof body.language === "string" ? body.language.trim().slice(0, 10) : undefined;

      const updated = await queryRows<Record<string, unknown>>(`
        UPDATE public.profiles
        SET full_name = COALESCE($2, full_name),
            phone = COALESCE($3, phone),
            bio = COALESCE($4, bio),
            location = COALESCE($5, location),
            linkedin_url = COALESCE($6, linkedin_url),
            education = COALESCE($7, education),
            experience_level = COALESCE($8, experience_level),
            education_history = COALESCE($9::jsonb, education_history),
            experience_history = COALESCE($10::jsonb, experience_history),
            certifications = COALESCE($11::jsonb, certifications),
            notification_preferences = COALESCE($12::jsonb, notification_preferences),
            language = COALESCE($13, language),
            updated_at = now()
        WHERE user_id = $1::uuid AND account_status = 'active' AND deleted_at IS NULL
        RETURNING *`,
        [
          actor.userId,
          fullName,
          phone,
          bio,
          location,
          linkedinUrl,
          education,
          experienceLevel,
          educationHistory,
          experienceHistory,
          certifications,
          notificationPreferences,
          language,
        ]
      );

      if (updated.length === 0) {
        return jsonApiResponse(
          { data: null, error: { code: "PROFILE_NOT_FOUND", message: "Profile not found or inactive." }, meta: { requestId } },
          404
        );
      }

      return jsonApiResponse({ data: updated[0], error: null, meta: { requestId } });
    }

    const auth = await authenticateRequest(request);
    const db = getAdminClient() as any;
    const { data, error } = await db
      .from("profiles")
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", auth.user.id)
      .select()
      .maybeSingle();

    if (error) throw error;

    return jsonApiResponse({ data, error: null, meta: { requestId } });
  } catch (err) {
    return jsonApiResponse(
      {
        data: null,
        error: {
          code: "PROFILE_UPDATE_FAILED",
          message: err instanceof Error ? err.message : "Failed to update profile.",
        },
        meta: { requestId },
      },
      500
    );
  }
}
