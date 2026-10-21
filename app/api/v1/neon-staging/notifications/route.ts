import { NextResponse } from "next/server";
import { getBackendMode } from "@/lib/server/backend-mode";
import { NeonAuthorizationError } from "@/lib/server/neon-authorization";
import { getAuthenticatedApplicationUser, NeonSessionUnavailable } from "@/lib/server/neon-session";
import { listOwnNotifications, markOwnNotificationUnread, markOwnNotificationsRead } from "@/lib/server/neon-notifications";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function stagingOnly() {
  try { return getBackendMode() !== "legacy"; } catch { return false; }
}

function failure(error: unknown) {
  if (error instanceof NeonAuthorizationError) {
    return NextResponse.json({ error: error.code }, { status: error.status, headers: { "Cache-Control": "private, no-store" } });
  }
  if (error instanceof NeonSessionUnavailable) {
    return NextResponse.json({ error: "AUTH_UNAVAILABLE" }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
  }
  return NextResponse.json({ error: "NOTIFICATIONS_UNAVAILABLE" }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
}

export async function GET(request: Request) {
  if (!stagingOnly()) return new Response(null, { status: 404 });
  try {
    const actor = await getAuthenticatedApplicationUser(request);
    const beforeId = new URL(request.url).searchParams.get("before");
    if (beforeId && !uuid.test(beforeId)) return NextResponse.json({ error: "INVALID_CURSOR" }, { status: 400 });
    const result = await listOwnNotifications(actor, undefined, beforeId);
    return NextResponse.json({ data: result }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return failure(error); }
}

export async function PATCH(request: Request) {
  if (!stagingOnly()) return new Response(null, { status: 404 });
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "CROSS_ORIGIN_WRITE_DENIED" }, { status: 403 });
  }
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }
  const value = body as Record<string, unknown>;
  const id = typeof value.id === "string" && uuid.test(value.id) ? value.id : null;
  const all = value.all === true;
  const unread = value.read === false;
  if ((id === null && !all) || (id !== null && all) || (unread && !id) ||
      Object.keys(value).some((key) => !["id","all","read"].includes(key)) ||
      (unread ? Object.keys(value).length !== 2 : Object.keys(value).length !== 1)) {
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }
  try {
    const actor = await getAuthenticatedApplicationUser(request);
    const updated = unread ? await markOwnNotificationUnread(actor, id!)
      : await markOwnNotificationsRead(actor, all ? null : id);
    return NextResponse.json({ data: { updated } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return failure(error); }
}
