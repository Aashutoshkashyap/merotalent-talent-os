/**
 * Neon staging Mentors repository and service.
 * Enforces active profiles, verified identity links, privacy boundaries, and atomic booking transactions.
 */
import type { PoolClient, QueryResultRow } from "pg";
import { queryRows, withTransaction } from "./db";
import {
  NeonAuthorizationError,
  neonQueryExecutor,
  type NeonActor,
  type NeonQueryExecutor,
} from "./neon-authorization";
import { appendNotificationEvent } from "./neon-application-events";

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
  scheduledStart: string; // ISO date string
  scheduledEnd: string;   // ISO date string
  topic: string;
  notes?: string;
  amount?: number;
  currency?: string;
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
      ORDER BY m.is_featured DESC, m.rating DESC, m.total_sessions DESC
      LIMIT $2 OFFSET $3`, [searchFilter, limit, offset]);
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
        hourly_rate: number;
        is_available: boolean;
        approval_status: string;
      }>(`
        SELECT m.id, m.user_id, m.headline, m.hourly_rate::float AS hourly_rate,
               m.is_available, m.approval_status
        FROM public.mentors m
        WHERE m.id = $1::uuid AND m.deleted_at IS NULL FOR UPDATE`, [input.mentorId]);

      const mentor = mentorRows.rows[0];
      if (!mentor || !mentor.is_available || mentor.approval_status !== "approved") {
        throw new NeonAuthorizationError(403, "MENTOR_UNAVAILABLE", "This mentor is not currently accepting bookings.");
      }

      if (mentor.user_id === actor.userId) {
        throw new NeonAuthorizationError(403, "CANNOT_BOOK_SELF", "You cannot book a mentorship session with yourself.");
      }

      const start = new Date(input.scheduledStart);
      const end = new Date(input.scheduledEnd);
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || start.getTime() >= end.getTime() || start.getTime() < Date.now()) {
        throw new NeonAuthorizationError(400, "INVALID_SCHEDULE", "Scheduled time window is invalid or in the past.");
      }

      const amount = input.amount ?? mentor.hourly_rate ?? 0;
      const currency = input.currency ?? "NPR";
      const initialStatus = amount === 0 ? "confirmed" : "pending";
      const paymentStatus = amount === 0 ? "not_required" : "pending";

      const formData = {
        topic: input.topic.trim(),
        notes: input.notes?.trim() ?? null,
        bookedAt: new Date().toISOString(),
      };

      // 2. Insert booking
      const bookingInsert = await client.query<MentorBookingRow>(`
        INSERT INTO public.mentor_bookings (
          mentor_id, student_id, scheduled_start, scheduled_end,
          status, payment_status, amount, currency, notes, form_data
        ) VALUES (
          $1::uuid, $2::uuid, $3::timestamptz, $4::timestamptz,
          $5, $6, $7, $8, $9, $10::jsonb
        ) RETURNING id, mentor_id, student_id, scheduled_start, scheduled_end,
                    status, payment_status, amount::float AS amount, currency,
                    notes, form_data, created_at`, [
        mentor.id,
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
}
