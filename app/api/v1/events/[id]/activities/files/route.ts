import { z } from "zod";
import { getBackendMode } from "@/lib/server/backend-mode";
import { getAuthenticatedApplicationUser, requireSameOrigin } from "@/lib/server/neon-session";
import { NeonEventActivities } from "@/lib/server/neon-event-activities";
import { eventActivityError, eventActivityResponse } from "@/lib/server/event-activity-response";
import { readEventActivityUpload } from "@/lib/server/event-activity-files";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
export async function POST(request: Request, context: Context) {
  if (getBackendMode() === "legacy") return new Response(null, { status: 404 });
  try {
    requireSameOrigin(request);
    const actor = await getAuthenticatedApplicationUser(request), { id } = await context.params;
    const { file, purpose, activityId } = await readEventActivityUpload(request);
    const input = z.object({ purpose: z.enum(["question", "assignment", "certificate_template"]), activityId: z.string().uuid().nullable() }).parse({ purpose, activityId });
    return eventActivityResponse(await new NeonEventActivities().uploadFile(actor, id,
      { purpose: input.purpose!, activityId: input.activityId ?? null, fileName: file.name, bytes: new Uint8Array(await file.arrayBuffer()) }));
  } catch (error) { return eventActivityError(error); }
}
export async function GET(request: Request, context: Context) {
  if (getBackendMode() === "legacy") return new Response(null, { status: 404 });
  try {
    const actor = await getAuthenticatedApplicationUser(request), { id } = await context.params, params = new URL(request.url).searchParams;
    return eventActivityResponse(await new NeonEventActivities().fileUrl(actor, id, params.get("fileId") ?? "", params.get("management") === "true"));
  } catch (error) { return eventActivityError(error); }
}
export async function DELETE(request: Request, context: Context) {
  if (getBackendMode() === "legacy") return new Response(null, { status: 404 });
  try {
    requireSameOrigin(request);
    const actor = await getAuthenticatedApplicationUser(request), { id } = await context.params;
    return eventActivityResponse(await new NeonEventActivities().deleteUnusedFile(actor, id, new URL(request.url).searchParams.get("fileId") ?? ""));
  } catch (error) { return eventActivityError(error); }
}
