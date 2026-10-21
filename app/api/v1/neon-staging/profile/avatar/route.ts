/** Own-profile avatar upload; the legacy browser path remains unchanged. */
import { NextResponse } from "next/server";
import { getBackendMode } from "@/lib/server/backend-mode";
import { ApplicationStorageError, publicObjectUrl, uploadBytes } from "@/lib/server/application-storage";
import { NeonAuthorizationError } from "@/lib/server/neon-authorization";
import { getAuthenticatedApplicationUser, NeonSessionUnavailable, requireSameOrigin } from "@/lib/server/neon-session";
import { assertMediaObjectPath, buildMediaObjectPath, MediaPolicyError, parseMediaUploadIntent } from "@/lib/server/media-policy";
import { deleteObject } from "@/lib/server/storage";
import { withTransaction } from "@/lib/server/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const maxBytes = 5 * 1024 * 1024;
const noStore = { "cache-control": "private, no-store" };

function stagingOnly() {
  try { return getBackendMode() !== "legacy"; } catch { return false; }
}
function validImage(bytes: Uint8Array, mime: string) {
  const prefix = (...values: number[]) => values.every((value, index) => bytes[index] === value);
  if (mime === "image/png") return prefix(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
  if (mime === "image/jpeg") return prefix(0xff, 0xd8, 0xff);
  if (mime === "image/webp") return prefix(0x52, 0x49, 0x46, 0x46) &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  if (mime === "image/avif") return bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70 &&
    bytes[8] === 0x61 && bytes[9] === 0x76 && bytes[10] === 0x69 && bytes[11] === 0x66;
  return false;
}
function failure(error: unknown) {
  if (error instanceof NeonAuthorizationError || error instanceof MediaPolicyError || error instanceof ApplicationStorageError) {
    return NextResponse.json({ error: error instanceof ApplicationStorageError ? "STORAGE_DENIED" : error.code },
      { status: error.status, headers: noStore });
  }
  if (error instanceof NeonSessionUnavailable) return NextResponse.json({ error: "AUTH_UNAVAILABLE" }, { status: 503, headers: noStore });
  return NextResponse.json({ error: "AVATAR_UNAVAILABLE" }, { status: 503, headers: noStore });
}

export async function POST(request: Request) {
  if (!stagingOnly()) return new Response(null, { status: 404 });
  try {
    requireSameOrigin(request);
    const length = Number(request.headers.get("content-length"));
    if (!Number.isSafeInteger(length) || length <= 0) return NextResponse.json({ error: "LENGTH_REQUIRED" }, { status: 411, headers: noStore });
    if (length > maxBytes + 64 * 1024) return NextResponse.json({ error: "FILE_TOO_LARGE" }, { status: 413, headers: noStore });
    const actor = await getAuthenticatedApplicationUser(request);
    const form = await request.formData().catch(() => null);
    if (!form || [...form.keys()].some((key) => key !== "file")) return NextResponse.json({ error: "INVALID_BODY" }, { status: 422, headers: noStore });
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "FILE_REQUIRED" }, { status: 422, headers: noStore });
    const intent = parseMediaUploadIntent({ module: "profile_avatar", resourceId: null,
      fileName: file.name, contentType: file.type, sizeBytes: file.size });
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!validImage(bytes, intent.contentType)) return NextResponse.json({ error: "INVALID_IMAGE" }, { status: 415, headers: noStore });
    const path = buildMediaObjectPath(intent, actor.userId);
    const stored = await uploadBytes(actor, { ...intent, bytes, path });
    let avatarUrl: string;
    let previous: string | null;
    try {
      avatarUrl = await publicObjectUrl("profile_avatar", stored.path);
      previous = await withTransaction(async (client) => {
        const rows = await client.query<{ avatar_url: string | null }>(`
          SELECT p.avatar_url FROM public.profiles p
          WHERE p.user_id=$1::uuid AND p.account_status='active' AND p.deleted_at IS NULL
            AND EXISTS (SELECT 1 FROM public.neon_application_accounts a
              JOIN public.neon_identity_links l ON l.application_account_id=a.id
              WHERE a.legacy_user_id=p.user_id AND a.status='active'
                AND l.neon_auth_user_id=$2::uuid AND l.status='verified')
          FOR UPDATE`, [actor.userId, actor.neonAuthUserId]);
        if (!rows.rows[0]) throw new NeonAuthorizationError(403, "IDENTITY_NOT_LINKED", "A linked profile is required.");
        await client.query(`UPDATE public.profiles SET avatar_url=$2, updated_at=now() WHERE user_id=$1::uuid`, [actor.userId, stored.path]);
        return rows.rows[0].avatar_url;
      });
    } catch (error) {
      await deleteObject(stored.bucket, stored.path).catch(() => undefined);
      throw error;
    }
    if (previous && previous !== stored.path) {
      try {
        assertMediaObjectPath({ module: "profile_avatar", resourceId: null, path: previous }, actor.userId);
        await deleteObject(stored.bucket, previous);
      } catch { /* Imported or externally referenced avatars remain intact. */ }
    }
    return NextResponse.json({ data: { avatarUrl } }, { status: 201, headers: noStore });
  } catch (error) { return failure(error); }
}
