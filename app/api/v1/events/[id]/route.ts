/**
 * Single event detail endpoint (by UUID or slug).
 * Mode-aware: uses NeonEventsRepository in staging, Supabase in legacy.
 */
import { jsonApiResponse } from "@/lib/server/api-response";
import { getBackendMode } from "@/lib/server/backend-mode";
import { getAdminClient } from "@/lib/server/supabase";
import { NeonEventsRepository } from "@/lib/server/neon-events";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = crypto.randomUUID();
  try {
    const { id } = await params;

    if (getBackendMode() === "neon-staging") {
      const repo = new NeonEventsRepository();
      const event = await repo.getPublicEventDetail(id);
      if (!event) {
        return jsonApiResponse(
          { data: null, error: { code: "EVENT_NOT_FOUND", message: "The requested event was not found or is no longer available." }, meta: { requestId } },
          404
        );
      }
      return jsonApiResponse({ data: event, error: null, meta: { requestId } });
    }

    // Legacy Supabase path
    const db = getAdminClient() as any;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

    let query = db
      .from("events")
      .select(`
        *,
        category:category_id (
          id,
          name,
          slug,
          icon
        ),
        programs:event_programs (
          id,
          title,
          slug,
          description,
          start_time,
          end_time,
          venue,
          capacity,
          requires_registration,
          speaker_or_organizer,
          status,
          display_order
        ),
        ticket_types:event_ticket_types (
          id,
          program_id,
          name,
          description,
          ticket_kind,
          min_team_size,
          max_team_size,
          price,
          currency,
          total_quantity,
          quantity_sold,
          min_per_order,
          max_per_order,
          sales_start_at,
          sales_end_at,
          eligibility_rules,
          is_active,
          display_order
        ),
        registration_fields:event_registration_fields (
          id,
          field_key,
          field_label,
          field_type,
          placeholder,
          help_text,
          options,
          required,
          display_order
        )
      `)
      .is("deleted_at", null);

    if (isUuid) {
      query = query.eq("id", id);
    } else {
      query = query.eq("slug", id);
    }

    const { data: event, error } = await query.maybeSingle();

    if (error || !event) {
      return jsonApiResponse(
        {
          data: null,
          error: {
            code: "EVENT_NOT_FOUND",
            message: "The requested event was not found or is no longer available.",
          },
          meta: { requestId },
        },
        404
      );
    }

    // Sort relations by display order
    if (Array.isArray(event.programs)) {
      event.programs.sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0));
    }
    if (Array.isArray(event.ticket_types)) {
      event.ticket_types.sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0));
    }
    if (Array.isArray(event.registration_fields)) {
      event.registration_fields.sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0));
    }

    return jsonApiResponse({
      data: event,
      error: null,
      meta: { requestId },
    });
  } catch (err) {
    return jsonApiResponse(
      {
        data: null,
        error: {
          code: "EVENT_FETCH_FAILED",
          message: err instanceof Error ? err.message : "Failed to load event details.",
        },
        meta: { requestId },
      },
      500
    );
  }
}
