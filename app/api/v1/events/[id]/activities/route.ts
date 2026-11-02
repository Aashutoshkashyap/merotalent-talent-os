import { z } from "zod";
import { getBackendMode } from "@/lib/server/backend-mode";
import { getAuthenticatedApplicationUser, requireSameOrigin } from "@/lib/server/neon-session";
import { readAdminJsonBody } from "@/lib/admin/admin-route-utils";
import { NeonEventActivities } from "@/lib/server/neon-event-activities";
import { eventActivityError, eventActivityResponse } from "@/lib/server/event-activity-response";
import { scheduleNeonEmailDelivery } from "@/lib/server/neon-email-dispatch";
import { eventCsv } from "@/lib/events/export";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  if (getBackendMode() === "legacy") return new Response(null, { status: 404 });
  try {
    const actor = await getAuthenticatedApplicationUser(request), { id } = await context.params;
    const service = new NeonEventActivities();
    const params = new URL(request.url).searchParams;
    if (params.has("export")) return new Response(eventCsv(await service.exportRecords(actor, id, params.get("export"))), {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="merotalent-event-records.csv"', "Cache-Control": "private, no-store" },
    });
    return eventActivityResponse(params.get("enrollments") === "true" ? await service.enrollments(actor, id)
      : params.get("submissions") === "true" ? await service.reviewAssignments(actor, id)
      : params.get("management") === "true" ? await service.management(actor, id) : await service.studentActivities(actor, id));
  } catch (error) { return eventActivityError(error); }
}
export async function POST(request: Request, context: Context) {
  if (getBackendMode() === "legacy") return new Response(null, { status: 404 });
  try {
    requireSameOrigin(request);
    const actor = await getAuthenticatedApplicationUser(request), { id } = await context.params;
    const input = z.object({ action: z.enum(["activity", "question", "enroll", "grade", "access"]), payload: z.unknown(), id: z.string().uuid().optional() }).strict().parse(await readAdminJsonBody(request));
    const service = new NeonEventActivities();
    const data = input.action === "access" ? await service.enrollments(actor, id, input.payload)
      : input.action === "grade" ? await service.reviewAssignments(actor, id, input.payload)
      : input.action === "question" ? await service.saveQuestion(actor, id, input.payload)
      : input.action === "enroll" ? await service.manualEnroll(actor, id, input.payload)
        : await service.saveActivity(actor, id, input.payload, input.id);
    scheduleNeonEmailDelivery();
    return eventActivityResponse(data);
  } catch (error) { return eventActivityError(error); }
}
