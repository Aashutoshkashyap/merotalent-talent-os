-- ============================================================================
-- Complete Event Management, Multi-Program, Registration, Ticketing & Check-in
-- ============================================================================

BEGIN;

-- 1. Event Categories Table
CREATE TABLE IF NOT EXISTS public.event_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  description text,
  icon text,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed initial default event categories
INSERT INTO public.event_categories (name, slug, description, display_order)
VALUES
  ('Hackathon', 'hackathon', 'Coding competitions, product build-offs and developer sprints', 1),
  ('Competition', 'competition', 'Academic, quiz, debate, robotics and technical contests', 2),
  ('Workshop', 'workshop', 'Hands-on skill building and practical training sessions', 3),
  ('Seminar', 'seminar', 'Subject matter presentations and expert knowledge panels', 4),
  ('Special Lecture', 'special-lecture', 'Distinguished speaker sessions, guest lectures and visiting classes', 5),
  ('Technical Event', 'technical-event', 'Coding meetups, engineering symposiums and tech demonstrations', 6),
  ('Cultural Event', 'cultural-event', 'Music, dance, poetry and cultural celebration programs', 7),
  ('Theater & Drama', 'theater-drama', 'Stage plays, theatrical performances and drama productions', 8),
  ('Sports & Gaming', 'sports-gaming', 'Esports tournaments, indoor games and athletic sports meets', 9),
  ('Student Fair', 'student-fair', 'Education expos, career fairs, project showcases and club carnivals', 10),
  ('Conference', 'conference', 'Academic conferences, research symposiums and multi-day summits', 11),
  ('College Festival', 'college-festival', 'Annual college festivals, tech fests and multi-disciplinary galas', 12),
  ('Club Event', 'club-event', 'Student-organized club activities and campus community initiatives', 13),
  ('Academic Session', 'academic-session', 'Preparatory classes, curriculum briefings and academic orientations', 14),
  ('Other', 'other', 'General student programs and miscellaneous community gatherings', 99)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order;

-- 2. Enhance Events Table
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.event_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS short_description text,
  ADD COLUMN IF NOT EXISTS gallery_urls text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS registration_open_at timestamptz,
  ADD COLUMN IF NOT EXISTS registration_close_at timestamptz,
  ADD COLUMN IF NOT EXISTS eligibility_rules jsonb NOT NULL DEFAULT '{"type":"all"}'::jsonb,
  ADD COLUMN IF NOT EXISTS contact_info jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS terms_and_conditions text,
  ADD COLUMN IF NOT EXISTS lifecycle_status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS postponed_date timestamptz,
  ADD COLUMN IF NOT EXISTS postponed_reason text,
  ADD COLUMN IF NOT EXISTS cancellation_reason text,
  ADD COLUMN IF NOT EXISTS is_multi_program boolean NOT NULL DEFAULT false;

-- Add check constraint for event lifecycle status
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_lifecycle_status_check;
ALTER TABLE public.events ADD CONSTRAINT events_lifecycle_status_check
  CHECK (lifecycle_status IN ('draft', 'published', 'registration_open', 'registration_closed', 'ongoing', 'completed', 'cancelled', 'postponed'));

-- 3. Event Programs / Sessions Table (Single or Multi-Program Support, e.g. LOKUS 2026)
CREATE TABLE IF NOT EXISTS public.event_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  title text NOT NULL,
  slug text,
  description text,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  venue text,
  capacity integer CHECK (capacity IS NULL OR capacity > 0),
  requires_registration boolean NOT NULL DEFAULT true,
  speaker_or_organizer text,
  status text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'ongoing', 'completed', 'cancelled', 'postponed')),
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CHECK (end_time >= start_time)
);

CREATE INDEX IF NOT EXISTS event_programs_event_idx ON public.event_programs(event_id) WHERE deleted_at IS NULL;

-- 4. Event Ticket Types Table (Configurable tiers: Free, Early Bird, General, VIP, Team, etc.)
CREATE TABLE IF NOT EXISTS public.event_ticket_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  program_id uuid REFERENCES public.event_programs(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  ticket_kind text NOT NULL DEFAULT 'individual'
    CHECK (ticket_kind IN ('individual', 'team', 'group')),
  min_team_size integer NOT NULL DEFAULT 1 CHECK (min_team_size >= 1),
  max_team_size integer NOT NULL DEFAULT 1 CHECK (max_team_size >= min_team_size),
  price numeric(12,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  currency text NOT NULL DEFAULT 'NPR',
  total_quantity integer CHECK (total_quantity IS NULL OR total_quantity >= 0),
  quantity_sold integer NOT NULL DEFAULT 0 CHECK (quantity_sold >= 0),
  min_per_order integer NOT NULL DEFAULT 1 CHECK (min_per_order >= 1),
  max_per_order integer NOT NULL DEFAULT 10 CHECK (max_per_order >= min_per_order),
  sales_start_at timestamptz,
  sales_end_at timestamptz,
  eligibility_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS event_ticket_types_event_idx ON public.event_ticket_types(event_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS event_ticket_types_program_idx ON public.event_ticket_types(program_id) WHERE deleted_at IS NULL;

-- 5. Configurable Registration Custom Fields Table
CREATE TABLE IF NOT EXISTS public.event_registration_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  field_key text NOT NULL,
  field_label text NOT NULL,
  field_type text NOT NULL DEFAULT 'text'
    CHECK (field_type IN ('text', 'textarea', 'number', 'select', 'checkbox', 'url', 'email', 'tel')),
  placeholder text,
  help_text text,
  options jsonb DEFAULT '[]'::jsonb,
  required boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, field_key)
);

CREATE INDEX IF NOT EXISTS event_registration_fields_event_idx ON public.event_registration_fields(event_id);

-- 6. Enhance Event Registrations Table
ALTER TABLE public.event_registrations
  ADD COLUMN IF NOT EXISTS program_id uuid REFERENCES public.event_programs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ticket_type_id uuid REFERENCES public.event_ticket_types(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS registration_number text,
  ADD COLUMN IF NOT EXISTS team_name text,
  ADD COLUMN IF NOT EXISTS custom_responses jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS attendee_count integer NOT NULL DEFAULT 1 CHECK (attendee_count >= 1),
  ADD COLUMN IF NOT EXISTS checked_in_count integer NOT NULL DEFAULT 0 CHECK (checked_in_count >= 0);

-- Drop legacy unique constraint to allow multi-program or multiple ticket order registrations
ALTER TABLE public.event_registrations DROP CONSTRAINT IF EXISTS event_registrations_event_id_user_id_key;

CREATE INDEX IF NOT EXISTS event_registrations_event_idx ON public.event_registrations(event_id);
CREATE INDEX IF NOT EXISTS event_registrations_user_idx ON public.event_registrations(user_id);
CREATE INDEX IF NOT EXISTS event_registrations_ticket_type_idx ON public.event_registrations(ticket_type_id);

-- 7. Event Participants Table (for individual tickets / team members)
CREATE TABLE IF NOT EXISTS public.event_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL REFERENCES public.event_registrations(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text,
  phone text,
  college text,
  student_id text,
  role_in_team text DEFAULT 'member',
  custom_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS event_participants_reg_idx ON public.event_participants(registration_id);

-- 8. Event Tickets Table (Digital Tickets / Passes with Secure QR Tokens)
CREATE TABLE IF NOT EXISTS public.event_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number text NOT NULL UNIQUE,
  registration_id uuid NOT NULL REFERENCES public.event_registrations(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  program_id uuid REFERENCES public.event_programs(id) ON DELETE SET NULL,
  ticket_type_id uuid REFERENCES public.event_ticket_types(id) ON DELETE SET NULL,
  participant_id uuid REFERENCES public.event_participants(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attendee_name text NOT NULL,
  attendee_email text,
  qr_token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'used', 'cancelled', 'expired')),
  checked_in_at timestamptz,
  checked_in_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS event_tickets_reg_idx ON public.event_tickets(registration_id);
CREATE INDEX IF NOT EXISTS event_tickets_event_idx ON public.event_tickets(event_id);
CREATE INDEX IF NOT EXISTS event_tickets_user_idx ON public.event_tickets(user_id);
CREATE INDEX IF NOT EXISTS event_tickets_qr_token_idx ON public.event_tickets(qr_token);

-- 9. Event Check-ins Table (Audit log for ticket scans)
CREATE TABLE IF NOT EXISTS public.event_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.event_tickets(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  program_id uuid REFERENCES public.event_programs(id) ON DELETE SET NULL,
  scanned_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_or_location text,
  status text NOT NULL DEFAULT 'success'
    CHECK (status IN ('success', 'duplicate_rejected', 'invalid', 'cancelled_ticket')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS event_checkins_ticket_idx ON public.event_checkins(ticket_id);
CREATE INDEX IF NOT EXISTS event_checkins_event_idx ON public.event_checkins(event_id);

-- 10. Enable Row Level Security on New Tables
ALTER TABLE public.event_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_ticket_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registration_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_checkins ENABLE ROW LEVEL SECURITY;

-- 11. RLS Policies

-- Event Categories (Public Read, Admin Write)
DROP POLICY IF EXISTS "Public can view active event categories" ON public.event_categories;
CREATE POLICY "Public can view active event categories"
  ON public.event_categories FOR SELECT
  USING (is_active = true OR public.is_platform_admin());

DROP POLICY IF EXISTS "Platform admins manage event categories" ON public.event_categories;
CREATE POLICY "Platform admins manage event categories"
  ON public.event_categories FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- Event Programs (Public View on Approved Events, Scoped Organizers / Admin Manage)
DROP POLICY IF EXISTS "Public can view programs of published events" ON public.event_programs;
CREATE POLICY "Public can view programs of published events"
  ON public.event_programs FOR SELECT
  USING (
    deleted_at IS NULL AND
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_programs.event_id
        AND (
          (e.is_active = true AND e.approval_status = 'approved' AND e.deleted_at IS NULL)
          OR public.is_platform_admin()
          OR e.organizer_user_id = auth.uid()
          OR public.authorize_module_access(auth.uid(), 'events', 'event', e.id, 'events')
        )
    )
  );

DROP POLICY IF EXISTS "Organizers manage their event programs" ON public.event_programs;
CREATE POLICY "Organizers manage their event programs"
  ON public.event_programs FOR ALL TO authenticated
  USING (
    public.is_platform_admin() OR
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_programs.event_id
        AND (e.organizer_user_id = auth.uid() OR public.authorize_module_access(auth.uid(), 'events', 'event', e.id, 'events'))
    )
  )
  WITH CHECK (
    public.is_platform_admin() OR
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_programs.event_id
        AND (e.organizer_user_id = auth.uid() OR public.authorize_module_access(auth.uid(), 'events', 'event', e.id, 'events'))
    )
  );

-- Event Ticket Types (Public View on Published Events, Scoped Organizers / Admin Manage)
DROP POLICY IF EXISTS "Public can view active ticket types" ON public.event_ticket_types;
CREATE POLICY "Public can view active ticket types"
  ON public.event_ticket_types FOR SELECT
  USING (
    deleted_at IS NULL AND
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_ticket_types.event_id
        AND (
          (e.is_active = true AND e.approval_status = 'approved' AND e.deleted_at IS NULL)
          OR public.is_platform_admin()
          OR e.organizer_user_id = auth.uid()
          OR public.authorize_module_access(auth.uid(), 'events', 'event', e.id, 'events')
        )
    )
  );

DROP POLICY IF EXISTS "Organizers manage event ticket types" ON public.event_ticket_types;
CREATE POLICY "Organizers manage event ticket types"
  ON public.event_ticket_types FOR ALL TO authenticated
  USING (
    public.is_platform_admin() OR
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_ticket_types.event_id
        AND (e.organizer_user_id = auth.uid() OR public.authorize_module_access(auth.uid(), 'events', 'event', e.id, 'events'))
    )
  )
  WITH CHECK (
    public.is_platform_admin() OR
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_ticket_types.event_id
        AND (e.organizer_user_id = auth.uid() OR public.authorize_module_access(auth.uid(), 'events', 'event', e.id, 'events'))
    )
  );

-- Event Registration Fields (Public Read, Scoped Organizers / Admin Manage)
DROP POLICY IF EXISTS "Public can view event registration fields" ON public.event_registration_fields;
CREATE POLICY "Public can view event registration fields"
  ON public.event_registration_fields FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Organizers manage registration fields" ON public.event_registration_fields;
CREATE POLICY "Organizers manage registration fields"
  ON public.event_registration_fields FOR ALL TO authenticated
  USING (
    public.is_platform_admin() OR
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_registration_fields.event_id
        AND (e.organizer_user_id = auth.uid() OR public.authorize_module_access(auth.uid(), 'events', 'event', e.id, 'events'))
    )
  )
  WITH CHECK (
    public.is_platform_admin() OR
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_registration_fields.event_id
        AND (e.organizer_user_id = auth.uid() OR public.authorize_module_access(auth.uid(), 'events', 'event', e.id, 'events'))
    )
  );

-- Event Participants (Registrant View, Organizers / Admin Manage)
DROP POLICY IF EXISTS "Registrants and organizers view participants" ON public.event_participants;
CREATE POLICY "Registrants and organizers view participants"
  ON public.event_participants FOR SELECT TO authenticated
  USING (
    public.is_platform_admin() OR
    EXISTS (
      SELECT 1 FROM public.event_registrations r
      WHERE r.id = event_participants.registration_id
        AND (
          r.user_id = auth.uid() OR
          EXISTS (
            SELECT 1 FROM public.events e
            WHERE e.id = r.event_id
              AND (e.organizer_user_id = auth.uid() OR public.authorize_module_access(auth.uid(), 'events', 'event', e.id, 'events'))
          )
        )
    )
  );

-- Event Tickets (Holder and Organizers View / Manage)
DROP POLICY IF EXISTS "Holders and organizers view tickets" ON public.event_tickets;
CREATE POLICY "Holders and organizers view tickets"
  ON public.event_tickets FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    public.is_platform_admin() OR
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_tickets.event_id
        AND (e.organizer_user_id = auth.uid() OR public.authorize_module_access(auth.uid(), 'events', 'event', e.id, 'events'))
    )
  );

DROP POLICY IF EXISTS "Organizers update ticket checkin status" ON public.event_tickets;
CREATE POLICY "Organizers update ticket checkin status"
  ON public.event_tickets FOR UPDATE TO authenticated
  USING (
    public.is_platform_admin() OR
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_tickets.event_id
        AND (e.organizer_user_id = auth.uid() OR public.authorize_module_access(auth.uid(), 'events', 'event', e.id, 'events'))
    )
  );

-- Event Checkins (Organizers / Platform Admin View & Insert)
DROP POLICY IF EXISTS "Organizers view checkin records" ON public.event_checkins;
CREATE POLICY "Organizers view checkin records"
  ON public.event_checkins FOR SELECT TO authenticated
  USING (
    public.is_platform_admin() OR
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_checkins.event_id
        AND (e.organizer_user_id = auth.uid() OR public.authorize_module_access(auth.uid(), 'events', 'event', e.id, 'events'))
    )
  );

DROP POLICY IF EXISTS "Organizers insert checkin records" ON public.event_checkins;
CREATE POLICY "Organizers insert checkin records"
  ON public.event_checkins FOR INSERT TO authenticated
  WITH CHECK (
    scanned_by = auth.uid() AND (
      public.is_platform_admin() OR
      EXISTS (
        SELECT 1 FROM public.events e
        WHERE e.id = event_checkins.event_id
          AND (e.organizer_user_id = auth.uid() OR public.authorize_module_access(auth.uid(), 'events', 'event', e.id, 'events'))
      )
    )
  );

COMMIT;
