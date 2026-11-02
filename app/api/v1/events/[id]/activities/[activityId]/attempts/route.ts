import { z } from "zod";
import { getBackendMode } from "@/lib/server/backend-mode";
import { getAuthenticatedApplicationUser, requireSameOrigin } from "@/lib/server/neon-session";
import { readAdminJsonBody } from "@/lib/admin/admin-route-utils";
import { NeonEventActivities } from "@/lib/server/neon-event-activities";
import { eventActivityError, eventActivityResponse } from "@/lib/server/event-activity-response";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string; activityId: string }> };
async function handle(request: Request, context: Context) {
  if (getBackendMode() === "legacy") return new Response(null, { status: 404 });
  try {
    if (request.method !== "GET") requireSameOrigin(request);
    const actor = await getAuthenticatedApplicationUser(request), { id, activityId } = await context.params;
    const attemptId = new URL(request.url).searchParams.get("attemptId") ?? undefined;
    if (request.method !== "POST") z.string().uuid().parse(attemptId);
    const body = request.method === "PATCH" ? await readAdminJsonBody(request) : undefined;
    return eventActivityResponse(await new NeonEventActivities().attempt(actor, id, activityId, attemptId, body));
  } catch (error) { return eventActivityError(error); }
}
export const GET = handle;
export const POST = handle;
export const PATCH = handle;
