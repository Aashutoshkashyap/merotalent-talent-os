import { getBackendMode } from "@/lib/server/backend-mode";
import { getAuthenticatedApplicationUser, requireSameOrigin } from "@/lib/server/neon-session";
import { eventPresentation } from "@/lib/server/neon-event-presentation";
import { eventActivityError, eventActivityResponse } from "@/lib/server/event-activity-response";
import { readAdminJsonBody } from "@/lib/admin/admin-route-utils";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
async function handle(request: Request, context: Context) {
  if (getBackendMode() === "legacy") return new Response(null, { status: 404 });
  try {
    if (request.method === "POST") requireSameOrigin(request);
    const actor = await getAuthenticatedApplicationUser(request), { id } = await context.params;
    return eventActivityResponse(await eventPresentation(actor, id, request.method === "POST" ? await readAdminJsonBody(request) : undefined));
  } catch (error) { return eventActivityError(error); }
}
export const GET = handle;
export const POST = handle;
