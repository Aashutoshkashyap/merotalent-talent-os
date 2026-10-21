import { NextResponse } from "next/server";
import { getBackendMode } from "@/lib/server/backend-mode";
import { NeonAuthorizationError } from "@/lib/server/neon-authorization";
import { NeonEventsRepository } from "@/lib/server/neon-events";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function stagingOnly() {
  try { return getBackendMode() !== "legacy"; } catch { return false; }
}

function failure(error: unknown) {
  if (error instanceof NeonAuthorizationError) {
    return NextResponse.json({ error: error.code, message: error.message }, { status: error.status });
  }
  return NextResponse.json({ error: "EVENTS_UNAVAILABLE" }, { status: 503 });
}

export async function GET(request: Request) {
  if (!stagingOnly()) return new Response(null, { status: 404 });
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const repo = new NeonEventsRepository();

  try {
    if (id) {
      const event = await repo.getPublicEvent(id);
      return event
        ? NextResponse.json({ data: event })
        : NextResponse.json({ error: "EVENT_NOT_FOUND" }, { status: 404 });
    }

    const search = url.searchParams.get("search") ?? undefined;
    const format = url.searchParams.get("format") ?? undefined;
    const eventType = url.searchParams.get("type") ?? undefined;
    const limit = url.searchParams.get("limit") ? parseInt(url.searchParams.get("limit")!, 10) : undefined;
    const offset = url.searchParams.get("offset") ? parseInt(url.searchParams.get("offset")!, 10) : undefined;

    const events = await repo.listPublicEvents({ search, format, eventType, limit, offset });
    return NextResponse.json({ data: events });
  } catch (error) {
    return failure(error);
  }
}
