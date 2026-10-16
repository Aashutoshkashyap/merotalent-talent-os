import { NextResponse } from "next/server";
import { getBackendMode } from "@/lib/server/backend-mode";
import { NeonAuthorizationError } from "@/lib/server/neon-authorization";
import { NeonModuleAccess, type AccessModule } from "@/lib/server/neon-module-access";
import { getAuthenticatedApplicationUser, requireSameOrigin } from "@/lib/server/neon-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const service = new NeonModuleAccess();
const reply = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
export async function POST(request: Request) {
  if (getBackendMode() !== "neon-staging") return new Response(null, { status: 404 });
  try {
    requireSameOrigin(request);
    const actor = await getAuthenticatedApplicationUser(request);
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body) || typeof body.requestId !== "string" ||
      typeof body.module !== "string" || typeof body.entityId !== "string" ||
      Object.keys(body).some(key => !["requestId", "module", "entityId"].includes(key))) return reply({ error: "INVALID_SCOPE" }, 400);
    return reply({ data: await service.assign(actor, body.requestId, body.module as AccessModule, body.entityId) });
  } catch (error) { return error instanceof NeonAuthorizationError
    ? reply({ error: error.code, message: error.message }, error.status) : reply({ error: "SCOPE_UNAVAILABLE" }, 503); }
}
