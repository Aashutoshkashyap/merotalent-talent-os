/**
 * Public events discovery endpoint.
 * Mode-aware: uses NeonEventsRepository in staging, Supabase in legacy.
 */
import { jsonApiResponse } from "@/lib/server/api-response";
import { getBackendMode } from "@/lib/server/backend-mode";
import { getAdminClient } from "@/lib/server/supabase";
import { NeonEventsRepository } from "@/lib/server/neon-events";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const url = new URL(request.url);
    const search = url.searchParams.get("search")?.trim().toLowerCase();
    const categorySlug = url.searchParams.get("category")?.trim();
    const format = url.searchParams.get("format")?.trim();
    const eventType = url.searchParams.get("type")?.trim();
    const organizerType = url.searchParams.get("organizer_type")?.trim();
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "50", 10)));
    const offset = Math.max(0, parseInt(url.searchParams.get("offset") || "0", 10));

    if (getBackendMode() === "neon-staging") {
      const repo = new NeonEventsRepository();
      const events = await repo.listPublicEvents({
        search: search || undefined,
        format: (format && format !== "all") ? format : undefined,
        eventType: (eventType && eventType !== "all") ? eventType : undefined,
        limit,
        offset,
      });

      return jsonApiResponse({
        data: events,
        error: null,
        meta: { requestId, count: events.length, offset, limit },
      });
    }

    // Legacy Supabase path
    const db = getAdminClient() as any;

    let query = db
      .from("events")
      .select(`
        id,
        title,
        slug,
        short_description,
        description,
        event_type,
        format,
        location,
        meeting_url,
        cover_image_url,
        start_date,
        end_date,
        registration_open_at,
        registration_close_at,
        registration_deadline,
        capacity,
        ticket_price,
        currency,
        status,
        lifecycle_status,
        organizer_type,
        organizer_id,
        is_multi_program,
        is_featured,
        created_at,
        category:category_id (
          id,
          name,
          slug,
          icon
        ),
        programs:event_programs (
          id,
          title,
          start_time,
          end_time,
          venue
        ),
        ticket_types:event_ticket_types (
          id,
          name,
          price,
          currency,
          ticket_kind,
          quantity_sold,
          total_quantity,
          is_active
        )
      `)
      .in("status", ["approved", "published"])
      .eq("approval_status", "approved")
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("start_date", { ascending: true })
      .range(offset, offset + limit - 1);

    if (format && format !== "all") {
      query = query.eq("format", format);
    }
    if (eventType && eventType !== "all") {
      query = query.eq("event_type", eventType);
    }
    if (organizerType && organizerType !== "all") {
      query = query.eq("organizer_type", organizerType);
    }

    const { data: events, error } = await query;
    if (error) throw error;

    let filtered = events || [];

    if (categorySlug && categorySlug !== "all") {
      filtered = filtered.filter((e: any) => e.category?.slug === categorySlug);
    }

    if (search) {
      filtered = filtered.filter((e: any) => {
        const text = [
          e.title,
          e.short_description || "",
          e.description || "",
          e.location || "",
          e.category?.name || "",
        ].join(" ").toLowerCase();
        return text.includes(search);
      });
    }

    return jsonApiResponse({
      data: filtered,
      error: null,
      meta: {
        requestId,
        count: filtered.length,
        offset,
        limit,
      },
    });
  } catch (err) {
    return jsonApiResponse(
      {
        data: null,
        error: {
          code: "EVENTS_FETCH_FAILED",
          message: err instanceof Error ? err.message : "Failed to load events.",
        },
        meta: { requestId },
      },
      500
    );
  }
}
