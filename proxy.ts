/** Consume Neon Managed Auth's one-use OAuth verifier before rendering any page. */
import { NextResponse, type NextRequest } from "next/server";
import { getBackendMode } from "@/lib/server/backend-mode";
import { finishNeonGoogleOAuth } from "@/lib/server/neon-oauth";

export async function proxy(request: NextRequest) {
  if (getBackendMode() === "legacy" || !request.nextUrl.searchParams.has("neon_auth_session_verifier")) {
    return NextResponse.next();
  }
  try { return await finishNeonGoogleOAuth(request); }
  catch {
    return NextResponse.redirect(new URL("/login", request.url), { status: 303,
      headers: { "cache-control": "private, no-store", "referrer-policy": "no-referrer" } });
  }
}
export const config = { matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"] };
