/**
 * Event lifecycle management endpoint (organizer/admin only).
 * Mode-aware: uses NeonEventsRepository in staging, legacy events-service otherwise.
 */
import { jsonApiResponse } from "@/lib/server/api-response";
import { getBackendMode } from "@/lib/server/backend-mode";
import { authenticateRequest } from "@/lib/server/auth";
import { updateEventLifecycle } from "@/lib/server/events-service";
import { getAdminClient } from "@/lib/server/supabase";
import { NeonEventsRepository } from "@/lib/server/neon-events";
import { getAuthenticatedApplicationUser } from "@/lib/server/neon-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = crypto.randomUUID();
  try {
    const { id: eventId } = await params;
    const body = await request.json().catch(() => ({}));

    if (!body || !body.lifecycleStatus) {
      return jsonApiResponse(
        { data: null, error: { code: "INVALID_STATUS", message: "Lifecycle status is required." }, meta: { requestId } },
        400
      );
    }

    if (getBackendMode() !== "legacy") {
      const actor = await getAuthenticatedApplicationUser(request);
      const repo = new NeonEventsRepository();
      const result = await repo.updateLifecycle(actor, eventId, body.lifecycleStatus, {
        postponedDate: body.postponedDate || null,
        postponedReason: body.postponedReason || null,
        cancellationReason: body.cancellationReason || null,
      });

      return jsonApiResponse({ data: result, error: null, meta: { requestId } });
    }

    // Legacy path
    const authenticated = await authenticateRequest(request);

    const isPlatformAdmin = authenticated.actor.roles.some((r) =>
      ["super_admin", "superadmin", "admin"].includes(r.toLowerCase())
    );

    const db = getAdminClient() as any;
    const { data: event } = await db
      .from("events")
      .select("id, organizer_user_id")
      .eq("id", eventId)
      .maybeSingle();

    if (!event) {
      return jsonApiResponse(
        { data: null, error: { code: "EVENT_NOT_FOUND", message: "Event was not found." }, meta: { requestId } },
        404
      );
    }

    const isOrganizer = event.organizer_user_id === authenticated.user.id;
    if (!isPlatformAdmin && !isOrganizer) {
      return jsonApiResponse(
        { data: null, error: { code: "FORBIDDEN", message: "You are not authorized to change the lifecycle of this event." }, meta: { requestId } },
        403
      );
    }

    const result = await updateEventLifecycle({
      eventId,
      actorUserId: authenticated.user.id,
      lifecycleStatus: body.lifecycleStatus,
      postponedDate: body.postponedDate || null,
      postponedReason: body.postponedReason || null,
      cancellationReason: body.cancellationReason || null,
    });

    return jsonApiResponse({
      data: result,
      error: null,
      meta: { requestId },
    });
  } catch (err: any) {
    return jsonApiResponse(
      {
        data: null,
        error: {
          code: err.code || "LIFECYCLE_UPDATE_FAILED",
          message: err.message || "Failed to update event lifecycle.",
        },
        meta: { requestId },
      },
      err.status || 500
    );
  }
}
