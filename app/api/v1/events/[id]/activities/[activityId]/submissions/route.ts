import { getBackendMode } from "@/lib/server/backend-mode";
import { getAuthenticatedApplicationUser, requireSameOrigin } from "@/lib/server/neon-session";
import { NeonEventActivities } from "@/lib/server/neon-event-activities";
import { eventActivityError, eventActivityResponse } from "@/lib/server/event-activity-response";
import { readAdminJsonBody } from "@/lib/admin/admin-route-utils";
import { scheduleNeonEmailDelivery } from "@/lib/server/neon-email-dispatch";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string; activityId: string }> };
async function handle(request: Request, context: Context) {
  if (getBackendMode() === "legacy") return new Response(null, { status: 404 });
  try {
    if (request.method === "POST") requireSameOrigin(request);
    const actor = await getAuthenticatedApplicationUser(request), { id, activityId } = await context.params;
    const data = await new NeonEventActivities().assignment(actor, id, activityId, request.method === "POST" ? await readAdminJsonBody(request) : undefined);
    scheduleNeonEmailDelivery();
    return eventActivityResponse(data);
  } catch (error) { return eventActivityError(error); }
}
export const GET = handle;
export const POST = handle;
