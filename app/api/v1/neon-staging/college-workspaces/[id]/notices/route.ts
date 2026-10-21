import { NextResponse } from "next/server";
import { getBackendMode } from "@/lib/server/backend-mode";
import { queryRows, withTransaction } from "@/lib/server/db";
import { NeonAuthorizationError, requireEntityAccess } from "@/lib/server/neon-authorization";
import { getAuthenticatedApplicationUser, NeonSessionUnavailable, requireSameOrigin } from "@/lib/server/neon-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const headers = { "Cache-Control": "private, no-store" };
const fail = (code: string, status: number) => NextResponse.json({ error: code }, { status, headers });
const invalid = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);

function parseNotice(value: unknown) {
  if (!invalid(value) || Object.keys(value).some(key => !["id", "title", "content", "notice_type", "is_pinned"].includes(key)) ||
      typeof value.title !== "string" || value.title.trim().length < 2 || value.title.length > 180 ||
      (value.content !== undefined && (typeof value.content !== "string" || value.content.length > 10_000)) ||
      !["general", "admission", "event", "result"].includes(String(value.notice_type)) ||
      typeof value.is_pinned !== "boolean" ||
      (value.id !== undefined && (typeof value.id !== "string" || !uuid.test(value.id)))) return null;
  return { id: value.id as string | undefined, title: value.title.trim(),
    content: (value.content as string | undefined)?.trim() ?? "", noticeType: value.notice_type as string,
    pinned: value.is_pinned };
}

function handleError(cause: unknown) {
  if (cause instanceof NeonAuthorizationError) return fail(cause.code, cause.status);
  if (cause instanceof NeonSessionUnavailable) return fail("AUTH_UNAVAILABLE", 503);
  return fail("NOTICES_UNAVAILABLE", 503);
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  if (getBackendMode() === "legacy") return new Response(null, { status: 404 });
  try {
    const { id } = await context.params;
    if (!uuid.test(id)) return fail("INVALID_COLLEGE", 400);
    const actor = await getAuthenticatedApplicationUser(request);
    await requireEntityAccess(actor, "college", "college", id, null);
    const rows = await queryRows(`SELECT id,title,content,notice_type,is_pinned,attachment_url,published_at,created_at
      FROM public.institute_notices WHERE institute_id=$1::uuid
      ORDER BY is_pinned DESC,published_at DESC LIMIT 100`, [id]);
    return NextResponse.json({ data: rows }, { headers });
  } catch (cause) { return handleError(cause); }
}

async function write(request: Request, context: { params: Promise<{ id: string }> }, action: "create" | "edit" | "delete") {
  if (getBackendMode() === "legacy") return new Response(null, { status: 404 });
  try {
    requireSameOrigin(request);
    const { id } = await context.params;
    if (!uuid.test(id)) return fail("INVALID_COLLEGE", 400);
    const raw: unknown = await request.json().catch(() => null);
    const value = action === "delete" ? null : parseNotice(raw);
    const noticeId = invalid(raw) && typeof raw.id === "string" ? raw.id : null;
    if ((action !== "delete" && !value) || (action !== "create" && (!noticeId || !uuid.test(noticeId))) ||
        (action === "create" && noticeId)) return fail("INVALID_NOTICE", 400);
    const actor = await getAuthenticatedApplicationUser(request);
    const row = await withTransaction(async client => {
      await requireEntityAccess(actor, "college", "college", id, null, {
        query: async <T extends import("pg").QueryResultRow>(sql: string, params: readonly unknown[]) =>
          (await client.query<T>(sql, [...params])).rows,
      });
      const result = action === "create"
        ? await client.query(`INSERT INTO public.institute_notices(institute_id,title,content,notice_type,is_pinned)
          SELECT i.id,$2,$3,$4,$5 FROM public.institutes i WHERE i.id=$1::uuid AND i.deleted_at IS NULL
          RETURNING id,title,content,notice_type,is_pinned,attachment_url,published_at,created_at`,
        [id, value!.title, value!.content, value!.noticeType, value!.pinned])
        : action === "edit"
          ? await client.query(`UPDATE public.institute_notices SET title=$3,content=$4,notice_type=$5,is_pinned=$6
            WHERE id=$2::uuid AND institute_id=$1::uuid
            RETURNING id,title,content,notice_type,is_pinned,attachment_url,published_at,created_at`,
          [id, noticeId, value!.title, value!.content, value!.noticeType, value!.pinned])
          : await client.query(`DELETE FROM public.institute_notices WHERE id=$2::uuid AND institute_id=$1::uuid RETURNING id`, [id, noticeId]);
      if (!result.rows[0]) throw new NeonAuthorizationError(404, "NOTICE_NOT_FOUND", "Notice not found in this college.");
      await client.query(`INSERT INTO public.audit_logs(actor_user_id,action,entity_type,entity_id,metadata)
        VALUES ($1::uuid,$2,'institute_notices',$3::text,jsonb_build_object('college_id',$4::uuid))`,
      [actor.userId, `${action}_college_notice`, result.rows[0].id, id]);
      return result.rows[0];
    });
    return NextResponse.json({ data: row }, { status: action === "create" ? 201 : 200, headers });
  } catch (cause) { return handleError(cause); }
}
export const POST = (request: Request, context: { params: Promise<{ id: string }> }) => write(request, context, "create");
export const PATCH = (request: Request, context: { params: Promise<{ id: string }> }) => write(request, context, "edit");
export const DELETE = (request: Request, context: { params: Promise<{ id: string }> }) => write(request, context, "delete");
