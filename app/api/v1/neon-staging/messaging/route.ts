import { NextResponse } from "next/server";
import { getBackendMode } from "@/lib/server/backend-mode";
import { NeonAuthorizationError } from "@/lib/server/neon-authorization";
import { getAuthenticatedApplicationUser, NeonSessionUnavailable } from "@/lib/server/neon-session";
import { NeonMessagingRepository } from "@/lib/server/neon-messaging";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function stagingOnly() {
  try { return getBackendMode() === "neon-staging"; } catch { return false; }
}

function failure(error: unknown) {
  if (error instanceof NeonAuthorizationError) {
    return NextResponse.json({ error: error.code, message: error.message }, { status: error.status });
  }
  if (error instanceof NeonSessionUnavailable) {
    return NextResponse.json({ error: "AUTH_UNAVAILABLE", message: error.message }, { status: 503 });
  }
  return NextResponse.json({ error: "MESSAGING_UNAVAILABLE" }, { status: 503 });
}

export async function GET(request: Request) {
  if (!stagingOnly()) return new Response(null, { status: 404 });
  try {
    const actor = await getAuthenticatedApplicationUser(request);
    const url = new URL(request.url);
    const conversationId = url.searchParams.get("conversationId");
    const repo = new NeonMessagingRepository();

    if (conversationId) {
      const messages = await repo.listMessages(actor, conversationId);
      return NextResponse.json({ data: messages });
    }

    const conversations = await repo.listConversations(actor);
    return NextResponse.json({ data: conversations });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  if (!stagingOnly()) return new Response(null, { status: 404 });
  try {
    const actor = await getAuthenticatedApplicationUser(request);
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

    if (!payload.conversationId) {
      return NextResponse.json({ error: "CONVERSATION_ID_REQUIRED" }, { status: 400 });
    }

    const repo = new NeonMessagingRepository();

    if (payload.action === "mark-read") {
      const count = await repo.markConversationRead(actor, payload.conversationId);
      return NextResponse.json({ data: { markedCount: count } });
    }

    const msg = await repo.sendMessage(
      actor,
      payload.conversationId,
      payload.content ?? "",
      payload.attachment,
    );

    return NextResponse.json({ data: msg }, { status: 201 });
  } catch (error) {
    return failure(error);
  }
}
