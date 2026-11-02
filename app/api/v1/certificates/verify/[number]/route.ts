import { NeonEventActivities } from "@/lib/server/neon-event-activities";
import { eventActivityError, eventActivityResponse } from "@/lib/server/event-activity-response";
import { getBackendMode } from "@/lib/server/backend-mode";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(_request: Request, context: { params: Promise<{ number: string }> }) {
  if (getBackendMode() === "legacy") return new Response(null, { status: 404 });
  try { return eventActivityResponse(await new NeonEventActivities().verifyCertificate((await context.params).number)); }
  catch (error) { return eventActivityError(error); }
}
