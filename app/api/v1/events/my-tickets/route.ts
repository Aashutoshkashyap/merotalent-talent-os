/**
 * User's own event tickets/registrations endpoint.
 * Mode-aware: uses NeonEventsRepository in staging, Supabase in legacy.
 */
import { jsonApiResponse } from "@/lib/server/api-response";
import { getBackendMode } from "@/lib/server/backend-mode";
import { authenticateRequest } from "@/lib/server/auth";
import { getAdminClient } from "@/lib/server/supabase";
import { NeonEventsRepository } from "@/lib/server/neon-events";
import { getAuthenticatedApplicationUser } from "@/lib/server/neon-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    if (getBackendMode() === "neon-staging") {
      const actor = await getAuthenticatedApplicationUser(request);
      const repo = new NeonEventsRepository();
      const registrations = await repo.listOwnRegistrations(actor);
      return jsonApiResponse({
        data: registrations,
        error: null,
        meta: { requestId, count: registrations.length },
      });
    }

    // Legacy Supabase path
    const authenticated = await authenticateRequest(request);
    const db = getAdminClient() as any;

    const { data: tickets, error } = await db
      .from("event_tickets")
      .select(`
        id,
        ticket_number,
        attendee_name,
        attendee_email,
        qr_token,
        status,
        checked_in_at,
        created_at,
        event:event_id (
          id,
          title,
          slug,
          format,
          location,
          meeting_url,
          cover_image_url,
          start_date,
          end_date
        ),
        program:program_id (
          id,
          title,
          start_time,
          end_time,
          venue
        ),
        ticket_type:ticket_type_id (
          id,
          name,
          ticket_kind,
          price,
          currency
        ),
        registration:registration_id (
          id,
          registration_number,
          team_name,
          payment_status,
          total_amount
        )
      `)
      .eq("user_id", authenticated.user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return jsonApiResponse({
      data: tickets || [],
      error: null,
      meta: { requestId, count: tickets?.length || 0 },
    });
  } catch (err: any) {
    return jsonApiResponse(
      {
        data: null,
        error: {
          code: err.code || "TICKETS_FETCH_FAILED",
          message: err.message || "Failed to load your event tickets.",
        },
        meta: { requestId },
      },
      err.status || 500
    );
  }
}
