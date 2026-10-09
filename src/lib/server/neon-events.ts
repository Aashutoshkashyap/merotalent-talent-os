/**
 * Neon staging Events repository and service.
 * Enforces active profiles, verified identity links, capacity boundaries, and atomic ticket registrations.
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

export interface PublicEventRow extends QueryResultRow {
  id: string;
  organizer_user_id: string | null;
  organizer_type: string | null;
  organizer_id: string | null;
  title: string;
  slug: string | null;
  description: string | null;
  event_type: string | null;
  format: string | null;
  location: string | null;
  meeting_url: string | null;
  cover_image_url: string | null;
  start_date: Date;
  end_date: Date | null;
  registration_deadline: Date | null;
  capacity: number | null;
  ticket_price: number | null;
  currency: string | null;
  status: string | null;
  approval_status: string | null;
  is_active: boolean;
  is_featured: boolean;
  created_at: Date;
}

export interface EventRegistrationRow extends QueryResultRow {
  id: string;
  event_id: string;
  user_id: string;
  status: string;
  payment_status: string;
  ticket_quantity: number;
  total_amount: number;
  payment_id: string | null;
  form_data: unknown;
  registered_at: Date;
}

export interface EventRegistrationInput {
  eventId: string;
  ticketQuantity?: number;
  participants?: Array<{
    fullName: string;
    email?: string;
    phone?: string;
    college?: string;
  }>;
  customResponses?: Record<string, unknown>;
}

export class NeonEventsRepository {
  constructor(private readonly db: NeonQueryExecutor = neonQueryExecutor) {}

  async listPublicEvents(params: {
    search?: string;
    format?: string;
    eventType?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<PublicEventRow[]> {
    const limit = Math.min(100, Math.max(1, params.limit ?? 50));
    const offset = Math.max(0, params.offset ?? 0);
    const searchFilter = params.search?.trim() ? `%${params.search.trim().toLowerCase()}%` : null;
    const formatFilter = params.format?.trim() || null;
    const typeFilter = params.eventType?.trim() || null;

    return this.db.query<PublicEventRow>(`
      SELECT id, organizer_user_id, organizer_type, organizer_id, title, slug,
             description, event_type, format, location, meeting_url, cover_image_url,
             start_date, end_date, registration_deadline, capacity, ticket_price::float AS ticket_price,
             currency, status, approval_status, is_active, is_featured, created_at
      FROM public.events
      WHERE is_active = true AND status IN ('approved', 'published')
        AND approval_status = 'approved' AND deleted_at IS NULL
        AND ($1::text IS NULL OR lower(title) LIKE $1 OR lower(description) LIKE $1)
        AND ($2::text IS NULL OR format = $2)
        AND ($3::text IS NULL OR event_type = $3)
      ORDER BY is_featured DESC, start_date ASC
      LIMIT $4 OFFSET $5`, [searchFilter, formatFilter, typeFilter, limit, offset]);
  }

  async getPublicEvent(id: string): Promise<PublicEventRow | null> {
    const rows = await this.db.query<PublicEventRow>(`
      SELECT id, organizer_user_id, organizer_type, organizer_id, title, slug,
             description, event_type, format, location, meeting_url, cover_image_url,
             start_date, end_date, registration_deadline, capacity, ticket_price::float AS ticket_price,
             currency, status, approval_status, is_active, is_featured, created_at
      FROM public.events
      WHERE id = $1::uuid AND is_active = true AND status IN ('approved', 'published')
        AND approval_status = 'approved' AND deleted_at IS NULL
      LIMIT 1`, [id]);
    return rows[0] ?? null;
  }

  async registerForEvent(
    actor: NeonActor,
    input: EventRegistrationInput,
    transactionClient?: Pick<PoolClient, "query">,
  ): Promise<EventRegistrationRow> {
    const runWith = async (client: Pick<PoolClient, "query">) => {
      // 1. Fetch event with row lock
      const eventRows = await client.query<{
        id: string;
        title: string;
        ticket_price: number | null;
        currency: string | null;
        capacity: number | null;
        registration_deadline: Date | null;
        is_active: boolean;
        approval_status: string;
        status: string;
      }>(`
        SELECT id, title, ticket_price::float AS ticket_price, currency, capacity,
               registration_deadline, is_active, approval_status, status
        FROM public.events
        WHERE id = $1::uuid AND deleted_at IS NULL FOR UPDATE`, [input.eventId]);

      const event = eventRows.rows[0];
      if (!event || !event.is_active || event.approval_status !== "approved") {
        throw new NeonAuthorizationError(403, "EVENT_UNAVAILABLE", "This event is not open for registration.");
      }

      if (event.registration_deadline && new Date(event.registration_deadline).getTime() < Date.now()) {
        throw new NeonAuthorizationError(403, "REGISTRATION_CLOSED", "Registration for this event is closed.");
      }

      const ticketQty = Math.max(1, input.ticketQuantity ?? 1);

      // Check capacity
      if (event.capacity && event.capacity > 0) {
        const soldRows = await client.query<{ count: number }>(`
          SELECT COALESCE(SUM(ticket_quantity), 0)::int AS count
          FROM public.event_registrations
          WHERE event_id = $1::uuid AND status NOT IN ('cancelled', 'refunded')
            AND deleted_at IS NULL`, [input.eventId]);
        const currentSold = soldRows.rows[0]?.count ?? 0;
        if (currentSold + ticketQty > event.capacity) {
          throw new NeonAuthorizationError(403, "CAPACITY_EXCEEDED", "Not enough remaining tickets for this event.");
        }
      }

      // Check existing user registration
      const existing = await client.query<{ id: string }>(`
        SELECT id FROM public.event_registrations
        WHERE event_id = $1::uuid AND user_id = $2::uuid AND status NOT IN ('cancelled', 'refunded')
          AND deleted_at IS NULL LIMIT 1`, [input.eventId, actor.userId]);

      if (existing.rows.length > 0) {
        throw new NeonAuthorizationError(403, "ALREADY_REGISTERED", "You have already registered for this event.");
      }

      const unitPrice = event.ticket_price ?? 0;
      const totalAmount = unitPrice * ticketQty;
      const isFree = totalAmount === 0;
      const status = isFree ? "confirmed" : "pending";
      const paymentStatus = isFree ? "not_required" : "pending";

      const formData = {
        participants: input.participants ?? [],
        customResponses: input.customResponses ?? {},
        registeredAt: new Date().toISOString(),
      };

      const regInsert = await client.query<EventRegistrationRow>(`
        INSERT INTO public.event_registrations (
          event_id, user_id, status, payment_status, ticket_quantity,
          total_amount, form_data, registered_at
        ) VALUES (
          $1::uuid, $2::uuid, $3, $4, $5,
          $6, $7::jsonb, now()
        ) RETURNING id, event_id, user_id, status, payment_status, ticket_quantity,
                    total_amount::float AS total_amount, payment_id, form_data, registered_at`, [
        event.id,
        actor.userId,
        status,
        paymentStatus,
        ticketQty,
        totalAmount,
        JSON.stringify(formData),
      ]);

      const registration = regInsert.rows[0];

      // Create notification & durable event
      const notif = await client.query<{ id: string }>(`
        INSERT INTO public.notifications (recipient_id, title, message, type, is_read)
        VALUES ($1::uuid, $2, $3, 'event_registration', false)
        RETURNING id`, [
        actor.userId,
        `Event Registration: ${event.title}`,
        isFree
          ? `Your registration for "${event.title}" is confirmed.`
          : `Your registration for "${event.title}" is pending payment.`,
      ]);

      await appendNotificationEvent(client, actor.userId, notif.rows[0].id);

      return registration;
    };

    if (transactionClient) return runWith(transactionClient);
    return withTransaction(runWith);
  }

  async listOwnTickets(actor: NeonActor): Promise<Array<EventRegistrationRow & { event_title: string; start_date: Date; location: string | null }>> {
    return this.db.query<EventRegistrationRow & { event_title: string; start_date: Date; location: string | null }>(`
      SELECT r.id, r.event_id, r.user_id, r.status, r.payment_status, r.ticket_quantity,
             r.total_amount::float AS total_amount, r.payment_id, r.form_data, r.registered_at,
             e.title AS event_title, e.start_date, e.location
      FROM public.event_registrations r
      JOIN public.events e ON e.id = r.event_id
      WHERE r.user_id = $1::uuid AND r.deleted_at IS NULL
      ORDER BY r.registered_at DESC
      LIMIT 100`, [actor.userId]);
  }
}
