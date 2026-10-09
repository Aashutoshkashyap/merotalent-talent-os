import { jsonApiResponse } from "@/lib/server/api-response";
import { authenticateRequest } from "@/lib/server/auth";
import { validateAndCheckinTicket } from "@/lib/server/events-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const authenticated = await authenticateRequest(request);
    const body = await request.json().catch(() => ({}));

    if (!body || typeof body.qrToken !== "string" || !body.qrToken.trim()) {
      return jsonApiResponse(
        {
          data: null,
          error: {
            code: "INVALID_QR_TOKEN",
            message: "A valid QR token string is required.",
          },
          meta: { requestId },
        },
        400
      );
    }

    const result = await validateAndCheckinTicket({
      qrToken: body.qrToken.trim(),
      scannedByUserId: authenticated.user.id,
      location: body.location || "Entrance Scanner",
    });

    const statusCode = result.success ? 200 : 422;
    return jsonApiResponse(
      {
        data: result,
        error: result.success
          ? null
          : {
              code: result.code,
              message: result.message,
            },
        meta: { requestId },
      },
      statusCode
    );
  } catch (err: any) {
    return jsonApiResponse(
      {
        data: null,
        error: {
          code: err.code || "CHECKIN_FAILED",
          message: err.message || "Failed to process check-in.",
        },
        meta: { requestId },
      },
      err.status || 500
    );
  }
}
