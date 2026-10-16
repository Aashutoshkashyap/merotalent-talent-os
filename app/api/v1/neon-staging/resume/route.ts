/** One isolated Neon staging storage slice: an authenticated user's own PDF resume. */
import { NextResponse } from "next/server";
import { getBackendMode } from "@/lib/server/backend-mode";
import { ApplicationStorageError, privateDownloadUrl, uploadBytes } from "@/lib/server/application-storage";
import { NeonAuthorizationError } from "@/lib/server/neon-authorization";
import { getAuthenticatedApplicationUser, NeonSessionUnavailable } from "@/lib/server/neon-session";
import { buildMediaObjectPath, MediaPolicyError, parseMediaUploadIntent } from "@/lib/server/media-policy";
import { assertMediaObjectPath } from "@/lib/server/media-policy";
import { withTransaction } from "@/lib/server/db";
import { deleteObject } from "@/lib/server/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const maxPdfBytes = 5 * 1024 * 1024;
const noStore = { "cache-control": "private, no-store" };

function stagingOnly() {
  try { return getBackendMode() === "neon-staging"; } catch { return false; }
}

function failure(error: unknown) {
  if (error instanceof NeonAuthorizationError || error instanceof ApplicationStorageError || error instanceof MediaPolicyError) {
    const code = error instanceof NeonAuthorizationError || error instanceof MediaPolicyError
      ? error.code : "STORAGE_DENIED";
    return NextResponse.json({ error: code }, { status: error.status, headers: noStore });
  }
  if (error instanceof NeonSessionUnavailable) {
    return NextResponse.json({ error: "AUTH_UNAVAILABLE" }, { status: 503, headers: noStore });
  }
  return NextResponse.json({ error: "STORAGE_UNAVAILABLE" }, { status: 503, headers: noStore });
}

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try { return new URL(origin).origin === new URL(request.url).origin; }
  catch { return false; }
}

export async function POST(request: Request) {
  if (!stagingOnly()) return new Response(null, { status: 404 });
  if (!sameOrigin(request)) return NextResponse.json({ error: "INVALID_ORIGIN" }, { status: 403, headers: noStore });
  const lengthHeader = request.headers.get("content-length");
  const contentLength = Number(lengthHeader);
  if (!lengthHeader || !Number.isSafeInteger(contentLength) || contentLength < 1) {
    return NextResponse.json({ error: "LENGTH_REQUIRED" }, { status: 411, headers: noStore });
  }
  if (contentLength > maxPdfBytes + 64 * 1024) {
    return NextResponse.json({ error: "FILE_TOO_LARGE" }, { status: 413, headers: noStore });
  }
  try {
    const actor = await getAuthenticatedApplicationUser(request);
    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "FILE_REQUIRED" }, { status: 422, headers: noStore });
    }
    const intent = parseMediaUploadIntent({
      module: "resume", resourceId: null, fileName: file.name,
      contentType: file.type, sizeBytes: file.size,
    });
    // This slice accepts PDF only; DOC/DOCX handling needs a separate reviewed parser.
    if (intent.contentType !== "application/pdf") {
      return NextResponse.json({ error: "PDF_REQUIRED" }, { status: 415, headers: noStore });
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes.byteLength < 5 || bytes[0] !== 0x25 || bytes[1] !== 0x50 ||
        bytes[2] !== 0x44 || bytes[3] !== 0x46 || bytes[4] !== 0x2d) {
      return NextResponse.json({ error: "INVALID_PDF" }, { status: 415, headers: noStore });
    }
    const path = buildMediaObjectPath(intent, actor.userId);
    const stored = await uploadBytes(actor, { ...intent, bytes, path });
    let previousPath: string | null = null;
    let previousReferenced = false;
    try {
      previousPath = await withTransaction(async (client) => {
        const current = await client.query<{ resume_url: string | null }>(`
          SELECT p.resume_url FROM public.profiles p
          JOIN public.neon_application_accounts a ON a.legacy_user_id=p.user_id AND a.status='active'
          JOIN public.neon_identity_links l ON l.application_account_id=a.id AND l.status='verified'
          WHERE p.user_id=$1::uuid AND l.neon_auth_user_id=$2::uuid
            AND p.account_status='active' AND p.deleted_at IS NULL
          LIMIT 1 FOR UPDATE OF p`, [actor.userId, actor.neonAuthUserId]);
        if (!current.rows[0]) throw new NeonAuthorizationError(403, "IDENTITY_NOT_LINKED", "A current linked profile is required.");
        if (current.rows[0].resume_url) {
          const references = await client.query<{ referenced: boolean }>(`SELECT EXISTS (
            SELECT 1 FROM public.job_applications WHERE resume_url=$1
              OR form_data->>'resumeUrl'=$1 OR form_data->>'resume_url'=$1
          ) AS referenced`, [current.rows[0].resume_url]);
          previousReferenced = references.rows[0]?.referenced !== false;
        }
        await client.query(`UPDATE public.profiles SET resume_url=$2, updated_at=now()
          WHERE user_id=$1::uuid`, [actor.userId, stored.path]);
        return current.rows[0].resume_url;
      });
    } catch (error) {
      await deleteObject(stored.bucket, stored.path).catch(() => undefined);
      throw error;
    }
    // Application submission holds FOR SHARE on this profile. The FOR UPDATE
    // above serializes replacement with snapshots so an earlier submission's
    // private file remains available to its authorized recruiter.
    if (previousPath && previousPath !== stored.path && !previousReferenced) {
      try {
        assertMediaObjectPath({ module: "resume", resourceId: null, path: previousPath }, actor.userId, true);
        await deleteObject(stored.bucket, previousPath);
      } catch { /* Imported legacy paths or transient cleanup failures remain private. */ }
    }
    return NextResponse.json({ data: stored }, { status: 201, headers: noStore });
  } catch (error) { return failure(error); }
}

export async function GET(request: Request) {
  if (!stagingOnly()) return new Response(null, { status: 404 });
  try {
    const actor = await getAuthenticatedApplicationUser(request);
    const path = new URL(request.url).searchParams.get("path");
    if (!path) return NextResponse.json({ error: "PATH_REQUIRED" }, { status: 422, headers: noStore });
    const signedUrl = await privateDownloadUrl(actor, { module: "resume", path, expiresIn: 300 });
    return NextResponse.json({ data: { signedUrl, expiresIn: 300 } }, { headers: noStore });
  } catch (error) { return failure(error); }
}

export async function DELETE(request: Request) {
  if (!stagingOnly()) return new Response(null, { status: 404 });
  if (!sameOrigin(request)) return NextResponse.json({ error: "INVALID_ORIGIN" }, { status: 403, headers: noStore });
  try {
    const actor = await getAuthenticatedApplicationUser(request);
    const { oldPath, referenced } = await withTransaction(async (client) => {
      const current = await client.query<{ resume_url: string | null }>(`
        SELECT p.resume_url FROM public.profiles p
        JOIN public.neon_application_accounts a ON a.legacy_user_id=p.user_id AND a.status='active'
        JOIN public.neon_identity_links l ON l.application_account_id=a.id AND l.status='verified'
        WHERE p.user_id=$1::uuid AND l.neon_auth_user_id=$2::uuid
          AND p.account_status='active' AND p.deleted_at IS NULL
        LIMIT 1 FOR UPDATE OF p`, [actor.userId, actor.neonAuthUserId]);
      if (!current.rows[0]) throw new NeonAuthorizationError(403, "IDENTITY_NOT_LINKED", "A current linked profile is required.");
      let referenced = false;
      if (current.rows[0].resume_url) {
        const references = await client.query<{ referenced: boolean }>(`SELECT EXISTS (
          SELECT 1 FROM public.job_applications WHERE resume_url=$1
            OR form_data->>'resumeUrl'=$1 OR form_data->>'resume_url'=$1
        ) AS referenced`, [current.rows[0].resume_url]);
        referenced = references.rows[0]?.referenced !== false;
      }
      await client.query(`UPDATE public.profiles SET resume_url=NULL, updated_at=now() WHERE user_id=$1::uuid`, [actor.userId]);
      return { oldPath: current.rows[0].resume_url, referenced };
    });
    if (oldPath && !referenced) {
      try {
        assertMediaObjectPath({ module: "resume", resourceId: null, path: oldPath }, actor.userId, true);
        await deleteObject("resumes", oldPath);
      } catch { /* Imported legacy paths are retained privately for controlled cleanup. */ }
    }
    return NextResponse.json({ data: { deleted: true } }, { headers: noStore });
  } catch (error) { return failure(error); }
}
