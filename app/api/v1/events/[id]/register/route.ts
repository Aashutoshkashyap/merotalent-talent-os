import { jsonApiResponse } from "@/lib/server/api-response";
import { authenticateRequest } from "@/lib/server/auth";
import { registerForEvent } from "@/lib/server/events-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = crypto.randomUUID();
  try {
    const authenticated = await authenticateRequest(request);
    const { id: eventId } = await params;

    const body = await request.json().catch(() => ({}));
    if (!body || typeof body !== "object") {
      return jsonApiResponse(
        {
          data: null,
          error: {
            code: "INVALID_BODY",
            message: "Request payload must be a JSON object.",
          },
          meta: { requestId },
        },
        400
      );
    }

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
      {
        data: result,
        error: null,
        meta: { requestId },
      },
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
