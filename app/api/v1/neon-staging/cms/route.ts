import { NextResponse } from "next/server";
import { getBackendMode } from "@/lib/server/backend-mode";
import { readPublicCms } from "@/lib/server/neon-cms";
import { NeonAuthorizationError } from "@/lib/server/neon-authorization";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  if (getBackendMode() !== "neon-staging") return new Response(null, { status: 404 });
  try {
    const page = new URL(request.url).searchParams.get("page") ?? "home";
    return NextResponse.json({ data: await readPublicCms(page) },
      { headers: { "Cache-Control": "public, max-age=0, s-maxage=60" } });
  } catch (error) {
    if (error instanceof NeonAuthorizationError) return NextResponse.json({ error: error.code }, { status: error.status });
    return NextResponse.json({ error: "CMS_UNAVAILABLE" }, { status: 503 });
  }
}
