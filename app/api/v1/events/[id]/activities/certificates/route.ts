import { z } from "zod";
import { getBackendMode } from "@/lib/server/backend-mode";
import { getAuthenticatedApplicationUser, requireSameOrigin } from "@/lib/server/neon-session";
import { NeonEventActivities } from "@/lib/server/neon-event-activities";
import { eventActivityError, eventActivityResponse } from "@/lib/server/event-activity-response";
import { readAdminJsonBody } from "@/lib/admin/admin-route-utils";
import { scheduleNeonEmailDelivery } from "@/lib/server/neon-email-dispatch";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  if (getBackendMode() === "legacy") return new Response(null, { status: 404 });
  try {
    const actor = await getAuthenticatedApplicationUser(request), { id } = await context.params, service = new NeonEventActivities();
    const params = new URL(request.url).searchParams;
    return eventActivityResponse(params.get("issued") === "true" ? await service.issuedCertificates(actor, id) : params.get("management") === "true"
      ? await service.certificateTemplates(actor, id) : await service.myCertificates(actor, id));
  } catch (error) { return eventActivityError(error); }
}
export async function POST(request: Request, context: Context) {
  if (getBackendMode() === "legacy") return new Response(null, { status: 404 });
  try {
    requireSameOrigin(request);
    const actor = await getAuthenticatedApplicationUser(request), { id } = await context.params;
    const body = z.object({ action: z.enum(["generate", "template", "revoke", "preview", "issue"]), payload: z.unknown().optional(), id: z.string().uuid().optional() }).strict().parse(await readAdminJsonBody(request));
    const service = new NeonEventActivities();
    if (body.action === "preview") return new Response(new Uint8Array(await service.previewCertificate(actor, id, body.payload)), {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": 'attachment; filename="merotalent-certificate-preview.pdf"', "Cache-Control": "private, no-store" },
    });
    const manual = body.action === "issue" ? z.object({ user_id: z.string().uuid(), template_id: z.string().uuid(), reason: z.string().trim().min(10).max(2000) }).strict().parse(body.payload) : undefined;
    const data = manual ? await service.myCertificates(actor, id, true, { user_id: manual.user_id, template_id: manual.template_id, reason: manual.reason })
      : body.action === "generate" ? await service.myCertificates(actor, id, true)
      : body.action === "revoke" ? await service.revokeCertificate(actor, id, body.payload)
        : await service.certificateTemplates(actor, id, body.payload, body.id);
    scheduleNeonEmailDelivery(); return eventActivityResponse(data);
  } catch (error) { return eventActivityError(error); }
}
