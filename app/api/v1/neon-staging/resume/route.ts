/** One isolated Neon staging storage slice: an authenticated user's own PDF resume. */
import { NextResponse } from "next/server";
import { getBackendMode } from "@/lib/server/backend-mode";
import { ApplicationStorageError, privateDownloadUrl, uploadBytes } from "@/lib/server/application-storage";
import { NeonAuthorizationError } from "@/lib/server/neon-authorization";
import { getAuthenticatedApplicationUser, NeonSessionUnavailable } from "@/lib/server/neon-session";
import { buildMediaObjectPath, MediaPolicyError, parseMediaUploadIntent } from "@/lib/server/media-policy";

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
