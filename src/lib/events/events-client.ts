export interface EventCategory {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  display_order: number;
}

export interface EventProgram {
  id: string;
  event_id: string;
  title: string;
  slug?: string | null;
  description?: string | null;
  start_time: string;
  end_time: string;
  venue?: string | null;
  capacity?: number | null;
  requires_registration: boolean;
  speaker_or_organizer?: string | null;
  status: "scheduled" | "ongoing" | "completed" | "cancelled" | "postponed";
  display_order: number;
}

export interface EventTicketType {
  id: string;
  event_id: string;
  program_id?: string | null;
  name: string;
  description?: string | null;
  ticket_kind: "individual" | "team" | "group";
  min_team_size: number;
  max_team_size: number;
  price: number;
  currency: string;
  total_quantity?: number | null;
  quantity_sold: number;
  min_per_order: number;
  max_per_order: number;
  sales_start_at?: string | null;
  sales_end_at?: string | null;
  is_active: boolean;
  display_order: number;
}

export interface EventRegistrationField {
  id: string;
  event_id: string;
  field_key: string;
  field_label: string;
  field_type: "text" | "textarea" | "number" | "select" | "checkbox" | "url" | "email" | "tel";
  placeholder?: string | null;
  help_text?: string | null;
  options?: Array<{ label: string; value: string }>;
  required: boolean;
  display_order: number;
}

export interface EventDetail {
  id: string;
  title: string;
  slug?: string | null;
  short_description?: string | null;
  description?: string | null;
  event_type: "free" | "paid";
  format: "online" | "offline" | "hybrid";
  location?: string | null;
  meeting_url?: string | null;
  cover_image_url?: string | null;
  gallery_urls?: string[];
  start_date: string;
  end_date: string;
  registration_open_at?: string | null;
  registration_close_at?: string | null;
  registration_deadline?: string | null;
  capacity?: number | null;
  ticket_price: number;
  currency: string;
  status: string;
  lifecycle_status?: string;
  approval_status: string;
  organizer_type: string;
  organizer_user_id: string;
  is_multi_program: boolean;
  terms_and_conditions?: string | null;
  contact_info?: Record<string, string>;
  category?: EventCategory | null;
  programs?: EventProgram[];
  ticket_types?: EventTicketType[];
  registration_fields?: EventRegistrationField[];
}

export interface DigitalTicket {
  id: string;
  ticket_number: string;
  attendee_name: string;
  attendee_email?: string | null;
  qr_token: string;
  status: "active" | "used" | "cancelled" | "expired";
  checked_in_at?: string | null;
  created_at: string;
  event?: {
    id: string;
    title: string;
    slug?: string | null;
    format: string;
    location?: string | null;
    cover_image_url?: string | null;
    start_date: string;
    end_date: string;
  };
  program?: {
    id: string;
    title: string;
    start_time: string;
    end_time: string;
    venue?: string | null;
  };
  ticket_type?: {
    id: string;
    name: string;
    ticket_kind: string;
    price: number;
    currency: string;
  };
  registration?: {
    id: string;
    registration_number?: string | null;
    team_name?: string | null;
    payment_status: string;
    total_amount: number;
  };
}

export async function fetchEventCategories(): Promise<EventCategory[]> {
  const res = await fetch("/api/v1/events/categories");
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message || "Failed to load categories.");
  return json.data || [];
}

export async function fetchPublicEvents(params?: {
  search?: string;
  category?: string;
  format?: string;
  type?: string;
  limit?: number;
}): Promise<EventDetail[]> {
  const searchParams = new URLSearchParams();
  if (params?.search) searchParams.set("search", params.search);
  if (params?.category) searchParams.set("category", params.category);
  if (params?.format) searchParams.set("format", params.format);
  if (params?.type) searchParams.set("type", params.type);
  if (params?.limit) searchParams.set("limit", String(params.limit));

  const res = await fetch(`/api/v1/events?${searchParams.toString()}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message || "Failed to load events.");
  return json.data || [];
}

export async function fetchPublicEventDetail(idOrSlug: string): Promise<EventDetail> {
  const res = await fetch(`/api/v1/events/${idOrSlug}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message || "Failed to load event details.");
  return json.data;
}

export async function registerForEventApi(
  eventId: string,
  payload: {
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
    }>;
    customResponses?: Record<string, unknown>;
  },
  token: string
) {
  const res = await fetch(`/api/v1/events/${eventId}/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message || "Registration failed.");
  return json.data;
}

export async function fetchMyTickets(token: string): Promise<DigitalTicket[]> {
  const res = await fetch("/api/v1/events/my-tickets", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message || "Failed to load tickets.");
  return json.data || [];
}

export async function checkinTicket(
  qrToken: string,
  token: string,
  location?: string
) {
  const res = await fetch("/api/v1/events/checkin", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ qrToken, location }),
  });
  const json = await res.json();
  if (!res.ok) {
    return {
      success: false,
      code: json.error?.code || "CHECKIN_FAILED",
      message: json.error?.message || "Check-in verification failed.",
      ticket: json.data?.ticket,
    };
  }
  return json.data;
}
