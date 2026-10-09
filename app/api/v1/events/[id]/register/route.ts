/**
 * Event registration endpoint.
 * Mode-aware: uses NeonEventsRepository in staging, legacy events-service otherwise.
 */
import { jsonApiResponse } from "@/lib/server/api-response";
import { getBackendMode } from "@/lib/server/backend-mode";
import { authenticateRequest } from "@/lib/server/auth";
import { registerForEvent } from "@/lib/server/events-service";
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
    if (!body || typeof body !== "object") {
      return jsonApiResponse(
        { data: null, error: { code: "INVALID_BODY", message: "Request payload must be a JSON object." }, meta: { requestId } },
        400
      );
    }

    if (getBackendMode() === "neon-staging") {
      const actor = await getAuthenticatedApplicationUser(request);
      const repo = new NeonEventsRepository();
      const registration = await repo.registerForEvent(actor, {
        eventId,
        ticketQuantity: typeof body.attendeeCount === "number" ? body.attendeeCount : 1,
        participants: Array.isArray(body.participants) ? body.participants : undefined,
        customResponses: typeof body.customResponses === "object" ? body.customResponses : {},
      });

      return jsonApiResponse({ data: registration, error: null, meta: { requestId } }, 201);
    }

    // Legacy path
    const authenticated = await authenticateRequest(request);

    const result = await registerForEvent({
      userId: authenticated.user.id,
      eventId,
      programId: body.programId || null,
      ticketTypeId: body.ticketTypeId || null,
      attendeeCount: typeof body.attendeeCount === "number" ? body.attendeeCount : 1,
      teamName: body.teamName || null,
      participants: Array.isArray(body.participants) ? body.participants : undefined,
      customResponses: typeof body.customResponses === "object" ? body.customResponses : {},
      formData: typeof body.formData === "object" ? body.formData : {},
    });

    return jsonApiResponse(
      { data: result, error: null, meta: { requestId } },
      201
    );
  } catch (err: any) {
    const status = err.status || (err.message?.includes("not found") ? 404 : 400);
    return jsonApiResponse(
      {
        data: null,
        error: {
          code: err.code || "REGISTRATION_FAILED",
          message: err.message || "Failed to complete registration.",
        },
        meta: { requestId },
      },
      status
    );
  }
}
