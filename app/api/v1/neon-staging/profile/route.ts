import { NextResponse } from "next/server";
import { getBackendMode } from "@/lib/server/backend-mode";
import { NeonAuthorizationError } from "@/lib/server/neon-authorization";
import { getAuthenticatedApplicationUser, NeonSessionUnavailable } from "@/lib/server/neon-session";
import { queryRows } from "@/lib/server/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function stagingOnly() {
  try { return getBackendMode() === "neon-staging"; } catch { return false; }
}

function failure(error: unknown) {
  if (error instanceof NeonAuthorizationError) {
    return NextResponse.json({ error: error.code }, { status: error.status });
  }
  if (error instanceof NeonSessionUnavailable) {
    return NextResponse.json({ error: "AUTH_UNAVAILABLE" }, { status: 503 });
  }
  return NextResponse.json({ error: "PROFILE_UNAVAILABLE" }, { status: 503 });
}

export async function GET(request: Request) {
  if (!stagingOnly()) return new Response(null, { status: 404 });
  try {
    const actor = await getAuthenticatedApplicationUser(request);
    const rows = await queryRows<{ user_id: string; full_name: string | null; account_status: string }>(
      "SELECT user_id, full_name, account_status FROM public.profiles WHERE user_id=$1::uuid AND deleted_at IS NULL LIMIT 1",
      [actor.userId],
    );
    return rows[0] ? NextResponse.json({ data: rows[0] }) : NextResponse.json({ error: "PROFILE_NOT_FOUND" }, { status: 404 });
  } catch (error) { return failure(error); }
}

export async function PATCH(request: Request) {
  if (!stagingOnly()) return new Response(null, { status: 404 });
  try {
    const actor = await getAuthenticatedApplicationUser(request);
    const body: unknown = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body) ||
        Object.keys(body).length !== 1 || typeof (body as { full_name?: unknown }).full_name !== "string" ||
        !(body as { full_name: string }).full_name.trim() ||
        (body as { full_name: string }).full_name.length > 120) {
      return NextResponse.json({ error: "INVALID_PROFILE" }, { status: 400 });
    }
    const rows = await queryRows<{ user_id: string; full_name: string | null }>(
      "UPDATE public.profiles SET full_name=$2, updated_at=now() WHERE user_id=$1::uuid AND account_status='active' AND deleted_at IS NULL RETURNING user_id, full_name",
      [actor.userId, (body as { full_name: string }).full_name.trim()],
    );
    return rows[0] ? NextResponse.json({ data: rows[0] }) : NextResponse.json({ error: "PROFILE_NOT_FOUND" }, { status: 404 });
  } catch (error) { return failure(error); }
}
