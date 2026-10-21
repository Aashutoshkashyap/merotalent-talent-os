/** Private chat attachments; never accepts a browser-supplied object path or sender ID. */
import { NextResponse } from "next/server";
import { getBackendMode } from "@/lib/server/backend-mode";
import { ApplicationStorageError, privateDownloadUrl, uploadBytes } from "@/lib/server/application-storage";
import { NeonAuthorizationError } from "@/lib/server/neon-authorization";
import { requireConversationMembership } from "@/lib/server/neon-application-events";
import { NeonMessagingRepository } from "@/lib/server/neon-messaging";
import { getAuthenticatedApplicationUser, NeonSessionUnavailable } from "@/lib/server/neon-session";
import { buildMediaObjectPath, MediaPolicyError, parseMediaUploadIntent } from "@/lib/server/media-policy";
import { deleteObject } from "@/lib/server/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const noStore = { "cache-control": "private, no-store" };
const maxBytes = 5 * 1024 * 1024;

function stagingOnly() {
  try { return getBackendMode() !== "legacy"; } catch { return false; }
}

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  try { return !!origin && new URL(origin).origin === new URL(request.url).origin; }
  catch { return false; }
}

function validSignature(bytes: Uint8Array, mime: string) {
  const prefix = (...values: number[]) => values.every((value, index) => bytes[index] === value);
  if (mime === "application/pdf") return prefix(0x25, 0x50, 0x44, 0x46, 0x2d);
  if (mime === "image/png") return prefix(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
  if (mime === "image/jpeg") return prefix(0xff, 0xd8, 0xff);
  if (mime === "image/webp") return prefix(0x52, 0x49, 0x46, 0x46) &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  return false;
}

function failure(error: unknown) {
  if (error instanceof NeonAuthorizationError || error instanceof MediaPolicyError || error instanceof ApplicationStorageError) {
    return NextResponse.json({ error: error instanceof ApplicationStorageError ? "STORAGE_DENIED" : error.code },
      { status: error.status, headers: noStore });
  }
  if (error instanceof NeonSessionUnavailable) {
    return NextResponse.json({ error: "AUTH_UNAVAILABLE" }, { status: 503, headers: noStore });
  }
  return NextResponse.json({ error: "ATTACHMENT_UNAVAILABLE" }, { status: 503, headers: noStore });
}

export async function POST(request: Request) {
  if (!stagingOnly()) return new Response(null, { status: 404 });
  if (!sameOrigin(request)) return NextResponse.json({ error: "INVALID_ORIGIN" }, { status: 403, headers: noStore });
  const length = Number(request.headers.get("content-length"));
  if (!Number.isSafeInteger(length) || length <= 0) {
    return NextResponse.json({ error: "LENGTH_REQUIRED" }, { status: 411, headers: noStore });
  }
  if (length > maxBytes + 64 * 1024) {
    return NextResponse.json({ error: "FILE_TOO_LARGE" }, { status: 413, headers: noStore });
  }
  try {
    const actor = await getAuthenticatedApplicationUser(request);
    const form = await request.formData().catch(() => null);
    if (!form || [...form.keys()].some((key) => !["conversationId", "file"].includes(key))) {
      return NextResponse.json({ error: "INVALID_BODY" }, { status: 422, headers: noStore });
    }
    const conversationId = form.get("conversationId");
    const file = form.get("file");
    if (typeof conversationId !== "string" || !uuid.test(conversationId) || !(file instanceof File)) {
      return NextResponse.json({ error: "INVALID_BODY" }, { status: 422, headers: noStore });
    }
    const intent = parseMediaUploadIntent({ module: "chat_attachment", resourceId: conversationId,
      fileName: file.name, contentType: file.type, sizeBytes: file.size });
    await requireConversationMembership(actor, conversationId);
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes.length !== file.size || !validSignature(bytes, intent.contentType)) {
      return NextResponse.json({ error: "INVALID_FILE_CONTENT" }, { status: 415, headers: noStore });
    }
    const path = buildMediaObjectPath(intent, actor.userId);
    const stored = await uploadBytes(actor, { ...intent, bytes, path });
    try {
      const message = await new NeonMessagingRepository().sendMessage(actor, conversationId,
        `[ATTACHMENT] ${intent.fileName}`, { path: stored.path, mimeType: intent.contentType });
      return NextResponse.json({ data: message }, { status: 201, headers: noStore });
    } catch (error) {
      await deleteObject(stored.bucket, stored.path).catch(() => undefined);
      throw error;
    }
  } catch (error) { return failure(error); }
}

export async function GET(request: Request) {
  if (!stagingOnly()) return new Response(null, { status: 404 });
  try {
    const actor = await getAuthenticatedApplicationUser(request);
    const params = new URL(request.url).searchParams;
    const conversationId = params.get("conversationId");
    const messageId = params.get("messageId");
    if (!conversationId || !uuid.test(conversationId) || !messageId || !uuid.test(messageId) ||
        [...params.keys()].some((key) => !["conversationId", "messageId"].includes(key))) {
      return NextResponse.json({ error: "INVALID_ATTACHMENT_REFERENCE" }, { status: 422, headers: noStore });
    }
    const message = await new NeonMessagingRepository().attachmentForMessage(actor, conversationId, messageId);
    const signedUrl = await privateDownloadUrl(actor, { module: "chat_attachment", resourceId: conversationId,
      path: message.attachment_path!, expiresIn: 60 });
    return NextResponse.json({ data: { signedUrl, mimeType: message.attachment_mime_type, expiresIn: 60 } },
      { headers: noStore });
  } catch (error) { return failure(error); }
}

// Message editing/deletion is not part of the current product. Do not expose object deletion.
export async function DELETE() {
  return new Response(null, { status: 405, headers: noStore });
}
