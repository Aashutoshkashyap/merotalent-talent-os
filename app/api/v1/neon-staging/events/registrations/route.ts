import { NextResponse } from "next/server";
import { getBackendMode } from "@/lib/server/backend-mode";
import { NeonAuthorizationError } from "@/lib/server/neon-authorization";
import { getAuthenticatedApplicationUser, NeonSessionUnavailable, requireSameOrigin } from "@/lib/server/neon-session";
import { NeonEventsRepository, type EventRegistrationInput } from "@/lib/server/neon-events";
import { z } from "zod";

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
  return NextResponse.json({ error: "EVENT_REGISTRATION_UNAVAILABLE" }, { status: 503 });
}

export async function GET(request: Request) {
  if (!stagingOnly()) return new Response(null, { status: 404 });
  try {
    const actor = await getAuthenticatedApplicationUser(request);
    const repo = new NeonEventsRepository();
    const tickets = await repo.listOwnTickets(actor);
    return NextResponse.json({ data: tickets });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  if (!stagingOnly()) return new Response(null, { status: 404 });
  try {
    requireSameOrigin(request);
    const actor = await getAuthenticatedApplicationUser(request);
    const body: unknown = await request.json().catch(() => null);
    const parsed = z.object({ eventId: z.string().uuid(), ticketTypeId: z.string().uuid().nullable().optional(),
      ticketQuantity: z.number().int().min(1).max(10).optional(),
      participants: z.array(z.object({ fullName: z.string().trim().min(1).max(200),
        email: z.string().email().optional(), phone: z.string().max(30).optional(), college: z.string().max(200).optional() })).max(10).optional(),
      customResponses: z.record(z.string(), z.unknown()).optional() }).strict().safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "INVALID_REGISTRATION" }, { status: 422 });

    const repo = new NeonEventsRepository();
    const result = await repo.registerForEvent(actor, parsed.data as EventRegistrationInput);

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    return failure(error);
  }
}
