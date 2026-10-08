import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
/**
 * The process-local prototype cannot deliver events across server instances and
 * did not authorize message topics by membership. Keep the endpoint closed until
 * a durable event bus and per-topic authorization are implemented and tested.
 * Legacy production continues to use Supabase Realtime.
 */
export async function GET() {
  return NextResponse.json(
    { error: "Staging realtime is not yet available." },
    { status: process.env.MEROTALENT_BACKEND_MODE === "neon-staging" ? 503 : 404 },
  );
}
