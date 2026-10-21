-- Forward-only Neon runtime foundation. No staging rows or fixture identities.
-- Apply transactionally only after private local restore rehearsal and backup checks.
-- Forward-only parity for the isolated Neon migration-staging event slice.
-- The guarded runner refuses every database endpoint except migration-staging.
CREATE TABLE IF NOT EXISTS public.event_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE, description text, icon text, display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
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

-- Apply only to the verified isolated migration-staging branch.
-- Application accounts preserve the legacy UUID used by existing authorization
-- tables while keeping the Managed Auth subject in a separate unique ledger.
CREATE TABLE IF NOT EXISTS public.neon_application_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(user_id),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.neon_identity_links (
  neon_auth_user_id uuid PRIMARY KEY REFERENCES neon_auth."user"(id),
  application_account_id uuid NOT NULL UNIQUE REFERENCES public.neon_application_accounts(id),
  status text NOT NULL CHECK (status IN ('verified', 'disabled')),
  verification_method text NOT NULL,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT verified_link_has_timestamp CHECK (status <> 'verified' OR verified_at IS NOT NULL)
);

REVOKE ALL ON public.neon_application_accounts FROM PUBLIC;
REVOKE ALL ON public.neon_identity_links FROM PUBLIC;

-- Durable, user-addressed event cursor for isolated Neon migration staging.
-- Producers must insert the source row and event in the same transaction.
CREATE TABLE IF NOT EXISTS public.neon_application_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  recipient_user_id uuid NOT NULL REFERENCES public.profiles(user_id),
  kind text NOT NULL CHECK (kind IN ('notification', 'message')),
  source_id uuid NOT NULL,
  conversation_id uuid REFERENCES public.conversations(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT neon_event_conversation_shape CHECK (
    (kind = 'notification' AND conversation_id IS NULL) OR
    (kind = 'message' AND conversation_id IS NOT NULL)
  ),
  UNIQUE (kind, source_id, recipient_user_id)
);

CREATE INDEX IF NOT EXISTS neon_events_recipient_cursor_idx
  ON public.neon_application_events (recipient_user_id, id);

REVOKE ALL ON public.neon_application_events FROM PUBLIC;

-- Isolated staging only. This ledger records only new draft uploads, never
-- infers ownership of historical objects from their filename.
CREATE TABLE IF NOT EXISTS public.neon_job_document_drafts (
  path text PRIMARY KEY,
  job_id uuid NOT NULL REFERENCES public.jobs(id),
  user_id uuid NOT NULL REFERENCES public.profiles(user_id),
  kind text NOT NULL CHECK (kind IN ('experience', 'training')),
  state text NOT NULL DEFAULT 'draft' CHECK (state IN ('draft', 'submitted', 'deleted')),
  application_id uuid REFERENCES public.job_applications(id),
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT neon_job_document_state_consistency CHECK (
    (state = 'draft' AND application_id IS NULL AND deleted_at IS NULL) OR
    (state = 'submitted' AND application_id IS NOT NULL AND deleted_at IS NULL) OR
    (state = 'deleted' AND application_id IS NULL AND deleted_at IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS neon_job_document_drafts_cleanup_idx
  ON public.neon_job_document_drafts (uploaded_at)
  WHERE state = 'draft';
REVOKE ALL ON public.neon_job_document_drafts FROM PUBLIC;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS job_preferences jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS industry text;
REVOKE ALL ON public.event_categories FROM PUBLIC;
REVOKE ALL ON public.event_programs FROM PUBLIC;
REVOKE ALL ON public.event_ticket_types FROM PUBLIC;
REVOKE ALL ON public.event_registration_fields FROM PUBLIC;
REVOKE ALL ON public.event_participants FROM PUBLIC;
REVOKE ALL ON public.event_tickets FROM PUBLIC;
