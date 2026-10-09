/**
 * Single partner course endpoint (by UUID).
 * Mode-aware: uses Neon SQL in staging, Supabase in legacy.
 */
import { NextResponse } from "next/server";
import { getBackendMode } from "@/lib/server/backend-mode";
import { getAdminClient } from "@/lib/server/supabase";
import { queryRows } from "@/lib/server/db";
import { PARTNER_COURSE_SELECT, type PartnerCourse, isLivePartnerCourse } from "@/lib/courses/partnered-courses";
import { jsonApiResponse } from "@/lib/server/api-response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = crypto.randomUUID();
  try {
    const { id } = await params;

    let course: PartnerCourse | null = null;

    if (getBackendMode() === "neon-staging") {
      const rows = await queryRows<PartnerCourse>(`
        SELECT id::text, title, description, category, thumbnail_url, redirect_url,
               partner_name, partner_id::text, display_order, referral_code,
               status, is_published, is_partnered, created_at, updated_at, deleted_at
        FROM public.courses
        WHERE id = $1::uuid
          AND is_partnered = true
          AND is_published = true
          AND status = 'published'
          AND deleted_at IS NULL
        LIMIT 1`, [id]);

      course = rows[0] ?? null;
    } else {
      const { data, error } = await (getAdminClient() as any)
        .from("courses")
        .select(PARTNER_COURSE_SELECT)
        .eq("id", id)
        .eq("is_partnered", true)
        .eq("is_published", true)
        .eq("status", "published")
        .is("deleted_at", null)
        .maybeSingle();

      if (error) throw error;
      course = data ?? null;
    }

    if (!course || !isLivePartnerCourse(course)) {
      return jsonApiResponse(
        {
          data: null,
          error: {
            code: "COURSE_NOT_FOUND",
            message: "The requested partner course was not found or is no longer available.",
          },
          meta: { requestId },
        },
        404
      );
    }

    return jsonApiResponse({
      data: course,
      error: null,
      meta: { requestId },
    });
  } catch (err) {
    return jsonApiResponse(
      {
        data: null,
        error: {
          code: "COURSE_FETCH_FAILED",
          message: err instanceof Error ? err.message : "Failed to load course details.",
        },
        meta: { requestId },
      },
      500
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = crypto.randomUUID();
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const destinationUrl = typeof body.destinationUrl === "string" ? body.destinationUrl : null;
    const referrer = typeof body.referrer === "string" ? body.referrer : null;
    const userId = typeof body.userId === "string" ? body.userId : null;
    const metadata = body.metadata && typeof body.metadata === "object" ? body.metadata : {};

    if (!destinationUrl) {
      return jsonApiResponse(
        { data: null, error: { code: "INVALID_INPUT", message: "Destination URL is required." }, meta: { requestId } },
        400
      );
    }

    if (getBackendMode() === "neon-staging") {
      await queryRows(`
        INSERT INTO public.course_referrals (course_id, user_id, destination_url, referrer, metadata)
        VALUES ($1::uuid, $2::uuid, $3, $4, $5::jsonb)
        ON CONFLICT DO NOTHING`,
        [id, userId || null, destinationUrl, referrer, JSON.stringify(metadata)]
      );
    } else {
      const db = getAdminClient() as any;
      await db.from("course_referrals").insert({
        course_id: id,
        user_id: userId || null,
        destination_url: destinationUrl,
        referrer,
        metadata,
      });
    }

    return jsonApiResponse({ data: { success: true }, error: null, meta: { requestId } }, 200);
  } catch (err) {
    return jsonApiResponse(
      {
        data: null,
        error: {
          code: "REFERRAL_RECORD_FAILED",
          message: err instanceof Error ? err.message : "Failed to record referral.",
        },
        meta: { requestId },
      },
      500
    );
  }
}

