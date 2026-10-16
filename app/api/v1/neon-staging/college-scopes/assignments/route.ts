import { NextResponse } from "next/server";
import { getBackendMode } from "@/lib/server/backend-mode";
import { queryRows } from "@/lib/server/db";
import { NeonAuthorizationError } from "@/lib/server/neon-authorization";
import { NeonCollegeScopes } from "@/lib/server/neon-college-scopes";
import { getAuthenticatedApplicationUser, NeonSessionUnavailable, requireSameOrigin } from "@/lib/server/neon-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const service = new NeonCollegeScopes();
const staging = () => { try { return getBackendMode() === "neon-staging"; } catch { return false; } };
const reply = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
const failure = (error: unknown) => error instanceof NeonAuthorizationError ? reply({ error: error.code }, error.status)
  : reply({ error: error instanceof NeonSessionUnavailable ? "AUTH_UNAVAILABLE" : "COLLEGE_ASSIGNMENT_UNAVAILABLE" }, 503);

export async function GET(request: Request): Promise<Response> {
  if (!staging()) return new Response(null, { status: 404 });
  try {
    const actor = await getAuthenticatedApplicationUser(request);
    if (!actor.platformAdmin) throw new NeonAuthorizationError(403, "ADMIN_REQUIRED", "Super Admin access required.");
    if (new URL(request.url).searchParams.get("catalog") === "true") {
      const entities = await queryRows<{ id: string; name: string }>(`
        SELECT id,name FROM public.institutes WHERE deleted_at IS NULL
        ORDER BY name ASC LIMIT 500`);
      return reply({ data: entities });
    }
    const rows = await queryRows<Record<string, unknown>>(`
      SELECT a.id,a.user_id,a.entity_id,a.status,a.created_at,i.name AS college_name,
        p.full_name AS applicant_name,p.email AS applicant_email
      FROM public.entity_admin_assignments a
      JOIN public.institutes i ON i.id=a.entity_id AND i.deleted_at IS NULL
      JOIN public.profiles p ON p.user_id=a.user_id
      JOIN public.user_module_capabilities umc ON umc.id=a.user_capability_id
      JOIN public.module_capabilities mc ON mc.id=umc.capability_id AND mc.module_key='college'
      WHERE a.entity_type='college' AND a.status='active'
      ORDER BY a.created_at DESC LIMIT 500`);
    return reply({ data: rows });
  } catch (error) { return failure(error); }
}

export async function POST(request: Request): Promise<Response> {
  if (!staging()) return new Response(null, { status: 404 });
  try {
    requireSameOrigin(request);
    const actor = await getAuthenticatedApplicationUser(request);
    const body: unknown = await request.json().catch(() => null);
    const value = body && typeof body === "object" && !Array.isArray(body) ? body as Record<string, unknown> : {};
    if (Object.keys(value).some(key => !["userId", "collegeId"].includes(key)) ||
      typeof value.userId !== "string" || typeof value.collegeId !== "string") return reply({ error: "INVALID_SCOPE" }, 400);
    return reply({ data: await service.assign(actor, value.userId, value.collegeId) });
  } catch (error) { return failure(error); }
}

export async function DELETE(request: Request): Promise<Response> {
  if (!staging()) return new Response(null, { status: 404 });
  try {
    requireSameOrigin(request);
    const actor = await getAuthenticatedApplicationUser(request);
    const body: unknown = await request.json().catch(() => null);
    const value = body && typeof body === "object" && !Array.isArray(body) ? body as Record<string, unknown> : {};
    if (Object.keys(value).length !== 1 || typeof value.assignmentId !== "string") return reply({ error: "INVALID_SCOPE" }, 400);
    return reply({ data: await service.revoke(actor, value.assignmentId) });
  } catch (error) { return failure(error); }
}
