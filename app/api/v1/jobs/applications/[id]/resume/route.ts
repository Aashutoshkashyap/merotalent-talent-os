/** A recruiter may download only the resume stored on an application in their live entity scope. */
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
const missingResume = () => NextResponse.json({ data: null, error: {
  code: "RESUME_NOT_FOUND", message: "Resume file unavailable; applicant needs to re-upload.",
} }, { status: 404, headers });

interface ApplicationResumeRow {
  user_id: string;
  resume_url: string | null;
  job_id: string;
  company_id: string | null;
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  if (getBackendMode() === "legacy") return new Response(null, { status: 404 });
  try {
    const { id } = await context.params;
    if (!uuid.test(id)) return NextResponse.json({ error: "INVALID_APPLICATION_ID" }, { status: 422, headers });
    const actor = await getAuthenticatedApplicationUser(request);
    const [application] = await queryRows<ApplicationResumeRow>(`
      SELECT a.user_id, a.resume_url, a.job_id, j.company_id
      FROM public.job_applications a
      JOIN public.jobs j ON j.id=a.job_id AND j.deleted_at IS NULL
      WHERE a.id=$1::uuid AND a.deleted_at IS NULL LIMIT 1`, [id]);
    if (!application) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404, headers });
    await requireApplicationRead(actor, application.company_id ? "company" : "job", application.company_id ?? application.job_id);
    if (!application.resume_url) return missingResume();
    const path = application.resume_url;
    // The imported legacy path is also private, but must carry the applicant's exact owner ID.
    const legacy = path.split("/");
    if (legacy.length === 2 && legacy[0] === application.user_id &&
        /^[A-Za-z0-9._-]{1,180}\.(pdf|doc|docx)$/i.test(legacy[1]) && !legacy[1].includes("..")) {
      // Valid imported owner-scoped path.
    } else {
      const ownerId = assertMediaObjectPath({ module: "resume", resourceId: null, path },
        application.user_id, true);
      if (ownerId !== application.user_id) throw new NeonAuthorizationError(403, "RESUME_OWNER_MISMATCH", "Resume owner mismatch.");
    }
    if (!await headObject("resumes", path)) return missingResume();
    const signed = await createPresignedDownloadUrl("resumes", path, 300, true);
    return NextResponse.json({ data: { signedUrl: signed.signedUrl, expiresIn: 300 } }, { headers });
  } catch (error) {
    if (error instanceof NeonAuthorizationError || error instanceof MediaPolicyError) {
      return NextResponse.json({ error: error.code }, { status: error.status, headers });
    }
    if (error instanceof NeonSessionUnavailable) {
      return NextResponse.json({ error: "AUTH_UNAVAILABLE" }, { status: 503, headers });
    }
    return NextResponse.json({ error: "RESUME_UNAVAILABLE" }, { status: 503, headers });
  }
}
