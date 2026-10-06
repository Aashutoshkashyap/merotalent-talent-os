import { z } from "zod";
import { authenticateRequest } from "@/lib/server/auth";
import { adminApiErrorResponse, AdminRequestError, readAdminJsonBody, throwDatabaseError } from "@/lib/admin/admin-route-utils";
import { jsonApiResponse } from "@/lib/server/api-response";
import { getAdminClient } from "@/lib/server/supabase";
import { loadProviderSecret } from "@/lib/server/provider-config-service";
import { getConfiguredTransactionalEmailProvider, getTransactionalEmailProvider } from "@/lib/server/email-provider";

export const dynamic = "force-dynamic";
const updateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["submitted", "screening", "follow_up", "interview", "offered", "confirmed", "rejected"]),
  notes: z.string().max(5000).default(""),
  interviewAt: z.string().datetime().nullable().default(null),
  interviewLocation: z.string().max(1000).default(""),
  duration: z.number().int().min(5).max(480).default(30),
}).strict();

export async function GET(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const { userClient } = await authenticateRequest(request);
    const offset = Number(new URL(request.url).searchParams.get("offset") || 0);
    if (!Number.isInteger(offset) || offset < 0 || offset > 100000) throw new AdminRequestError(400, "INVALID_OFFSET", "Invalid page.");
    const { data, error } = await userClient.rpc("list_job_applications_for_review", { p_offset: offset });
    if (error) throwDatabaseError(error);
    return jsonApiResponse({ data, error: null, meta: { requestId } });
  } catch (error) { return adminApiErrorResponse(error, requestId, "load job applications"); }
}

export async function PATCH(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const { userClient } = await authenticateRequest(request);
    const parsed = updateSchema.safeParse(await readAdminJsonBody(request));
    if (!parsed.success) throw new AdminRequestError(422, "INVALID_APPLICATION_UPDATE", "Check the status, notes and interview details.");
    const input = parsed.data;
    const { data, error } = await userClient.rpc("review_job_application", {
      p_id: input.id, p_status: input.status, p_notes: input.notes,
      p_interview_at: input.interviewAt, p_interview_location: input.interviewLocation, p_duration: input.duration,
    });
    if (error) throwDatabaseError(error);
    let emailStatus = "not_required";
    // Only the authorized, committed RPC may choose the email record/recipient.
    if (data?.notificationId) {
      emailStatus = "failed";
      try {
        const db = getAdminClient();
        const { data: notification, error: readError } = await db.from("notifications").select("title,message,email_to").eq("id", data.notificationId).eq("channel", "email").eq("status", "queued").single();
        if (readError) throw readError;
        const config = await loadProviderSecret("email");
        const provider = config ? getConfiguredTransactionalEmailProvider(config) : getTransactionalEmailProvider();
        const delivery = await provider.send({ event: "job_application_received", to: notification.email_to, subject: notification.title, text: notification.message, idempotencyKey: `job-application-${data.notificationId}` });
        emailStatus = delivery.status;
        const { error: recordError } = await db.from("notifications").update({
          status: delivery.status === "sent" ? "sent" : "failed",
          sent_at: delivery.status === "sent" ? new Date().toISOString() : null,
          metadata: { delivery_status: delivery.status, provider: delivery.provider },
        }).eq("id", data.notificationId);
        if (recordError) emailStatus = "delivery_record_failed";
      } catch { emailStatus = "failed"; }
    }
    return jsonApiResponse({ data: { ...data, emailStatus }, error: null, meta: { requestId } });
  } catch (error) { return adminApiErrorResponse(error, requestId, "review job application"); }
}
