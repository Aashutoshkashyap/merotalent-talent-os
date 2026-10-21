import { getBackendMode } from "@/lib/server/backend-mode";
import { finishNeonGoogleOAuth } from "@/lib/server/neon-oauth";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    if (getBackendMode() === "legacy") return new Response(null, { status: 404 });
    return await finishNeonGoogleOAuth(request);
  } catch {
    return Response.json({ error: "AUTH_UNAVAILABLE" }, { status: 503, headers: { "cache-control": "private, no-store" } });
  }
}
