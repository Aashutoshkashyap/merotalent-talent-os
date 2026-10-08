/**
 * Reserve this path during the Supabase-to-Neon transition.
 *
 * The target is Neon Managed Auth, not an independently hosted Better Auth
 * instance. Never expose the experimental local Better Auth server from a
 * production deployment or imply that staging authentication is ready.
 */
import { NextResponse } from "next/server";

function unavailable() {
  return NextResponse.json(
    { error: "Managed authentication is not yet available on this route." },
    { status: process.env.MEROTALENT_BACKEND_MODE === "neon-staging" ? 503 : 404 },
  );
}

export const GET = unavailable;
export const POST = unavailable;
