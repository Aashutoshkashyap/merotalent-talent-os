/**
 * Public partner courses endpoint.
 * Returns published, partnered courses ordered by display_order.
 * No authentication required.
 */
import { NextResponse } from "next/server";
import { getBackendMode } from "@/lib/server/backend-mode";
import { getAdminClient } from "@/lib/server/supabase";
import { queryRows } from "@/lib/server/db";
import { PARTNER_COURSE_SELECT, type PartnerCourse, isLivePartnerCourse } from "@/lib/courses/partnered-courses";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = parseInt(searchParams.get("limit") || "6", 10);
    const limit = Math.min(Math.max(limitParam, 1), 50);
    const category = searchParams.get("category");

    let courses: PartnerCourse[] = [];

    if (getBackendMode() === "neon-staging") {
      let query = `
        SELECT id::text, title, description, category, thumbnail_url, redirect_url,
               partner_name, partner_id::text, display_order, referral_code,
               status, is_published, is_partnered, created_at, updated_at, deleted_at
        FROM public.courses
        WHERE is_partnered = true
          AND is_published = true
          AND status = 'published'
          AND deleted_at IS NULL
      `;
      const params: unknown[] = [];

      if (category && category !== "All") {
        params.push(category);
        query += ` AND category = $${params.length}`;
      }

      params.push(limit);
      query += ` ORDER BY display_order ASC NULLS LAST, created_at DESC LIMIT $${params.length}`;

      courses = await queryRows<PartnerCourse>(query, params);
    } else {
      let q = (getAdminClient() as any)
        .from("courses")
        .select(PARTNER_COURSE_SELECT)
        .eq("is_partnered", true)
        .eq("is_published", true)
        .eq("status", "published")
        .is("deleted_at", null);

      if (category && category !== "All") {
        q = q.eq("category", category);
      }

      const { data, error } = await q
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("[courses] Legacy fetch error:", error.message);
        return NextResponse.json({ data: [] });
      }
      courses = data ?? [];
    }

    const filtered = courses.filter(isLivePartnerCourse);

    return NextResponse.json({ data: filtered }, {
      headers: {
        "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
      },
    });
  } catch (err) {
    console.error("[courses] Unexpected error:", err);
    return NextResponse.json({ data: [] });
  }
}
