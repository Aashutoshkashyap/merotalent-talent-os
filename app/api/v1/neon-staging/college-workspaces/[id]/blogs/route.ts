import { NextResponse } from "next/server";
import { getBackendMode } from "@/lib/server/backend-mode";
import { queryRows, withTransaction } from "@/lib/server/db";
import { NeonAuthorizationError, requireEntityAccess } from "@/lib/server/neon-authorization";
import { getAuthenticatedApplicationUser, NeonSessionUnavailable, requireSameOrigin } from "@/lib/server/neon-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const headers = { "Cache-Control": "private, no-store" };
const reply = (data: unknown, status = 200) => NextResponse.json(data, { status, headers });
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const fail = (cause: unknown) => cause instanceof NeonAuthorizationError ? reply({ error: cause.code }, cause.status)
  : reply({ error: cause instanceof NeonSessionUnavailable ? "AUTH_UNAVAILABLE" : "BLOG_UNAVAILABLE" }, 503);

function parseBlog(raw: unknown) {
  if (!object(raw) || Object.keys(raw).some(key => !["id", "title", "slug", "excerpt", "content", "featured_image_url", "status"].includes(key)) ||
      typeof raw.title !== "string" || raw.title.trim().length < 3 || raw.title.length > 180 ||
      typeof raw.slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(raw.slug) || raw.slug.length > 100 ||
      typeof raw.content !== "string" || !raw.content.trim() || raw.content.length > 50_000 ||
      (raw.excerpt !== undefined && raw.excerpt !== null && (typeof raw.excerpt !== "string" || raw.excerpt.length > 500)) ||
      (raw.featured_image_url !== undefined && raw.featured_image_url !== null &&
        (typeof raw.featured_image_url !== "string" || raw.featured_image_url.length > 2048 ||
          (raw.featured_image_url !== "" && !/^https:\/\/[^\s]+$/i.test(raw.featured_image_url)))) ||
      !["draft", "published"].includes(String(raw.status)) ||
      (raw.id !== undefined && (typeof raw.id !== "string" || !uuid.test(raw.id)))) return null;
  return { id: raw.id as string | undefined, title: raw.title.trim(), slug: raw.slug,
    excerpt: typeof raw.excerpt === "string" ? raw.excerpt.trim() : "",
    content: raw.content.trim(), featuredImageUrl: typeof raw.featured_image_url === "string" ? raw.featured_image_url.trim() : "",
    status: raw.status as "draft" | "published" };
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  if (getBackendMode() === "legacy") return new Response(null, { status: 404 });
  try {
    const { id } = await context.params;
    if (!uuid.test(id)) return reply({ error: "INVALID_COLLEGE" }, 400);
    const actor = await getAuthenticatedApplicationUser(request);
    await requireEntityAccess(actor, "college", "college", id, "profile_editing");
    return reply({ data: await queryRows(`SELECT id,institute_id,title,slug,excerpt,content,featured_image_url,status,published_at
      FROM public.college_blogs WHERE institute_id=$1::uuid AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 100`, [id]) });
  } catch (cause) { return fail(cause); }
}

async function write(request: Request, context: { params: Promise<{ id: string }> }, action: "create" | "edit" | "delete") {
  if (getBackendMode() === "legacy") return new Response(null, { status: 404 });
  try {
    requireSameOrigin(request);
    const { id } = await context.params;
    if (!uuid.test(id)) return reply({ error: "INVALID_COLLEGE" }, 400);
    const raw: unknown = await request.json().catch(() => null);
    const post = action === "delete" ? null : parseBlog(raw);
    const blogId = object(raw) && typeof raw.id === "string" ? raw.id : null;
    if ((action !== "delete" && !post) || (action !== "create" && (!blogId || !uuid.test(blogId))) ||
        (action === "create" && blogId) || (action === "delete" && (!object(raw) || Object.keys(raw).length !== 1)))
      return reply({ error: "INVALID_BLOG" }, 400);
    const actor = await getAuthenticatedApplicationUser(request);
    const row = await withTransaction(async client => {
      await requireEntityAccess(actor, "college", "college", id, "profile_editing", {
        query: async <T extends import("pg").QueryResultRow>(sql: string, params: readonly unknown[]) =>
          (await client.query<T>(sql, [...params])).rows,
      });
      const result = action === "create"
        ? await client.query(`INSERT INTO public.college_blogs
          (institute_id,author_user_id,title,slug,excerpt,content,featured_image_url,status,published_at)
          SELECT i.id,$2::uuid,$3,$4,NULLIF($5,''),$6,NULLIF($7,''),$8,
            CASE WHEN $8='published' THEN now() ELSE NULL END
          FROM public.institutes i WHERE i.id=$1::uuid AND i.deleted_at IS NULL
          RETURNING id`, [id, actor.userId, post!.title, post!.slug, post!.excerpt, post!.content, post!.featuredImageUrl, post!.status])
        : action === "edit"
          ? await client.query(`UPDATE public.college_blogs SET title=$3,slug=$4,excerpt=NULLIF($5,''),content=$6,
            featured_image_url=NULLIF($7,''),status=$8,
            published_at=CASE WHEN $8='published' THEN COALESCE(published_at,now()) ELSE NULL END,updated_at=now()
            WHERE institute_id=$1::uuid AND id=$2::uuid AND deleted_at IS NULL RETURNING id`,
          [id, blogId, post!.title, post!.slug, post!.excerpt, post!.content, post!.featuredImageUrl, post!.status])
          : await client.query(`UPDATE public.college_blogs SET deleted_at=now(),updated_at=now()
            WHERE institute_id=$1::uuid AND id=$2::uuid AND deleted_at IS NULL RETURNING id`, [id, blogId]);
      if (!result.rows[0]) throw new NeonAuthorizationError(404, "BLOG_NOT_FOUND", "Blog not found in this college.");
      await client.query(`INSERT INTO public.audit_logs(actor_user_id,action,entity_type,entity_id,metadata)
        VALUES ($1::uuid,$2,'college_blogs',$3::text,jsonb_build_object('college_id',$4::uuid))`,
      [actor.userId, `${action}_college_blog`, result.rows[0].id, id]);
      return result.rows[0];
    });
    return reply({ data: row }, action === "create" ? 201 : 200);
  } catch (cause) {
    if (object(cause) && cause.code === "23505") return reply({ error: "BLOG_SLUG_EXISTS" }, 409);
    return fail(cause);
  }
}
export const POST = (request: Request, context: { params: Promise<{ id: string }> }) => write(request, context, "create");
export const PATCH = (request: Request, context: { params: Promise<{ id: string }> }) => write(request, context, "edit");
export const DELETE = (request: Request, context: { params: Promise<{ id: string }> }) => write(request, context, "delete");
