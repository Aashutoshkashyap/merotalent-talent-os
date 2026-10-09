/**
 * Mentor review submission endpoint.
 * Mode-aware: uses NeonMentorsRepository in staging, legacy mentorship-service otherwise.
 */
import { authenticateRequest, ApiAuthError } from "@/lib/server/auth";
import { jsonApiResponse } from "@/lib/server/api-response";
import { getBackendMode } from "@/lib/server/backend-mode";
import { submitMentorReview } from "@/lib/server/mentorship-service";
import { NeonMentorsRepository } from "@/lib/server/neon-mentors";
import { getAuthenticatedApplicationUser } from "@/lib/server/neon-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const body = await request.json();

    if (!body.bookingId) {
      return jsonApiResponse(
        { data: null, error: { code: "INVALID_BOOKING_ID", message: "Booking ID is required." }, meta: { requestId } },
        400
      );
    }

    if (typeof body.rating !== "number" || body.rating < 1 || body.rating > 5) {
      return jsonApiResponse(
        { data: null, error: { code: "INVALID_RATING", message: "Rating must be between 1 and 5." }, meta: { requestId } },
        400
      );
    }

    if (getBackendMode() === "neon-staging") {
      const actor = await getAuthenticatedApplicationUser(request);
      const repo = new NeonMentorsRepository();
      const review = await repo.submitReview(actor, body.bookingId, body.rating, body.feedback);
      return jsonApiResponse({ data: review, error: null, meta: { requestId } }, 201);
    }

    // Legacy path
    const auth = await authenticateRequest(request);

    const review = await submitMentorReview({
      userId: auth.user.id,
      bookingId: body.bookingId,
      rating: body.rating,
      feedback: body.feedback,
    });

    return jsonApiResponse({ data: review, error: null, meta: { requestId } }, 201);
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return jsonApiResponse({ data: null, error: { code: error.code, message: error.message }, meta: { requestId } }, error.status);
    }
    return jsonApiResponse(
      { data: null, error: { code: "REVIEW_SUBMISSION_FAILED", message: error instanceof Error ? error.message : "Failed to submit review." }, meta: { requestId } },
      400
    );
  }
}
