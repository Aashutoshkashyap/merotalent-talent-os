import { NextResponse } from "next/server";
import { getBackendMode } from "@/lib/server/backend-mode";
import { NeonAuthorizationError } from "@/lib/server/neon-authorization";
import { getAuthenticatedApplicationUser, NeonSessionUnavailable } from "@/lib/server/neon-session";
import { NeonMessagingRepository } from "@/lib/server/neon-messaging";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const noStore = { "Cache-Control": "private, no-store" };

function stagingOnly() {
  try { return getBackendMode() === "neon-staging"; } catch { return false; }
}

function failure(error: unknown) {
  if (error instanceof NeonAuthorizationError) {
    return NextResponse.json({ error: error.code, message: error.message }, { status: error.status, headers: noStore });
  }
  if (error instanceof NeonSessionUnavailable) {
    return NextResponse.json({ error: "AUTH_UNAVAILABLE", message: error.message }, { status: 503, headers: noStore });
  }
  return NextResponse.json({ error: "MESSAGING_UNAVAILABLE" }, { status: 503, headers: noStore });
}

export async function GET(request: Request) {
  if (!stagingOnly()) return new Response(null, { status: 404 });
  try {
    const url = new URL(request.url);
    const conversationId = url.searchParams.get("conversationId");
    const beforeId = url.searchParams.get("before");
    if ((conversationId && !uuid.test(conversationId)) || (beforeId && (!conversationId || !uuid.test(beforeId)))) {
      return NextResponse.json({ error: "INVALID_CURSOR" }, { status: 400, headers: noStore });
    }
    const actor = await getAuthenticatedApplicationUser(request);
    const repo = new NeonMessagingRepository();

    if (conversationId) {
      const messages = await repo.listMessages(actor, conversationId, beforeId);
      return NextResponse.json({ data: messages }, { headers: noStore });
    }

    const conversations = await repo.listConversations(actor);
    return NextResponse.json({ data: conversations }, { headers: noStore });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  if (!stagingOnly()) return new Response(null, { status: 404 });
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) return NextResponse.json({ error: "CROSS_ORIGIN_WRITE_DENIED" }, { status: 403, headers: noStore });
  try {
    const body: unknown = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
    }

    const payload = body as {
      action?: string;
      conversationId: string;
      content?: string;
      attachment?: { path: string; mimeType: string };
    };

    if (!uuid.test(payload.conversationId || "") ||
        Object.keys(payload).some((key) => !["action", "conversationId", "content"].includes(key)) ||
        (payload.action !== undefined && payload.action !== "mark-read")) {
      return NextResponse.json({ error: "INVALID_MESSAGE" }, { status: 400, headers: noStore });
    }

    const actor = await getAuthenticatedApplicationUser(request);
    const repo = new NeonMessagingRepository();

    if (payload.action === "mark-read") {
      if (payload.content !== undefined) return NextResponse.json({ error: "INVALID_MESSAGE" }, { status: 400, headers: noStore });
      const count = await repo.markConversationRead(actor, payload.conversationId);
      return NextResponse.json({ data: { markedCount: count } }, { headers: noStore });
    }

    if (typeof payload.content !== "string" || payload.content.trim().length === 0 || payload.content.length > 5000) {
      return NextResponse.json({ error: "INVALID_MESSAGE" }, { status: 400, headers: noStore });
    }

    const msg = await repo.sendMessage(
      actor,
      payload.conversationId,
      payload.content,
    );

    return NextResponse.json({ data: msg }, { status: 201, headers: noStore });
  } catch (error) {
    return failure(error);
  }
}
