/**
 * Public competitions discovery endpoint.
 * Mode-aware: uses Neon SQL in staging, Supabase in legacy.
 */
import { jsonApiResponse } from "@/lib/server/api-response";
import { getBackendMode } from "@/lib/server/backend-mode";
import { getAdminClient } from "@/lib/server/supabase";
import { listPublicCompetitions } from "@/lib/server/neon-competitions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const url = new URL(request.url);
    const requestedLimit = parseInt(url.searchParams.get("limit") || "50", 10);
    const requestedOffset = parseInt(url.searchParams.get("offset") || "0", 10);
    const limit = Number.isFinite(requestedLimit) ? Math.min(100, Math.max(1, requestedLimit)) : 50;
    const offset = Number.isFinite(requestedOffset) ? Math.max(0, requestedOffset) : 0;

    if (getBackendMode() === "neon-staging") {
      const competitions = await listPublicCompetitions(limit, offset);

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
