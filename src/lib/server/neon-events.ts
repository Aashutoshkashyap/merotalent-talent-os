/**
 * Neon staging Events repository and service.
 * Enforces active profiles, verified identity links, capacity boundaries, and atomic ticket registrations.
 */
import type { PoolClient, QueryResultRow } from "pg";
import {requireNeonPaidInitiation} from './neon-paid-initiation';
import { queryRows, withTransaction } from "./db";
import {
  NeonAuthorizationError,
  neonQueryExecutor,
  requireEntityAccess,
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
  ticketTypeId?: string | null;
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
        start_date: Date;
        is_active: boolean;
        approval_status: string;
        status: string;
      }>(`
        SELECT id, title, ticket_price::float AS ticket_price, currency, capacity,
               registration_deadline, start_date, is_active, approval_status, status
        FROM public.events
        WHERE id = $1::uuid AND deleted_at IS NULL FOR UPDATE`, [input.eventId]);

      const event = eventRows.rows[0];
      if (!event || !event.is_active || event.approval_status !== "approved" || !["approved", "published"].includes(event.status)) {
        throw new NeonAuthorizationError(403, "EVENT_UNAVAILABLE", "This event is not open for registration.");
      }

      if (event.registration_deadline && new Date(event.registration_deadline).getTime() < Date.now()) {
        throw new NeonAuthorizationError(403, "REGISTRATION_CLOSED", "Registration for this event is closed.");
      }
      if (new Date(event.start_date).getTime() <= Date.now()) {
        throw new NeonAuthorizationError(403, "EVENT_STARTED", "Registration is no longer available.");
      }

      const ticketQty = input.ticketQuantity ?? 1;
      if (!Number.isInteger(ticketQty) || ticketQty < 1 || ticketQty > 10) {
        throw new NeonAuthorizationError(400, "INVALID_QUANTITY", "Choose between one and ten tickets.");
      }

      const ticketRows = input.ticketTypeId ? await client.query<{
        id: string; price: number; currency: string; min_per_order: number; max_per_order: number;
        total_quantity: number | null; sales_start_at: Date | null; sales_end_at: Date | null;
      }>(`SELECT id,price::float AS price,currency,min_per_order,max_per_order,
            total_quantity,sales_start_at,sales_end_at
          FROM public.event_ticket_types
          WHERE id=$1::uuid AND event_id=$2::uuid AND is_active=true AND deleted_at IS NULL
          LIMIT 1 FOR UPDATE`, [input.ticketTypeId, event.id]) : { rows: [] };
      const tier = ticketRows.rows[0];
      if (input.ticketTypeId && !tier) throw new NeonAuthorizationError(404, "TICKET_UNAVAILABLE", "Ticket type unavailable.");
      if (!input.ticketTypeId) {
        const publishedTiers = await client.query<{ exists: boolean }>(`
          SELECT EXISTS(SELECT 1 FROM public.event_ticket_types
            WHERE event_id=$1::uuid AND is_active=true AND deleted_at IS NULL) AS exists`, [event.id]);
        if (publishedTiers.rows[0]?.exists) {
          throw new NeonAuthorizationError(400, "TICKET_REQUIRED", "Choose a published ticket type.");
        }
      }
      if (tier && (ticketQty < tier.min_per_order || ticketQty > tier.max_per_order ||
          (tier.sales_start_at && new Date(tier.sales_start_at).getTime() > Date.now()) ||
          (tier.sales_end_at && new Date(tier.sales_end_at).getTime() < Date.now()))) {
        throw new NeonAuthorizationError(403, "TICKET_UNAVAILABLE", "This ticket type is not on sale for the selected quantity.");
      }
      if (tier?.total_quantity !== null && tier?.total_quantity !== undefined) {
        const soldTier = await client.query<{ count: number }>(`
          SELECT COALESCE(SUM(ticket_quantity),0)::int AS count FROM public.event_registrations
          WHERE ticket_type_id=$1::uuid AND status NOT IN ('cancelled','refunded') AND deleted_at IS NULL`, [tier.id]);
        if ((soldTier.rows[0]?.count ?? 0) + ticketQty > tier.total_quantity) {
          throw new NeonAuthorizationError(403, "TICKET_SOLD_OUT", "Not enough tickets remain in this tier.");
        }
      }

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

      const unitPrice = tier?.price ?? event.ticket_price ?? 0;
      const totalAmount = unitPrice * ticketQty;
      const isFree = totalAmount === 0;
      if(!isFree)requireNeonPaidInitiation();
      const status = isFree ? "confirmed" : "pending";
      const paymentStatus = isFree ? "not_required" : "pending";

      const formData = {
        participants: input.participants ?? [],
        ticketTypeId: tier?.id ?? null,
        customResponses: input.customResponses ?? {},
        registeredAt: new Date().toISOString(),
      };

      const regInsert = await client.query<EventRegistrationRow>(`
        INSERT INTO public.event_registrations (
          event_id, user_id, ticket_type_id, status, payment_status, ticket_quantity,
          total_amount, form_data, registered_at
        ) VALUES (
          $1::uuid, $2::uuid, $3::uuid, $4, $5, $6,
          $7, $8::jsonb, now()
        ) RETURNING id, event_id, user_id, status, payment_status, ticket_quantity,
                    total_amount::float AS total_amount, payment_id, form_data, registered_at`, [
        event.id,
        actor.userId,
        tier?.id ?? null,
        status,
        paymentStatus,
        ticketQty,
        totalAmount,
        JSON.stringify(formData),
      ]);

      const registration = regInsert.rows[0];

      if (isFree) {
        // Free registrations receive passes immediately. Paid passes await verified payment.
        for (let i = 0; i < ticketQty; i++) {
          const attendee = input.participants?.[i];
          const ticketNumber = `MT-${crypto.randomUUID()}`;
          await client.query(`INSERT INTO public.event_tickets
            (ticket_number,registration_id,event_id,ticket_type_id,user_id,attendee_name,attendee_email,qr_token,status)
            VALUES ($1,$2::uuid,$3::uuid,$4::uuid,$5::uuid,$6,$7,$8,'active')`,
            [ticketNumber, registration.id, event.id, tier?.id ?? null, actor.userId,
              attendee?.fullName?.trim() || "Attendee", attendee?.email?.trim() || null, crypto.randomUUID()]);
        }
      }

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

  async listCategories(): Promise<Array<{ id: string; name: string; slug: string; icon: string | null; display_order: number }>> {
    return this.db.query<{ id: string; name: string; slug: string; icon: string | null; display_order: number }>(`
      SELECT id, name, slug, icon, display_order
      FROM public.event_categories
      WHERE is_active = true
      ORDER BY display_order ASC, name ASC
      LIMIT 200`, []);
  }

  async getPublicEventDetail(idOrSlug: string): Promise<Record<string, unknown> | null> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idOrSlug);
    const where = isUuid ? `e.id = $1::uuid` : `e.slug = $1`;

    const events = await this.db.query<PublicEventRow & { category_id: string | null }>(`
      SELECT e.id, e.organizer_user_id, e.organizer_type, e.organizer_id, e.title, e.slug,
             e.description, e.event_type, e.format, e.location, e.meeting_url,
             e.cover_image_url, e.start_date, e.end_date, e.registration_deadline,
             e.capacity, e.ticket_price::float AS ticket_price, e.currency,
             e.status, e.approval_status, e.is_active, e.is_featured, e.created_at,
             e.category_id
      FROM public.events e
      WHERE ${where} AND e.deleted_at IS NULL AND e.is_active=true
        AND e.approval_status='approved' AND e.status IN ('approved','published')
      LIMIT 1`, [idOrSlug]);

    const event = events[0];
    if (!event) return null;

    // Fetch category
    let category: Record<string, unknown> | null = null;
    if (event.category_id) {
      const cats = await this.db.query<{ id: string; name: string; slug: string; icon: string | null }>(`
        SELECT id, name, slug, icon FROM public.event_categories WHERE id = $1::uuid LIMIT 1`,
        [event.category_id]);
      category = cats[0] ?? null;
    }

    // Fetch programs
    const programs = await this.db.query<Record<string, unknown>>(`
      SELECT id, title, slug, description, start_time, end_time, venue, capacity,
             requires_registration, speaker_or_organizer, status, display_order
      FROM public.event_programs
      WHERE event_id = $1::uuid AND deleted_at IS NULL
      ORDER BY display_order ASC`, [event.id]);

    // Fetch ticket types
    const ticketTypes = await this.db.query<Record<string, unknown>>(`
      SELECT id, program_id, name, description, ticket_kind,
             min_team_size, max_team_size, price::float AS price, currency,
             total_quantity, quantity_sold, min_per_order, max_per_order,
             sales_start_at, sales_end_at, eligibility_rules, is_active, display_order
      FROM public.event_ticket_types
      WHERE event_id = $1::uuid AND deleted_at IS NULL
      ORDER BY display_order ASC`, [event.id]);

    // Fetch registration fields
    const registrationFields = await this.db.query<Record<string, unknown>>(`
      SELECT id, field_key, field_label, field_type, placeholder, help_text,
             options, required, display_order
      FROM public.event_registration_fields
      WHERE event_id = $1::uuid
      ORDER BY display_order ASC`, [event.id]);

    const { category_id: _catId, ...eventData } = event as Record<string, unknown>;
    return {
      ...eventData,
      category,
      programs,
      ticket_types: ticketTypes,
      registration_fields: registrationFields,
    };
  }

  async listOwnRegistrations(actor: NeonActor): Promise<Array<Record<string, unknown>>> {
    return this.db.query<Record<string, unknown>>(`
      SELECT r.id, r.event_id, r.user_id, r.status, r.payment_status,
             r.ticket_quantity, r.total_amount::float AS total_amount,
             r.payment_id, r.form_data, r.registered_at,
             e.title AS event_title, e.slug AS event_slug,
             e.format AS event_format, e.location AS event_location,
             e.meeting_url AS event_meeting_url,
             e.cover_image_url AS event_cover_image_url,
             e.start_date AS event_start_date, e.end_date AS event_end_date
      FROM public.event_registrations r
      JOIN public.events e ON e.id = r.event_id
      WHERE r.user_id = $1::uuid AND r.deleted_at IS NULL
      ORDER BY r.registered_at DESC
      LIMIT 100`, [actor.userId]);
  }

  async listOwnDigitalTickets(actor: NeonActor): Promise<Array<Record<string, unknown>>> {
    return this.db.query<Record<string, unknown>>(`
      SELECT t.id,t.ticket_number,t.attendee_name,t.attendee_email,t.qr_token,t.status,
        t.checked_in_at,t.created_at,
        jsonb_build_object('id',e.id,'title',e.title,'slug',e.slug,'format',e.format,
          'location',e.location,'cover_image_url',e.cover_image_url,
          'start_date',e.start_date,'end_date',e.end_date) AS event,
        CASE WHEN tt.id IS NULL THEN NULL ELSE jsonb_build_object('id',tt.id,'name',tt.name,
          'ticket_kind',tt.ticket_kind,'price',tt.price,'currency',tt.currency) END AS ticket_type,
        jsonb_build_object('id',r.id,'payment_status',r.payment_status,
          'total_amount',r.total_amount,'registration_number',r.registration_number) AS registration
      FROM public.event_tickets t
      JOIN public.event_registrations r ON r.id=t.registration_id AND r.deleted_at IS NULL
      JOIN public.events e ON e.id=t.event_id
      LEFT JOIN public.event_ticket_types tt ON tt.id=t.ticket_type_id
      WHERE t.user_id=$1::uuid AND r.user_id=$1::uuid AND r.status='confirmed'
      ORDER BY t.created_at DESC LIMIT 100`, [actor.userId]);
  }

  async checkinByQrToken(
    actor: NeonActor,
    qrToken: string,
    location: string,
  ): Promise<{ success: boolean; code: string; message: string; ticket?: Record<string, unknown> }> {
    // Find the ticket by qr_token
    const tickets = await this.db.query<Record<string, unknown>>(`
      SELECT t.id, t.ticket_number, t.status, t.checked_in_at,
             t.event_id, t.user_id, t.attendee_name,r.status AS registration_status,
             e.title AS event_title
      FROM public.event_tickets t
      JOIN public.events e ON e.id = t.event_id
      JOIN public.event_registrations r ON r.id=t.registration_id
      WHERE t.qr_token = $1
      LIMIT 1`, [qrToken]);

    const ticket = tickets[0];
    if (!ticket) {
      return { success: false, code: "TICKET_NOT_FOUND", message: "No ticket found for this QR code." };
    }
    await requireEntityAccess(actor, "events", "event", String(ticket.event_id), "registrations");
    if (ticket.registration_status !== "confirmed" || ticket.status !== "active") {
      return { success: false, code: "TICKET_NOT_ACTIVE", message: "This ticket is not active." };
    }
    if (ticket.checked_in_at) {
      return { success: false, code: "ALREADY_CHECKED_IN", message: `Already checked in at ${ticket.checked_in_at}.` };
    }

    // Update ticket status
    const checked = await this.db.query<{ id: string }>(`
      UPDATE public.event_tickets
      SET status = 'used', checked_in_at = now(), checked_in_by = $2::uuid, updated_at = now()
      WHERE id = $1::uuid AND status='active' AND checked_in_at IS NULL
      RETURNING id`, [ticket.id, actor.userId]);
    if (!checked[0]) return { success: false, code: "ALREADY_CHECKED_IN", message: "This ticket was already scanned." };

    return {
      success: true,
      code: "CHECKED_IN",
      message: `${ticket.attendee_name || "Attendee"} checked in for "${ticket.event_title}".`,
      ticket: { ...ticket, status: "used", checked_in_at: new Date() },
    };
  }

  async updateLifecycle(
    actor: NeonActor,
    eventId: string,
    lifecycleStatus: string,
    extra?: { postponedDate?: string; postponedReason?: string; cancellationReason?: string },
  ): Promise<Record<string, unknown>> {
    // Verify actor is organizer or admin
    const events = await this.db.query<{ id: string; organizer_user_id: string | null }>(`
      SELECT id, organizer_user_id FROM public.events
      WHERE id = $1::uuid AND deleted_at IS NULL LIMIT 1`, [eventId]);

    const event = events[0];
    if (!event) {
      throw new NeonAuthorizationError(404, "EVENT_NOT_FOUND", "Event was not found.");
    }

    const isOrganizer = event.organizer_user_id === actor.userId;
    if (!actor.platformAdmin && !isOrganizer) {
      throw new NeonAuthorizationError(403, "FORBIDDEN", "You are not authorized to change the lifecycle of this event.");
    }

    const validStatuses = ["scheduled", "ongoing", "completed", "postponed", "cancelled"];
    if (!validStatuses.includes(lifecycleStatus)) {
      throw new NeonAuthorizationError(400, "INVALID_STATUS", `Valid lifecycle statuses: ${validStatuses.join(", ")}.`);
    }

    const updated = await this.db.query<Record<string, unknown>>(`
      UPDATE public.events
      SET lifecycle_status = $2, updated_at = now()
      WHERE id = $1::uuid
      RETURNING id, title, lifecycle_status, status, updated_at`, [eventId, lifecycleStatus]);

    return updated[0] ?? {};
  }
}
