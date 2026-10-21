import { NextResponse } from "next/server";
import { getBackendMode } from "@/lib/server/backend-mode";
import { queryRows } from "@/lib/server/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const blogSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const slug = new URL(request.url).searchParams.get("slug");
  if (!uuid.test(id) || (slug !== null && (slug.length > 180 || !blogSlugPattern.test(slug)))) {
    return NextResponse.json({ error: "Invalid college update request." }, { status: 400 });
  }
  try {
    if (getBackendMode() !== "legacy") {
      const rows = slug === null
        ? await queryRows(`SELECT b.id::text, b.title, b.slug, b.excerpt,
            b.featured_image_url, b.published_at
          FROM public.college_blogs b
          JOIN public.institutes i ON i.id=b.institute_id
          WHERE b.institute_id=$1::uuid AND i.status='approved' AND i.deleted_at IS NULL
            AND b.status='published' AND b.deleted_at IS NULL AND b.published_at <= now()
          ORDER BY b.published_at DESC`, [id])
        : await queryRows(`SELECT b.title, b.excerpt, b.content, b.featured_image_url,
            b.published_at, b.seo_title, b.seo_description
          FROM public.college_blogs b
          JOIN public.institutes i ON i.id=b.institute_id
          WHERE b.institute_id=$1::uuid AND b.slug=$2 AND i.status='approved'
            AND i.deleted_at IS NULL AND b.status='published' AND b.deleted_at IS NULL
            AND b.published_at <= now() LIMIT 1`, [id, slug]);
      return NextResponse.json({ data: slug === null ? rows : rows[0] ?? null }, {
        headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" },
      });
    }
    const { getAdminClient } = await import("@/lib/server/supabase");
    const client = getAdminClient();
    const { data: institute, error: instituteError } = await client.from("institutes")
      .select("id").eq("id", id).eq("status", "approved").is("deleted_at", null).maybeSingle();
    if (instituteError) throw instituteError;
    if (!institute) return NextResponse.json({ data: slug === null ? [] : null });
    let query = client.from("college_blogs").select(slug === null
      ? "id,title,slug,excerpt,featured_image_url,published_at"
      : "title,excerpt,content,featured_image_url,published_at,seo_title,seo_description")
      .eq("institute_id", id).eq("status", "published").is("deleted_at", null)
      .lte("published_at", new Date().toISOString());
    if (slug !== null) query = query.eq("slug", slug);
    const result = slug === null
      ? await query.order("published_at", { ascending: false })
      : await query.maybeSingle();
    if (result.error) throw result.error;
    return NextResponse.json({ data: result.data ?? (slug === null ? [] : null) }, {
      headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" },
    });
  } catch (error) {
    console.error("[institute blogs] unavailable", error && typeof error === "object" && "code" in error
      ? String(error.code) : error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "College updates are unavailable." }, { status: 503 });
  }
}
