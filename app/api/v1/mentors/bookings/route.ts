import { authenticateRequest, ApiAuthError } from "@/lib/server/auth";
import { jsonApiResponse } from "@/lib/server/api-response";
import { getAdminClient } from "@/lib/server/supabase";
import {
  rescheduleMentorBooking,
  cancelMentorBooking,
} from "@/lib/server/mentorship-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const auth = await authenticateRequest(request);
    const db = getAdminClient() as any;
    const url = new URL(request.url);
    const mode = url.searchParams.get("mode"); // "mentor" or "student"

    if (mode === "mentor") {
      // Find mentor record for this user
      const { data: mentor } = await db
        .from("mentors")
        .select("id")
        .eq("user_id", auth.user.id)
        .is("deleted_at", null)
        .maybeSingle();

      if (!mentor) {
        return jsonApiResponse({ data: [], error: null, meta: { requestId } }, 200);
      }

      const { data: bookings, error } = await db
        .from("mentor_bookings")
        .select(`
          id,
          student_id,
          mentor_service_id,
          scheduled_start,
          scheduled_end,
          status,
          payment_status,
          amount,
          currency,
          notes,
          form_data,
          created_at,
          mentor_services (title, session_type, duration_minutes)
        `)
        .eq("mentor_id", mentor.id)
        .is("deleted_at", null)
        .order("scheduled_start", { ascending: false });

      if (error) throw error;
      return jsonApiResponse({ data: bookings || [], error: null, meta: { requestId } }, 200);
    }

    // Default: student's own bookings
    const { data: bookings, error } = await db
      .from("mentor_bookings")
      .select(`
        id,
        mentor_id,
        mentor_service_id,
        scheduled_start,
        scheduled_end,
        status,
        payment_status,
        amount,
        currency,
        notes,
        form_data,
        created_at,
        mentor_services (title, session_type, duration_minutes),
        mentors (
          id,
          user_id,
          headline,
          profile_image_url
        )
      `)
      .eq("student_id", auth.user.id)
      .is("deleted_at", null)
      .order("scheduled_start", { ascending: false });

    if (error) throw error;

    // Fetch mentor public display names safely
    const mentorUserIds = [...new Set((bookings || []).map((b: any) => b.mentors?.user_id).filter(Boolean))];
    const { data: profiles } = mentorUserIds.length > 0
      ? await db.from("public_profile_directory").select("user_id, full_name, avatar_url").in("user_id", mentorUserIds)
      : { data: [] };

    const profileMap = new Map<string, any>((profiles || []).map((p: any) => [p.user_id, p]));

    const formatted = (bookings || []).map((b: any) => {
      const prof = profileMap.get(b.mentors?.user_id) || {};
      return {
        id: b.id,
        mentorId: b.mentor_id,
        mentorName: prof.full_name || b.mentors?.headline || "Mentor",
        mentorAvatar: b.mentors?.profile_image_url || prof.avatar_url || null,
        scheduledStart: b.scheduled_start,
        scheduledEnd: b.scheduled_end,
        status: b.status,
        paymentStatus: b.payment_status,
        amount: Number(b.amount || 0),
        currency: b.currency,
        notes: b.notes,
        serviceTitle: b.mentor_services?.title || b.form_data?.serviceTitle || "Mentorship Session",
        topic: b.form_data?.topic || "Career & Academic Guidance",
        createdAt: b.created_at,
      };
    });

    return jsonApiResponse({ data: formatted, error: null, meta: { requestId } }, 200);
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return jsonApiResponse({ data: null, error: { code: error.code, message: error.message }, meta: { requestId } }, error.status);
    }
    return jsonApiResponse(
      { data: null, error: { code: "FETCH_BOOKINGS_FAILED", message: error instanceof Error ? error.message : "Failed to load bookings." }, meta: { requestId } },
      500
    );
  }
}

export async function PATCH(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const auth = await authenticateRequest(request);
    const body = await request.json();

    if (!body.bookingId) {
      return jsonApiResponse(
        { data: null, error: { code: "INVALID_BOOKING_ID", message: "Booking ID is required." }, meta: { requestId } },
        400
      );
    }

    const action = body.action; // "reschedule", "cancel", "complete"

    if (action === "reschedule") {
      if (!body.newDate || !body.newTime) {
        return jsonApiResponse(
          { data: null, error: { code: "INVALID_SCHEDULE", message: "New date and time are required for rescheduling." }, meta: { requestId } },
          400
        );
      }
      const result = await rescheduleMentorBooking(
        body.bookingId,
        auth.user.id,
        body.newDate,
        body.newTime,
        body.reason
      );
      return jsonApiResponse({ data: result, error: null, meta: { requestId } }, 200);
    }

    if (action === "cancel") {
      const result = await cancelMentorBooking(body.bookingId, auth.user.id, body.reason);
      return jsonApiResponse({ data: result, error: null, meta: { requestId } }, 200);
    }

    if (action === "complete") {
      const db = getAdminClient() as any;
      const { data: result, error } = await db.rpc("complete_mentor_booking", {
        p_booking_id: body.bookingId,
      });
      if (error) throw error;
      return jsonApiResponse({ data: result, error: null, meta: { requestId } }, 200);
    }

    return jsonApiResponse(
      { data: null, error: { code: "INVALID_ACTION", message: "Supported actions are 'reschedule', 'cancel', or 'complete'." }, meta: { requestId } },
      400
    );
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return jsonApiResponse({ data: null, error: { code: error.code, message: error.message }, meta: { requestId } }, error.status);
    }
    return jsonApiResponse(
      { data: null, error: { code: "BOOKING_ACTION_FAILED", message: error instanceof Error ? error.message : "Failed to update booking." }, meta: { requestId } },
      400
    );
  }
}
