import { NextResponse } from "next/server";
import { getBackendMode } from "@/lib/server/backend-mode";
import { uploadBytes } from "@/lib/server/application-storage";
import { withTransaction } from "@/lib/server/db";
import { assertMediaObjectPath, buildMediaObjectPath, MediaPolicyError, parseMediaUploadIntent } from "@/lib/server/media-policy";
import { NeonAuthorizationError, requireEntityAccess, type NeonActor } from "@/lib/server/neon-authorization";
import { getAuthenticatedApplicationUser, NeonSessionUnavailable, requireSameOrigin } from "@/lib/server/neon-session";
import { deleteObject } from "@/lib/server/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const noStore = { "Cache-Control": "private, no-store" };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type Kind = "logo" | "cover";
const moduleFor = (kind: Kind) => kind === "logo" ? "college_logo" : "college_cover";
const columnFor = (kind: Kind) => kind === "logo" ? "logo_url" : "cover_image_url";
const error = (code: string, status: number) => NextResponse.json({ error: code }, { status, headers: noStore });

function imageBytesMatch(bytes: Uint8Array, mime: string): boolean {
  const starts = (...values: number[]) => values.every((value, index) => bytes[index] === value);
  if (mime === "image/png") return starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
  if (mime === "image/jpeg") return starts(0xff, 0xd8, 0xff);
  if (mime === "image/webp") return starts(0x52, 0x49, 0x46, 0x46) &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  if (mime === "image/avif") return bytes[4] === 0x66 && bytes[5] === 0x74 &&
    bytes[6] === 0x79 && bytes[7] === 0x70 && bytes[8] === 0x61 &&
    bytes[9] === 0x76 && bytes[10] === 0x69 && bytes[11] === 0x66;
  return false;
}

async function replaceReference(actor: NeonActor, id: string, kind: Kind, next: string | null): Promise<string | null> {
  return withTransaction(async client => {
    await requireEntityAccess(actor, "college", "college", id, "media_management", {
      query: async <T extends import("pg").QueryResultRow>(sql: string, values: readonly unknown[]) =>
        (await client.query<T>(sql, [...values])).rows,
    });
    const column = columnFor(kind);
    const current = await client.query<{ path: string | null }>(
      `SELECT ${column} AS path FROM public.institutes WHERE id=$1::uuid AND deleted_at IS NULL FOR UPDATE`, [id]);
    if (!current.rows[0]) throw new NeonAuthorizationError(404, "COLLEGE_NOT_FOUND", "College not found.");
    const previous = current.rows[0].path;
    await client.query(`UPDATE public.institutes SET ${column}=$2, updated_at=now() WHERE id=$1::uuid`, [id, next]);
    await client.query(`INSERT INTO public.audit_logs(actor_user_id,action,entity_type,entity_id,metadata)
      VALUES ($1::uuid,$2,'college',$3::text,jsonb_build_object('media_kind',$4::text,'replaced', $5::boolean))`,
    [actor.userId, next ? "update_college_media" : "remove_college_media", id, kind, !!previous]);
    return previous;
  });
}

async function removeOld(actor: NeonActor, id: string, kind: Kind, previous: string | null, next: string | null) {
  if (!previous || previous === next) return;
  try {
    assertMediaObjectPath({ module: moduleFor(kind), resourceId: id, path: previous }, actor.userId);
    // Imported/shared paths are never deleted. Only an owned, unreferenced object is disposable.
    const referenced = await withTransaction(async client => (await client.query<{ used: boolean }>(`
      SELECT EXISTS (SELECT 1 FROM public.institutes WHERE deleted_at IS NULL
        AND (logo_url=$1 OR cover_image_url=$1 OR $1=ANY(gallery_urls))) AS used`, [previous])).rows[0]?.used);
    if (!referenced) await deleteObject("college-media", previous);
  } catch { /* A stale object is safer than deleting another institution's image. */ }
}

function failure(cause: unknown) {
  if (cause instanceof NeonAuthorizationError || cause instanceof MediaPolicyError) return error(cause.code, cause.status);
  if (cause instanceof NeonSessionUnavailable) return error("AUTH_UNAVAILABLE", 503);
  return error("COLLEGE_MEDIA_UNAVAILABLE", 503);
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  if (getBackendMode() !== "neon-staging") return new Response(null, { status: 404 });
  try {
    requireSameOrigin(request);
    const { id } = await context.params;
    if (!uuid.test(id)) return error("INVALID_COLLEGE", 400);
    const length = Number(request.headers.get("content-length"));
    if (!Number.isSafeInteger(length) || length <= 0) return error("LENGTH_REQUIRED", 411);
    if (length > 8 * 1024 * 1024 + 64 * 1024) return error("FILE_TOO_LARGE", 413);
    const actor = await getAuthenticatedApplicationUser(request);
    const form = await request.formData().catch(() => null);
    if (!form || [...form.keys()].some(key => key !== "kind" && key !== "file")) return error("INVALID_BODY", 422);
    const kind = form.get("kind");
    const file = form.get("file");
    if ((kind !== "logo" && kind !== "cover") || !(file instanceof File)) return error("INVALID_BODY", 422);
    const intent = parseMediaUploadIntent({ module: moduleFor(kind), resourceId: id,
      fileName: file.name, contentType: file.type, sizeBytes: file.size });
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!imageBytesMatch(bytes, intent.contentType)) return error("INVALID_IMAGE", 415);
    await requireEntityAccess(actor, "college", "college", id, "media_management");
    const path = buildMediaObjectPath(intent, actor.userId);
    const stored = await uploadBytes(actor, { ...intent, bytes, path });
    let previous: string | null;
    try { previous = await replaceReference(actor, id, kind, stored.path); }
    catch (cause) { await deleteObject(stored.bucket, stored.path).catch(() => undefined); throw cause; }
    await removeOld(actor, id, kind, previous, stored.path);
    return NextResponse.json({ data: { bucket: stored.bucket, path: stored.path,
      publicUrl: `/api/v1/institutes/media?path=${encodeURIComponent(stored.path)}` } },
    { status: 201, headers: noStore });
  } catch (cause) { return failure(cause); }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  if (getBackendMode() !== "neon-staging") return new Response(null, { status: 404 });
  try {
    requireSameOrigin(request);
    const { id } = await context.params;
    const kind = new URL(request.url).searchParams.get("kind");
    if (!uuid.test(id) || (kind !== "logo" && kind !== "cover")) return error("INVALID_BODY", 400);
    const actor = await getAuthenticatedApplicationUser(request);
    const previous = await replaceReference(actor, id, kind, null);
    await removeOld(actor, id, kind, previous, null);
    return NextResponse.json({ data: { removed: !!previous } }, { headers: noStore });
  } catch (cause) { return failure(cause); }
}
