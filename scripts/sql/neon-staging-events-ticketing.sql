-- Forward-only parity for the isolated Neon migration-staging event slice.
-- The guarded runner refuses every database endpoint except migration-staging.
CREATE TABLE IF NOT EXISTS public.event_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE, description text, icon text, display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.event_categories (name,slug,description,display_order) VALUES
  ('Hackathon','hackathon','Coding competitions and developer sprints',1),
  ('Competition','competition','Academic and technical contests',2),
  ('Workshop','workshop','Hands-on training sessions',3),
  ('Special Lecture','special-lecture','Guest and college lectures',4),
  ('Cultural Event','cultural-event','Performances and cultural programs',5),
  ('Other','other','General events',99)
ON CONFLICT(slug) DO NOTHING;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.event_categories(id);
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS short_description text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS lifecycle_status text NOT NULL DEFAULT 'draft';
-- Fields used by the existing Super Admin event form, matching the forward
-- source contract in 20261008130000_event_management_complete.sql.
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS registration_open_at timestamptz;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS registration_close_at timestamptz;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS terms_and_conditions text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_multi_program boolean NOT NULL DEFAULT false;
CREATE TABLE IF NOT EXISTS public.event_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  title text NOT NULL, slug text, description text, start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL, venue text, capacity integer, requires_registration boolean NOT NULL DEFAULT true,
  speaker_or_organizer text, status text NOT NULL DEFAULT 'scheduled', display_order integer NOT NULL DEFAULT 0,
  deleted_at timestamptz, CHECK (end_time>=start_time)
);
CREATE TABLE IF NOT EXISTS public.event_ticket_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  program_id uuid REFERENCES public.event_programs(id) ON DELETE SET NULL,
  name text NOT NULL, description text, ticket_kind text NOT NULL DEFAULT 'individual',
  min_team_size integer NOT NULL DEFAULT 1, max_team_size integer NOT NULL DEFAULT 1,
  price numeric(12,2) NOT NULL DEFAULT 0 CHECK (price>=0), currency text NOT NULL DEFAULT 'NPR',
  total_quantity integer, quantity_sold integer NOT NULL DEFAULT 0,
  min_per_order integer NOT NULL DEFAULT 1, max_per_order integer NOT NULL DEFAULT 10,
  sales_start_at timestamptz, sales_end_at timestamptz,
  eligibility_rules jsonb NOT NULL DEFAULT '{}'::jsonb, is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0, deleted_at timestamptz,
  CHECK (min_team_size>=1 AND max_team_size>=min_team_size),
  CHECK (min_per_order>=1 AND max_per_order>=min_per_order)
);
CREATE TABLE IF NOT EXISTS public.event_registration_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  field_key text NOT NULL, field_label text NOT NULL, field_type text NOT NULL DEFAULT 'text',
  placeholder text, help_text text, options jsonb DEFAULT '[]'::jsonb,
  required boolean NOT NULL DEFAULT false, display_order integer NOT NULL DEFAULT 0,
  UNIQUE(event_id,field_key)
);
ALTER TABLE public.event_registrations ADD COLUMN IF NOT EXISTS program_id uuid REFERENCES public.event_programs(id);
ALTER TABLE public.event_registrations ADD COLUMN IF NOT EXISTS ticket_type_id uuid REFERENCES public.event_ticket_types(id);
ALTER TABLE public.event_registrations ADD COLUMN IF NOT EXISTS registration_number text;
ALTER TABLE public.event_registrations ADD COLUMN IF NOT EXISTS team_name text;
ALTER TABLE public.event_registrations ADD COLUMN IF NOT EXISTS attendee_count integer NOT NULL DEFAULT 1;
CREATE TABLE IF NOT EXISTS public.event_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), registration_id uuid NOT NULL REFERENCES public.event_registrations(id) ON DELETE CASCADE,
  full_name text NOT NULL, email text, phone text, college text, student_id text,
  role_in_team text DEFAULT 'member', custom_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.event_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), ticket_number text NOT NULL UNIQUE,
  registration_id uuid NOT NULL REFERENCES public.event_registrations(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  program_id uuid REFERENCES public.event_programs(id), ticket_type_id uuid REFERENCES public.event_ticket_types(id),
  participant_id uuid REFERENCES public.event_participants(id), user_id uuid NOT NULL REFERENCES public.profiles(user_id),
  attendee_name text NOT NULL, attendee_email text, qr_token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active', checked_in_at timestamptz,
  checked_in_by uuid REFERENCES public.profiles(user_id), created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS event_ticket_types_event_idx ON public.event_ticket_types(event_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS event_tickets_user_idx ON public.event_tickets(user_id);
CREATE INDEX IF NOT EXISTS event_registrations_ticket_type_idx ON public.event_registrations(ticket_type_id);
