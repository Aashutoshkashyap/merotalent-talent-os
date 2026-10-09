/**
 * Public institute directory listing endpoint.
 * Supports search, type/category filters, and cursor pagination.
 * No authentication required. Safe for public CDN caching with short TTL.
 */
import { NextResponse } from "next/server";
import { getBackendMode } from "@/lib/server/backend-mode";
import { getAdminClient } from "@/lib/server/supabase";
import { queryRows } from "@/lib/server/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface PublicInstituteRow {
  id: string;
  name: string;
  short_name: string | null;
  slug: string | null;
  type: string | null;
  institution_category: string | null;
  level: string | null;
  description: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  location: string | null;
  is_featured: boolean | null;
  ranking: number | null;
  status: string;
  admission_status: string | null;
  applications_enabled: boolean | null;
}

export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const search = url.searchParams.get("search")?.trim() || null;
    const type = url.searchParams.get("type")?.trim() || null;
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") ?? "20", 10)));
    const offset = Math.max(0, parseInt(url.searchParams.get("offset") ?? "0", 10));
    const featured = url.searchParams.get("featured") === "true";

    let institutes: PublicInstituteRow[] = [];

    if (getBackendMode() === "neon-staging") {
      const searchFilter = search ? `%${search.toLowerCase()}%` : null;
      institutes = await queryRows<PublicInstituteRow>(`
        SELECT id, name, short_name, slug, type, institution_category,
               level, description, logo_url, cover_image_url,
               location, is_featured, ranking, status,
               admission_status, applications_enabled
        FROM public.institutes
        WHERE status = 'approved' AND deleted_at IS NULL
          AND ($1::text IS NULL OR (
            lower(name) LIKE $1 OR lower(coalesce(description, '')) LIKE $1
            OR lower(coalesce(location, '')) LIKE $1
          ))
          AND ($2::text IS NULL OR type = $2)
          AND ($3::boolean IS FALSE OR is_featured = true)
        ORDER BY
          CASE WHEN is_featured THEN 0 ELSE 1 END,
          ranking ASC NULLS LAST,
          name ASC
        LIMIT $4 OFFSET $5`,
        [searchFilter, type, featured, limit, offset]);
    } else {
      let query = (getAdminClient() as any)
        .from("institute_directory")
        .select(`
          id, name, short_name, slug, type, institution_category,
          level, description, logo_url, cover_image_url,
          location, is_featured, ranking, status,
          admission_status, applications_enabled
        `)
        .eq("status", "approved")
        .is("deleted_at", null)
        .order("ranking", { ascending: true, nullsFirst: false })
        .range(offset, offset + limit - 1);

      if (search) {
        // Use ilike for simple partial-match search
        query = query.or(`name.ilike.%${search}%,location.ilike.%${search}%`);
      }
      if (type) {
        query = query.eq("type", type);
      }
      if (featured) {
        query = query.eq("is_featured", true);
      }

      const { data, error } = await query;
      if (error) {
        console.error("[institutes] Legacy fetch error:", error.message);
        return NextResponse.json({ data: [] });
      }
      institutes = data ?? [];
    }

    return NextResponse.json({ data: institutes }, {
      headers: {
        "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
      },
    });
  } catch (err) {
    console.error("[institutes] Unexpected error:", err);
    return NextResponse.json({ data: [] });
  }
}
