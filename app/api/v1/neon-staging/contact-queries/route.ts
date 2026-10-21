import { NextResponse } from "next/server";
import { getBackendMode } from "@/lib/server/backend-mode";
import { queryRows } from "@/lib/server/db";
import { NeonAuthorizationError } from "@/lib/server/neon-authorization";
import { requireSameOrigin } from "@/lib/server/neon-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function stagingOnly(): boolean {
  try { return getBackendMode() !== "legacy"; } catch { return false; }
}

export async function POST(request: Request): Promise<Response> {
  if (!stagingOnly()) return new Response(null, { status: 404 });
  try { requireSameOrigin(request); }
  catch (error) {
    return NextResponse.json({ error: error instanceof NeonAuthorizationError ? error.code : "FORBIDDEN" }, { status: 403 });
  }
  if (Number(request.headers.get("content-length") || 0) > 10_000) {
    return NextResponse.json({ error: "INVALID_QUERY" }, { status: 413 });
  }
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "INVALID_QUERY" }, { status: 400 });
  }
  const data = body as Record<string, unknown>;
  const name = typeof data.name === "string" ? data.name.trim() : "";
  const email = typeof data.email === "string" ? data.email.trim().toLowerCase() : "";
  const subject = typeof data.subject === "string" ? data.subject.trim() : "";
  const message = typeof data.message === "string" ? data.message.trim() : "";
  if (Object.keys(data).some((key) => !["name", "email", "subject", "message"].includes(key)) ||
      !name || name.length > 180 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 ||
      !subject || subject.length > 250 || !message || message.length > 5000) {
    return NextResponse.json({ error: "INVALID_QUERY" }, { status: 400 });
  }
  try {
    const rows = await queryRows<{ id: string }>(`
      INSERT INTO public.contact_queries (name, email, subject, message, status)
      SELECT $1, $2, $3, $4, 'pending'
      WHERE NOT EXISTS (
        SELECT 1 FROM public.contact_queries
        WHERE lower(email) = $2 AND created_at > now() - interval '60 seconds'
      ) RETURNING id`, [name, email, subject, message]);
    if (!rows[0]) return NextResponse.json({ error: "PLEASE_WAIT_BEFORE_RETRYING" }, { status: 429 });
    return NextResponse.json({ data: { id: rows[0].id } }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "QUERY_UNAVAILABLE" }, { status: 503 });
  }
}
