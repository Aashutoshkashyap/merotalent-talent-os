import { jsonApiResponse } from "@/lib/server/api-response";
import { getBackendMode } from "@/lib/server/backend-mode";
import {
  checkGuestVerification,
  GuestVerificationError,
  normalizeGuestIdentity,
  startGuestVerification,
  type GuestVerificationChannel,
} from "@/lib/server/guest-college-verification";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const respond = (status: number, data: unknown, code?: string, message?: string) =>
    jsonApiResponse({ data, error: code ? { code, message: message || "Verification failed." } : null, meta: { requestId } }, status);

  if (getBackendMode() !== "legacy" && request.headers.get("origin") !== new URL(request.url).origin) {
    return respond(403, null, "CROSS_ORIGIN_WRITE_DENIED", "Submit verification from this website.");
  }

  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return respond(415, null, "UNSUPPORTED_MEDIA_TYPE", "Send verification requests as JSON.");
  }
  if (Number(request.headers.get("content-length") || 0) > 2_048) {
    return respond(413, null, "PAYLOAD_TOO_LARGE", "The verification request is too large.");
  }
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw, "utf8") > 2_048) return respond(413, null, "PAYLOAD_TOO_LARGE", "The verification request is too large.");
    const value = JSON.parse(raw) as Record<string, unknown>;
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return respond(400, null, "INVALID_REQUEST", "Enter valid verification details.");
    }
    const identity = normalizeGuestIdentity({
      guestToken: value.guestToken,
      collegeId: value.collegeId,
      email: value.email,
      whatsappNumber: value.whatsappNumber,
    });
    const channel = value.channel;
    if (channel !== "email" && channel !== "whatsapp") {
      return respond(422, null, "INVALID_CHANNEL", "Choose email or WhatsApp verification.");
    }
    if (value.action === "start") {
      return respond(200, await startGuestVerification(identity, channel));
    }
    if (value.action === "check") {
      return respond(200, await checkGuestVerification(
        identity,
        typeof value.verificationId === "string" ? value.verificationId : "",
        channel as GuestVerificationChannel,
        typeof value.code === "string" ? value.code.trim() : "",
      ));
    }
    return respond(422, null, "INVALID_ACTION", "Choose a verification action.");
  } catch (error) {
    if (error instanceof GuestVerificationError) {
      return respond(error.status, null, error.code, error.message);
    }
    if (error instanceof SyntaxError) return respond(400, null, "INVALID_JSON", "The verification request is invalid JSON.");
    console.error("Guest college verification failed", { requestId, kind: error instanceof Error ? error.name : "unknown" });
    return respond(503, null, "VERIFICATION_UNAVAILABLE", "Verification is temporarily unavailable. Please try again later.");
  }
}
