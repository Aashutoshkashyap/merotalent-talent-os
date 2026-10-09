import { z } from "zod";
import { authenticateRequest } from "@/lib/server/auth";
import { adminApiErrorResponse, AdminRequestError, readAdminJsonBody, throwDatabaseError } from "@/lib/admin/admin-route-utils";
import { jsonApiResponse } from "@/lib/server/api-response";
import { getAdminClient } from "@/lib/server/supabase";
import { getBackendMode } from "@/lib/server/backend-mode";
import { getAuthenticatedApplicationUser, NeonSessionUnavailable } from "@/lib/server/neon-session";
import { NeonAuthorizationError } from "@/lib/server/neon-authorization";
import { NeonJobsRepository } from "@/lib/server/neon-jobs";
import { loadProviderSecret } from "@/lib/server/provider-config-service";
import { getConfiguredTransactionalEmailProvider, getTransactionalEmailProvider } from "@/lib/server/email-provider";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const updateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["submitted", "applied", "screening", "follow_up", "shortlisted", "interview", "offered", "selected", "confirmed", "rejected"]),
  notes: z.string().max(5000).default(""),
  interviewAt: z.string().datetime().nullable().default(null),
  interviewLocation: z.string().max(1000).default(""),
  duration: z.number().int().min(5).max(480).default(30),
}).strict();

export async function GET(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const isStaging = getBackendMode() === "neon-staging";

    if (isStaging) {
      const actor = await getAuthenticatedApplicationUser(request);
      const url = new URL(request.url);
      const offsetParam = url.searchParams.get("offset");
      const mode = url.searchParams.get("mode");
      const jobId = url.searchParams.get("jobId") || undefined;
      const repo = new NeonJobsRepository();

      if (mode === "review" || offsetParam !== null || jobId) {
        const offset = Number(offsetParam || 0);
        if (!Number.isInteger(offset) || offset < 0 || offset > 100000) {
          return jsonApiResponse({ data: null, error: { code: "INVALID_OFFSET", message: "Invalid page offset." }, meta: { requestId } }, 400);
        }
        const applications = await repo.listRecruiterApplications(actor, jobId, offset);
        return jsonApiResponse({ data: applications, error: null, meta: { requestId, count: applications.length } });
      }

      const applications = await repo.listOwnApplications(actor);
      return jsonApiResponse({
        data: applications,
        error: null,
        meta: { requestId, count: applications.length },
      });
    }

    const authenticated = await authenticateRequest(request);
    const url = new URL(request.url);
    const offsetParam = url.searchParams.get("offset");
    const mode = url.searchParams.get("mode");

    // If offset or review mode is explicitly requested, use the recruiter/admin review RPC
    if (mode === "review" || offsetParam !== null) {
      const offset = Number(offsetParam || 0);
      if (!Number.isInteger(offset) || offset < 0 || offset > 100000) {
        throw new AdminRequestError(400, "INVALID_OFFSET", "Invalid page.");
      }
      const { data, error } = await authenticated.userClient.rpc("list_job_applications_for_review", { p_offset: offset });
      if (error) throwDatabaseError(error);
      return jsonApiResponse({ data: data || [], error: null, meta: { requestId } });
    }

    // Default: Return the authenticated student's own job applications
    const db = getAdminClient() as any;
    const { data: applications, error } = await db
      .from("job_applications")
      .select(`
        id,
        job_id,
        status,
        applied_at,
        updated_at,
        resume_url,
        cover_letter,
        portfolio_url,
        skills_match_score,
        timeline,
        interview_at,
        interview_location,
        interview_duration_minutes,
        interview_type,
        interview_status,
        job:job_id (
          id,
          title,
          location,
          job_type,
          experience_level,
          salary_min,
          salary_max,
          is_remote,
          company:company_id (
            id,
            name,
            logo_url
          )
        )
      `)
      .eq("user_id", authenticated.user.id)
      .is("deleted_at", null)
      .order("applied_at", { ascending: false });

    if (error) throw error;

    return jsonApiResponse({
      data: applications || [],
      error: null,
      meta: { requestId, count: applications?.length || 0 },
    });
  } catch (err: any) {
    if (getBackendMode() === "neon-staging") {
      if (err instanceof NeonAuthorizationError) {
        return jsonApiResponse({ data: null, error: { code: err.code, message: err.message }, meta: { requestId } }, err.status);
      }
      if (err instanceof NeonSessionUnavailable) {
        return jsonApiResponse({ data: null, error: { code: "AUTH_UNAVAILABLE", message: err.message }, meta: { requestId } }, 503);
      }
    }
    if (err instanceof AdminRequestError || err.code === "42501" || err.status === 401 || err.status === 403) {
      return adminApiErrorResponse(err, requestId, "load job applications");
    }
    return jsonApiResponse(
      {
        data: null,
        error: {
          code: err.code || "APPLICATIONS_FETCH_FAILED",
          message: err.message || "Failed to load job applications.",
        },
        meta: { requestId },
      },
      err.status || 500
    );
  }
}

export async function PATCH(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const isStaging = getBackendMode() === "neon-staging";
    const body = await readAdminJsonBody(request);
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      throw new AdminRequestError(422, "INVALID_APPLICATION_UPDATE", "Check the status, notes and interview details.");
    }
    const input = parsed.data;

    if (isStaging) {
      const actor = await getAuthenticatedApplicationUser(request);
      const repo = new NeonJobsRepository();
      const updated = await repo.reviewApplication(actor, {
        id: input.id,
        status: input.status,
        notes: input.notes,
        interviewAt: input.interviewAt,
        interviewLocation: input.interviewLocation,
        duration: input.duration,
      });

      return jsonApiResponse({
        data: {
          id: updated.id,
          status: updated.status,
          interviewAt: updated.interview_at,
          interviewLocation: updated.interview_location,
          emailStatus: "not_required",
        },
        error: null,
        meta: { requestId },
      });
    }

    const { userClient } = await authenticateRequest(request);

    // Normalizing status for RPC compatibility if necessary
    const normalizedStatus = input.status === "applied" ? "submitted" : input.status === "selected" ? "offered" : input.status;

    const { data, error } = await userClient.rpc("review_job_application", {
      p_id: input.id,
      p_status: normalizedStatus,
      p_notes: input.notes,
      p_interview_at: input.interviewAt,
      p_interview_location: input.interviewLocation,
      p_duration: input.duration,
    });
    if (error) throwDatabaseError(error);

    let emailStatus = "not_required";
    // Only the authorized, committed RPC may choose the email record/recipient.
    if (data?.notificationId) {
      emailStatus = "failed";
      try {
        const db = getAdminClient();
        const { data: notification, error: readError } = await db
          .from("notifications")
          .select("title,message,email_to")
          .eq("id", data.notificationId)
          .eq("channel", "email")
          .eq("status", "queued")
          .single();
        if (readError) throw readError;
        const config = await loadProviderSecret("email");
        const provider = config ? getConfiguredTransactionalEmailProvider(config) : getTransactionalEmailProvider();
        const delivery = await provider.send({
          event: "job_application_received",
          to: notification.email_to,
          subject: notification.title,
          text: notification.message,
          idempotencyKey: `job-application-${data.notificationId}`,
        });
        emailStatus = delivery.status;
        const { error: recordError } = await db
          .from("notifications")
          .update({
            status: delivery.status === "sent" ? "sent" : "failed",
            sent_at: delivery.status === "sent" ? new Date().toISOString() : null,
            metadata: { delivery_status: delivery.status, provider: delivery.provider },
          })
          .eq("id", data.notificationId);
        if (recordError) emailStatus = "delivery_record_failed";
      } catch {
        emailStatus = "failed";
      }
    }
    return jsonApiResponse({ data: { ...data, emailStatus }, error: null, meta: { requestId } });
  } catch (error) {
    return adminApiErrorResponse(error, requestId, "review job application");
  }
}
