import { NextResponse } from "next/server";
import { setTimeout as delay } from "node:timers/promises";
import { getBackendMode } from "@/lib/server/backend-mode";
import { NeonAuthorizationError } from "@/lib/server/neon-authorization";
import { getAuthenticatedApplicationUser, NeonSessionUnavailable } from "@/lib/server/neon-session";
import { listApplicationEvents, requireConversationMembership } from "@/lib/server/neon-application-events";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const cursorPattern = /^(0|[1-9][0-9]{0,18})$/;
const maxCursor = BigInt("9223372036854775807");

function parseEventCursor(value: string | null): string | null {
  if (value === null) return "0";
  if (!cursorPattern.test(value) || BigInt(value) > maxCursor) return null;
  return value;
}

function stagingOnly() {
  try { return getBackendMode() !== "legacy"; } catch { return false; }
}

function failure(error: unknown) {
  if (error instanceof NeonAuthorizationError) {
    return NextResponse.json({ error: error.code }, { status: error.status });
  }
  if (error instanceof NeonSessionUnavailable) {
    return NextResponse.json({ error: "AUTH_UNAVAILABLE" }, { status: 503 });
  }
  return NextResponse.json({ error: "EVENT_STREAM_UNAVAILABLE" }, { status: 503 });
}

/**
 * The staging stream reads a durable Postgres cursor, not process memory. It is
 * intentionally bounded to 20 seconds so a serverless worker can reconnect.
 * Legacy production remains on its existing Realtime implementation.
 */
export async function GET(request: Request) {
  if (!stagingOnly()) return new Response(null, { status: 404 });
  const url = new URL(request.url);
  const cursor = parseEventCursor(url.searchParams.get("cursor") ?? request.headers.get("last-event-id"));
  const conversationId = url.searchParams.get("conversationId");
  if (cursor === null || (conversationId !== null && !uuidPattern.test(conversationId))) {
    return NextResponse.json({ error: "INVALID_STREAM_CURSOR" }, { status: 400 });
  }
  try {
    const actor = await getAuthenticatedApplicationUser(request);
    // Authorize a requested topic before sending even a heartbeat.
    if (conversationId) await requireConversationMembership(actor, conversationId);
    const encoder = new TextEncoder();
    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let lastId = cursor;
        const deadline = Date.now() + 20_000;
        const send = (value: string) => { if (!cancelled) controller.enqueue(encoder.encode(value)); };
        try {
          send("retry: 1500\n\n");
          while (!cancelled && !request.signal.aborted && Date.now() < deadline) {
            // A revoked Auth session, application link, or profile stops delivery.
            const currentActor = await getAuthenticatedApplicationUser(request);
            const events = await listApplicationEvents(currentActor, lastId, conversationId);
            for (const event of events) {
              send(`id: ${event.id}\nevent: ${event.kind}\ndata: ${JSON.stringify({
                sourceId: event.source_id,
                conversationId: event.conversation_id,
              })}\n\n`);
              lastId = event.id;
            }
            if (events.length === 50) continue;
            send(": heartbeat\n\n");
            await delay(1_500, undefined, { signal: request.signal }).catch(() => undefined);
          }
        } catch {
          // The browser reconnects with its last acknowledged event ID.
          if (!cancelled && !request.signal.aborted) send("event: reconnect\ndata: {}\n\n");
        } finally {
          if (!cancelled) controller.close();
        }
      },
      cancel() { cancelled = true; },
    });
    return new Response(stream, {
      headers: {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-store, no-transform",
        "x-accel-buffering": "no",
      },
    });
  } catch (error) { return failure(error); }
}
