import { getAdminClient } from "./supabase";

export interface BookMentorSessionInput {
  userId: string;
  mentorId: string;
  mentorServiceId?: string | null;
  fullName: string;
  email: string;
  phone: string;
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime: string; // HH:mm (24-hour format)
  durationMinutes?: number;
  topic: string;
  notes?: string;
  meetingPreference?: "online" | "in_person" | "either";
}

export interface MentorReviewInput {
  userId: string;
  bookingId: string;
  rating: number;
  feedback?: string;
}

export interface MentorFilterParams {
  query?: string;
  topic?: string;
  skill?: string;
  industry?: string;
  isFree?: boolean;
  minRating?: number;
}

/**
 * Publicly sanitized mentor view that guarantees mentor contact privacy.
 * Personal email, phone, and direct contact details are NEVER returned.
 */
export interface PublicMentorProfile {
  id: string;
  userId: string;
  fullName: string;
  headline: string | null;
  bio: string | null;
  description: string | null;
  avatarUrl: string | null;
  expertise: string[];
  topics: string[];
  industry: string | null;
  languages: string[];
  location: string | null;
  yearsExperience: number;
  hourlyRate: number;
  rating: number;
  totalSessions: number;
  totalReviews: number;
  availability: {
    days?: string[];
    startTime?: string;
    endTime?: string;
    timezone?: string;
  } | null;
  services: Array<{
    id: string;
    title: string;
    description: string | null;
    sessionType: "one_to_one" | "group";
    deliveryMode: "online" | "in_person" | "either";
    durationMinutes: number;
    price: number;
    currency: string;
    isActive: boolean;
  }>;
  reviews?: Array<{
    id: string;
    rating: number;
    feedback: string | null;
    createdAt: string;
  }>;
}

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * Validates and atomically creates a mentor booking (Free or Paid)
 */
export async function bookMentorSession(input: BookMentorSessionInput) {
  const db = getAdminClient() as any;
  const now = new Date();

  // 1. Fetch Mentor
  const { data: mentor, error: mentorError } = await db
    .from("mentors")
    .select("id, user_id, headline, hourly_rate, is_available, availability, approval_status, deleted_at")
    .eq("id", input.mentorId)
    .is("deleted_at", null)
    .maybeSingle();

  if (mentorError || !mentor) {
    throw new Error("Mentor profile was not found or is currently unavailable.");
  }

  if (mentor.approval_status !== "approved" || !mentor.is_available) {
    throw new Error("This mentor is not currently accepting new bookings.");
  }

  // 2. Fetch Selected Service if provided, or fallback to default pricing
  let service: any = null;
  if (input.mentorServiceId) {
    const { data: svc, error: svcError } = await db
      .from("mentor_services")
      .select("id, mentor_id, title, description, session_type, duration_minutes, price, currency, is_active")
      .eq("id", input.mentorServiceId)
      .eq("mentor_id", mentor.id)
      .eq("is_active", true)
      .is("deleted_at", null)
      .maybeSingle();

    if (svcError || !svc) {
      throw new Error("The selected mentoring service is not available.");
    }
    service = svc;
  }

  const durationMinutes = service?.duration_minutes ?? (input.durationMinutes ? Number(input.durationMinutes) : 60);
  const price = service ? Number(service.price) : Number(mentor.hourly_rate || 0) * (durationMinutes / 60);
  const currency = service?.currency ?? "NPR";
  const isFree = price <= 0;

  // 3. Compute timestamps
  const [hoursStr, minsStr] = input.scheduledTime.split(":");
  const hours = parseInt(hoursStr || "09", 10);
  const mins = parseInt(minsStr || "00", 10);

  const startLocal = new Date(`${input.scheduledDate}T${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:00`);
  if (Number.isNaN(startLocal.getTime())) {
    throw new Error("Invalid booking date or time.");
  }

  if (startLocal.getTime() < now.getTime()) {
    throw new Error("Cannot book a mentorship session in the past.");
  }

  const endLocal = new Date(startLocal.getTime() + durationMinutes * 60 * 1000);
  const scheduledStartIso = startLocal.toISOString();
  const scheduledEndIso = endLocal.toISOString();

  // 4. Validate Published Availability Window
  const mentorAvailability = mentor.availability || {};
  const allowedDays = Array.isArray(mentorAvailability.days) ? mentorAvailability.days : [];
  if (allowedDays.length > 0) {
    const dayOfWeek = dayNames[startLocal.getDay()];
    if (!allowedDays.includes(dayOfWeek)) {
      throw new Error(`The mentor is only available on: ${allowedDays.join(", ")}.`);
    }
  }

  const availStart = mentorAvailability.startTime || "00:00";
  const availEnd = mentorAvailability.endTime || "23:59";
  const requestedTime = `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
  if (requestedTime < availStart || requestedTime >= availEnd) {
    throw new Error(`The mentor's available booking hours are between ${availStart} and ${availEnd}.`);
  }

  // 5. Pre-check Overlapping Slot Conflict / Double Booking
  const { data: conflict } = await db
    .from("mentor_bookings")
    .select("id")
    .eq("mentor_id", mentor.id)
    .is("deleted_at", null)
    .in("status", ["pending", "confirmed", "rescheduled", "reschedule_requested", "pending_payment"])
    .lt("scheduled_start", scheduledEndIso)
    .gt("scheduled_end", scheduledStartIso)
    .maybeSingle();

  if (conflict) {
    throw new Error("This time slot is already booked for this mentor. Please select another slot.");
  }

  // 6. Insert Booking Record
  const initialStatus = isFree ? "confirmed" : "pending";
  const initialPaymentStatus = isFree ? "not_required" : "pending";

  const { data: booking, error: insertError } = await db
    .from("mentor_bookings")
    .insert({
      mentor_id: mentor.id,
      mentor_service_id: service?.id ?? null,
      student_id: input.userId,
      scheduled_start: scheduledStartIso,
      scheduled_end: scheduledEndIso,
      status: initialStatus,
      payment_status: initialPaymentStatus,
      amount: price,
      currency,
      notes: input.notes || null,
      form_data: {
        topic: input.topic,
        fullName: input.fullName,
        email: input.email,
        phone: input.phone,
        serviceTitle: service?.title || "1-on-1 Mentorship",
        meetingPreference: input.meetingPreference || "online",
      },
    })
    .select("id, mentor_id, student_id, scheduled_start, scheduled_end, status, payment_status, amount, currency")
    .single();

  if (insertError) {
    if (insertError.code === "23P01" || insertError.message?.includes("already booked")) {
      throw new Error("This time slot was just booked by another student. Please select a different time.");
    }
    throw insertError;
  }

  // 7. If Free Session, dispatch instant confirmation notifications
  if (isFree) {
    // Notify Student
    const { error: studentNotifErr } = await db.from("notifications").insert({
      recipient_id: input.userId,
      title: "Mentorship Session Confirmed",
      message: `Your free session with your mentor is confirmed for ${input.scheduledDate} at ${input.scheduledTime}.`,
      type: "success",
      category: "general",
      action_url: "/dashboard/sessions",
    });
    if (studentNotifErr) console.warn("Failed to insert student notification", studentNotifErr);

    // Notify Mentor
    const { error: mentorNotifErr } = await db.from("notifications").insert({
      recipient_id: mentor.user_id,
      title: "New Mentorship Session Booked",
      message: `${input.fullName} has booked a mentoring session for ${input.scheduledDate} at ${input.scheduledTime}.`,
      type: "info",
      category: "general",
      action_url: "/mentor#pipeline",
    });
    if (mentorNotifErr) console.warn("Failed to insert mentor notification", mentorNotifErr);

    // Create Audit Log
    const { error: auditErr } = await db.from("audit_logs").insert({
      actor_user_id: input.userId,
      action: "MENTOR_BOOKING_CREATED",
      entity_type: "mentor_booking",
      entity_id: booking.id,
      metadata: {
        is_free: true,
        amount: 0,
        mentor_id: mentor.id,
        scheduled_start: scheduledStartIso,
      },
    });
    if (auditErr) console.warn("Failed to insert audit log", auditErr);

    return {
      id: booking.id,
      status: "confirmed",
      isFree: true,
      amount: 0,
      currency,
      scheduledStart: scheduledStartIso,
      scheduledEnd: scheduledEndIso,
    };
  }

  // 8. Paid Session: Audit log pending booking
  const { error: auditPendingErr } = await db.from("audit_logs").insert({
    actor_user_id: input.userId,
    action: "MENTOR_BOOKING_PENDING_PAYMENT",
    entity_type: "mentor_booking",
    entity_id: booking.id,
    metadata: {
      is_free: false,
      amount: price,
      mentor_id: mentor.id,
      scheduled_start: scheduledStartIso,
    },
  });
  if (auditPendingErr) console.warn("Failed to insert audit log", auditPendingErr);

  return {
    id: booking.id,
    status: "pending",
    isFree: false,
    amount: price,
    currency,
    scheduledStart: scheduledStartIso,
    scheduledEnd: scheduledEndIso,
  };
}

/**
 * Reschedules an existing mentor booking
 */
export async function rescheduleMentorBooking(
  bookingId: string,
  actorUserId: string,
  newDate: string,
  newTime: string,
  reason?: string
) {
  const db = getAdminClient() as any;

  const { data: booking, error: bookingError } = await db
    .from("mentor_bookings")
    .select("id, mentor_id, student_id, scheduled_start, scheduled_end, status, mentor_service_id")
    .eq("id", bookingId)
    .is("deleted_at", null)
    .maybeSingle();

  if (bookingError || !booking) {
    throw new Error("Booking not found.");
  }

  if (["completed", "cancelled", "declined"].includes(booking.status)) {
    throw new Error(`Cannot reschedule a session that is already ${booking.status}.`);
  }

  // Verify actor is student or mentor
  const { data: mentor } = await db
    .from("mentors")
    .select("id, user_id")
    .eq("id", booking.mentor_id)
    .maybeSingle();

  const isStudent = booking.student_id === actorUserId;
  const isMentor = mentor?.user_id === actorUserId;

  if (!isStudent && !isMentor) {
    throw new Error("You are not authorized to reschedule this session.");
  }

  // Calculate new time range
  const currentDurationMs = new Date(booking.scheduled_end).getTime() - new Date(booking.scheduled_start).getTime();
  const [hoursStr, minsStr] = newTime.split(":");
  const newStart = new Date(`${newDate}T${hoursStr.padStart(2, "0")}:${minsStr.padStart(2, "0")}:00`);
  const newEnd = new Date(newStart.getTime() + currentDurationMs);

  if (newStart.getTime() < Date.now()) {
    throw new Error("Cannot reschedule to a past date/time.");
  }

  // Call RPC
  const { data: result, error: rpcError } = await db.rpc("reschedule_mentor_booking", {
    p_booking_id: bookingId,
    p_scheduled_start: newStart.toISOString(),
    p_scheduled_end: newEnd.toISOString(),
    p_reason: reason || null,
  });

  if (rpcError) throw rpcError;

  // Send Notification to Counterparty
  const notifyRecipient = isStudent ? mentor?.user_id : booking.student_id;
  if (notifyRecipient) {
    const { error: notifErr } = await db.from("notifications").insert({
      recipient_id: notifyRecipient,
      title: "Mentorship Session Rescheduled",
      message: `The mentoring session has been rescheduled to ${newDate} at ${newTime}.`,
      type: "info",
      category: "general",
      action_url: isStudent ? "/mentor#pipeline" : "/dashboard/sessions",
    });
    if (notifErr) console.warn("Failed to insert notification", notifErr);
  }

  return result;
}

/**
 * Cancels a mentor booking safely
 */
export async function cancelMentorBooking(bookingId: string, actorUserId: string, reason?: string) {
  const db = getAdminClient() as any;

  const { data: booking, error: bookingError } = await db
    .from("mentor_bookings")
    .select("id, mentor_id, student_id, status")
    .eq("id", bookingId)
    .is("deleted_at", null)
    .maybeSingle();

  if (bookingError || !booking) {
    throw new Error("Booking not found.");
  }

  const { data: mentor } = await db
    .from("mentors")
    .select("id, user_id")
    .eq("id", booking.mentor_id)
    .maybeSingle();

  const isStudent = booking.student_id === actorUserId;
  const isMentor = mentor?.user_id === actorUserId;

  if (!isStudent && !isMentor) {
    throw new Error("You are not authorized to cancel this booking.");
  }

  const { data: result, error: rpcError } = await db.rpc("cancel_mentor_booking", {
    p_booking_id: bookingId,
    p_reason: reason || null,
  });

  if (rpcError) throw rpcError;

  // Notify Counterparty
  const notifyRecipient = isStudent ? mentor?.user_id : booking.student_id;
  if (notifyRecipient) {
    const { error: cancelNotifErr } = await db.from("notifications").insert({
      recipient_id: notifyRecipient,
      title: "Mentorship Session Cancelled",
      message: `The mentoring session scheduled with you was cancelled. Reason: ${reason || "No reason provided."}`,
      type: "alert",
      category: "general",
      action_url: isStudent ? "/mentor#pipeline" : "/dashboard/sessions",
    });
    if (cancelNotifErr) console.warn("Failed to insert notification", cancelNotifErr);
  }

  return result;
}

/**
 * Submits feedback and rating for a completed mentor session
 */
export async function submitMentorReview(input: MentorReviewInput) {
  const db = getAdminClient() as any;

  if (input.rating < 1 || input.rating > 5) {
    throw new Error("Rating must be an integer between 1 and 5 stars.");
  }

  // Check booking
  const { data: booking, error: bookingError } = await db
    .from("mentor_bookings")
    .select("id, mentor_id, student_id, status")
    .eq("id", input.bookingId)
    .maybeSingle();

  if (bookingError || !booking) {
    throw new Error("Booking not found.");
  }

  if (booking.student_id !== input.userId) {
    throw new Error("You can only review sessions that you personally attended.");
  }

  if (booking.status !== "completed") {
    throw new Error("You can only submit a review after the mentorship session is completed.");
  }

  // Check if existing review exists
  const { data: existingReview } = await db
    .from("mentor_reviews")
    .select("id")
    .eq("booking_id", input.bookingId)
    .maybeSingle();

  if (existingReview) {
    throw new Error("You have already submitted a review for this session.");
  }

  // Insert review
  const { data: review, error: insertError } = await db
    .from("mentor_reviews")
    .insert({
      booking_id: input.bookingId,
      mentor_id: booking.mentor_id,
      student_id: input.userId,
      rating: Math.round(input.rating),
      feedback: input.feedback?.trim() || null,
      is_public: true,
    })
    .select("id, rating, feedback, created_at")
    .single();

  if (insertError) throw insertError;

  return review;
}

/**
 * Retrieves public mentor directory without exposing any personal contact info
 */
export async function listPublicMentors(filters: MentorFilterParams = {}): Promise<PublicMentorProfile[]> {
  const db = getAdminClient() as any;

  let query = db
    .from("mentors")
    .select(`
      id,
      user_id,
      headline,
      description,
      profile_image_url,
      expertise,
      topics,
      industry,
      languages,
      location,
      years_experience,
      hourly_rate,
      rating,
      total_sessions,
      total_reviews,
      availability,
      mentor_services (
        id,
        title,
        description,
        session_type,
        delivery_mode,
        duration_minutes,
        price,
        currency,
        is_active
      )
    `)
    .eq("approval_status", "approved")
    .eq("is_available", true)
    .is("deleted_at", null)
    .order("rating", { ascending: false });

  if (filters.industry) {
    query = query.eq("industry", filters.industry);
  }

  const { data: mentorRows, error } = await query;
  if (error) throw error;

  const mentors = mentorRows || [];
  const userIds = mentors.map((m: any) => m.user_id);

  // Fetch names and avatars safely from public profile directory (no emails/phones)
  const { data: profiles } = userIds.length > 0
    ? await db
        .from("public_profile_directory")
        .select("user_id, full_name, avatar_url, bio, location")
        .in("user_id", userIds)
    : { data: [] };

  const profileMap = new Map<string, any>((profiles || []).map((p: any) => [p.user_id, p]));

  let results: PublicMentorProfile[] = mentors.map((m: any) => {
    const prof = profileMap.get(m.user_id) || {};
    const services = Array.isArray(m.mentor_services)
      ? m.mentor_services.filter((s: any) => s.is_active)
      : [];

    return {
      id: m.id,
      userId: m.user_id,
      fullName: prof.full_name || m.headline || "MeroTalent Mentor",
      headline: m.headline,
      bio: prof.bio || m.description,
      description: m.description,
      avatarUrl: m.profile_image_url || prof.avatar_url || null,
      expertise: Array.isArray(m.expertise) ? m.expertise : [],
      topics: Array.isArray(m.topics) ? m.topics : [],
      industry: m.industry || null,
      languages: Array.isArray(m.languages) ? m.languages : ["English", "Nepali"],
      location: m.location || prof.location || null,
      yearsExperience: m.years_experience || 0,
      hourlyRate: Number(m.hourly_rate || 0),
      rating: Number(m.rating || 5.0),
      totalSessions: m.total_sessions || 0,
      totalReviews: m.total_reviews || 0,
      availability: m.availability || null,
      services: services.map((s: any) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        sessionType: s.session_type,
        deliveryMode: s.delivery_mode || "online",
        durationMinutes: s.duration_minutes,
        price: Number(s.price),
        currency: s.currency,
        isActive: s.is_active,
      })),
    };
  });

  // Client-level query filtering
  if (filters.query?.trim()) {
    const q = filters.query.toLowerCase();
    results = results.filter((m) =>
      [m.fullName, m.headline, m.bio, ...m.expertise, ...m.topics, m.industry]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }

  if (filters.skill?.trim()) {
    const s = filters.skill.toLowerCase();
    results = results.filter((m) =>
      m.expertise.some((e) => e.toLowerCase().includes(s)) ||
      m.topics.some((t) => t.toLowerCase().includes(s))
    );
  }

  if (filters.isFree) {
    results = results.filter(
      (m) => m.hourlyRate === 0 || m.services.some((s) => s.price === 0)
    );
  }

  return results;
}
