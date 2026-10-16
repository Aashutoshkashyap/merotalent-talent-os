import { NextResponse } from "next/server";
import { getBackendMode } from "@/lib/server/backend-mode";
import { NeonAuthorizationError } from "@/lib/server/neon-authorization";
import { getAuthenticatedApplicationUser, NeonSessionUnavailable } from "@/lib/server/neon-session";
import { NeonMentorsRepository, type BookSessionInput } from "@/lib/server/neon-mentors";
import { requireSameOrigin } from "@/lib/server/neon-session";
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
    requireSameOrigin(request);
    const actor = await getAuthenticatedApplicationUser(request);
    const body: unknown = await request.json().catch(() => null);
    const parsed = z.object({ mentorId: z.string().uuid(), mentorServiceId: z.string().uuid(),
      scheduledStart: z.string().datetime(), scheduledEnd: z.string().datetime(),
      topic: z.string().trim().min(1).max(300), notes: z.string().max(2000).optional() }).strict().safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "INVALID_BOOKING" }, { status: 422 });

    const repo = new NeonMentorsRepository();
    const result = await repo.bookMentorSession(actor, parsed.data as BookSessionInput);

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    return failure(error);
  }
}
