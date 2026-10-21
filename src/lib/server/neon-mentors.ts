/**
 * Neon staging Mentors repository and service.
 * Enforces active profiles, verified identity links, privacy boundaries, and atomic booking transactions.
 */
import type { PoolClient, QueryResultRow } from "pg";
import { queryRows, withTransaction } from "./db";
import {
  NeonAuthorizationError,
  neonQueryExecutor,
  requireEntityAccess,
  type NeonActor,
  type NeonQueryExecutor,
} from "./neon-authorization";
import { appendNotificationEvent } from "./neon-application-events";
import { assertRoleWorkspaceIdentity, requireRoleWorkspaceAccess } from "./neon-role-workspaces";
import {requireNeonPaidInitiation} from './neon-paid-initiation';

export interface PublicMentorRow extends QueryResultRow {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  headline: string | null;
  description: string | null;
  expertise: string[];
  hourly_rate: number;
  rating: number;
  total_sessions: number;
  is_available: boolean;
  availability: unknown;
  timezone: string | null;
  is_featured: boolean;
}

export interface MentorBookingRow extends QueryResultRow {
  id: string;
  mentor_id: string;
  student_id: string;
  scheduled_start: Date;
  scheduled_end: Date;
  status: string;
  payment_status: string;
  amount: number;
  currency: string;
  notes: string | null;
  form_data: unknown;
  created_at: Date;
}

export interface BookSessionInput {
  mentorId: string;
  mentorServiceId: string;
  scheduledStart: string; // ISO date string
  scheduledEnd: string;   // ISO date string
  topic: string;
  notes?: string;
}

export class NeonMentorsRepository {
  constructor(private readonly db: NeonQueryExecutor = neonQueryExecutor) {}

  async listPublicMentors(params: {
    search?: string;
    expertise?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<PublicMentorRow[]> {
    const limit = Math.min(100, Math.max(1, params.limit ?? 50));
    const offset = Math.max(0, params.offset ?? 0);
    const searchFilter = params.search?.trim() ? `%${params.search.trim().toLowerCase()}%` : null;
    const expertiseFilter = params.expertise?.trim() ? params.expertise.trim().toLowerCase() : null;

    return this.db.query<PublicMentorRow>(`
      SELECT m.id, m.user_id, p.full_name, p.avatar_url, m.headline, m.description,
             COALESCE(m.expertise, ARRAY[]::text[]) AS expertise,
             m.hourly_rate::float AS hourly_rate, m.rating::float AS rating,
             m.total_sessions, m.is_available, m.availability, m.timezone, m.is_featured
      FROM public.mentors m
      JOIN public.profiles p ON p.user_id = m.user_id
      WHERE m.approval_status = 'approved' AND m.deleted_at IS NULL
        AND p.account_status = 'active' AND p.deleted_at IS NULL
        AND ($1::text IS NULL OR lower(p.full_name) LIKE $1 OR lower(m.headline) LIKE $1 OR lower(m.description) LIKE $1)
        AND ($2::text IS NULL OR EXISTS (
          SELECT 1 FROM unnest(COALESCE(m.expertise, ARRAY[]::text[])) AS expertise_topic(value)
          WHERE lower(expertise_topic.value) = $2
        ))
      ORDER BY m.is_featured DESC, m.rating DESC, m.total_sessions DESC
      LIMIT $3 OFFSET $4`, [searchFilter, expertiseFilter, limit, offset]);
  }

  async getPublicMentor(id: string): Promise<PublicMentorRow | null> {
    const rows = await this.db.query<PublicMentorRow>(`
      SELECT m.id, m.user_id, p.full_name, p.avatar_url, m.headline, m.description,
             COALESCE(m.expertise, ARRAY[]::text[]) AS expertise,
             m.hourly_rate::float AS hourly_rate, m.rating::float AS rating,
             m.total_sessions, m.is_available, m.availability, m.timezone, m.is_featured
      FROM public.mentors m
      JOIN public.profiles p ON p.user_id = m.user_id
      WHERE m.id = $1::uuid AND m.approval_status = 'approved' AND m.deleted_at IS NULL
        AND p.account_status = 'active' AND p.deleted_at IS NULL
      LIMIT 1`, [id]);
    return rows[0] ?? null;
  }

  async getMentorServices(mentorId: string): Promise<Array<{
    id: string;
    mentor_id: string;
    title: string;
    description: string | null;
    session_type: string;
    duration_minutes: number;
    capacity: number;
    price: number;
    currency: string;
  }>> {
    return this.db.query(`
      SELECT id, mentor_id, title, description, session_type, duration_minutes,
             capacity, price::float AS price, currency
      FROM public.mentor_services
      WHERE mentor_id = $1::uuid AND is_active = true AND deleted_at IS NULL
      ORDER BY price ASC`, [mentorId]);
  }

  async bookMentorSession(
    actor: NeonActor,
    input: BookSessionInput,
    transactionClient?: Pick<PoolClient, "query">,
  ): Promise<MentorBookingRow> {
    const runWith = async (client: Pick<PoolClient, "query">) => {
      // 1. Fetch mentor and verify status
      const mentorRows = await client.query<{
        id: string;
        user_id: string;
        headline: string | null;
        is_available: boolean;
        approval_status: string;
        availability: { days?: string[]; startTime?: string; endTime?: string; timezone?: string } | null;
      }>(`
        SELECT m.id, m.user_id, m.headline,
               m.is_available, m.approval_status, m.availability
        FROM public.mentors m
        WHERE m.id = $1::uuid AND m.deleted_at IS NULL FOR UPDATE`, [input.mentorId]);

      const mentor = mentorRows.rows[0];
      if (!mentor || !mentor.is_available || mentor.approval_status !== "approved") {
        throw new NeonAuthorizationError(403, "MENTOR_UNAVAILABLE", "This mentor is not currently accepting bookings.");
      }

      if (mentor.user_id === actor.userId) {
        throw new NeonAuthorizationError(403, "CANNOT_BOOK_SELF", "You cannot book a mentorship session with yourself.");
      }

      const linked = await client.query<{ ready: boolean }>(`
        SELECT EXISTS (SELECT 1 FROM public.profiles p
          JOIN public.neon_application_accounts a ON a.legacy_user_id=p.user_id AND a.status='active'
          JOIN public.neon_identity_links l ON l.application_account_id=a.id
            AND l.neon_auth_user_id=$2::uuid AND l.status='verified'
          WHERE p.user_id=$1::uuid AND p.account_status='active' AND p.deleted_at IS NULL
            AND length(trim(coalesce(p.full_name,'')))>=2
            AND length(trim(coalesce(p.phone,'')))>=5) AS ready`,
        [actor.userId, actor.neonAuthUserId]);
      if (!linked.rows[0]?.ready) throw new NeonAuthorizationError(403, "PROFILE_REQUIRED", "Complete your profile before booking.");

      const services = await client.query<{
        id: string; duration_minutes: number; price: number; currency: string; session_type: string; capacity: number; title: string;
      }>(`SELECT id,duration_minutes,price::float AS price,currency,session_type,capacity,title
          FROM public.mentor_services WHERE id=$1::uuid AND mentor_id=$2::uuid
            AND is_active=true AND deleted_at IS NULL LIMIT 1`, [input.mentorServiceId, mentor.id]);
      const service = services.rows[0];
      if (!service) throw new NeonAuthorizationError(404, "SERVICE_NOT_FOUND", "This mentor service is unavailable.");

      const start = new Date(input.scheduledStart);
      const end = new Date(input.scheduledEnd);
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || start.getTime() >= end.getTime() || start.getTime() < Date.now()) {
        throw new NeonAuthorizationError(400, "INVALID_SCHEDULE", "Scheduled time window is invalid or in the past.");
      }

      if (end.getTime() - start.getTime() !== service.duration_minutes * 60_000) {
        throw new NeonAuthorizationError(400, "INVALID_DURATION", "Choose the published session duration.");
      }
      const availability = mentor.availability;
      if (availability && (availability.days?.length || availability.startTime || availability.endTime)) {
        let parts: Intl.DateTimeFormatPart[], endParts: Intl.DateTimeFormatPart[];
        try {
          const clock = new Intl.DateTimeFormat("en-US", { timeZone: availability.timezone || "Asia/Kathmandu",
            weekday: "long", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
          parts = clock.formatToParts(start);
          endParts = clock.formatToParts(end);
        } catch { throw new NeonAuthorizationError(400, "INVALID_AVAILABILITY", "Mentor availability is misconfigured."); }
        const value = (items: Intl.DateTimeFormatPart[], type: string) => items.find((part) => part.type === type)?.value ?? "";
        const startLocal = `${value(parts, "hour")}:${value(parts, "minute")}`;
        const endLocal = `${value(endParts, "hour")}:${value(endParts, "minute")}`;
        if ((availability.days?.length && !availability.days.includes(value(parts, "weekday"))) ||
            (availability.startTime && startLocal < availability.startTime) ||
            (availability.endTime && endLocal > availability.endTime) ||
            value(parts, "weekday") !== value(endParts, "weekday")) {
          throw new NeonAuthorizationError(403, "OUTSIDE_AVAILABILITY", "Choose a published mentor availability window.");
        }
      }

      // Locking the mentor serializes competing bookings for this mentor. Group capacity is
      // not offered here yet; reserving the whole interval avoids overselling a shared slot.
      const conflict = await client.query<{ id: string }>(`
        SELECT id FROM public.mentor_bookings
        WHERE mentor_id=$1::uuid AND deleted_at IS NULL
          AND status NOT IN ('cancelled','declined','no_show')
          AND scheduled_start<$3::timestamptz AND scheduled_end>$2::timestamptz
        LIMIT 1`, [mentor.id, input.scheduledStart, input.scheduledEnd]);
      if (conflict.rows.length) throw new NeonAuthorizationError(403, "SLOT_TAKEN", "This time is already booked.");

      const amount = service.price;
      if(amount>0)requireNeonPaidInitiation();
      const currency = service.currency;
      const initialStatus = amount === 0 ? "confirmed" : "pending";
      const paymentStatus = amount === 0 ? "not_required" : "pending";

      const formData = {
        topic: input.topic.trim(),
        serviceTitle: service.title,
        notes: input.notes?.trim() ?? null,
        bookedAt: new Date().toISOString(),
      };

      // 2. Insert booking
      const bookingInsert = await client.query<MentorBookingRow>(`
        INSERT INTO public.mentor_bookings (
          mentor_id, mentor_service_id, student_id, scheduled_start, scheduled_end,
          status, payment_status, amount, currency, notes, form_data
        ) VALUES (
          $1::uuid, $2::uuid, $3::uuid, $4::timestamptz, $5::timestamptz,
          $6, $7, $8, $9, $10, $11::jsonb
        ) RETURNING id, mentor_id, student_id, scheduled_start, scheduled_end,
                    status, payment_status, amount::float AS amount, currency,
                    notes, form_data, created_at`, [
        mentor.id,
        service.id,
        actor.userId,
        input.scheduledStart,
        input.scheduledEnd,
        initialStatus,
        paymentStatus,
        amount,
        currency,
        input.notes?.trim().slice(0, 2000) ?? null,
        JSON.stringify(formData),
      ]);

      const booking = bookingInsert.rows[0];

      // 3. Ensure conversation row exists between mentor and mentee
      await client.query(`
        INSERT INTO public.conversations (mentor_id, mentee_id, is_active)
        VALUES ($1::uuid, $2::uuid, true)
        ON CONFLICT DO NOTHING`, [mentor.id, actor.userId]);

      // 4. Create notifications and durable events for both parties
      const menteeNotif = await client.query<{ id: string }>(`
        INSERT INTO public.notifications (recipient_id, title, message, type, is_read)
        VALUES ($1::uuid, $2, $3, 'mentor_booking', false)
        RETURNING id`, [
        actor.userId,
        `Session Booked with Mentor`,
        `Your mentorship session for "${input.topic}" is scheduled for ${start.toLocaleString()}.`,
      ]);
      await appendNotificationEvent(client, actor.userId, menteeNotif.rows[0].id);

      const mentorNotif = await client.query<{ id: string }>(`
        INSERT INTO public.notifications (recipient_id, title, message, type, is_read)
        VALUES ($1::uuid, $2, $3, 'mentor_booking', false)
        RETURNING id`, [
        mentor.user_id,
        `New Mentorship Booking Request`,
        `You have a new booking request for "${input.topic}" on ${start.toLocaleString()}.`,
      ]);
      await appendNotificationEvent(client, mentor.user_id, mentorNotif.rows[0].id);

      return booking;
    };

    if (transactionClient) return runWith(transactionClient);
    return withTransaction(runWith);
  }

  async listOwnBookings(actor: NeonActor): Promise<MentorBookingRow[]> {
    return this.db.query<MentorBookingRow>(`
      SELECT b.id, b.mentor_id, b.student_id, b.scheduled_start, b.scheduled_end,
             b.status, b.payment_status, b.amount::float AS amount, b.currency,
             b.notes, b.form_data, b.created_at
      FROM public.mentor_bookings b
      LEFT JOIN public.mentors m ON m.id = b.mentor_id
      WHERE (b.student_id = $1::uuid OR m.user_id = $1::uuid)
        AND b.deleted_at IS NULL
      ORDER BY b.scheduled_start DESC
      LIMIT 100`, [actor.userId]);
  }

  async listOwnBookingsDetailed(actor: NeonActor, mode: "student" | "mentor"): Promise<Array<Record<string, unknown>>> {
    if (mode === "mentor") {
      const mentors = await this.db.query<{ id: string }>(`
        SELECT DISTINCT m.id FROM public.mentors m
        LEFT JOIN public.entity_admin_assignments ea ON ea.entity_type='mentor'
          AND ea.entity_id=m.id AND ea.user_id=$1::uuid AND ea.status='active'
        WHERE m.deleted_at IS NULL AND (m.user_id=$1::uuid OR ea.id IS NOT NULL OR $2::boolean)
        LIMIT 100`,
        [actor.userId, actor.platformAdmin]);
      const permitted: string[] = [];
      for (const mentor of mentors) {
        for (const feature of ["mentor_bookings", "booking_management", "bookings", "lead_viewing"]) {
          try {
            await requireEntityAccess(actor, "mentor", "mentor", mentor.id, feature, this.db);
            permitted.push(mentor.id); break;
          } catch (error) {
            if (!(error instanceof NeonAuthorizationError && error.status === 403)) throw error;
          }
        }
      }
      if (permitted.length === 0) return [];
      return this.db.query<Record<string, unknown>>(`
        SELECT b.id, b.student_id, b.mentor_service_id, b.scheduled_start, b.scheduled_end,
               b.status, b.payment_status, b.amount::float AS amount, b.currency,
               b.notes, b.form_data, b.created_at
        FROM public.mentor_bookings b
        WHERE b.mentor_id = ANY($1::uuid[]) AND b.deleted_at IS NULL
        ORDER BY b.scheduled_start DESC
        LIMIT 100`, [permitted]);
    }

    // Student mode — join with mentor profile data
    const bookings = await this.db.query<Record<string, unknown>>(`
      SELECT b.id, b.mentor_id, b.mentor_service_id, b.scheduled_start, b.scheduled_end,
             b.status, b.payment_status, b.amount::float AS amount, b.currency,
             b.notes, b.form_data, b.created_at,
             m.user_id AS mentor_user_id, m.headline AS mentor_headline,
             p.full_name AS mentor_name, p.avatar_url AS mentor_avatar
      FROM public.mentor_bookings b
      LEFT JOIN public.mentors m ON m.id = b.mentor_id
      LEFT JOIN public.profiles p ON p.user_id = m.user_id
      WHERE b.student_id = $1::uuid AND b.deleted_at IS NULL
      ORDER BY b.scheduled_start DESC
      LIMIT 100`, [actor.userId]);

    return bookings.map((b: Record<string, unknown>) => ({
      id: b.id,
      mentorId: b.mentor_id,
      mentorName: b.mentor_name || b.mentor_headline || "Mentor",
      mentorAvatar: b.mentor_avatar || null,
      scheduledStart: b.scheduled_start,
      scheduledEnd: b.scheduled_end,
      status: b.status,
      paymentStatus: b.payment_status,
      amount: Number(b.amount || 0),
      currency: b.currency,
      notes: b.notes,
      serviceTitle: (b.form_data as any)?.serviceTitle || "Mentorship Session",
      topic: (b.form_data as any)?.topic || "Career & Academic Guidance",
      createdAt: b.created_at,
    }));
  }

  async rescheduleBooking(
    actor: NeonActor,
    bookingId: string,
    newStart: string,
    newEnd: string,
    reason?: string,
    transactionClient?: Pick<PoolClient, "query">,
  ): Promise<Record<string, unknown>> {
    const start = new Date(newStart), end = new Date(newEnd);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start.getTime() <= Date.now() || end <= start) {
      throw new NeonAuthorizationError(400, "INVALID_SCHEDULE", "Choose a future session time.");
    }
    const run = async (client: Pick<PoolClient, "query">) => {
      await assertRoleWorkspaceIdentity(client, actor);
      const [booking] = (await client.query<{ id: string; mentor_id: string; student_id: string;
        mentor_user_id: string; status: string; payment_status: string; duration_minutes: number }>(`
        SELECT b.id,b.mentor_id,b.student_id,m.user_id AS mentor_user_id,b.status,b.payment_status,
          s.duration_minutes FROM public.mentor_bookings b
        JOIN public.mentors m ON m.id=b.mentor_id
        JOIN public.mentor_services s ON s.id=b.mentor_service_id
        WHERE b.id=$1::uuid AND b.deleted_at IS NULL LIMIT 1 FOR UPDATE OF b`, [bookingId])).rows;
      if (!booking) throw new NeonAuthorizationError(404, "BOOKING_NOT_FOUND", "Booking not found.");
      if (booking.student_id !== actor.userId || actor.platformAdmin) {
        await requireRoleWorkspaceAccess(client, actor, "mentor", "mentor", booking.mentor_id, "booking_management");
      }
      if (!["pending", "confirmed"].includes(booking.status) ||
          !["pending", "not_required"].includes(booking.payment_status)) {
        throw new NeonAuthorizationError(403, "RESCHEDULE_UNAVAILABLE", "This booking cannot be rescheduled here.");
      }
      if (end.getTime() - start.getTime() !== booking.duration_minutes * 60_000) {
        throw new NeonAuthorizationError(400, "INVALID_DURATION", "Keep the published service duration.");
      }
      await client.query(`SELECT id FROM public.mentors WHERE id=$1::uuid FOR UPDATE`, [booking.mentor_id]);
      const conflict = await client.query(`SELECT id FROM public.mentor_bookings
        WHERE mentor_id=$1::uuid AND id<>$2::uuid AND deleted_at IS NULL
          AND status NOT IN ('cancelled','declined','no_show')
          AND scheduled_start<$4::timestamptz AND scheduled_end>$3::timestamptz LIMIT 1`,
      [booking.mentor_id, booking.id, newStart, newEnd]);
      if (conflict.rows.length) throw new NeonAuthorizationError(403, "SLOT_TAKEN", "This time is already booked.");
      const updated = await client.query<Record<string, unknown>>(`UPDATE public.mentor_bookings
        SET scheduled_start=$2::timestamptz,scheduled_end=$3::timestamptz,
          notes=COALESCE($4,notes),updated_at=now()
        WHERE id=$1::uuid AND status IN ('pending','confirmed') AND deleted_at IS NULL
        RETURNING id,mentor_id,student_id,scheduled_start,scheduled_end,status,updated_at`,
      [bookingId, newStart, newEnd, reason ?? null]);
      await this.appendBookingChange(client, actor, bookingId, booking.student_id, "rescheduled");
      return updated.rows[0];
    };
    return transactionClient ? run(transactionClient) : withTransaction(run);
  }

  async cancelBooking(
    actor: NeonActor,
    bookingId: string,
    reason?: string,
    transactionClient?: Pick<PoolClient, "query">,
  ): Promise<Record<string, unknown>> {
    const run = async (client: Pick<PoolClient, "query">) => {
    await assertRoleWorkspaceIdentity(client, actor);
    const bookings = await client.query<{ id: string; student_id: string; mentor_user_id: string; mentor_id: string; status: string; payment_status: string }>(`
      SELECT b.id, b.student_id, m.user_id AS mentor_user_id,b.mentor_id,b.status,b.payment_status
      FROM public.mentor_bookings b
      LEFT JOIN public.mentors m ON m.id = b.mentor_id
      WHERE b.id = $1::uuid AND b.deleted_at IS NULL LIMIT 1 FOR UPDATE OF b`, [bookingId]);

    const booking = bookings.rows[0];
    if (!booking) throw new NeonAuthorizationError(404, "BOOKING_NOT_FOUND", "Booking not found.");
    if (booking.student_id !== actor.userId || actor.platformAdmin) {
      await requireRoleWorkspaceAccess(client, actor, "mentor", "mentor", booking.mentor_id, "booking_management");
    }
    if (booking.payment_status === "success") throw new NeonAuthorizationError(403, "REFUND_REQUIRED", "Paid bookings need a verified refund workflow.");

    const updated = await client.query<Record<string, unknown>>(`
      UPDATE public.mentor_bookings
      SET status = 'cancelled', notes = COALESCE($2, notes), updated_at = now()
      WHERE id = $1::uuid AND deleted_at IS NULL AND status IN ('pending','confirmed') AND payment_status IN ('pending','not_required')
      RETURNING id, status, updated_at`, [bookingId, reason ?? null]);

    if (!updated.rows[0]) throw new NeonAuthorizationError(403, "INVALID_TRANSITION", "This booking cannot be cancelled.");
    await this.appendBookingChange(client, actor, bookingId, booking.student_id, "cancelled");
    return updated.rows[0];
    };
    return transactionClient ? run(transactionClient) : withTransaction(run);
  }

  async completeBooking(
    actor: NeonActor,
    bookingId: string,
    transactionClient?: Pick<PoolClient, "query">,
  ): Promise<Record<string, unknown>> {
    const run = async (client: Pick<PoolClient, "query">) => {
    await assertRoleWorkspaceIdentity(client, actor);
    const booking = (await client.query<{ mentor_id: string; student_id: string }>(`SELECT mentor_id,student_id
      FROM public.mentor_bookings WHERE id=$1::uuid AND deleted_at IS NULL FOR UPDATE`, [bookingId])).rows[0];
    if (!booking) throw new NeonAuthorizationError(404, "BOOKING_NOT_FOUND", "Booking not found.");
    await requireRoleWorkspaceAccess(client, actor, "mentor", "mentor", booking.mentor_id, "booking_management");
    const updated = await client.query<Record<string, unknown>>(`
      UPDATE public.mentor_bookings
      SET status = 'completed', updated_at = now()
      WHERE id = $1::uuid AND deleted_at IS NULL AND status='confirmed'
        AND scheduled_end<=now() AND payment_status IN ('success','not_required')
      RETURNING id, status, updated_at`, [bookingId]);

    if (updated.rows.length === 0) throw new NeonAuthorizationError(409, "INVALID_TRANSITION", "A paid or free confirmed session must have ended before completion.");
    await this.appendBookingChange(client, actor, bookingId, booking.student_id, "completed");
    return updated.rows[0];
    };
    return transactionClient ? run(transactionClient) : withTransaction(run);
  }

  private async appendBookingChange(client: Pick<PoolClient, "query">, actor: NeonActor, bookingId: string, recipient: string, action: string) {
    const notification = (await client.query<{ id: string }>(`INSERT INTO public.notifications
      (recipient_id,title,message,type,category,channel,status,entity_type,entity_id,action_url)
      VALUES($1::uuid,'Mentorship session updated',$2,'info','mentor_booking','dashboard','queued','mentor_booking',$3::uuid,'/dashboard/mentorship') RETURNING id`,
    [recipient, `Your mentorship session has been ${action}.`, bookingId])).rows[0];
    await appendNotificationEvent(client, recipient, notification.id);
    await client.query(`INSERT INTO public.audit_logs(actor_user_id,action,entity_type,entity_id,metadata)
      VALUES($1::uuid,'mentor_booking_changed','mentor_bookings',$2::text,jsonb_build_object('action',$3::text))`, [actor.userId, bookingId, action]);
  }

  async submitReview(
    actor: NeonActor,
    bookingId: string,
    rating: number,
    feedback?: string,
  ): Promise<Record<string, unknown>> {
    // Verify the booking belongs to this user
    const bookings = await this.db.query<{ id: string; mentor_id: string; student_id: string; status: string }>(`
      SELECT id, mentor_id, student_id, status FROM public.mentor_bookings
      WHERE id = $1::uuid AND deleted_at IS NULL LIMIT 1`, [bookingId]);

    const booking = bookings[0];
    if (!booking) throw new NeonAuthorizationError(404, "BOOKING_NOT_FOUND", "Booking not found.");
    if (booking.student_id !== actor.userId) {
      throw new NeonAuthorizationError(403, "FORBIDDEN", "Only the student who booked can leave a review.");
    }

    // Check if already reviewed
    const existing = await this.db.query<{ id: string }>(`
      SELECT id FROM public.mentor_reviews
      WHERE booking_id = $1::uuid AND deleted_at IS NULL LIMIT 1`, [bookingId]);
    if (existing.length > 0) {
      throw new NeonAuthorizationError(400, "ALREADY_REVIEWED", "You have already reviewed this session.");
    }

    const reviews = await this.db.query<Record<string, unknown>>(`
      INSERT INTO public.mentor_reviews (booking_id, mentor_id, student_id, rating, feedback)
      VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5)
      RETURNING id, booking_id, mentor_id, student_id, rating, feedback, created_at`,
      [bookingId, booking.mentor_id, actor.userId, rating, feedback ?? null]);

    // Update mentor aggregate rating
    await this.db.query(`
      UPDATE public.mentors
      SET rating = (
        SELECT COALESCE(AVG(rating), 0) FROM public.mentor_reviews
        WHERE mentor_id = $1::uuid AND deleted_at IS NULL
      ),
      total_sessions = total_sessions + 1,
      updated_at = now()
      WHERE id = $1::uuid`, [booking.mentor_id]);

    return reviews[0];
  }
}
