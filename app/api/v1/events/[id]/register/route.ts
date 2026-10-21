/**
 * Event registration endpoint.
 * Mode-aware: uses NeonEventsRepository in staging, legacy events-service otherwise.
 */
import { jsonApiResponse } from "@/lib/server/api-response";
import { getBackendMode } from "@/lib/server/backend-mode";
import { authenticateRequest } from "@/lib/server/auth";
import { registerForEvent } from "@/lib/server/events-service";
import { NeonEventsRepository } from "@/lib/server/neon-events";
import { getAuthenticatedApplicationUser, requireSameOrigin } from "@/lib/server/neon-session";
import { z } from "zod";

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

    if (getBackendMode() !== "legacy") {
      requireSameOrigin(request);
      const actor = await getAuthenticatedApplicationUser(request);
      const repo = new NeonEventsRepository();
      const parsed = z.object({ ticketTypeId: z.string().uuid().nullable().optional(),
        attendeeCount: z.number().int().min(1).max(10).optional(),
        participants: z.array(z.object({ fullName: z.string().trim().min(1).max(200),
          email: z.string().email().optional(), phone: z.string().max(30).optional(),
          college: z.string().max(200).optional(), studentId: z.string().max(100).optional(),
          roleInTeam: z.string().max(50).optional() })).max(10).optional(),
        customResponses: z.record(z.string(), z.unknown()).optional(),
        programId: z.string().uuid().nullable().optional(), teamName: z.string().max(200).nullable().optional() })
        .passthrough().safeParse(body);
      if (!parsed.success || "totalAmount" in body || "paymentStatus" in body) {
        return jsonApiResponse({ data: null, error: { code: "INVALID_REGISTRATION", message: "Choose a valid ticket and quantity." }, meta: { requestId } }, 422);
      }
      const registration = await repo.registerForEvent(actor, {
        eventId,
        ticketTypeId: parsed.data.ticketTypeId,
        ticketQuantity: parsed.data.attendeeCount ?? 1,
        participants: parsed.data.participants?.map((participant) => ({
          fullName: participant.fullName!, email: participant.email, phone: participant.phone, college: participant.college,
        })),
        customResponses: parsed.data.customResponses ?? {},
      });

      return jsonApiResponse({ data: { registration, isFree: registration.payment_status === "not_required" }, error: null, meta: { requestId } }, 201);
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
