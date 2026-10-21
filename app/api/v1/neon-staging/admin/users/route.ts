import { NextResponse } from "next/server";
import { getBackendMode } from "@/lib/server/backend-mode";
import { listNeonAdminUsers, setNeonUserStatus } from "@/lib/server/neon-admin-users";
import { NeonAuthorizationError } from "@/lib/server/neon-authorization";
import { getAuthenticatedApplicationUser, NeonSessionUnavailable, requireSameOrigin } from "@/lib/server/neon-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  if (getBackendMode() === "legacy") return new Response(null, { status: 404 });
  try {
    const actor = await getAuthenticatedApplicationUser(request);
    const url = new URL(request.url);
    const result = await listNeonAdminUsers(actor, {
      page: Number(url.searchParams.get("page") ?? 1),
      pageSize: Number(url.searchParams.get("page_size") ?? 25),
      search: url.searchParams.get("search") ?? "",
    });
    return NextResponse.json({ data: result.data, meta: {
      page: result.page, pageSize: result.pageSize, total: result.total,
      totalPages: result.totalPages, hasNextPage: result.hasNextPage,
    } }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const status = error instanceof NeonAuthorizationError ? error.status : 503;
    const code = error instanceof NeonAuthorizationError ? error.code
      : error instanceof NeonSessionUnavailable ? "AUTH_UNAVAILABLE" : "USERS_UNAVAILABLE";
    return NextResponse.json({ error: code }, { status, headers: { "Cache-Control": "private, no-store" } });
  }
}

export async function PATCH(request: Request): Promise<Response> {
  if (getBackendMode() === "legacy") return new Response(null, { status: 404 });
  try {
    requireSameOrigin(request);
    const actor = await getAuthenticatedApplicationUser(request);
    const body: unknown = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body) ||
      Object.keys(body).length !== 2 || !("userId" in body) || !("status" in body) ||
      typeof body.userId !== "string" || !["active", "suspended", "deactivated"].includes(String(body.status))) {
      return NextResponse.json({ error: "INVALID_USER_STATUS" }, { status: 400 });
    }
    const result = await setNeonUserStatus(actor, body.userId, body.status as "active" | "suspended" | "deactivated");
    return NextResponse.json({ data: result }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const status = error instanceof NeonAuthorizationError ? error.status : 503;
    const code = error instanceof NeonAuthorizationError ? error.code
      : error instanceof NeonSessionUnavailable ? "AUTH_UNAVAILABLE" : "USERS_UNAVAILABLE";
    return NextResponse.json({ error: code }, { status, headers: { "Cache-Control": "private, no-store" } });
  }
}
