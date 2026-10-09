import { NextResponse } from "next/server";
import { getBackendMode } from "@/lib/server/backend-mode";
import { NeonAuthorizationError } from "@/lib/server/neon-authorization";
import { getAuthenticatedApplicationUser, NeonSessionUnavailable } from "@/lib/server/neon-session";
import { NeonMentorsRepository, type BookSessionInput } from "@/lib/server/neon-mentors";

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
  return NextResponse.json({ error: "MENTOR_BOOKING_UNAVAILABLE" }, { status: 503 });
}

export async function GET(request: Request) {
  if (!stagingOnly()) return new Response(null, { status: 404 });
  try {
    const actor = await getAuthenticatedApplicationUser(request);
    const repo = new NeonMentorsRepository();
    const bookings = await repo.listOwnBookings(actor);
    return NextResponse.json({ data: bookings });
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

    const payload = body as Partial<BookSessionInput>;
    if (!payload.mentorId || !payload.scheduledStart || !payload.scheduledEnd || !payload.topic) {
      return NextResponse.json({ error: "MISSING_REQUIRED_FIELDS" }, { status: 400 });
    }

    const repo = new NeonMentorsRepository();
    const result = await repo.bookMentorSession(actor, {
      mentorId: payload.mentorId,
      scheduledStart: payload.scheduledStart,
      scheduledEnd: payload.scheduledEnd,
      topic: payload.topic,
      notes: payload.notes,
      amount: payload.amount,
      currency: payload.currency,
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    return failure(error);
  }
}
