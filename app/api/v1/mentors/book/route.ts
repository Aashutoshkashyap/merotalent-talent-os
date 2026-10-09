import { authenticateRequest, ApiAuthError } from "@/lib/server/auth";
import { jsonApiResponse } from "@/lib/server/api-response";
import { bookMentorSession } from "@/lib/server/mentorship-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const auth = await authenticateRequest(request);
    const body = await request.json();

    if (!body.mentorId || typeof body.mentorId !== "string") {
      return jsonApiResponse(
        {
          data: null,
          error: { code: "INVALID_MENTOR_ID", message: "A valid mentor ID is required." },
          meta: { requestId },
        },
        400
      );
    }

    if (!body.scheduledDate || !body.scheduledTime) {
      return jsonApiResponse(
        {
          data: null,
          error: { code: "INVALID_SCHEDULE", message: "Booking date and time are required." },
          meta: { requestId },
        },
        400
      );
    }

    if (!body.topic || typeof body.topic !== "string" || body.topic.trim().length === 0) {
      return jsonApiResponse(
        {
          data: null,
          error: { code: "TOPIC_REQUIRED", message: "Please specify what you would like to discuss." },
          meta: { requestId },
        },
        400
      );
    }

    const bookingResult = await bookMentorSession({
      userId: auth.user.id,
      mentorId: body.mentorId,
      mentorServiceId: body.mentorServiceId || null,
      fullName: body.fullName || auth.user.email?.split("@")[0] || "Student",
      email: body.email || auth.user.email || "",
      phone: body.phone || "",
      scheduledDate: body.scheduledDate,
      scheduledTime: body.scheduledTime,
      durationMinutes: body.durationMinutes ? Number(body.durationMinutes) : undefined,
      topic: body.topic.trim(),
      notes: body.notes?.trim(),
      meetingPreference: body.meetingPreference,
    });

    return jsonApiResponse(
      {
        data: bookingResult,
        error: null,
        meta: { requestId },
      },
      201
    );
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return jsonApiResponse(
        {
          data: null,
          error: { code: error.code, message: error.message },
          meta: { requestId },
        },
        error.status
      );
    }

    const message = error instanceof Error ? error.message : "Failed to create mentor booking.";
    const isConflict = message.includes("already booked") || message.includes("slot");

    return jsonApiResponse(
      {
        data: null,
        error: {
          code: isConflict ? "SLOT_CONFLICT" : "BOOKING_FAILED",
          message,
        },
        meta: { requestId },
      },
      isConflict ? 409 : 400
    );
  }
}
