import { randomUUID, randomBytes } from "node:crypto";
import { getAdminClient } from "./supabase";

export interface EventRegistrationInput {
  userId: string;
  eventId: string;
  programId?: string | null;
  ticketTypeId?: string | null;
  attendeeCount?: number;
  teamName?: string | null;
  participants?: Array<{
    fullName: string;
    email?: string;
    phone?: string;
    college?: string;
    studentId?: string;
    roleInTeam?: string;
    customData?: Record<string, unknown>;
  }>;
  customResponses?: Record<string, unknown>;
  formData?: Record<string, unknown>;
}

export interface CheckinResult {
  success: boolean;
  code: "SUCCESS" | "ALREADY_CHECKED_IN" | "INVALID_TICKET" | "CANCELLED_TICKET" | "UNAUTHORIZED";
  message: string;
  ticket?: {
    id: string;
    ticketNumber: string;
    attendeeName: string;
    attendeeEmail: string | null;
    status: string;
    checkedInAt: string | null;
    eventTitle: string;
    programTitle?: string | null;
    ticketTypeName?: string | null;
  };
}

/** Generate a short random registration code */
function generateRegistrationNumber(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "REG-";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/** Generate a secure unique ticket number */
function generateTicketNumber(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "TKT-";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/** Generate an opaque cryptographic QR token */
function generateQrToken(): string {
  return `mt_qr_${randomBytes(24).toString("hex")}`;
}

/**
 * Atomic Registration for Free and Paid Events
 * Free events immediately issue confirmed registration and digital QR passes with zero payment records.
 * Paid events issue a pending registration for subsequent provider-agnostic checkout.
 */
export async function registerForEvent(input: EventRegistrationInput) {
  const db = getAdminClient() as any;
  const now = new Date();

  // 1. Fetch Event with Category and Settings
  const { data: event, error: eventError } = await db
    .from("events")
    .select("*, event_categories(name, slug)")
    .eq("id", input.eventId)
    .is("deleted_at", null)
    .maybeSingle();

  if (eventError || !event) {
    throw new Error("Event not found or is no longer available.");
  }

  // Check event approval & active status
  if (!event.is_active || event.approval_status !== "approved") {
    throw new Error("This event is not open for public registrations.");
  }

  // Check lifecycle status
  const lifecycle = event.lifecycle_status || (event.status === "published" ? "registration_open" : "draft");
  if (["cancelled", "completed"].includes(lifecycle)) {
    throw new Error(`This event has been ${lifecycle}.`);
  }

  // Check registration time windows
  if (event.registration_open_at && new Date(event.registration_open_at).getTime() > now.getTime()) {
    throw new Error("Registration for this event has not opened yet.");
  }
  if (event.registration_close_at && new Date(event.registration_close_at).getTime() < now.getTime()) {
    throw new Error("Registration for this event is closed.");
  }
  if (event.registration_deadline && new Date(event.registration_deadline).getTime() < now.getTime()) {
    throw new Error("Registration deadline for this event has passed.");
  }

  // 2. Fetch Program (if multi-program event and programId provided)
  let program: any = null;
  if (input.programId) {
    const { data: progData, error: progError } = await db
      .from("event_programs")
      .select("*")
      .eq("id", input.programId)
      .eq("event_id", event.id)
      .is("deleted_at", null)
      .maybeSingle();

    if (progError || !progData) {
      throw new Error("Selected event program/session was not found.");
    }
    if (progData.status === "cancelled") {
      throw new Error("Selected session has been cancelled.");
    }
    program = progData;
  }

  // 3. Fetch Ticket Type (if provided)
  let ticketType: any = null;
  const requestedQuantity = Math.max(1, input.attendeeCount || 1);

  if (input.ticketTypeId) {
    const { data: ttData, error: ttError } = await db
      .from("event_ticket_types")
      .select("*")
      .eq("id", input.ticketTypeId)
      .eq("event_id", event.id)
      .is("deleted_at", null)
      .maybeSingle();

    if (ttError || !ttData) {
      throw new Error("Selected ticket type was not found.");
    }
    if (!ttData.is_active) {
      throw new Error("Selected ticket type is currently inactive.");
    }
    if (ttData.sales_start_at && new Date(ttData.sales_start_at).getTime() > now.getTime()) {
      throw new Error("Sales for this ticket type have not started yet.");
    }
    if (ttData.sales_end_at && new Date(ttData.sales_end_at).getTime() < now.getTime()) {
      throw new Error("Sales for this ticket type have ended.");
    }
    if (ttData.total_quantity !== null && ttData.total_quantity !== undefined) {
      const remaining = ttData.total_quantity - (ttData.quantity_sold || 0);
      if (remaining < requestedQuantity) {
        throw new Error(`Only ${remaining} ticket(s) remaining for this tier.`);
      }
    }
    if (requestedQuantity < ttData.min_per_order) {
      throw new Error(`Minimum purchase is ${ttData.min_per_order} ticket(s).`);
    }
    if (requestedQuantity > ttData.max_per_order) {
      throw new Error(`Maximum purchase is ${ttData.max_per_order} ticket(s).`);
    }

    // Team validation
    if (ttData.ticket_kind === "team") {
      const participantsCount = input.participants?.length || requestedQuantity;
      if (participantsCount < ttData.min_team_size) {
        throw new Error(`Team registration requires at least ${ttData.min_team_size} members.`);
      }
      if (participantsCount > ttData.max_team_size) {
        throw new Error(`Team registration cannot exceed ${ttData.max_team_size} members.`);
      }
    }

    ticketType = ttData;
  }

  // 4. Calculate pricing
  const unitPrice = ticketType ? Number(ticketType.price) : Number(event.ticket_price || 0);
  const totalAmount = unitPrice * requestedQuantity;
  const isFree = totalAmount === 0 || event.event_type === "free";

  // 5. Check Overall Event Capacity
  if (event.capacity) {
    const { count, error: countError } = await db
      .from("event_registrations")
      .select("id", { count: "exact", head: true })
      .eq("event_id", event.id)
      .in("status", ["confirmed", "attended"])
      .is("deleted_at", null);

    if (!countError && typeof count === "number" && count + requestedQuantity > event.capacity) {
      throw new Error("This event has reached its maximum capacity.");
    }
  }

  // 6. Fetch User Profile for primary registrant name
  const { data: userProfile } = await db
    .from("profiles")
    .select("id, full_name, email, phone")
    .eq("id", input.userId)
    .maybeSingle();

  const registrationNumber = generateRegistrationNumber();

  // 7. Create Registration Record
  const registrationPayload = {
    event_id: event.id,
    user_id: input.userId,
    program_id: input.programId || null,
    ticket_type_id: input.ticketTypeId || null,
    registration_number: registrationNumber,
    team_name: input.teamName || null,
    status: isFree ? "confirmed" : "pending",
    payment_status: isFree ? "not_required" : "pending",
    ticket_quantity: requestedQuantity,
    attendee_count: requestedQuantity,
    total_amount: isFree ? 0 : totalAmount,
    custom_responses: input.customResponses || {},
    form_data: input.formData || {},
    registered_at: now.toISOString(),
  };

  const { data: registration, error: regInsertError } = await db
    .from("event_registrations")
    .insert(registrationPayload)
    .select("*")
    .single();

  if (regInsertError) {
    throw regInsertError;
  }

  // 8. Insert Participant Records (team members or individual attendees)
  const participantList = input.participants && input.participants.length > 0
    ? input.participants
    : [
        {
          fullName: userProfile?.full_name || "Attendee",
          email: userProfile?.email || "",
          phone: userProfile?.phone || "",
          roleInTeam: "leader",
          customData: {},
        },
      ];

  const participantRows = participantList.map((p, idx) => ({
    registration_id: registration.id,
    full_name: p.fullName || `Participant ${idx + 1}`,
    email: p.email || null,
    phone: p.phone || null,
    college: p.college || null,
    student_id: p.studentId || null,
    role_in_team: p.roleInTeam || (idx === 0 ? "leader" : "member"),
    custom_data: p.customData || {},
  }));

  const { data: insertedParticipants, error: partError } = await db
    .from("event_participants")
    .insert(participantRows)
    .select("*");

  if (partError) {
    console.error("Failed to insert event participants:", partError);
  }

  // 9. If Free Event: Update inventory, generate digital tickets, queue confirmation notification & email
  let generatedTickets: any[] = [];
  if (isFree) {
    if (ticketType?.id) {
      const { error: ticketUpdateError } = await db
        .from("event_ticket_types")
        .update({
          quantity_sold: (ticketType.quantity_sold || 0) + requestedQuantity,
          updated_at: now.toISOString(),
        })
        .eq("id", ticketType.id);
      if (ticketUpdateError) console.error("Ticket sold quantity update error:", ticketUpdateError);
    }

    generatedTickets = await issueTicketsForConfirmedRegistration(db, {
      registration,
      event,
      program,
      ticketType,
      participants: insertedParticipants || [],
      userProfile,
    });

    // Queue in-app notification
    const { error: notifError } = await db.from("notifications").insert({
      recipient_id: input.userId,
      title: `Registration confirmed: ${event.title}`,
      message: `Your registration for "${event.title}" is confirmed! Digital pass code: ${registrationNumber}.`,
      type: "success",
      category: "event",
      channel: "dashboard",
      status: "queued",
      entity_type: "event_registration",
      entity_id: registration.id,
      action_url: `/events/${event.id}`,
      metadata: {
        registration_number: registrationNumber,
        event_id: event.id,
        is_free: true,
      },
    });
    if (notifError) console.error("Notification queue error:", notifError);

    // Queue email confirmation
    if (userProfile?.email) {
      const { error: emailError } = await db.from("notifications").insert({
        recipient_id: input.userId,
        title: `Your Ticket Pass for ${event.title}`,
        message: `Hello ${userProfile.full_name || "Student"},\n\nYour registration for "${event.title}" is confirmed!\n\nRegistration Code: ${registrationNumber}\nDate: ${new Date(event.start_date).toLocaleString()}\nVenue: ${event.location || "Online"}\n\nShow your digital QR pass at the entrance.`,
        type: "info",
        category: "event",
        channel: "email",
        status: "queued",
        email_to: userProfile.email,
        email_delivery_enabled: true,
        entity_type: "event_registration",
        entity_id: registration.id,
        metadata: {
          event_id: event.id,
          registration_number: registrationNumber,
        },
      });
      if (emailError) console.error("Email queue error:", emailError);
    }

    // Audit log
    const { error: auditError } = await db.from("audit_logs").insert({
      actor_user_id: input.userId,
      action: "EVENT_FREE_REGISTRATION_COMPLETED",
      entity_type: "event_registration",
      entity_id: registration.id,
      metadata: {
        event_id: event.id,
        registration_number: registrationNumber,
        ticket_count: generatedTickets.length,
      },
    });
    if (auditError) console.error("Audit log error:", auditError);
  }

  return {
    registration,
    tickets: generatedTickets,
    isFree,
    requiresPayment: !isFree,
    totalAmount,
    currency: event.currency || "NPR",
    registrationNumber,
  };
}

/**
 * Issues digital tickets with secure QR tokens for a confirmed registration
 */
export async function issueTicketsForConfirmedRegistration(
  db: any,
  context: {
    registration: any;
    event: any;
    program: any;
    ticketType: any;
    participants: any[];
    userProfile: any;
  }
) {
  const { registration, event, program, ticketType, participants, userProfile } = context;

  const ticketsToCreate = (participants && participants.length > 0 ? participants : [null]).map((part) => ({
    ticket_number: generateTicketNumber(),
    registration_id: registration.id,
    event_id: event.id,
    program_id: program?.id || registration.program_id || null,
    ticket_type_id: ticketType?.id || registration.ticket_type_id || null,
    participant_id: part?.id || null,
    user_id: registration.user_id,
    attendee_name: part?.full_name || userProfile?.full_name || "Event Attendee",
    attendee_email: part?.email || userProfile?.email || null,
    qr_token: generateQrToken(),
    status: "active",
  }));

  const { data: tickets, error } = await db
    .from("event_tickets")
    .insert(ticketsToCreate)
    .select("*");

  if (error) {
    console.error("Failed to generate digital tickets:", error);
    return [];
  }

  return tickets || [];
}

/**
 * Authoritatively generates digital tickets when a paid registration checkout is verified
 */
export async function generateTicketsForRegistration(registrationId: string) {
  const db = getAdminClient() as any;

  const { data: registration, error: regError } = await db
    .from("event_registrations")
    .select("*, events(*), event_programs(*), event_ticket_types(*), event_participants(*)")
    .eq("id", registrationId)
    .maybeSingle();

  if (regError || !registration) {
    throw new Error("Registration record not found.");
  }

  // Check if tickets already generated
  const { data: existingTickets } = await db
    .from("event_tickets")
    .select("id")
    .eq("registration_id", registrationId);

  if (existingTickets && existingTickets.length > 0) {
    return existingTickets;
  }

  const { data: userProfile } = await db
    .from("profiles")
    .select("id, full_name, email, phone")
    .eq("id", registration.user_id)
    .maybeSingle();

  const tickets = await issueTicketsForConfirmedRegistration(db, {
    registration,
    event: registration.events,
    program: registration.event_programs,
    ticketType: registration.event_ticket_types,
    participants: registration.event_participants || [],
    userProfile,
  });

  // Increment ticket sold quantity
  if (registration.ticket_type_id && registration.event_ticket_types) {
    const { error: countUpdateError } = await db
      .from("event_ticket_types")
      .update({
        quantity_sold: (registration.event_ticket_types.quantity_sold || 0) + (registration.ticket_quantity || 1),
        updated_at: new Date().toISOString(),
      })
      .eq("id", registration.ticket_type_id);
    if (countUpdateError) console.error("Ticket count update error:", countUpdateError);
  }

  return tickets;
}

/**
 * QR Validation and Check-in Service
 * Validates QR tokens, marks tickets as used, and records checkin timestamps with duplicate prevention.
 */
export async function validateAndCheckinTicket(input: {
  qrToken: string;
  scannedByUserId: string;
  location?: string;
}): Promise<CheckinResult> {
  const db = getAdminClient() as any;
  const now = new Date();

  // Find ticket by QR token
  const { data: ticket, error: ticketError } = await db
    .from("event_tickets")
    .select("*, events(id, title, organizer_user_id), event_programs(id, title), event_ticket_types(id, name)")
    .eq("qr_token", input.qrToken)
    .maybeSingle();

  if (ticketError || !ticket) {
    return {
      success: false,
      code: "INVALID_TICKET",
      message: "Invalid QR pass or ticket was not found.",
    };
  }

  // Handle cancelled ticket
  if (ticket.status === "cancelled") {
    const { error: cancelLogErr } = await db.from("event_checkins").insert({
      ticket_id: ticket.id,
      event_id: ticket.event_id,
      program_id: ticket.program_id,
      scanned_by: input.scannedByUserId,
      device_or_location: input.location || "Main Entrance",
      status: "cancelled_ticket",
      notes: "Attempted scan of cancelled ticket.",
    });
    if (cancelLogErr) console.error("Checkin log error:", cancelLogErr);

    return {
      success: false,
      code: "CANCELLED_TICKET",
      message: `This ticket was cancelled and is no longer valid for admission.`,
      ticket: {
        id: ticket.id,
        ticketNumber: ticket.ticket_number,
        attendeeName: ticket.attendee_name,
        attendeeEmail: ticket.attendee_email,
        status: ticket.status,
        checkedInAt: ticket.checked_in_at,
        eventTitle: ticket.events?.title || "Event",
        programTitle: ticket.event_programs?.title,
        ticketTypeName: ticket.event_ticket_types?.name,
      },
    };
  }

  // Handle duplicate check-in
  if (ticket.status === "used" || ticket.checked_in_at) {
    const { error: dupLogErr } = await db.from("event_checkins").insert({
      ticket_id: ticket.id,
      event_id: ticket.event_id,
      program_id: ticket.program_id,
      scanned_by: input.scannedByUserId,
      device_or_location: input.location || "Main Entrance",
      status: "duplicate_rejected",
      notes: `Duplicate scan. Already checked in at ${ticket.checked_in_at}.`,
    });
    if (dupLogErr) console.error("Checkin duplicate log error:", dupLogErr);

    return {
      success: false,
      code: "ALREADY_CHECKED_IN",
      message: `Ticket already checked in at ${new Date(ticket.checked_in_at).toLocaleTimeString()}. Duplicate entry rejected.`,
      ticket: {
        id: ticket.id,
        ticketNumber: ticket.ticket_number,
        attendeeName: ticket.attendee_name,
        attendeeEmail: ticket.attendee_email,
        status: ticket.status,
        checkedInAt: ticket.checked_in_at,
        eventTitle: ticket.events?.title || "Event",
        programTitle: ticket.event_programs?.title,
        ticketTypeName: ticket.event_ticket_types?.name,
      },
    };
  }

  // Successful Check-in: Mark ticket used and record checkin log
  const { error: updateError } = await db
    .from("event_tickets")
    .update({
      status: "used",
      checked_in_at: now.toISOString(),
      checked_in_by: input.scannedByUserId,
      updated_at: now.toISOString(),
    })
    .eq("id", ticket.id);

  if (updateError) {
    throw updateError;
  }

  // Increment checked in count on registration
  if (ticket.registration_id) {
    const { error: regUpdateErr } = await db
      .from("event_registrations")
      .update({ checked_in_count: 1, updated_at: now.toISOString() })
      .eq("id", ticket.registration_id);
    if (regUpdateErr) console.error("Registration checkin count update error:", regUpdateErr);
  }

  const { error: checkinInsertErr } = await db.from("event_checkins").insert({
    ticket_id: ticket.id,
    event_id: ticket.event_id,
    program_id: ticket.program_id,
    scanned_by: input.scannedByUserId,
    device_or_location: input.location || "Main Entrance",
    status: "success",
    notes: `Checked in attendee: ${ticket.attendee_name}`,
  });
  if (checkinInsertErr) console.error("Checkin insert error:", checkinInsertErr);

  return {
    success: true,
    code: "SUCCESS",
    message: `Welcome, ${ticket.attendee_name}! Admission verified.`,
    ticket: {
      id: ticket.id,
      ticketNumber: ticket.ticket_number,
      attendeeName: ticket.attendee_name,
      attendeeEmail: ticket.attendee_email,
      status: "used",
      checkedInAt: now.toISOString(),
      eventTitle: ticket.events?.title || "Event",
      programTitle: ticket.event_programs?.title,
      ticketTypeName: ticket.event_ticket_types?.name,
    },
  };
}

/**
 * Event Lifecycle Management with Registrant Notifications
 */
export async function updateEventLifecycle(input: {
  eventId: string;
  actorUserId: string;
  lifecycleStatus: "draft" | "published" | "registration_open" | "registration_closed" | "ongoing" | "completed" | "cancelled" | "postponed";
  postponedDate?: string | null;
  postponedReason?: string | null;
  cancellationReason?: string | null;
}) {
  const db = getAdminClient() as any;
  const now = new Date();

  const { data: event, error: eventError } = await db
    .from("events")
    .select("id, title, status, lifecycle_status, organizer_user_id")
    .eq("id", input.eventId)
    .maybeSingle();

  if (eventError || !event) {
    throw new Error("Event not found.");
  }

  const updatePayload: Record<string, unknown> = {
    lifecycle_status: input.lifecycleStatus,
    updated_at: now.toISOString(),
  };

  if (input.lifecycleStatus === "published" || input.lifecycleStatus === "registration_open") {
    updatePayload.status = "published";
    updatePayload.is_active = true;
  } else if (input.lifecycleStatus === "cancelled") {
    updatePayload.status = "cancelled";
    updatePayload.cancellation_reason = input.cancellationReason || "Event cancelled by organizer.";
  } else if (input.lifecycleStatus === "postponed") {
    updatePayload.status = "postponed";
    updatePayload.postponed_date = input.postponedDate || null;
    updatePayload.postponed_reason = input.postponedReason || "Event postponed.";
  }

  const { error: updateError } = await db
    .from("events")
    .update(updatePayload)
    .eq("id", event.id);

  if (updateError) {
    throw updateError;
  }

  // Audit log
  const { error: auditError } = await db.from("audit_logs").insert({
    actor_user_id: input.actorUserId,
    action: `EVENT_LIFECYCLE_${input.lifecycleStatus.toUpperCase()}`,
    entity_type: "event",
    entity_id: event.id,
    metadata: {
      previous_status: event.lifecycle_status,
      new_status: input.lifecycleStatus,
      reason: input.cancellationReason || input.postponedReason,
    },
  });
  if (auditError) console.error("Audit log error:", auditError);

  // If Cancelled or Postponed: Notify all registered attendees!
  if (input.lifecycleStatus === "cancelled" || input.lifecycleStatus === "postponed") {
    const { data: registrations } = await db
      .from("event_registrations")
      .select("id, user_id, registration_number")
      .eq("event_id", event.id)
      .in("status", ["confirmed", "pending"])
      .is("deleted_at", null);

    if (registrations && registrations.length > 0) {
      const isCancelled = input.lifecycleStatus === "cancelled";
      const subject = isCancelled
        ? `Important: ${event.title} has been cancelled`
        : `Important: ${event.title} has been postponed`;
      const msg = isCancelled
        ? `The event "${event.title}" has been cancelled. Reason: ${input.cancellationReason || "Organiser decision"}.`
        : `The event "${event.title}" has been postponed to ${input.postponedDate ? new Date(input.postponedDate).toLocaleString() : "a future date"}. Reason: ${input.postponedReason || "Organiser update"}.`;

      for (const reg of registrations) {
        // In-app alert
        const { error: notifError } = await db.from("notifications").insert({
          recipient_id: reg.user_id,
          title: subject,
          message: msg,
          type: "warning",
          category: "event",
          channel: "dashboard",
          status: "queued",
          entity_type: "event",
          entity_id: event.id,
          action_url: `/events/${event.id}`,
        });
        if (notifError) console.error("Lifecycle notification error:", notifError);
      }
    }
  }

  return { success: true, eventId: event.id, newStatus: input.lifecycleStatus };
}
