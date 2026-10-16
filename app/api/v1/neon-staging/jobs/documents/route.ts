/** Private applicant supporting documents in isolated Neon staging only. */
import { NextResponse } from "next/server";
import { getBackendMode } from "@/lib/server/backend-mode";
import { queryRows, withTransaction } from "@/lib/server/db";
import { getAuthenticatedApplicationUser, NeonSessionUnavailable, requireSameOrigin } from "@/lib/server/neon-session";
import { NeonAuthorizationError } from "@/lib/server/neon-authorization";
import { ApplicationStorageError, uploadBytes } from "@/lib/server/application-storage";
import { assertMediaObjectPath, buildMediaObjectPath, MediaPolicyError, parseMediaUploadIntent } from "@/lib/server/media-policy";
import { deleteObject } from "@/lib/server/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const headers = { "cache-control": "private, no-store" };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const maxBytes = 5 * 1024 * 1024;

function failure(error: unknown) {
  if (error instanceof NeonAuthorizationError || error instanceof MediaPolicyError) {
    return NextResponse.json({ error: error.code }, { status: error.status, headers });
  }
  if (error instanceof ApplicationStorageError) {
    return NextResponse.json({ error: "STORAGE_DENIED" }, { status: error.status, headers });
  }
  if (error instanceof NeonSessionUnavailable) {
    return NextResponse.json({ error: "AUTH_UNAVAILABLE" }, { status: 503, headers });
  }
  return NextResponse.json({ error: "DOCUMENT_UNAVAILABLE" }, { status: 503, headers });
}

export async function POST(request: Request) {
  if (getBackendMode() !== "neon-staging") return new Response(null, { status: 404 });
  try {
    requireSameOrigin(request);
    const length = Number(request.headers.get("content-length"));
    if (!Number.isSafeInteger(length) || length < 1) return NextResponse.json({ error: "LENGTH_REQUIRED" }, { status: 411, headers });
    if (length > maxBytes + 64 * 1024) return NextResponse.json({ error: "FILE_TOO_LARGE" }, { status: 413, headers });
    const actor = await getAuthenticatedApplicationUser(request);
    const form = await request.formData();
    const file = form.get("file");
    const jobId = form.get("jobId");
    const kind = form.get("kind");
    if (!(file instanceof File) || typeof jobId !== "string" || !uuid.test(jobId) ||
        (kind !== "experience" && kind !== "training")) {
      return NextResponse.json({ error: "INVALID_DOCUMENT_REQUEST" }, { status: 422, headers });
    }
    const jobs = await queryRows<{ id: string }>(`SELECT id FROM public.jobs WHERE id=$1::uuid
      AND deleted_at IS NULL AND is_active=true AND status='published' AND approval_status='approved'
      AND (application_deadline IS NULL OR application_deadline >= now())
      AND (expires_at IS NULL OR expires_at > now()) LIMIT 1`, [jobId]);
    if (!jobs[0]) return NextResponse.json({ error: "JOB_NOT_ACCEPTING_APPLICATIONS" }, { status: 403, headers });
    const intent = parseMediaUploadIntent({ module: "job_attachment", resourceId: jobId,
      fileName: file.name, contentType: file.type, sizeBytes: file.size });
    if (intent.contentType !== "application/pdf") return NextResponse.json({ error: "PDF_REQUIRED" }, { status: 415, headers });
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes.length < 5 || String.fromCharCode(...bytes.slice(0, 5)) !== "%PDF-") {
      return NextResponse.json({ error: "INVALID_PDF" }, { status: 415, headers });
    }
    const path = buildMediaObjectPath(intent, actor.userId);
    await queryRows(`INSERT INTO public.neon_job_document_drafts (path, job_id, user_id, kind)
      VALUES ($1, $2::uuid, $3::uuid, $4)`, [path, jobId, actor.userId, kind]);
    try {
      const stored = await uploadBytes(actor, { ...intent, bytes, path });
      return NextResponse.json({ data: { path: stored.path, kind } }, { status: 201, headers });
    } catch (error) {
      await queryRows(`DELETE FROM public.neon_job_document_drafts
        WHERE path=$1 AND user_id=$2::uuid AND state='draft'`, [path, actor.userId]).catch(() => undefined);
      throw error;
    }
  } catch (error) { return failure(error); }
}

export async function DELETE(request: Request) {
  if (getBackendMode() !== "neon-staging") return new Response(null, { status: 404 });
  try {
    requireSameOrigin(request);
    const actor = await getAuthenticatedApplicationUser(request);
    const body = await request.json().catch(() => null);
    if (!body || typeof body.jobId !== "string" || !uuid.test(body.jobId) || typeof body.path !== "string") {
      return NextResponse.json({ error: "INVALID_DOCUMENT_REQUEST" }, { status: 422, headers });
    }
    assertMediaObjectPath({ module: "job_attachment", resourceId: body.jobId, path: body.path }, actor.userId);
    const result = await withTransaction(async (client) => {
      const draft = await client.query<{ state: string }>(`SELECT state FROM public.neon_job_document_drafts
        WHERE path=$1 AND user_id=$2::uuid AND job_id=$3::uuid FOR UPDATE`,
      [body.path, actor.userId, body.jobId]);
      if (!draft.rows[0]) return "missing";
      if (draft.rows[0].state === "submitted") return "submitted";
      if (draft.rows[0].state === "deleted") return "deleted";
      // Historical application references are checked as defense in depth.
      const references = await client.query(`SELECT id FROM public.job_applications
        WHERE form_data->>'experienceLetterUrl'=$1 OR form_data->>'trainingDocumentUrl'=$1
        LIMIT 1`, [body.path]);
      if (references.rows[0]) return "submitted";
      await deleteObject("job-files", body.path);
      await client.query(`UPDATE public.neon_job_document_drafts
        SET state='deleted', deleted_at=now() WHERE path=$1`, [body.path]);
      return "deleted";
    });
    if (result === "missing") return NextResponse.json({ error: "DOCUMENT_NOT_FOUND" }, { status: 404, headers });
    if (result === "submitted") return NextResponse.json({ error: "DOCUMENT_ALREADY_SUBMITTED" }, { status: 409, headers });
    return NextResponse.json({ data: { deleted: true } }, { headers });
  } catch (error) { return failure(error); }
}
