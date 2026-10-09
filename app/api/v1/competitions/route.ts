/**
 * Public competitions discovery endpoint.
 * Mode-aware: uses Neon SQL in staging, Supabase in legacy.
 */
import { jsonApiResponse } from "@/lib/server/api-response";
import { getBackendMode } from "@/lib/server/backend-mode";
import { queryRows } from "@/lib/server/db";
import { getAdminClient } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const url = new URL(request.url);
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "50", 10)));
    const offset = Math.max(0, parseInt(url.searchParams.get("offset") || "0", 10));

    if (getBackendMode() === "neon-staging") {
      // Query competitions from Neon
      const competitions = await queryRows<Record<string, unknown>>(`
        SELECT id, title, type, organizer_type, prize_pool, format, status,
               start_date, end_date, description, cover_image_url
        FROM public.competitions
        WHERE status IN ('upcoming', 'ongoing')
        ORDER BY start_date ASC NULLS LAST, created_at DESC
        LIMIT $1 OFFSET $2`, [limit, offset]);

      return jsonApiResponse({
        data: competitions,
        error: null,
        meta: { requestId, count: competitions.length, offset, limit },
      });
    }

    // Legacy Supabase path
    const db = getAdminClient() as any;
    const { data: competitions, error } = await db
      .from("competitions")
      .select("id, title, type, organizer_type, prize_pool, format, status, start_date, end_date, description, cover_image_url")
      .in("status", ["upcoming", "ongoing"])
      .order("start_date", { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return jsonApiResponse({
      data: competitions || [],
      error: null,
      meta: { requestId, count: (competitions || []).length, offset, limit },
    });
  } catch (err) {
    return jsonApiResponse(
      {
        data: [],
        error: {
          code: "COMPETITIONS_FETCH_FAILED",
          message: err instanceof Error ? err.message : "Failed to load competitions.",
        },
        meta: { requestId },
      },
      500
    );
  }
}
