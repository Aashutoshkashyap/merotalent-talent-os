import { createHash, createHmac, randomInt } from "node:crypto";

import { getConfiguredTransactionalEmailProvider, getTransactionalEmailProvider } from "./email-provider";
import { loadProviderSecret } from "./provider-config-service";
import { getAdminClient, ServerConfigurationError } from "./supabase";
import { getBackendMode } from "./backend-mode";

export type GuestVerificationChannel = "email" | "whatsapp";

export class GuestVerificationError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message);
    this.name = "GuestVerificationError";
  }
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeGuestIdentity(input: {
  guestToken: unknown;
  collegeId: unknown;
  email: unknown;
  whatsappNumber: unknown;
}) {
  const guestToken = typeof input.guestToken === "string" ? input.guestToken.trim() : "";
  const collegeId = typeof input.collegeId === "string" ? input.collegeId.trim() : "";
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const rawNumber = typeof input.whatsappNumber === "string" ? input.whatsappNumber.trim() : "";
  const compactNumber = rawNumber.replace(/[\s()-]/g, "");
  const whatsappNumber = /^(?:97|98)\d{8}$/.test(compactNumber)
    ? `+977${compactNumber}`
    : compactNumber;

  if (!uuidPattern.test(guestToken) || !uuidPattern.test(collegeId)
    || email.length > 254 || !emailPattern.test(email)
    || !/^\+[1-9]\d{7,14}$/.test(whatsappNumber)) {
    throw new GuestVerificationError(422, "INVALID_VERIFICATION_DETAILS", "Enter a valid email and WhatsApp number before requesting codes.");
  }
  return { guestToken, collegeId, email, whatsappNumber };
}

const verificationKey = (environment: Record<string, string | undefined> = process.env) => {
  const encoded = environment.GUEST_VERIFICATION_HMAC_KEY?.trim() || "";
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32 || key.toString("base64") !== encoded) {
    throw new ServerConfigurationError("Guest verification signing is not configured.");
  }
  return key;
};

export const hashGuestToken = (token: string) => createHash("sha256").update(token).digest("hex");

export function guestCodeHash(
  identity: ReturnType<typeof normalizeGuestIdentity>,
  channel: GuestVerificationChannel,
  code: string,
  environment: Record<string, string | undefined> = process.env,
) {
  const destination = channel === "email" ? identity.email : identity.whatsappNumber;
  return createHmac("sha256", verificationKey(environment))
    .update(`${hashGuestToken(identity.guestToken)}|${identity.collegeId}|${channel}|${destination}|${code}`)
    .digest("hex");
}

export const openwaConfiguration = () => {
  const baseUrl = process.env.OPENWA_BASE_URL?.trim().replace(/\/$/, "") || "";
  const apiKey = process.env.OPENWA_API_KEY?.trim() || "";
  const sessionId = process.env.OPENWA_SESSION_ID?.trim() || "";
  let url: URL;
  try { url = new URL(baseUrl); } catch {
    throw new ServerConfigurationError("MeroTalent WhatsApp verification is not configured.");
  }
  if (!apiKey || !uuidPattern.test(sessionId) || url.protocol !== "https:"
    || url.username || url.password || url.search || url.hash || url.pathname !== "/") {
    throw new ServerConfigurationError("MeroTalent WhatsApp verification is not configured.");
  }
  return { baseUrl: url.origin, apiKey, sessionId };
};

async function openwaRequest(path: string, init?: RequestInit) {
  const config = openwaConfiguration();
  const response = await fetch(`${config.baseUrl}${path}`, {
    ...init,
    headers: { Accept: "application/json", "X-API-Key": config.apiKey, ...init?.headers },
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new GuestVerificationError(503, "WHATSAPP_UNAVAILABLE", "WhatsApp code delivery is currently unavailable.");
  return response.json().catch(() => null) as Promise<Record<string, unknown> | null>;
}

export async function sendWhatsAppCode(number: string, code: string) {
  const config = openwaConfiguration();
  const session = await openwaRequest(`/api/sessions/${encodeURIComponent(config.sessionId)}`);
  const directStatus = session?.status;
  const nestedStatus = (session?.data as Record<string, unknown> | undefined)?.status;
  const status = typeof directStatus === "string" ? directStatus : typeof nestedStatus === "string" ? nestedStatus : "";
  if (status.toLowerCase() !== "ready") {
    throw new GuestVerificationError(503, "WHATSAPP_UNAVAILABLE", "WhatsApp verification is not connected right now.");
  }
  await openwaRequest(`/api/sessions/${encodeURIComponent(config.sessionId)}/messages/send-text`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chatId: `${number.slice(1)}@c.us`,
      text: `Your MeroTalent college application verification code is ${code}. It expires in 10 minutes. Do not share this code.`,
    }),
  });
}

async function sendEmailCode(email: string, code: string) {
  const configured = await loadProviderSecret("email");
  const provider = configured
    ? getConfiguredTransactionalEmailProvider(configured)
    : getTransactionalEmailProvider();
  if (provider.name === "unconfigured") {
    throw new GuestVerificationError(503, "EMAIL_UNAVAILABLE", "Email verification is not configured.");
  }
  const result = await provider.send({
    event: "guest_application_verification",
    to: email,
    subject: "Verify your MeroTalent college application",
    text: `Your MeroTalent college application verification code is ${code}. It expires in 10 minutes. Do not share this code.`,
  });
  if (result.status !== "sent") {
    throw new GuestVerificationError(503, "EMAIL_UNAVAILABLE", "The email provider did not accept the verification message.");
  }
}

export async function startGuestVerification(
  identity: ReturnType<typeof normalizeGuestIdentity>,
  channel: GuestVerificationChannel,
) {
  if (getBackendMode() === "neon-staging") {
    const { startNeonGuestVerification } = await import("./neon-guest-college-verification");
    return startNeonGuestVerification(identity, channel);
  }
  // Reject missing provider configuration before reserving a code or a rate-limit slot.
  verificationKey();
  if (channel === "whatsapp") openwaConfiguration();
  else {
    const configured = await loadProviderSecret("email");
    if (!configured && getTransactionalEmailProvider().name === "unconfigured") {
      throw new GuestVerificationError(503, "EMAIL_UNAVAILABLE", "Email verification is not configured.");
    }
  }
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const db = getAdminClient() as any;
  const { data, error } = await db.rpc("reserve_guest_college_verification", {
    p_guest_token: identity.guestToken,
    p_college_id: identity.collegeId,
    p_email: identity.email,
    p_whatsapp_number: identity.whatsappNumber,
    p_channel: channel,
    p_code_hash: guestCodeHash(identity, channel, code),
  });
  if (error) {
    if (error.code === "P0001") throw new GuestVerificationError(429, "VERIFICATION_THROTTLED", "The college is unavailable or too many codes were requested. Please wait and try again.");
    if (error.code === "22023") throw new GuestVerificationError(422, "INVALID_VERIFICATION_DETAILS", "Check the college and contact details.");
    throw new GuestVerificationError(503, "VERIFICATION_UNAVAILABLE", "Verification could not be started right now.");
  }
  const verificationId = String(data || "");
  if (!uuidPattern.test(verificationId)) throw new GuestVerificationError(503, "VERIFICATION_UNAVAILABLE", "Verification could not be started right now.");

  try {
    if (channel === "email") await sendEmailCode(identity.email, code);
    else await sendWhatsAppCode(identity.whatsappNumber, code);
    const column = channel === "email" ? "email_dispatched_at" : "whatsapp_dispatched_at";
    const { error: updateError } = await db.from("guest_college_verifications")
      .update({ [column]: new Date().toISOString() })
      .eq("id", verificationId)
      .eq("guest_token_hash", hashGuestToken(identity.guestToken));
    if (updateError) throw new GuestVerificationError(503, "VERIFICATION_UNAVAILABLE", "Verification could not be confirmed right now.");
  } catch (error) {
    // A provider failure must never leave a code usable as proof.
    const codeColumn = channel === "email" ? "email_code_hash" : "whatsapp_code_hash";
    const requestedColumn = channel === "email" ? "last_email_requested_at" : "last_whatsapp_requested_at";
    const { error: cleanupError } = await db.from("guest_college_verifications")
      .update({ [codeColumn]: null, [requestedColumn]: null })
      .eq("id", verificationId)
      .eq("guest_token_hash", hashGuestToken(identity.guestToken));
    if (cleanupError) console.error("Guest verification cleanup failed", { code: cleanupError.code });
    if (error instanceof GuestVerificationError) throw error;
    throw new GuestVerificationError(503, channel === "email" ? "EMAIL_UNAVAILABLE" : "WHATSAPP_UNAVAILABLE", "The verification message could not be sent. Please try again.");
  }
  return { verificationId, channel, status: "code_requested" as const };
}

export async function checkGuestVerification(
  identity: ReturnType<typeof normalizeGuestIdentity>,
  verificationId: string,
  channel: GuestVerificationChannel,
  code: string,
) {
  if (getBackendMode() === "neon-staging") {
    const { checkNeonGuestVerification } = await import("./neon-guest-college-verification");
    return checkNeonGuestVerification(identity, verificationId, channel, code);
  }
  if (!uuidPattern.test(verificationId) || !/^\d{6}$/.test(code)) {
    throw new GuestVerificationError(422, "INVALID_CODE", "Enter the six-digit verification code.");
  }
  const { data, error } = await (getAdminClient() as any).rpc("check_guest_college_verification", {
    p_verification_id: verificationId,
    p_guest_token: identity.guestToken,
    p_channel: channel,
    p_code_hash: guestCodeHash(identity, channel, code),
  });
  if (error) throw new GuestVerificationError(503, "VERIFICATION_UNAVAILABLE", "The code could not be checked right now.");
  if (data !== true) throw new GuestVerificationError(422, "INVALID_CODE", "That code is invalid or expired. Request a new code if needed.");
  return { verificationId, channel, verified: true };
}
