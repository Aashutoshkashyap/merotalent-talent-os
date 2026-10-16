import { NextResponse } from "next/server";
import { AIProviderUnavailableError } from "@/lib/server/ai-provider";
import { getBackendMode } from "@/lib/server/backend-mode";
import { NeonAuthorizationError } from "@/lib/server/neon-authorization";
import { NeonSessionUnavailable } from "@/lib/server/neon-session";

export const stagingOnly = () => getBackendMode() === "neon-staging";
export const reply = (data: unknown, status = 200) => NextResponse.json(data, {
  status, headers: { "Cache-Control": "private, no-store" },
});
export const failure = (error: unknown) => {
  if (error instanceof NeonAuthorizationError) return reply({ error: { code: error.code, message: error.message } }, error.status);
  if (error instanceof AIProviderUnavailableError) return reply({ error: { code: "AI_UNAVAILABLE", message: error.message } }, 503);
  if (error instanceof NeonSessionUnavailable) return reply({ error: { code: "AUTH_UNAVAILABLE", message: "Authentication is unavailable." } }, 503);
  return reply({ error: { code: "AI_UNAVAILABLE", message: "AI service is unavailable." } }, 503);
};
export async function readBody(request: Request): Promise<Record<string, unknown>> {
  const text = await request.text();
  if (text.length > 16_384) throw new NeonAuthorizationError(400, "INVALID_AI_REQUEST", "AI request is too large.");
  let value: unknown;
  try { value = JSON.parse(text); } catch { value = null; }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new NeonAuthorizationError(400, "INVALID_AI_REQUEST", "AI request must be an object.");
  }
  return value as Record<string, unknown>;
}
