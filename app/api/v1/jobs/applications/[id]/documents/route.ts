/** Recruiter-only download of the exact submitted private supporting document. */
import { NextResponse } from "next/server";
import { getBackendMode } from "@/lib/server/backend-mode";
import { queryRows } from "@/lib/server/db";
import { NeonAuthorizationError } from "@/lib/server/neon-authorization";
import { requireApplicationRead } from "@/lib/server/neon-jobs";
import { getAuthenticatedApplicationUser, NeonSessionUnavailable } from "@/lib/server/neon-session";
import { assertMediaObjectPath, MediaPolicyError } from "@/lib/server/media-policy";
import { createPresignedDownloadUrl, headObject } from "@/lib/server/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const headers = { "cache-control": "private, no-store" };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  if (getBackendMode() === "legacy") return new Response(null, { status: 404 });
  try {
    const { id } = await context.params;
    const kind = new URL(request.url).searchParams.get("kind");
    if (!uuid.test(id) || (kind !== "experience" && kind !== "training")) {
      return NextResponse.json({ error: "INVALID_DOCUMENT_REQUEST" }, { status: 422, headers });
    }
    const actor = await getAuthenticatedApplicationUser(request);
    const [application] = await queryRows<{ user_id: string; job_id: string; company_id: string | null; form_data: Record<string, unknown> }>(`
      SELECT a.user_id, a.job_id, a.form_data, j.company_id
      FROM public.job_applications a JOIN public.jobs j ON j.id=a.job_id AND j.deleted_at IS NULL
      WHERE a.id=$1::uuid AND a.deleted_at IS NULL LIMIT 1`, [id]);
    if (!application) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404, headers });
    await requireApplicationRead(actor, application.company_id ? "company" : "job", application.company_id ?? application.job_id);
    const path = application.form_data?.[kind === "experience" ? "experienceLetterUrl" : "trainingDocumentUrl"];
    if (typeof path !== "string" || !path) return NextResponse.json({ error: "DOCUMENT_NOT_FOUND" }, { status: 404, headers });
    const pathOwner = assertMediaObjectPath({ module: "job_attachment", resourceId: application.job_id, path }, application.user_id, true);
    if (pathOwner !== application.user_id) {
      throw new NeonAuthorizationError(403, "DOCUMENT_OWNER_MISMATCH", "Document owner mismatch.");
    }
    if (!await headObject("job-files", path)) return NextResponse.json({ error: "DOCUMENT_NOT_FOUND" }, { status: 404, headers });
    const signed = await createPresignedDownloadUrl("job-files", path, 300, true);
    return NextResponse.json({ data: { signedUrl: signed.signedUrl, expiresIn: 300 } }, { headers });
  } catch (error) {
    if (error instanceof NeonAuthorizationError || error instanceof MediaPolicyError) {
      return NextResponse.json({ error: error.code }, { status: error.status, headers });
    }
    if (error instanceof NeonSessionUnavailable) return NextResponse.json({ error: "AUTH_UNAVAILABLE" }, { status: 503, headers });
    return NextResponse.json({ error: "DOCUMENT_UNAVAILABLE" }, { status: 503, headers });
  }
}
