import { NextResponse } from "next/server";
import { getBackendMode } from "@/lib/server/backend-mode";
import { queryRows } from "@/lib/server/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface BlogUpdate {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  published_at: string | null;
}

interface NoticeUpdate {
  id: string;
  title: string;
  content: string | null;
  published_at: string | null;
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!uuid.test(id)) return NextResponse.json({ error: "Invalid institution ID." }, { status: 400 });
  try {
    let blogs: BlogUpdate[] = [];
    let notices: NoticeUpdate[] = [];
    if (getBackendMode() === "neon-staging") {
      const rows = await queryRows<{ blogs: BlogUpdate[]; notices: NoticeUpdate[] }>(`
        SELECT
          COALESCE((SELECT jsonb_agg(to_jsonb(b)) FROM (
            SELECT id::text, title, slug, excerpt, published_at
            FROM public.college_blogs
            WHERE institute_id=$1::uuid AND status='published' AND deleted_at IS NULL
              AND published_at <= now()
            ORDER BY published_at DESC LIMIT 3
          ) b), '[]'::jsonb) AS blogs,
          COALESCE((SELECT jsonb_agg(to_jsonb(n)) FROM (
            SELECT id::text, title, content, published_at
            FROM public.institute_notices
            WHERE institute_id=$1::uuid AND published_at <= now()
            ORDER BY published_at DESC LIMIT 3
          ) n), '[]'::jsonb) AS notices
        WHERE EXISTS (SELECT 1 FROM public.institutes i WHERE i.id=$1::uuid
          AND i.status='approved' AND i.deleted_at IS NULL)`, [id]);
      blogs = rows[0]?.blogs ?? [];
      notices = rows[0]?.notices ?? [];
    } else {
      const { getAdminClient } = await import("@/lib/server/supabase");
      const client = getAdminClient();
      const { data: institute, error: instituteError } = await client.from("institutes")
        .select("id").eq("id", id).eq("status", "approved").is("deleted_at", null).maybeSingle();
      if (instituteError) throw instituteError;
      if (institute) {
        const [blogResult, noticeResult] = await Promise.all([
          client.from("college_blogs").select("id,title,slug,excerpt,published_at")
            .eq("institute_id", id).eq("status", "published").is("deleted_at", null)
            .lte("published_at", new Date().toISOString())
            .order("published_at", { ascending: false }).limit(3),
          client.from("institute_notices").select("id,title,content,published_at")
            .eq("institute_id", id).lte("published_at", new Date().toISOString())
            .order("published_at", { ascending: false }).limit(3),
        ]);
        if (blogResult.error) throw blogResult.error;
        if (noticeResult.error) throw noticeResult.error;
        blogs = blogResult.data ?? [];
        notices = noticeResult.data ?? [];
      }
    }
    return NextResponse.json({ data: { blogs, notices } }, {
      headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" },
    });
  } catch (error) {
    console.error("[institute updates] unavailable", error && typeof error === "object" && "code" in error
      ? String(error.code) : error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "College updates are unavailable." }, { status: 503 });
  }
}
