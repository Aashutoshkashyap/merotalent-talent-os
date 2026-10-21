import { NextResponse } from "next/server";
import { getBackendMode } from "@/lib/server/backend-mode";
import { getAuthenticatedApplicationUser, NeonSessionUnavailable, requireSameOrigin } from "@/lib/server/neon-session";
import { NeonAuthorizationError } from "@/lib/server/neon-authorization";
import { deleteAdminSection, readAdminCms, saveAdminSection } from "@/lib/server/neon-cms";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const active = () => getBackendMode() !== "legacy";
const failure = (error: unknown) => error instanceof NeonAuthorizationError
  ? NextResponse.json({ error: error.code }, { status: error.status })
  : error instanceof NeonSessionUnavailable
    ? NextResponse.json({ error: "AUTH_UNAVAILABLE" }, { status: 503 })
    : NextResponse.json({ error: "CMS_UNAVAILABLE" }, { status: 503 });

export async function GET(request: Request): Promise<Response> {
  if (!active()) return new Response(null, { status: 404 });
  try {
    const actor = await getAuthenticatedApplicationUser(request);
    return NextResponse.json({ data: await readAdminCms(actor) },
      { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return failure(error); }
}

async function write(request: Request, method: "POST" | "PATCH") {
  if (!active()) return new Response(null, { status: 404 });
  try {
    requireSameOrigin(request);
    const actor = await getAuthenticatedApplicationUser(request);
    const body: unknown = await request.json().catch(() => null);
    const value = body && typeof body === "object" && !Array.isArray(body) ? body as Record<string, unknown> : {};
    const id = method === "PATCH" && typeof value.id === "string" ? value.id : undefined;
    if (method === "PATCH" && !id) return NextResponse.json({ error: "INVALID_CMS_SECTION" }, { status: 400 });
    return NextResponse.json({ data: await saveAdminSection(actor, value, id) },
      { status: method === "POST" ? 201 : 200, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return failure(error); }
}
export const POST = (request: Request) => write(request, "POST");
export const PATCH = (request: Request) => write(request, "PATCH");

export async function DELETE(request: Request): Promise<Response> {
  if (!active()) return new Response(null, { status: 404 });
  try {
    requireSameOrigin(request);
    const actor = await getAuthenticatedApplicationUser(request);
    const body: unknown = await request.json().catch(() => null);
    const id = body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>).id : null;
    if (typeof id !== "string") return NextResponse.json({ error: "INVALID_CMS_SECTION" }, { status: 400 });
    return NextResponse.json({ data: await deleteAdminSection(actor, id) },
      { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return failure(error); }
}
