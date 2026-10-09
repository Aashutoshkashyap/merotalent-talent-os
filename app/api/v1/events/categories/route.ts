/**
 * Event categories endpoint.
 * Mode-aware: uses NeonEventsRepository in staging, Supabase in legacy.
 */
import { jsonApiResponse } from "@/lib/server/api-response";
import { getBackendMode } from "@/lib/server/backend-mode";
import { getAdminClient } from "@/lib/server/supabase";
import { NeonEventsRepository } from "@/lib/server/neon-events";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const requestId = crypto.randomUUID();
  try {
    if (getBackendMode() === "neon-staging") {
      const repo = new NeonEventsRepository();
      const categories = await repo.listCategories();
      return jsonApiResponse({ data: categories, error: null, meta: { requestId } });
    }

    // Legacy Supabase path
    const db = getAdminClient() as any;
    const { data, error } = await db
      .from("event_categories")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (error) throw error;

    return jsonApiResponse({
      data: data || [],
      error: null,
      meta: { requestId },
    });
  } catch (err) {
    return jsonApiResponse(
      {
        data: null,
        error: {
          code: "CATEGORIES_FETCH_FAILED",
          message: err instanceof Error ? err.message : "Failed to fetch event categories.",
        },
        meta: { requestId },
      },
      500
    );
  }
}
