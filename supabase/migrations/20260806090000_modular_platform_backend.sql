-- MeroTalent modular platform backend.
--
-- This migration is intentionally additive and keeps the legacy table names used
-- by the current frontend. In particular, `institutes` is the canonical college
-- table, `admin` represents Super Admin, and `talent` represents Student/User.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Account safety and controlled profile visibility
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS email_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_account_status_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_account_status_check
  CHECK (account_status IN ('pending', 'active', 'suspended', 'deactivated')) NOT VALID;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.profiles p ON p.user_id = ur.user_id
    WHERE ur.user_id = _user_id AND ur.role = _role
      AND p.account_status = 'active' AND p.deleted_at IS NULL
  )
$$;

DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile or public mentors" ON public.profiles;
CREATE POLICY "Users can view own profile or public mentors"
ON public.profiles FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1
    FROM public.mentors m
    WHERE m.user_id = profiles.user_id
      AND m.is_available = true
  )
);

DROP VIEW IF EXISTS public.public_profile_directory;
CREATE VIEW public.public_profile_directory
WITH (security_barrier = true) AS
SELECT id, user_id, full_name, avatar_url, bio, location
FROM public.profiles
WHERE account_status = 'active' AND deleted_at IS NULL;

REVOKE ALL ON public.public_profile_directory FROM PUBLIC;
GRANT SELECT ON public.public_profile_directory TO anon, authenticated;

-- Self-service registration may choose a non-privileged account type. Admin
-- is never accepted from user metadata or a self-service role insert.
DROP POLICY IF EXISTS "Users can insert own non privileged role" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert own initial role" ON public.user_roles;
CREATE POLICY "Users can insert own non privileged role"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND role IN ('talent', 'institution', 'company', 'mentor')
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  requested_role public.app_role;
BEGIN
  requested_role := CASE NEW.raw_user_meta_data ->> 'account_type'
    WHEN 'institution' THEN 'institution'::public.app_role
    WHEN 'company' THEN 'company'::public.app_role
    WHEN 'mentor' THEN 'mentor'::public.app_role
    ELSE 'talent'::public.app_role
  END;

  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')
  )
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, requested_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- Permission model. Existing role enum values are deliberately preserved.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
  role public.app_role NOT NULL,
  permission_id uuid NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (role, permission_id)
);

CREATE TABLE IF NOT EXISTS public.user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, permission_id)
);

ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.profiles p ON p.user_id = ur.user_id
    WHERE ur.user_id = _user_id
      AND ur.role = 'admin'
      AND p.account_status = 'active'
      AND p.deleted_at IS NULL
  )
$$;

CREATE OR REPLACE FUNCTION public.is_account_active(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = _user_id
      AND p.account_status = 'active'
      AND p.deleted_at IS NULL
  )
$$;

CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission_code text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.is_account_active(_user_id) AND (
    public.is_platform_admin(_user_id)
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.role_permissions rp ON rp.role = ur.role
      JOIN public.permissions p ON p.id = rp.permission_id
      WHERE ur.user_id = _user_id AND p.code = _permission_code
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_permissions up
      JOIN public.permissions p ON p.id = up.permission_id
      WHERE up.user_id = _user_id
        AND p.code = _permission_code
        AND (up.expires_at IS NULL OR up.expires_at > now())
    )
  )
$$;

DROP POLICY IF EXISTS "Permissions are readable by authenticated users" ON public.permissions;
CREATE POLICY "Permissions are readable by authenticated users"
ON public.permissions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Role permissions are readable by authenticated users" ON public.role_permissions;
CREATE POLICY "Role permissions are readable by authenticated users"
ON public.role_permissions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can read own explicit permissions" ON public.user_permissions;
CREATE POLICY "Users can read own explicit permissions"
ON public.user_permissions FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_platform_admin());

DROP POLICY IF EXISTS "Admins manage permissions" ON public.permissions;
CREATE POLICY "Admins manage permissions"
ON public.permissions FOR ALL TO authenticated
USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS "Admins manage role permissions" ON public.role_permissions;
CREATE POLICY "Admins manage role permissions"
ON public.role_permissions FOR ALL TO authenticated
USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS "Admins manage user permissions" ON public.user_permissions;
CREATE POLICY "Admins manage user permissions"
ON public.user_permissions FOR ALL TO authenticated
USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

INSERT INTO public.permissions (code, description) VALUES
  ('profile.manage', 'Manage the current user profile'),
  ('college.manage', 'Manage an owned college profile'),
  ('mentor.manage', 'Manage an owned mentor profile and sessions'),
  ('job.post', 'Create and manage job postings'),
  ('event.organize', 'Create and manage events'),
  ('course.manage', 'Manage partnered course listings'),
  ('lead.view', 'View owned leads when subscription permits'),
  ('media.manage', 'Manage media for owned resources'),
  ('admin.manage', 'Manage platform administration')
ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description;

INSERT INTO public.role_permissions (role, permission_id)
SELECT mapping.role::public.app_role, p.id
FROM (VALUES
  ('talent', 'profile.manage'),
  ('institution', 'profile.manage'),
  ('institution', 'college.manage'),
  ('institution', 'job.post'),
  ('institution', 'event.organize'),
  ('institution', 'lead.view'),
  ('institution', 'media.manage'),
  ('company', 'profile.manage'),
  ('company', 'job.post'),
  ('company', 'event.organize'),
  ('company', 'lead.view'),
  ('company', 'media.manage'),
  ('mentor', 'profile.manage'),
  ('mentor', 'mentor.manage'),
  ('mentor', 'event.organize'),
  ('mentor', 'lead.view'),
  ('mentor', 'media.manage')
) AS mapping(role, code)
JOIN public.permissions p ON p.code = mapping.code
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Canonical colleges and compatibility support for existing screens.
-- ---------------------------------------------------------------------------

ALTER TABLE public.institutes
  ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS cover_image_url text,
  ADD COLUMN IF NOT EXISTS gallery_urls text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS youtube_url text,
  ADD COLUMN IF NOT EXISTS contact_info jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS courses_offered jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS ranking integer,
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS featured_until timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE public.institutes DROP CONSTRAINT IF EXISTS institutes_status_check;
ALTER TABLE public.institutes ADD CONSTRAINT institutes_status_check
  CHECK (status IN ('draft', 'pending', 'approved', 'suspended', 'rejected')) NOT VALID;

UPDATE public.institutes SET status = 'approved' WHERE is_verified = true AND status = 'pending';

CREATE UNIQUE INDEX IF NOT EXISTS institutes_slug_unique
  ON public.institutes (lower(slug)) WHERE slug IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS institutes_owner_idx ON public.institutes(owner_user_id);
CREATE INDEX IF NOT EXISTS institutes_listing_idx
  ON public.institutes(status, is_featured, ranking) WHERE deleted_at IS NULL;

-- Legacy `institutions` remains available to old code, but all new college
-- modules use `institutes` so current AdminInstitutions data stays connected.
ALTER TABLE public.institutions
  ADD COLUMN IF NOT EXISTS deprecated_in_favor_of_institute_id uuid REFERENCES public.institutes(id),
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

DROP POLICY IF EXISTS "Anyone can view institutes" ON public.institutes;
DROP POLICY IF EXISTS "Admins can manage institutes" ON public.institutes;
CREATE POLICY "Public can view approved colleges"
ON public.institutes FOR SELECT TO anon, authenticated
USING (
  (status = 'approved' AND is_verified = true AND deleted_at IS NULL)
  OR ((owner_user_id = auth.uid() OR public.is_platform_admin()) AND deleted_at IS NULL)
);
CREATE POLICY "Owners can create college profiles"
ON public.institutes FOR INSERT TO authenticated
WITH CHECK (
  public.is_platform_admin()
  OR (
    public.is_account_active()
    AND owner_user_id = auth.uid()
    AND public.has_permission(auth.uid(), 'college.manage')
  )
);
CREATE POLICY "Owners can update college profiles"
ON public.institutes FOR UPDATE TO authenticated
USING (owner_user_id = auth.uid() OR public.is_platform_admin())
WITH CHECK (owner_user_id = auth.uid() OR public.is_platform_admin());

-- ---------------------------------------------------------------------------
-- Subscription and package model
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  audience public.app_role,
  price numeric(12,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  currency text NOT NULL DEFAULT 'NPR',
  billing_interval text NOT NULL DEFAULT 'month'
    CHECK (billing_interval IN ('one_time', 'month', 'quarter', 'year')),
  features jsonb NOT NULL DEFAULT '{}'::jsonb,
  lead_access_mode text NOT NULL DEFAULT 'full'
    CHECK (lead_access_mode IN ('none', 'read_only', 'full')),
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  package_id uuid NOT NULL REFERENCES public.packages(id),
  entity_type text NOT NULL DEFAULT 'user'
    CHECK (entity_type IN ('user', 'college', 'mentor', 'company', 'organizer')),
  entity_id uuid,
  start_date timestamptz NOT NULL DEFAULT now(),
  expiry_date timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'trialing', 'active', 'past_due', 'expired', 'cancelled')),
  payment_status text NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'success', 'failed', 'refunded', 'not_required')),
  auto_renew boolean NOT NULL DEFAULT false,
  cancelled_at timestamptz,
  cancellation_reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CHECK (expiry_date > start_date)
);

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_one_active_entity_idx
ON public.subscriptions(user_id, entity_type, COALESCE(entity_id, '00000000-0000-0000-0000-000000000000'::uuid))
WHERE status IN ('trialing', 'active') AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS subscriptions_expiry_idx
ON public.subscriptions(expiry_date) WHERE status IN ('trialing', 'active');

ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_active_subscription(
  _user_id uuid,
  _entity_type text DEFAULT NULL,
  _entity_id uuid DEFAULT NULL,
  _feature text DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.is_account_active(_user_id) AND (public.is_platform_admin(_user_id) OR EXISTS (
    SELECT 1
    FROM public.subscriptions s
    JOIN public.packages p ON p.id = s.package_id
    WHERE s.user_id = _user_id
      AND s.status IN ('trialing', 'active')
      AND s.payment_status IN ('success', 'not_required')
      AND s.start_date <= now()
      AND s.expiry_date > now()
      AND s.deleted_at IS NULL
      AND p.is_active = true
      AND p.deleted_at IS NULL
      AND (_entity_type IS NULL OR s.entity_type = _entity_type)
      AND (_entity_id IS NULL OR s.entity_id = _entity_id)
      AND (_feature IS NULL OR p.features @> jsonb_build_object(_feature, true))
  ))
$$;

CREATE POLICY "Public can view active packages"
ON public.packages FOR SELECT TO anon, authenticated
USING ((is_active = true AND deleted_at IS NULL) OR public.is_platform_admin());
CREATE POLICY "Admins manage packages"
ON public.packages FOR INSERT TO authenticated
WITH CHECK (public.is_platform_admin());
CREATE POLICY "Admins update packages"
ON public.packages FOR UPDATE TO authenticated
USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

CREATE POLICY "Users view own subscriptions"
ON public.subscriptions FOR SELECT TO authenticated
USING ((user_id = auth.uid() AND deleted_at IS NULL) OR public.is_platform_admin());
CREATE POLICY "Admins create subscriptions"
ON public.subscriptions FOR INSERT TO authenticated
WITH CHECK (public.is_platform_admin());
CREATE POLICY "Admins update subscriptions"
ON public.subscriptions FOR UPDATE TO authenticated
USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

-- ---------------------------------------------------------------------------
-- Extend legacy catalog, mentor, job, payment, and notification tables.
-- ---------------------------------------------------------------------------

ALTER TABLE public.mentors
  ADD COLUMN IF NOT EXISTS headline text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS profile_image_url text,
  ADD COLUMN IF NOT EXISTS cover_image_url text,
  ADD COLUMN IF NOT EXISTS availability jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'Asia/Kathmandu',
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS commission_rate numeric(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE public.mentors DROP CONSTRAINT IF EXISTS mentors_approval_status_check;
ALTER TABLE public.mentors ADD CONSTRAINT mentors_approval_status_check
  CHECK (approval_status IN ('pending', 'approved', 'rejected', 'suspended')) NOT VALID;

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS partner_name text,
  ADD COLUMN IF NOT EXISTS partner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_partnered boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referral_code text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE public.courses DROP CONSTRAINT IF EXISTS courses_status_check;
ALTER TABLE public.courses ADD CONSTRAINT courses_status_check
  CHECK (status IN ('draft', 'pending', 'published', 'inactive')) NOT VALID;

UPDATE public.courses
SET status = CASE WHEN is_published THEN 'published' ELSE status END,
    is_partnered = CASE
      WHEN redirect_url IS NOT NULL AND redirect_url ~ '^https://learn[.]merotalent[.]com(?:/|[?]|#|$)' THEN true
      ELSE is_partnered
    END;

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending_approval',
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

UPDATE public.jobs j
SET owner_user_id = c.user_id
FROM public.companies c
WHERE j.company_id = c.id AND j.owner_user_id IS NULL;

UPDATE public.jobs
SET status = CASE WHEN is_active THEN 'published' ELSE 'closed' END,
    approval_status = CASE WHEN is_active THEN 'approved' ELSE approval_status END,
    approved_at = CASE WHEN is_active THEN COALESCE(approved_at, created_at) ELSE approved_at END,
    expires_at = COALESCE(expires_at, application_deadline)
WHERE status = 'pending_approval';

ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_status_check;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_status_check
  CHECK (status IN ('draft', 'pending_approval', 'published', 'rejected', 'closed', 'expired')) NOT VALID;
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_approval_status_check;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_approval_status_check
  CHECK (approval_status IN ('pending', 'approved', 'rejected')) NOT VALID;

ALTER TABLE public.job_applications
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS form_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS gateway text,
  ADD COLUMN IF NOT EXISTS gateway_transaction_id text,
  ADD COLUMN IF NOT EXISTS subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS failed_at timestamptz,
  ADD COLUMN IF NOT EXISTS failure_reason text,
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'dashboard',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'queued',
  ADD COLUMN IF NOT EXISTS entity_type text,
  ADD COLUMN IF NOT EXISTS entity_id uuid,
  ADD COLUMN IF NOT EXISTS email_to text,
  ADD COLUMN IF NOT EXISTS read_at timestamptz,
  ADD COLUMN IF NOT EXISTS sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_channel_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_channel_check
  CHECK (channel IN ('dashboard', 'email')) NOT VALID;
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_status_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_status_check
  CHECK (status IN ('queued', 'sent', 'failed', 'read')) NOT VALID;

CREATE UNIQUE INDEX IF NOT EXISTS payments_gateway_transaction_unique
  ON public.payments(gateway, gateway_transaction_id)
  WHERE gateway_transaction_id IS NOT NULL;

-- Remove client-writable payment creation and harden application state changes.
DROP POLICY IF EXISTS "Users can create payments" ON public.payments;
DROP POLICY IF EXISTS "Users can apply for jobs" ON public.job_applications;
DROP POLICY IF EXISTS "Users can update their applications" ON public.job_applications;
CREATE POLICY "Students submit job applications"
ON public.job_applications FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND public.is_account_active()
  AND status = 'submitted'
  AND EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = job_applications.job_id
      AND j.status = 'published'
      AND j.approval_status = 'approved'
      AND j.is_active = true
      AND j.deleted_at IS NULL
      AND (j.expires_at IS NULL OR j.expires_at > now())
  )
);
CREATE POLICY "Students withdraw job applications"
ON public.job_applications FOR UPDATE TO authenticated
USING (auth.uid() = user_id AND status IN ('submitted', 'screening'))
WITH CHECK (auth.uid() = user_id AND status = 'withdrawn');
DROP POLICY IF EXISTS "Admins update job applications" ON public.job_applications;
CREATE POLICY "Admins update job applications"
ON public.job_applications FOR UPDATE TO authenticated
USING (public.is_platform_admin())
WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS "Anyone can view active jobs" ON public.jobs;
DROP POLICY IF EXISTS "Companies can manage their jobs" ON public.jobs;
CREATE POLICY "Public can view approved jobs"
ON public.jobs FOR SELECT TO anon, authenticated
USING (
  (status = 'published' AND approval_status = 'approved' AND is_active = true AND deleted_at IS NULL
    AND (expires_at IS NULL OR expires_at > now()))
  OR ((owner_user_id = auth.uid() OR public.is_platform_admin()) AND deleted_at IS NULL)
);
CREATE POLICY "Authorized owners create jobs"
ON public.jobs FOR INSERT TO authenticated
WITH CHECK (
  public.is_platform_admin()
  OR (
    public.is_account_active()
    AND owner_user_id = auth.uid()
    AND public.has_permission(auth.uid(), 'job.post')
    AND status IN ('draft', 'pending_approval')
  )
);
CREATE POLICY "Authorized owners update jobs"
ON public.jobs FOR UPDATE TO authenticated
USING (
  owner_user_id = auth.uid() AND public.has_permission(auth.uid(), 'job.post')
  OR public.is_platform_admin()
)
WITH CHECK (
  owner_user_id = auth.uid() AND public.has_permission(auth.uid(), 'job.post')
  OR public.is_platform_admin()
);

-- Job owners can see applicants only while their subscription is valid.
DROP POLICY IF EXISTS "Users can view their applications" ON public.job_applications;
CREATE POLICY "Applicants and subscribed owners view job applications"
ON public.job_applications FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR public.is_platform_admin()
  OR EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = job_applications.job_id
      AND j.owner_user_id = auth.uid()
      AND public.has_permission(auth.uid(), 'lead.view')
      AND public.has_active_subscription(auth.uid(), NULL, NULL, NULL)
  )
);

-- ---------------------------------------------------------------------------
-- Core modular entities
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.college_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id uuid NOT NULL REFERENCES public.institutes(id),
  applicant_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  program_interest text,
  intake text,
  message text,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  form_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'reviewing', 'contacted', 'accepted', 'rejected', 'withdrawn')),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.mentor_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id uuid NOT NULL REFERENCES public.mentors(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  session_type text NOT NULL DEFAULT 'one_to_one'
    CHECK (session_type IN ('one_to_one', 'group')),
  duration_minutes integer NOT NULL DEFAULT 60 CHECK (duration_minutes BETWEEN 15 AND 480),
  capacity integer NOT NULL DEFAULT 1 CHECK (capacity > 0),
  price numeric(12,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  currency text NOT NULL DEFAULT 'NPR',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.mentor_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id uuid NOT NULL REFERENCES public.mentors(id),
  mentor_service_id uuid REFERENCES public.mentor_services(id),
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scheduled_start timestamptz NOT NULL,
  scheduled_end timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'declined', 'completed', 'cancelled', 'no_show')),
  payment_status text NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'success', 'failed', 'refunded', 'not_required')),
  amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'NPR',
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  notes text,
  form_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CHECK (scheduled_end > scheduled_start)
);

CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organizer_type text NOT NULL DEFAULT 'user'
    CHECK (organizer_type IN ('user', 'college', 'mentor', 'company')),
  organizer_id uuid,
  title text NOT NULL,
  slug text,
  description text,
  event_type text NOT NULL DEFAULT 'free' CHECK (event_type IN ('free', 'paid')),
  format text NOT NULL DEFAULT 'offline' CHECK (format IN ('online', 'offline', 'hybrid')),
  location text,
  meeting_url text,
  cover_image_url text,
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  registration_deadline timestamptz,
  capacity integer CHECK (capacity IS NULL OR capacity > 0),
  ticket_price numeric(12,2) NOT NULL DEFAULT 0 CHECK (ticket_price >= 0),
  currency text NOT NULL DEFAULT 'NPR',
  status text NOT NULL DEFAULT 'pending_approval'
    CHECK (status IN ('draft', 'pending_approval', 'approved', 'published', 'rejected', 'cancelled', 'completed')),
  approval_status text NOT NULL DEFAULT 'pending'
    CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  is_active boolean NOT NULL DEFAULT false,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  rejection_reason text,
  is_featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CHECK (end_date > start_date)
);

CREATE TABLE IF NOT EXISTS public.event_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'cancelled', 'attended', 'refunded')),
  payment_status text NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'success', 'failed', 'refunded', 'not_required')),
  ticket_quantity integer NOT NULL DEFAULT 1 CHECK (ticket_quantity BETWEEN 1 AND 10),
  total_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  form_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  registered_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (event_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.course_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  destination_url text NOT NULL,
  referrer text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  clicked_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL
    CHECK (source_type IN ('college_application', 'mentor_booking', 'job_application', 'event_registration', 'contact_query')),
  source_id uuid NOT NULL,
  owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_type text,
  organization_id uuid,
  applicant_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'viewed', 'contacted', 'qualified', 'converted', 'closed')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (source_type, source_id)
);

CREATE TABLE IF NOT EXISTS public.advertisements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  placement text NOT NULL,
  image_url text,
  destination_url text,
  target_url text,
  sponsor_name text,
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  priority integer NOT NULL DEFAULT 0,
  target_locations text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'scheduled', 'active', 'paused', 'expired')),
  is_active boolean NOT NULL DEFAULT false,
  impressions bigint NOT NULL DEFAULT 0,
  clicks bigint NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CHECK (end_date > start_date)
);

CREATE TABLE IF NOT EXISTS public.featured_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('college', 'mentor', 'course', 'job', 'event')),
  entity_id uuid NOT NULL,
  title text,
  placement text NOT NULL DEFAULT 'homepage',
  priority integer NOT NULL DEFAULT 0,
  start_date timestamptz NOT NULL DEFAULT now(),
  end_date timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (entity_type, entity_id, placement)
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  old_data jsonb,
  new_data jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.module_form_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module text NOT NULL CHECK (module IN ('college', 'mentor', 'job', 'event')),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  schema jsonb NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (module, version)
);

CREATE TABLE IF NOT EXISTS public.module_form_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module text NOT NULL CHECK (module IN ('college', 'mentor', 'job', 'event')),
  idempotency_key text NOT NULL,
  form_version integer NOT NULL DEFAULT 1,
  domain_submission_id uuid,
  response jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, module, idempotency_key)
);

CREATE INDEX IF NOT EXISTS college_applications_institute_idx ON public.college_applications(institute_id, status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS college_applications_applicant_idx ON public.college_applications(applicant_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS mentor_bookings_mentor_idx ON public.mentor_bookings(mentor_id, scheduled_start);
CREATE INDEX IF NOT EXISTS mentor_bookings_student_idx ON public.mentor_bookings(student_id, scheduled_start);
CREATE UNIQUE INDEX IF NOT EXISTS events_slug_unique ON public.events(lower(slug)) WHERE slug IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS events_listing_idx ON public.events(status, start_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS leads_owner_idx ON public.leads(owner_user_id, status, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS ads_active_idx ON public.advertisements(placement, priority DESC, start_date, end_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS featured_active_idx ON public.featured_items(placement, priority DESC, start_date, end_date) WHERE is_active AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS module_form_rate_idx ON public.module_form_submissions(user_id, module, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_queue_idx ON public.notifications(channel, status, created_at)
  WHERE status = 'queued' AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS notifications_recipient_idx ON public.notifications(recipient_id, is_read, created_at DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS payments_user_status_idx ON public.payments(user_id, status, created_at DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS jobs_public_listing_idx ON public.jobs(status, is_active, expires_at)
  WHERE deleted_at IS NULL;

CREATE OR REPLACE FUNCTION public.is_valid_partner_course_url(_url text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT _url IS NOT NULL
    AND _url ~ '^https://learn[.]merotalent[.]com(?:/[^[:space:]]*)?(?:[?][^[:space:]#]*)?(?:#[^[:space:]]*)?$'
$$;

ALTER TABLE public.courses DROP CONSTRAINT IF EXISTS courses_partner_redirect_check;
ALTER TABLE public.courses ADD CONSTRAINT courses_partner_redirect_check
  CHECK (NOT is_partnered OR public.is_valid_partner_course_url(redirect_url)) NOT VALID;

-- ---------------------------------------------------------------------------
-- Legacy schema objects present in generated types/current screens but absent
-- from older migrations. IF NOT EXISTS keeps existing deployments compatible.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.institute_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id uuid NOT NULL REFERENCES public.institutes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  can_edit_profile boolean NOT NULL DEFAULT false,
  can_manage_courses boolean NOT NULL DEFAULT false,
  can_post_notices boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institute_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.mentor_trial_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id uuid NOT NULL UNIQUE REFERENCES public.mentors(id) ON DELETE CASCADE,
  free_trial_enabled boolean NOT NULL DEFAULT false,
  free_trial_type text NOT NULL DEFAULT 'one_session',
  free_trial_duration_minutes integer NOT NULL DEFAULT 30,
  trial_days integer NOT NULL DEFAULT 7,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mentor_trial_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id uuid NOT NULL REFERENCES public.mentors(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trial_used boolean NOT NULL DEFAULT false,
  trial_started_at timestamptz,
  trial_ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (mentor_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.course_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  video_url text NOT NULL,
  duration_seconds integer,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id uuid NOT NULL REFERENCES public.mentors(id) ON DELETE CASCADE,
  mentee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (mentor_id, mentee_id)
);

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 10000),
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS read_at timestamptz;

ALTER TABLE public.institute_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_trial_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_trial_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Institute owners and assigned admins view administrators"
ON public.institute_admins FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_platform_admin()
  OR EXISTS (
    SELECT 1 FROM public.institutes i
    WHERE i.id = institute_admins.institute_id AND i.owner_user_id = auth.uid()
  )
);
CREATE POLICY "Institute owners manage administrators"
ON public.institute_admins FOR ALL TO authenticated
USING (
  public.is_platform_admin()
  OR EXISTS (
    SELECT 1 FROM public.institutes i
    WHERE i.id = institute_admins.institute_id AND i.owner_user_id = auth.uid()
  )
)
WITH CHECK (
  public.is_platform_admin()
  OR EXISTS (
    SELECT 1 FROM public.institutes i
    WHERE i.id = institute_admins.institute_id AND i.owner_user_id = auth.uid()
  )
);

CREATE POLICY "Public can read approved mentor trial settings"
ON public.mentor_trial_settings FOR SELECT TO anon, authenticated
USING (EXISTS (
  SELECT 1 FROM public.mentors m
  WHERE m.id = mentor_trial_settings.mentor_id
    AND m.approval_status = 'approved'
    AND m.deleted_at IS NULL
));
CREATE POLICY "Mentor owners manage trial settings"
ON public.mentor_trial_settings FOR ALL TO authenticated
USING (public.is_platform_admin() OR EXISTS (
  SELECT 1 FROM public.mentors m
  WHERE m.id = mentor_trial_settings.mentor_id AND m.user_id = auth.uid()
))
WITH CHECK (public.is_platform_admin() OR EXISTS (
  SELECT 1 FROM public.mentors m
  WHERE m.id = mentor_trial_settings.mentor_id AND m.user_id = auth.uid()
));

CREATE POLICY "Users view own mentor trial usage"
ON public.mentor_trial_usage FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_platform_admin() OR EXISTS (
  SELECT 1 FROM public.mentors m
  WHERE m.id = mentor_trial_usage.mentor_id AND m.user_id = auth.uid()
));
CREATE POLICY "Users begin own mentor trials"
ON public.mentor_trial_usage FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND public.is_account_active());
CREATE POLICY "Users update own mentor trials"
ON public.mentor_trial_usage FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR public.is_platform_admin())
WITH CHECK (user_id = auth.uid() OR public.is_platform_admin());

DROP POLICY IF EXISTS "Users begin own mentor trials" ON public.mentor_trial_usage;
DROP POLICY IF EXISTS "Users update own mentor trials" ON public.mentor_trial_usage;

CREATE POLICY "Users view videos for visible lessons"
ON public.course_videos FOR SELECT TO anon, authenticated
USING (EXISTS (
  SELECT 1
  FROM public.lessons l
  JOIN public.course_modules cm ON cm.id = l.module_id
  JOIN public.courses c ON c.id = cm.course_id
  WHERE l.id = course_videos.lesson_id
    AND (c.is_published = true OR public.is_platform_admin())
));
CREATE POLICY "Course managers manage videos"
ON public.course_videos FOR ALL TO authenticated
USING (public.is_platform_admin() OR uploaded_by = auth.uid())
WITH CHECK (public.is_platform_admin() OR uploaded_by = auth.uid());

CREATE POLICY "Conversation participants can read"
ON public.conversations FOR SELECT TO authenticated
USING (
  mentee_id = auth.uid()
  OR public.is_platform_admin()
  OR EXISTS (SELECT 1 FROM public.mentors m WHERE m.id = conversations.mentor_id AND m.user_id = auth.uid())
);
CREATE POLICY "Booked users can create conversations"
ON public.conversations FOR INSERT TO authenticated
WITH CHECK (
  mentee_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.id = conversations.appointment_id
      AND a.student_id = auth.uid()
      AND a.mentor_id = conversations.mentor_id
      AND a.status = 'confirmed'
      AND a.payment_status IN ('success', 'not_required')
  )
);
CREATE POLICY "Conversation participants can update"
ON public.conversations FOR UPDATE TO authenticated
USING (
  mentee_id = auth.uid()
  OR public.is_platform_admin()
  OR EXISTS (SELECT 1 FROM public.mentors m WHERE m.id = conversations.mentor_id AND m.user_id = auth.uid())
)
WITH CHECK (
  mentee_id = auth.uid()
  OR public.is_platform_admin()
  OR EXISTS (SELECT 1 FROM public.mentors m WHERE m.id = conversations.mentor_id AND m.user_id = auth.uid())
);

CREATE POLICY "Conversation participants read messages"
ON public.messages FOR SELECT TO authenticated
USING (sender_id = auth.uid() OR receiver_id = auth.uid() OR public.is_platform_admin());
CREATE POLICY "Conversation participants send messages"
ON public.messages FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND sender_id <> receiver_id
  AND EXISTS (
    SELECT 1 FROM public.conversations c
    JOIN public.mentors m ON m.id = c.mentor_id
    WHERE c.id = messages.conversation_id
      AND c.is_active
      AND ((c.mentee_id = sender_id AND m.user_id = receiver_id)
        OR (m.user_id = sender_id AND c.mentee_id = receiver_id))
  )
);
CREATE POLICY "Recipients mark messages read"
ON public.messages FOR UPDATE TO authenticated
USING (receiver_id = auth.uid())
WITH CHECK (receiver_id = auth.uid());

-- Add conversation relationships to the controlled profile policy without
-- reopening email/phone visibility to every authenticated account.
DROP POLICY IF EXISTS "Users can view own profile or public mentors" ON public.profiles;
CREATE POLICY "Users and admins view private profiles"
ON public.profiles FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR public.is_platform_admin()
);

-- ---------------------------------------------------------------------------
-- RLS for modular entities
-- ---------------------------------------------------------------------------

ALTER TABLE public.college_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.featured_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_form_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_form_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Applicants view own college applications"
ON public.college_applications FOR SELECT TO authenticated
USING (
  applicant_id = auth.uid()
  OR public.is_platform_admin()
  OR EXISTS (
    SELECT 1 FROM public.institutes i
    WHERE i.id = college_applications.institute_id
      AND i.owner_user_id = auth.uid()
      AND public.has_permission(auth.uid(), 'lead.view')
      AND public.has_active_subscription(auth.uid(), 'college', i.id, NULL)
  )
);
CREATE POLICY "Students withdraw college applications"
ON public.college_applications FOR UPDATE TO authenticated
USING (applicant_id = auth.uid() AND status IN ('submitted', 'reviewing'))
WITH CHECK (applicant_id = auth.uid() AND status = 'withdrawn');
CREATE POLICY "Admins update college applications"
ON public.college_applications FOR UPDATE TO authenticated
USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

CREATE POLICY "Public views approved mentor services"
ON public.mentor_services FOR SELECT TO anon, authenticated
USING (
  (is_active = true AND deleted_at IS NULL AND EXISTS (
    SELECT 1 FROM public.mentors m
    WHERE m.id = mentor_services.mentor_id
      AND m.approval_status = 'approved'
      AND m.is_available = true
      AND m.deleted_at IS NULL
  ))
  OR EXISTS (SELECT 1 FROM public.mentors m WHERE m.id = mentor_services.mentor_id AND m.user_id = auth.uid())
  OR public.is_platform_admin()
);
CREATE POLICY "Mentor owners create services"
ON public.mentor_services FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.mentors m
  WHERE m.id = mentor_services.mentor_id
    AND m.user_id = auth.uid()
    AND public.has_permission(auth.uid(), 'mentor.manage')
) OR public.is_platform_admin());
CREATE POLICY "Mentor owners update services"
ON public.mentor_services FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.mentors m
  WHERE m.id = mentor_services.mentor_id AND m.user_id = auth.uid()
) OR public.is_platform_admin())
WITH CHECK (EXISTS (
  SELECT 1 FROM public.mentors m
  WHERE m.id = mentor_services.mentor_id AND m.user_id = auth.uid()
) OR public.is_platform_admin());

CREATE POLICY "Booking participants view mentor bookings"
ON public.mentor_bookings FOR SELECT TO authenticated
USING (
  student_id = auth.uid()
  OR public.is_platform_admin()
  OR EXISTS (SELECT 1 FROM public.mentors m WHERE m.id = mentor_bookings.mentor_id AND m.user_id = auth.uid())
);
CREATE POLICY "Mentors and admins update mentor bookings"
ON public.mentor_bookings FOR UPDATE TO authenticated
USING (public.is_platform_admin() OR EXISTS (
  SELECT 1 FROM public.mentors m WHERE m.id = mentor_bookings.mentor_id AND m.user_id = auth.uid()
))
WITH CHECK (public.is_platform_admin() OR EXISTS (
  SELECT 1 FROM public.mentors m WHERE m.id = mentor_bookings.mentor_id AND m.user_id = auth.uid()
));

CREATE POLICY "Public views published events"
ON public.events FOR SELECT TO anon, authenticated
USING (
  (status IN ('approved', 'published') AND approval_status = 'approved' AND is_active = true
    AND deleted_at IS NULL AND end_date > now())
  OR organizer_user_id = auth.uid()
  OR public.is_platform_admin()
);
CREATE POLICY "Authorized organizers create events"
ON public.events FOR INSERT TO authenticated
WITH CHECK (
  public.is_platform_admin()
  OR (
    public.is_account_active()
    AND organizer_user_id = auth.uid()
    AND public.has_permission(auth.uid(), 'event.organize')
    AND status IN ('draft', 'pending_approval')
    AND approval_status = 'pending'
    AND is_active = false
    AND is_featured = false
  )
);
CREATE POLICY "Authorized organizers update events"
ON public.events FOR UPDATE TO authenticated
USING (
  organizer_user_id = auth.uid() AND public.has_permission(auth.uid(), 'event.organize')
  OR public.is_platform_admin()
)
WITH CHECK (
  organizer_user_id = auth.uid() AND public.has_permission(auth.uid(), 'event.organize')
  OR public.is_platform_admin()
);

CREATE POLICY "Registrants and subscribed organizers view event registrations"
ON public.event_registrations FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_platform_admin()
  OR EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_registrations.event_id
      AND e.organizer_user_id = auth.uid()
      AND public.has_permission(auth.uid(), 'lead.view')
      AND public.has_active_subscription(auth.uid(), NULL, NULL, NULL)
  )
);
CREATE POLICY "Admins update event registrations"
ON public.event_registrations FOR UPDATE TO authenticated
USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

CREATE POLICY "Users view own course referrals"
ON public.course_referrals FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_platform_admin());
CREATE POLICY "Authenticated users record partnered course referrals"
ON public.course_referrals FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND public.is_account_active()
  AND public.is_valid_partner_course_url(destination_url)
  AND EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = course_referrals.course_id
      AND c.is_partnered = true
      AND c.is_published = true
      AND c.redirect_url = course_referrals.destination_url
      AND c.deleted_at IS NULL
  )
);

CREATE POLICY "Subscribed owners view leads"
ON public.leads FOR SELECT TO authenticated
USING (
  public.is_platform_admin()
  OR (
    owner_user_id = auth.uid()
    AND public.has_permission(auth.uid(), 'lead.view')
    AND public.has_active_subscription(auth.uid(), NULL, NULL, NULL)
  )
);
CREATE POLICY "Subscribed owners update lead status"
ON public.leads FOR UPDATE TO authenticated
USING (
  public.is_platform_admin()
  OR (
    owner_user_id = auth.uid()
    AND public.has_permission(auth.uid(), 'lead.view')
    AND public.has_active_subscription(auth.uid(), NULL, NULL, NULL)
  )
)
WITH CHECK (
  public.is_platform_admin()
  OR (
    owner_user_id = auth.uid()
    AND public.has_permission(auth.uid(), 'lead.view')
    AND public.has_active_subscription(auth.uid(), NULL, NULL, NULL)
  )
);

CREATE POLICY "Public views active advertisements"
ON public.advertisements FOR SELECT TO anon, authenticated
USING (
  (is_active AND status IN ('scheduled', 'active') AND deleted_at IS NULL
    AND start_date <= now() AND end_date > now())
  OR public.is_platform_admin()
);
CREATE POLICY "Admins create advertisements"
ON public.advertisements FOR INSERT TO authenticated
WITH CHECK (public.is_platform_admin());
CREATE POLICY "Admins update advertisements"
ON public.advertisements FOR UPDATE TO authenticated
USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

CREATE POLICY "Public views active featured items"
ON public.featured_items FOR SELECT TO anon, authenticated
USING (
  (is_active AND deleted_at IS NULL AND start_date <= now()
    AND (end_date IS NULL OR end_date > now()))
  OR public.is_platform_admin()
);
CREATE POLICY "Admins create featured items"
ON public.featured_items FOR INSERT TO authenticated
WITH CHECK (public.is_platform_admin());
CREATE POLICY "Admins update featured items"
ON public.featured_items FOR UPDATE TO authenticated
USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

CREATE POLICY "Admins view audit logs"
ON public.audit_logs FOR SELECT TO authenticated
USING (public.is_platform_admin());

CREATE POLICY "Public reads active form definitions"
ON public.module_form_definitions FOR SELECT TO anon, authenticated
USING (is_active OR public.is_platform_admin());
CREATE POLICY "Admins create form definitions"
ON public.module_form_definitions FOR INSERT TO authenticated
WITH CHECK (public.is_platform_admin());
CREATE POLICY "Admins update form definitions"
ON public.module_form_definitions FOR UPDATE TO authenticated
USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

CREATE POLICY "Users read own module form submissions"
ON public.module_form_submissions FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_platform_admin());

-- Tighten legacy mentor, course, appointment, payment, and notification rules.
DROP POLICY IF EXISTS "Anyone can view available mentors" ON public.mentors;
DROP POLICY IF EXISTS "Mentors can manage their profile" ON public.mentors;
CREATE POLICY "Public views approved mentors"
ON public.mentors FOR SELECT TO anon, authenticated
USING (
  (approval_status = 'approved' AND is_available = true AND deleted_at IS NULL
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = mentors.user_id AND p.account_status = 'active' AND p.deleted_at IS NULL))
  OR user_id = auth.uid()
  OR public.is_platform_admin()
);
CREATE POLICY "Mentors create own profile"
ON public.mentors FOR INSERT TO authenticated
WITH CHECK (
  public.is_platform_admin()
  OR (
    user_id = auth.uid()
    AND public.has_permission(auth.uid(), 'mentor.manage')
    AND approval_status = 'pending'
    AND is_featured = false
    AND commission_rate = 0
  )
);
CREATE POLICY "Mentors update own profile"
ON public.mentors FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR public.is_platform_admin())
WITH CHECK (user_id = auth.uid() OR public.is_platform_admin());

DROP POLICY IF EXISTS "Anyone can view published courses" ON public.courses;
DROP POLICY IF EXISTS "Admins can manage all courses" ON public.courses;
CREATE POLICY "Public views published course listings"
ON public.courses FOR SELECT TO anon, authenticated
USING (
  (is_published = true AND deleted_at IS NULL
    AND (is_partnered = false OR public.is_valid_partner_course_url(redirect_url)))
  OR ((created_by = auth.uid() OR public.is_platform_admin()) AND deleted_at IS NULL)
);
CREATE POLICY "Admins create course listings"
ON public.courses FOR INSERT TO authenticated
WITH CHECK (public.is_platform_admin());
CREATE POLICY "Admins update course listings"
ON public.courses FOR UPDATE TO authenticated
USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS "Users can create appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can update their appointments" ON public.appointments;
CREATE POLICY "Students create pending appointments"
ON public.appointments FOR INSERT TO authenticated
WITH CHECK (
  student_id = auth.uid()
  AND public.is_account_active()
  AND (
    status = 'pending'
    OR (
      status = 'confirmed' AND payment_status = 'not_required'
      AND EXISTS (
        SELECT 1 FROM public.mentor_trial_usage mtu
        WHERE mtu.mentor_id = appointments.mentor_id
          AND mtu.user_id = auth.uid()
          AND mtu.trial_used = true
          AND mtu.trial_started_at > now() - interval '5 minutes'
      )
    )
  )
  AND EXISTS (
    SELECT 1 FROM public.mentors m
    WHERE m.id = appointments.mentor_id
      AND m.approval_status = 'approved'
      AND m.is_available = true
      AND m.deleted_at IS NULL
  )
);
CREATE POLICY "Mentor participants update appointments"
ON public.appointments FOR UPDATE TO authenticated
USING (
  public.is_platform_admin()
  OR student_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.mentors m WHERE m.id = appointments.mentor_id AND m.user_id = auth.uid())
)
WITH CHECK (
  public.is_platform_admin()
  OR student_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.mentors m WHERE m.id = appointments.mentor_id AND m.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Admins can manage payments" ON public.payments;
DROP POLICY IF EXISTS "Users can view their payments" ON public.payments;
CREATE POLICY "Users view active payments"
ON public.payments FOR SELECT TO authenticated
USING ((auth.uid() = user_id AND deleted_at IS NULL) OR public.is_platform_admin());
CREATE POLICY "Admins update payments"
ON public.payments FOR UPDATE TO authenticated
USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS "Admins can send notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view their notifications" ON public.notifications;
CREATE POLICY "Users can view active notifications"
ON public.notifications FOR SELECT TO authenticated
USING (auth.uid() = recipient_id AND deleted_at IS NULL);
CREATE POLICY "Admins create notifications"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (public.is_platform_admin());
CREATE POLICY "Admins update notifications"
ON public.notifications FOR UPDATE TO authenticated
USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
CREATE POLICY "Admins view all notifications"
ON public.notifications FOR SELECT TO authenticated
USING (public.is_platform_admin() AND deleted_at IS NULL);

-- Admin resource policies needed by authenticated admin API clients.
CREATE POLICY "Admins update profiles"
ON public.profiles FOR UPDATE TO authenticated
USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

CREATE POLICY "Admins create payments"
ON public.payments FOR INSERT TO authenticated
WITH CHECK (public.is_platform_admin());

CREATE POLICY "Admins request soft delete colleges"
ON public.institutes FOR DELETE TO authenticated USING (public.is_platform_admin());
CREATE POLICY "Admins request soft delete courses"
ON public.courses FOR DELETE TO authenticated USING (public.is_platform_admin());
CREATE POLICY "Admins request soft delete jobs"
ON public.jobs FOR DELETE TO authenticated USING (public.is_platform_admin());
CREATE POLICY "Admins request soft delete notifications"
ON public.notifications FOR DELETE TO authenticated USING (public.is_platform_admin());

CREATE OR REPLACE FUNCTION public.convert_admin_delete_to_soft_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF public.is_platform_admin(auth.uid()) OR auth.role() = 'service_role' THEN
    EXECUTE format('UPDATE public.%I SET deleted_at = now() WHERE id = $1', TG_TABLE_NAME)
    USING OLD.id;
    RETURN NULL;
  END IF;
  RAISE EXCEPTION 'Soft delete requires an active administrator' USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS soft_delete_institutes ON public.institutes;
CREATE TRIGGER soft_delete_institutes BEFORE DELETE ON public.institutes
FOR EACH ROW EXECUTE FUNCTION public.convert_admin_delete_to_soft_delete();
DROP TRIGGER IF EXISTS soft_delete_courses ON public.courses;
CREATE TRIGGER soft_delete_courses BEFORE DELETE ON public.courses
FOR EACH ROW EXECUTE FUNCTION public.convert_admin_delete_to_soft_delete();
DROP TRIGGER IF EXISTS soft_delete_jobs ON public.jobs;
CREATE TRIGGER soft_delete_jobs BEFORE DELETE ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.convert_admin_delete_to_soft_delete();
DROP TRIGGER IF EXISTS soft_delete_notifications ON public.notifications;
CREATE TRIGGER soft_delete_notifications BEFORE DELETE ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.convert_admin_delete_to_soft_delete();

-- ---------------------------------------------------------------------------
-- Invariant and anti-escalation triggers
-- ---------------------------------------------------------------------------

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.companies DROP CONSTRAINT IF EXISTS companies_status_check;
ALTER TABLE public.companies ADD CONSTRAINT companies_status_check
  CHECK (status IN ('pending', 'approved', 'suspended', 'rejected')) NOT VALID;
UPDATE public.companies SET status = 'approved' WHERE is_verified = true AND status = 'pending';

DROP POLICY IF EXISTS "Company owners can manage their company" ON public.companies;
DROP POLICY IF EXISTS "Anyone can view verified companies" ON public.companies;
CREATE POLICY "Public views approved companies"
ON public.companies FOR SELECT TO anon, authenticated
USING (
  (is_verified = true AND status = 'approved' AND deleted_at IS NULL)
  OR user_id = auth.uid() OR public.is_platform_admin()
);
CREATE POLICY "Company owners create profiles"
ON public.companies FOR INSERT TO authenticated
WITH CHECK (
  public.is_platform_admin()
  OR (user_id = auth.uid() AND public.is_account_active() AND public.has_permission(auth.uid(), 'job.post'))
);
CREATE POLICY "Company owners update profiles"
ON public.companies FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR public.is_platform_admin())
WITH CHECK (user_id = auth.uid() OR public.is_platform_admin());

CREATE OR REPLACE FUNCTION public.protect_profile_admin_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF EXISTS (
      SELECT 1 FROM public.user_roles ur WHERE ur.user_id = OLD.user_id AND ur.role = 'admin'
    )
    AND OLD.account_status = 'active' AND OLD.deleted_at IS NULL
    AND (NEW.account_status <> 'active' OR NEW.deleted_at IS NOT NULL)
    AND NOT EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.profiles p ON p.user_id = ur.user_id
      WHERE ur.role = 'admin' AND ur.user_id <> OLD.user_id
        AND p.account_status = 'active' AND p.deleted_at IS NULL
    )
  THEN
    RAISE EXCEPTION 'The final active Super Admin cannot be deactivated' USING ERRCODE = 'P0001';
  END IF;

  IF auth.role() <> 'service_role' AND NOT public.is_platform_admin(auth.uid()) THEN
    NEW.user_id := OLD.user_id;
    NEW.email := OLD.email;
    NEW.account_status := OLD.account_status;
    NEW.email_verified_at := OLD.email_verified_at;
    NEW.deleted_at := OLD.deleted_at;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_admin_fields_trigger ON public.profiles;
CREATE TRIGGER protect_profile_admin_fields_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_admin_fields();

CREATE OR REPLACE FUNCTION public.protect_company_admin_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.is_platform_admin(auth.uid()) THEN
    IF TG_OP = 'INSERT' THEN
      NEW.is_verified := false;
      NEW.status := 'pending';
      NEW.deleted_at := NULL;
    ELSE
      NEW.user_id := OLD.user_id;
      NEW.is_verified := OLD.is_verified;
      NEW.status := OLD.status;
      NEW.deleted_at := OLD.deleted_at;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_company_admin_fields_trigger ON public.companies;
CREATE TRIGGER protect_company_admin_fields_trigger
BEFORE INSERT OR UPDATE ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.protect_company_admin_fields();

CREATE OR REPLACE FUNCTION public.protect_college_admin_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.is_platform_admin(auth.uid()) THEN
    IF TG_OP = 'INSERT' THEN
      NEW.status := CASE WHEN NEW.status = 'draft' THEN 'draft' ELSE 'pending' END;
      NEW.is_verified := false;
      NEW.is_featured := false;
      NEW.ranking := NULL;
      NEW.featured_until := NULL;
      NEW.deleted_at := NULL;
    ELSE
      NEW.owner_user_id := OLD.owner_user_id;
      NEW.status := OLD.status;
      NEW.is_verified := OLD.is_verified;
      NEW.is_featured := OLD.is_featured;
      NEW.ranking := OLD.ranking;
      NEW.featured_until := OLD.featured_until;
      NEW.deleted_at := OLD.deleted_at;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_college_admin_fields_trigger ON public.institutes;
CREATE TRIGGER protect_college_admin_fields_trigger
BEFORE INSERT OR UPDATE ON public.institutes
FOR EACH ROW EXECUTE FUNCTION public.protect_college_admin_fields();

CREATE OR REPLACE FUNCTION public.protect_mentor_admin_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.is_platform_admin(auth.uid()) THEN
    IF TG_OP = 'INSERT' THEN
      NEW.approval_status := 'pending';
      NEW.commission_rate := 0;
      NEW.is_featured := false;
      NEW.deleted_at := NULL;
    ELSE
      NEW.user_id := OLD.user_id;
      NEW.approval_status := OLD.approval_status;
      NEW.commission_rate := OLD.commission_rate;
      NEW.is_featured := OLD.is_featured;
      NEW.deleted_at := OLD.deleted_at;
      NEW.rating := OLD.rating;
      NEW.total_sessions := OLD.total_sessions;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_mentor_admin_fields_trigger ON public.mentors;
CREATE TRIGGER protect_mentor_admin_fields_trigger
BEFORE INSERT OR UPDATE ON public.mentors
FOR EACH ROW EXECUTE FUNCTION public.protect_mentor_admin_fields();

CREATE OR REPLACE FUNCTION public.protect_job_approval_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.is_platform_admin(auth.uid()) THEN
    IF NEW.company_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = NEW.company_id AND c.user_id = auth.uid() AND c.deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'Job company is not owned by the posting user' USING ERRCODE = '42501';
    END IF;
    IF TG_OP = 'INSERT' THEN
      NEW.owner_user_id := auth.uid();
      NEW.status := CASE WHEN NEW.status = 'draft' THEN 'draft' ELSE 'pending_approval' END;
      NEW.approval_status := 'pending';
      NEW.is_active := false;
      NEW.is_featured := false;
      NEW.approved_by := NULL;
      NEW.approved_at := NULL;
      NEW.rejection_reason := NULL;
      NEW.deleted_at := NULL;
    ELSE
      NEW.owner_user_id := OLD.owner_user_id;
      NEW.is_featured := OLD.is_featured;
      NEW.deleted_at := OLD.deleted_at;
      IF OLD.status = 'published' THEN
        NEW.status := 'pending_approval';
        NEW.approval_status := 'pending';
        NEW.is_active := false;
        NEW.approved_by := NULL;
        NEW.approved_at := NULL;
      ELSE
        NEW.status := CASE WHEN NEW.status = 'draft' THEN 'draft' ELSE 'pending_approval' END;
        NEW.approval_status := 'pending';
        NEW.is_active := false;
        NEW.approved_by := OLD.approved_by;
        NEW.approved_at := OLD.approved_at;
      END IF;
      NEW.rejection_reason := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_job_approval_fields_trigger ON public.jobs;
CREATE TRIGGER protect_job_approval_fields_trigger
BEFORE INSERT OR UPDATE ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.protect_job_approval_fields();

CREATE OR REPLACE FUNCTION public.protect_event_approval_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.is_platform_admin(auth.uid()) THEN
    IF NEW.organizer_type = 'user' AND NEW.organizer_id IS NOT NULL THEN
      RAISE EXCEPTION 'User events cannot claim an organization' USING ERRCODE = '22023';
    ELSIF NEW.organizer_type = 'college' AND NOT EXISTS (
      SELECT 1 FROM public.institutes i
      WHERE i.id = NEW.organizer_id AND i.owner_user_id = auth.uid() AND i.deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'Event college is not owned by the organizer' USING ERRCODE = '42501';
    ELSIF NEW.organizer_type = 'mentor' AND NOT EXISTS (
      SELECT 1 FROM public.mentors m
      WHERE m.id = NEW.organizer_id AND m.user_id = auth.uid() AND m.deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'Event mentor profile is not owned by the organizer' USING ERRCODE = '42501';
    ELSIF NEW.organizer_type = 'company' AND NOT EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = NEW.organizer_id AND c.user_id = auth.uid() AND c.deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'Event company is not owned by the organizer' USING ERRCODE = '42501';
    END IF;
    IF TG_OP = 'INSERT' THEN
      NEW.organizer_user_id := auth.uid();
      NEW.status := CASE WHEN NEW.status = 'draft' THEN 'draft' ELSE 'pending_approval' END;
      NEW.approval_status := 'pending';
      NEW.is_active := false;
      NEW.is_featured := false;
      NEW.approved_by := NULL;
      NEW.approved_at := NULL;
      NEW.rejection_reason := NULL;
      NEW.deleted_at := NULL;
    ELSE
      NEW.organizer_user_id := OLD.organizer_user_id;
      NEW.status := CASE WHEN NEW.status = 'draft' THEN 'draft' ELSE 'pending_approval' END;
      NEW.approval_status := 'pending';
      NEW.is_active := false;
      NEW.is_featured := OLD.is_featured;
      NEW.approved_by := NULL;
      NEW.approved_at := NULL;
      NEW.rejection_reason := NULL;
      NEW.deleted_at := OLD.deleted_at;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_event_approval_fields_trigger ON public.events;
CREATE TRIGGER protect_event_approval_fields_trigger
BEFORE INSERT OR UPDATE ON public.events
FOR EACH ROW EXECUTE FUNCTION public.protect_event_approval_fields();

CREATE OR REPLACE FUNCTION public.secure_job_application_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.is_platform_admin(auth.uid()) THEN
    IF NEW.user_id <> auth.uid() THEN
      RAISE EXCEPTION 'Applicant identity mismatch' USING ERRCODE = '42501';
    END IF;
    NEW.status := 'submitted';
    NEW.skills_match_score := NULL;
    NEW.notes := NULL;
    NEW.deleted_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS secure_job_application_insert_trigger ON public.job_applications;
CREATE TRIGGER secure_job_application_insert_trigger
BEFORE INSERT ON public.job_applications
FOR EACH ROW EXECUTE FUNCTION public.secure_job_application_insert();

CREATE OR REPLACE FUNCTION public.claim_mentor_trial(
  _mentor_id uuid,
  _user_id uuid,
  _requested_duration integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  allowed_duration integer;
  claimed_id uuid;
BEGIN
  SELECT LEAST(GREATEST(_requested_duration, 15), mts.free_trial_duration_minutes)
  INTO allowed_duration
  FROM public.mentor_trial_settings mts
  JOIN public.mentors m ON m.id = mts.mentor_id
  WHERE mts.mentor_id = _mentor_id
    AND mts.free_trial_enabled = true
    AND mts.free_trial_duration_minutes BETWEEN 15 AND 480
    AND m.approval_status = 'approved'
    AND m.is_available = true
    AND m.deleted_at IS NULL;

  IF allowed_duration IS NULL THEN RETURN NULL; END IF;

  INSERT INTO public.mentor_trial_usage(
    mentor_id, user_id, trial_used, trial_started_at, trial_ended_at
  ) VALUES (
    _mentor_id, _user_id, true, now(), now() + make_interval(mins => allowed_duration)
  )
  ON CONFLICT (mentor_id, user_id) DO UPDATE SET
    trial_used = true,
    trial_started_at = now(),
    trial_ended_at = now() + make_interval(mins => allowed_duration)
  WHERE public.mentor_trial_usage.trial_used = false
  RETURNING id INTO claimed_id;

  IF claimed_id IS NULL THEN RETURN NULL; END IF;
  RETURN allowed_duration;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_mentor_trial(uuid, uuid, integer) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.secure_legacy_appointment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  mentor_owner uuid;
  rate numeric(12,2);
  approved boolean;
  requested_trial boolean;
  claimed_trial_duration integer;
BEGIN
  requested_trial := COALESCE(NEW.payment_status = 'trial', false);
  SELECT m.user_id, COALESCE(m.hourly_rate, 0),
    (m.approval_status = 'approved' AND m.is_available AND m.deleted_at IS NULL)
  INTO mentor_owner, rate, approved
  FROM public.mentors m WHERE m.id = NEW.mentor_id;

  IF mentor_owner IS NULL OR NOT approved THEN
    RAISE EXCEPTION 'Mentor is not available for booking' USING ERRCODE = 'P0001';
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF auth.role() <> 'service_role' AND NOT public.is_platform_admin(auth.uid()) AND NEW.student_id <> auth.uid() THEN
      RAISE EXCEPTION 'Booking identity mismatch' USING ERRCODE = '42501';
    END IF;
    NEW.duration_minutes := LEAST(GREATEST(COALESCE(NEW.duration_minutes, 60), 15), 480);
    IF requested_trial THEN
      claimed_trial_duration := public.claim_mentor_trial(NEW.mentor_id, NEW.student_id, NEW.duration_minutes);
      IF claimed_trial_duration IS NULL THEN
        RAISE EXCEPTION 'Free trial is unavailable or has already been used' USING ERRCODE = 'P0001';
      END IF;
      NEW.duration_minutes := claimed_trial_duration;
      NEW.amount := 0;
      NEW.status := 'confirmed';
      NEW.payment_status := 'not_required';
    ELSE
      NEW.amount := round(rate * NEW.duration_minutes / 60.0, 2);
      NEW.status := 'pending';
      NEW.payment_status := CASE WHEN NEW.amount = 0 THEN 'not_required' ELSE 'pending' END;
    END IF;
    NEW.meeting_link := NULL;
  ELSIF auth.role() <> 'service_role' AND NOT public.is_platform_admin(auth.uid()) THEN
    IF auth.uid() = NEW.student_id THEN
      NEW := OLD;
      NEW.status := 'cancelled';
      NEW.updated_at := now();
    ELSIF auth.uid() = mentor_owner THEN
      NEW.amount := OLD.amount;
      NEW.payment_status := OLD.payment_status;
      NEW.student_id := OLD.student_id;
      NEW.mentor_id := OLD.mentor_id;
    ELSE
      RAISE EXCEPTION 'Not permitted to update this booking' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS secure_legacy_appointment_trigger ON public.appointments;
CREATE TRIGGER secure_legacy_appointment_trigger
BEFORE INSERT OR UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.secure_legacy_appointment();

CREATE OR REPLACE FUNCTION public.protect_notification_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  requested_read boolean;
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.is_platform_admin(auth.uid()) THEN
    requested_read := NEW.is_read;
    NEW := OLD;
    NEW.is_read := requested_read;
    NEW.read_at := CASE WHEN requested_read THEN COALESCE(OLD.read_at, now()) ELSE NULL END;
    NEW.read_at := CASE WHEN requested_read THEN COALESCE(OLD.read_at, now()) ELSE NULL END;
    NEW.status := CASE WHEN requested_read THEN 'read' ELSE OLD.status END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_notification_update_trigger ON public.notifications;
CREATE TRIGGER protect_notification_update_trigger
BEFORE UPDATE ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.protect_notification_update();

CREATE OR REPLACE FUNCTION public.protect_message_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  requested_read boolean;
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.is_platform_admin(auth.uid()) THEN
    requested_read := NEW.is_read;
    NEW := OLD;
    NEW.is_read := requested_read;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_message_update_trigger ON public.messages;
CREATE TRIGGER protect_message_update_trigger
BEFORE UPDATE ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.protect_message_update();

CREATE OR REPLACE FUNCTION public.protect_last_admin_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  removes_admin boolean;
BEGIN
  IF TG_OP = 'DELETE' THEN
    removes_admin := OLD.role = 'admin';
  ELSE
    removes_admin := OLD.role = 'admin' AND (NEW.role <> 'admin' OR NEW.user_id <> OLD.user_id);
  END IF;

  IF removes_admin AND NOT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.profiles p ON p.user_id = ur.user_id
    WHERE ur.role = 'admin' AND ur.id <> OLD.id
      AND p.account_status = 'active' AND p.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'The final Super Admin role cannot be revoked' USING ERRCODE = 'P0001';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DROP TRIGGER IF EXISTS protect_last_admin_role_trigger ON public.user_roles;
CREATE TRIGGER protect_last_admin_role_trigger
BEFORE DELETE OR UPDATE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.protect_last_admin_role();

-- ---------------------------------------------------------------------------
-- Leads, centralized notifications, timestamps, and audit history
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_lead_from_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  lead_source text;
  lead_owner uuid;
  org_type text;
  org_id uuid;
  applicant uuid;
  lead_payload jsonb;
  notification_title text;
BEGIN
  CASE TG_TABLE_NAME
    WHEN 'college_applications' THEN
      lead_source := 'college_application';
      SELECT i.owner_user_id INTO lead_owner FROM public.institutes i WHERE i.id = NEW.institute_id;
      org_type := 'college'; org_id := NEW.institute_id; applicant := NEW.applicant_id;
      lead_payload := NEW.form_data || jsonb_build_object('program_interest', NEW.program_interest, 'intake', NEW.intake);
      notification_title := 'New college application';
    WHEN 'mentor_bookings' THEN
      lead_source := 'mentor_booking';
      SELECT m.user_id INTO lead_owner FROM public.mentors m WHERE m.id = NEW.mentor_id;
      org_type := 'mentor'; org_id := NEW.mentor_id; applicant := NEW.student_id;
      lead_payload := NEW.form_data || jsonb_build_object('scheduled_start', NEW.scheduled_start, 'amount', NEW.amount);
      notification_title := 'New mentor booking';
    WHEN 'job_applications' THEN
      lead_source := 'job_application';
      SELECT COALESCE(j.owner_user_id, c.user_id), COALESCE(j.company_id, j.id)
      INTO lead_owner, org_id
      FROM public.jobs j LEFT JOIN public.companies c ON c.id = j.company_id
      WHERE j.id = NEW.job_id;
      org_type := 'job_owner'; applicant := NEW.user_id;
      lead_payload := NEW.form_data || jsonb_build_object('job_id', NEW.job_id);
      notification_title := 'New job application';
    WHEN 'event_registrations' THEN
      lead_source := 'event_registration';
      SELECT e.organizer_user_id, COALESCE(e.organizer_id, e.id)
      INTO lead_owner, org_id FROM public.events e WHERE e.id = NEW.event_id;
      org_type := 'event_organizer'; applicant := NEW.user_id;
      lead_payload := NEW.form_data || jsonb_build_object('event_id', NEW.event_id, 'ticket_quantity', NEW.ticket_quantity);
      notification_title := 'New event registration';
    WHEN 'contact_queries' THEN
      lead_source := 'contact_query';
      SELECT ur.user_id INTO lead_owner
      FROM public.user_roles ur WHERE ur.role = 'admin'
      ORDER BY ur.created_at, ur.id LIMIT 1;
      org_type := 'platform'; org_id := NULL; applicant := NULL;
      lead_payload := to_jsonb(NEW) - 'response';
      notification_title := 'New contact query';
    ELSE
      RETURN NEW;
  END CASE;

  INSERT INTO public.leads (
    source_type, source_id, owner_user_id, organization_type,
    organization_id, applicant_user_id, payload
  ) VALUES (
    lead_source, NEW.id, lead_owner, org_type,
    org_id, applicant, COALESCE(lead_payload, '{}'::jsonb)
  )
  ON CONFLICT (source_type, source_id) DO NOTHING;

  IF lead_owner IS NOT NULL THEN
    INSERT INTO public.notifications (
      recipient_id, title, message, type, category, channel,
      status, entity_type, entity_id, action_url, metadata
    ) VALUES (
      lead_owner, notification_title,
      'A new submission is available in your MeroTalent dashboard.',
      'info', lead_source, 'dashboard', 'queued', lead_source, NEW.id,
      '/dashboard', jsonb_build_object('source_type', lead_source, 'source_id', NEW.id)
    );

    INSERT INTO public.notifications (
      recipient_id, title, message, type, category, channel,
      status, entity_type, entity_id, email_to, metadata
    )
    SELECT lead_owner, notification_title,
      'A new submission is available in your MeroTalent dashboard.',
      'info', lead_source, 'email', 'queued', lead_source, NEW.id, p.email,
      jsonb_build_object('source_type', lead_source, 'source_id', NEW.id)
    FROM public.profiles p
    WHERE p.user_id = lead_owner AND p.account_status = 'active' AND p.deleted_at IS NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS create_college_application_lead ON public.college_applications;
CREATE TRIGGER create_college_application_lead
AFTER INSERT ON public.college_applications
FOR EACH ROW EXECUTE FUNCTION public.create_lead_from_submission();

DROP TRIGGER IF EXISTS create_mentor_booking_lead ON public.mentor_bookings;
CREATE TRIGGER create_mentor_booking_lead
AFTER INSERT ON public.mentor_bookings
FOR EACH ROW EXECUTE FUNCTION public.create_lead_from_submission();

DROP TRIGGER IF EXISTS create_job_application_lead ON public.job_applications;
CREATE TRIGGER create_job_application_lead
AFTER INSERT ON public.job_applications
FOR EACH ROW EXECUTE FUNCTION public.create_lead_from_submission();

DROP TRIGGER IF EXISTS create_event_registration_lead ON public.event_registrations;
CREATE TRIGGER create_event_registration_lead
AFTER INSERT ON public.event_registrations
FOR EACH ROW EXECUTE FUNCTION public.create_lead_from_submission();

DROP TRIGGER IF EXISTS create_contact_query_lead ON public.contact_queries;
CREATE TRIGGER create_contact_query_lead
AFTER INSERT ON public.contact_queries
FOR EACH ROW EXECUTE FUNCTION public.create_lead_from_submission();

CREATE OR REPLACE FUNCTION public.audit_row_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  old_row jsonb;
  new_row jsonb;
  record_id text;
BEGIN
  old_row := CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END;
  new_row := CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END;
  record_id := COALESCE(new_row ->> 'id', old_row ->> 'id', new_row ->> 'code', old_row ->> 'code');

  INSERT INTO public.audit_logs(actor_user_id, action, entity_type, entity_id, old_data, new_data)
  VALUES (auth.uid(), lower(TG_OP), TG_TABLE_NAME, record_id, old_row, new_row);

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'profiles', 'user_roles', 'permissions', 'role_permissions', 'user_permissions',
    'packages', 'subscriptions', 'institutes', 'companies', 'mentors', 'courses',
    'jobs', 'events', 'payments', 'advertisements', 'featured_items'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', 'audit_' || table_name || '_changes', table_name);
    EXECUTE format(
      'CREATE TRIGGER %I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.audit_row_change()',
      'audit_' || table_name || '_changes', table_name
    );
  END LOOP;
END;
$$;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'packages', 'subscriptions', 'institutes', 'mentor_services', 'mentor_bookings',
    'events', 'event_registrations', 'college_applications', 'leads',
    'advertisements', 'featured_items', 'module_form_definitions', 'conversations'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', 'update_' || table_name || '_updated_at', table_name);
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()',
      'update_' || table_name || '_updated_at', table_name
    );
  END LOOP;
END;
$$;

INSERT INTO public.module_form_definitions(module, version, schema) VALUES
  ('college', 1, '{"fields":["fullName","email","phone","intendedCourse","preferredIntake","message","attachments"]}'::jsonb),
  ('mentor', 1, '{"fields":["scheduledDate","scheduledTime","durationMinutes","notes"]}'::jsonb),
  ('job', 1, '{"fields":["fullName","email","phone","resumeUrl","coverLetter","portfolioUrl"]}'::jsonb),
  ('event', 1, '{"fields":["fullName","email","phone","attendeeCount","message"]}'::jsonb)
ON CONFLICT (module, version) DO UPDATE SET schema = EXCLUDED.schema;

-- ---------------------------------------------------------------------------
-- Auth/access and generated module-form RPCs
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_canonical_media_path(
  _path text,
  _owner_user_id uuid,
  _module text,
  _resource_segment text
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT _path IS NOT NULL
    AND _path !~ '(^|/)[.][.]($|/)'
    AND _path !~ '://'
    AND split_part(_path, '/', 1) = _owner_user_id::text
    AND split_part(_path, '/', 2) = _module
    AND split_part(_path, '/', 3) = _resource_segment
    AND CASE
      WHEN _module IN ('resume', 'job_attachment', 'application_file') THEN
        split_part(_path, '/', 4) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}[.](pdf|doc|docx)$'
      WHEN _module IN (
        'profile_avatar', 'college_logo', 'college_cover', 'college_gallery',
        'mentor_profile', 'event_cover', 'course_thumbnail', 'advertisement'
      ) THEN
        split_part(_path, '/', 4) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}[.](png|jpe?g|webp|avif)$'
      ELSE false
    END
    AND split_part(_path, '/', 5) = ''
$$;

CREATE OR REPLACE FUNCTION public.is_owned_legacy_resume_path(_path text, _owner_user_id uuid)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT _path IS NOT NULL
    AND _path !~ '://'
    AND _path !~ '(^|/)[.][.]($|/)'
    AND split_part(_path, '/', 1) = _owner_user_id::text
    AND split_part(_path, '/', 2) ~ '^resume-[0-9]+[.](pdf|doc|docx)$'
    AND split_part(_path, '/', 3) = ''
$$;

CREATE OR REPLACE FUNCTION public.validate_job_application_media()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.resume_url IS NOT NULL AND NEW.resume_url <> ''
    AND NOT public.is_owned_legacy_resume_path(NEW.resume_url, NEW.user_id)
    AND NOT public.is_canonical_media_path(NEW.resume_url, NEW.user_id, 'job_attachment', NEW.job_id::text)
  THEN
    RAISE EXCEPTION 'Resume path is not owned by the applicant' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_job_application_media_trigger ON public.job_applications;
CREATE TRIGGER validate_job_application_media_trigger
BEFORE INSERT OR UPDATE OF resume_url ON public.job_applications
FOR EACH ROW EXECUTE FUNCTION public.validate_job_application_media();

CREATE OR REPLACE FUNCTION public.get_my_access_context()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH actor AS (
    SELECT p.account_status, p.deleted_at
    FROM public.profiles p WHERE p.user_id = auth.uid()
  ), roles AS (
    SELECT COALESCE(jsonb_agg(ur.role::text ORDER BY ur.role::text), '[]'::jsonb) value
    FROM public.user_roles ur WHERE ur.user_id = auth.uid()
  ), effective_permissions AS (
    SELECT DISTINCT p.code
    FROM public.permissions p
    WHERE public.is_platform_admin(auth.uid())
       OR EXISTS (
         SELECT 1 FROM public.user_roles ur
         JOIN public.role_permissions rp ON rp.role = ur.role
         WHERE ur.user_id = auth.uid() AND rp.permission_id = p.id
       )
       OR EXISTS (
         SELECT 1 FROM public.user_permissions up
         WHERE up.user_id = auth.uid() AND up.permission_id = p.id
           AND (up.expires_at IS NULL OR up.expires_at > now())
       )
  )
  SELECT jsonb_build_object(
    'account_status', CASE
      WHEN auth.uid() IS NULL THEN 'unauthenticated'
      WHEN (SELECT deleted_at FROM actor) IS NOT NULL THEN 'deactivated'
      ELSE COALESCE((SELECT account_status FROM actor), 'pending')
    END,
    'roles', (SELECT value FROM roles),
    'permissions', COALESCE((SELECT jsonb_agg(code ORDER BY code) FROM effective_permissions), '[]'::jsonb)
  )
$$;

REVOKE ALL ON FUNCTION public.get_my_access_context() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_access_context() TO authenticated;

CREATE OR REPLACE FUNCTION public.authorize_media_access(
  p_action text,
  p_module text,
  p_resource_id uuid,
  p_owner_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  actor uuid := auth.uid();
BEGIN
  IF actor IS NULL OR p_action NOT IN ('upload', 'download') THEN
    RETURN false;
  END IF;
  IF public.is_platform_admin(actor) THEN
    RETURN true;
  END IF;
  IF NOT public.is_account_active(actor) OR p_owner_user_id IS NULL THEN
    RETURN false;
  END IF;
  IF p_action = 'upload' AND p_owner_user_id <> actor THEN
    RETURN false;
  END IF;
  IF p_action = 'download' AND p_owner_user_id = actor THEN
    RETURN true;
  END IF;

  CASE p_module
    WHEN 'profile_avatar' THEN
      RETURN p_owner_user_id = actor
        AND (p_resource_id IS NULL OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.user_id = actor AND p.id = p_resource_id
        ));
    WHEN 'resume' THEN
      RETURN p_owner_user_id = actor;
    WHEN 'college_logo', 'college_cover', 'college_gallery' THEN
      RETURN p_resource_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.institutes i
        WHERE i.id = p_resource_id AND i.owner_user_id = actor AND i.deleted_at IS NULL
      );
    WHEN 'mentor_profile' THEN
      RETURN p_resource_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.mentors m
        WHERE m.id = p_resource_id AND m.user_id = actor AND m.deleted_at IS NULL
      );
    WHEN 'job_attachment' THEN
      IF p_action = 'upload' THEN
        RETURN p_resource_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.jobs j
          WHERE j.id = p_resource_id AND j.status = 'published' AND j.approval_status = 'approved' AND j.is_active
            AND j.deleted_at IS NULL AND (j.expires_at IS NULL OR j.expires_at > now())
        );
      END IF;
      RETURN p_resource_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.jobs j
        WHERE j.id = p_resource_id AND j.owner_user_id = actor
          AND public.has_permission(actor, 'lead.view')
          AND public.has_active_subscription(actor, NULL, NULL, NULL)
          AND EXISTS (
            SELECT 1 FROM public.job_applications ja
            WHERE ja.job_id = j.id AND ja.user_id = p_owner_user_id AND ja.deleted_at IS NULL
          )
      );
    WHEN 'application_file' THEN
      IF p_action = 'upload' THEN
        RETURN p_owner_user_id = actor AND p_resource_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.institutes i
          WHERE i.id = p_resource_id AND i.status = 'approved' AND i.is_verified
            AND i.deleted_at IS NULL AND i.owner_user_id IS NOT NULL
            AND public.has_active_subscription(i.owner_user_id, 'college', i.id, NULL)
        );
      END IF;
      RETURN p_resource_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.college_applications ca
        JOIN public.institutes i ON i.id = ca.institute_id
        WHERE ca.institute_id = p_resource_id AND ca.applicant_id = p_owner_user_id
          AND i.owner_user_id = actor
          AND public.has_permission(actor, 'lead.view')
          AND public.has_active_subscription(actor, 'college', i.id, NULL)
      );
    WHEN 'event_cover' THEN
      RETURN p_resource_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.events e
        WHERE e.id = p_resource_id AND e.organizer_user_id = actor AND e.deleted_at IS NULL
      );
    WHEN 'course_thumbnail' THEN
      RETURN p_resource_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.courses c
        WHERE c.id = p_resource_id AND c.created_by = actor AND c.deleted_at IS NULL
      );
    WHEN 'advertisement' THEN
      RETURN false;
    ELSE
      RETURN false;
  END CASE;
END;
$$;

REVOKE ALL ON FUNCTION public.authorize_media_access(text, text, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.authorize_media_access(text, text, uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.submit_module_form(p_module text, p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  actor uuid := auth.uid();
  target_id uuid;
  submission_id uuid;
  lead_id uuid;
  payment_record_id uuid;
  submission_status text;
  created_time timestamptz := now();
  request_idempotency_key text;
  form_version integer;
  form_submission_id uuid;
  existing_response jsonb;
  actor_name text;
  actor_email text;
  requested_duration_minutes integer;
  attendee_count integer;
  requested_start timestamptz;
  requested_end timestamptz;
  server_amount numeric(12,2);
  server_currency text;
  service_id uuid;
  target_owner uuid;
  target_is_paid boolean;
  using_free_trial boolean := false;
  claimed_trial_duration integer;
  registered_tickets bigint;
  resume_path text;
BEGIN
  IF actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF p_module NOT IN ('college', 'mentor', 'job', 'event') THEN
    RAISE EXCEPTION 'Unsupported module' USING ERRCODE = '22023';
  END IF;
  IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' THEN
    RAISE EXCEPTION 'Form payload must be a JSON object' USING ERRCODE = '22023';
  END IF;
  IF NOT public.is_account_active(actor) THEN
    RAISE EXCEPTION 'Account is not active' USING ERRCODE = '42501';
  END IF;

  request_idempotency_key := NULLIF(btrim(p_payload ->> '_idempotencyKey'), '');
  IF request_idempotency_key IS NULL THEN request_idempotency_key := gen_random_uuid()::text; END IF;
  IF char_length(request_idempotency_key) > 128 THEN
    RAISE EXCEPTION 'Invalid idempotency key' USING ERRCODE = '22023';
  END IF;
  form_version := CASE
    WHEN COALESCE(p_payload ->> '_formVersion', '') ~ '^[1-9][0-9]{0,5}$'
      THEN (p_payload ->> '_formVersion')::integer
    ELSE 1
  END;

  SELECT mfs.response INTO existing_response
  FROM public.module_form_submissions mfs
  WHERE mfs.user_id = actor AND mfs.module = p_module AND mfs.idempotency_key = request_idempotency_key;
  IF existing_response IS NOT NULL THEN RETURN existing_response; END IF;

  IF (SELECT count(*) FROM public.module_form_submissions mfs
      WHERE mfs.user_id = actor AND mfs.module = p_module
        AND mfs.created_at > now() - interval '10 minutes') >= 10 THEN
    RAISE EXCEPTION 'Too many form submissions; try again later' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.module_form_submissions(user_id, module, idempotency_key, form_version)
  VALUES (actor, p_module, request_idempotency_key, form_version)
  ON CONFLICT (user_id, module, idempotency_key) DO NOTHING
  RETURNING id INTO form_submission_id;

  IF form_submission_id IS NULL THEN
    SELECT response INTO existing_response
    FROM public.module_form_submissions mfs
    WHERE mfs.user_id = actor AND mfs.module = p_module AND mfs.idempotency_key = request_idempotency_key;
    IF existing_response IS NOT NULL THEN RETURN existing_response; END IF;
    RAISE EXCEPTION 'Submission is already being processed' USING ERRCODE = '40001';
  END IF;

  SELECT NULLIF(p.full_name, ''), p.email INTO actor_name, actor_email
  FROM public.profiles p WHERE p.user_id = actor;
  actor_name := COALESCE(NULLIF(btrim(p_payload ->> 'fullName'), ''), actor_name);
  actor_email := COALESCE(NULLIF(btrim(p_payload ->> 'email'), ''), actor_email);

  IF p_module = 'college' THEN
    target_id := COALESCE(NULLIF(p_payload ->> 'collegeId', '')::uuid, NULLIF(p_payload ->> 'institute_id', '')::uuid);
    SELECT i.owner_user_id INTO target_owner
    FROM public.institutes i
    WHERE i.id = target_id AND i.status = 'approved' AND i.is_verified = true AND i.deleted_at IS NULL;
    IF target_owner IS NULL THEN
      RAISE EXCEPTION 'College is not accepting applications' USING ERRCODE = 'P0001';
    END IF;
    IF NOT public.has_active_subscription(target_owner, 'college', target_id, NULL) THEN
      RAISE EXCEPTION 'College applications are unavailable for this listing' USING ERRCODE = 'P0001';
    END IF;
    IF actor_name IS NULL OR actor_email IS NULL THEN
      RAISE EXCEPTION 'Full name and email are required' USING ERRCODE = '22023';
    END IF;
    IF jsonb_typeof(COALESCE(p_payload -> 'attachments', '[]'::jsonb)) <> 'array'
      OR EXISTS (
        SELECT 1
        FROM jsonb_array_elements_text(COALESCE(p_payload -> 'attachments', '[]'::jsonb)) AS attachment(path)
        WHERE NOT public.is_canonical_media_path(attachment.path, actor, 'application_file', target_id::text)
      )
    THEN
      RAISE EXCEPTION 'Application attachments must use owned signed-upload object paths' USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.college_applications(
      institute_id, applicant_id, full_name, email, phone,
      program_interest, intake, message, attachments, form_data
    ) VALUES (
      target_id, actor, actor_name, actor_email, NULLIF(btrim(p_payload ->> 'phone'), ''),
      COALESCE(NULLIF(btrim(p_payload ->> 'intendedCourse'), ''), NULLIF(btrim(p_payload ->> 'program_interest'), '')),
      COALESCE(NULLIF(btrim(p_payload ->> 'preferredIntake'), ''), NULLIF(btrim(p_payload ->> 'intake'), '')),
      NULLIF(btrim(p_payload ->> 'message'), ''),
      COALESCE(p_payload -> 'attachments', '[]'::jsonb), p_payload
    ) RETURNING id, status, submitted_at INTO submission_id, submission_status, created_time;

  ELSIF p_module = 'job' THEN
    target_id := COALESCE(NULLIF(p_payload ->> 'jobId', '')::uuid, NULLIF(p_payload ->> 'job_id', '')::uuid);
    PERFORM 1 FROM public.jobs j
    WHERE j.id = target_id AND j.status = 'published' AND j.approval_status = 'approved' AND j.is_active = true
      AND j.deleted_at IS NULL AND (j.expires_at IS NULL OR j.expires_at > now());
    IF NOT FOUND THEN RAISE EXCEPTION 'Job is not accepting applications' USING ERRCODE = 'P0001'; END IF;

    SELECT ja.id, ja.status, ja.applied_at INTO submission_id, submission_status, created_time
    FROM public.job_applications ja WHERE ja.job_id = target_id AND ja.user_id = actor;
    IF submission_id IS NULL THEN
      resume_path := NULLIF(btrim(COALESCE(p_payload ->> 'resumeUrl', p_payload ->> 'resume_url')), '');
      IF resume_path IS NOT NULL
        AND NOT public.is_canonical_media_path(resume_path, actor, 'job_attachment', target_id::text) THEN
        RAISE EXCEPTION 'Resume must use an owned signed-upload object path' USING ERRCODE = '22023';
      END IF;
      INSERT INTO public.job_applications(
        job_id, user_id, full_name, email, phone, resume_url,
        cover_letter, portfolio_url, status, form_data
      ) VALUES (
        target_id, actor, actor_name, actor_email, NULLIF(btrim(p_payload ->> 'phone'), ''), resume_path,
        NULLIF(btrim(COALESCE(p_payload ->> 'coverLetter', p_payload ->> 'cover_letter')), ''),
        NULLIF(btrim(COALESCE(p_payload ->> 'portfolioUrl', p_payload ->> 'portfolio_url')), ''),
        'submitted', p_payload
      ) RETURNING id, status, applied_at INTO submission_id, submission_status, created_time;
    END IF;

  ELSIF p_module = 'mentor' THEN
    target_id := COALESCE(NULLIF(p_payload ->> 'mentorId', '')::uuid, NULLIF(p_payload ->> 'mentor_id', '')::uuid);
    service_id := COALESCE(NULLIF(p_payload ->> 'serviceId', '')::uuid, NULLIF(p_payload ->> 'mentor_service_id', '')::uuid);
    requested_duration_minutes := CASE
      WHEN COALESCE(p_payload ->> 'durationMinutes', '') ~ '^[0-9]{1,3}$'
        THEN (p_payload ->> 'durationMinutes')::integer
      ELSE 60
    END;
    IF requested_duration_minutes NOT BETWEEN 15 AND 480 THEN
      RAISE EXCEPTION 'Session duration must be between 15 and 480 minutes' USING ERRCODE = '22023';
    END IF;
    IF NULLIF(p_payload ->> 'scheduledStart', '') IS NOT NULL THEN
      requested_start := (p_payload ->> 'scheduledStart')::timestamptz;
    ELSIF COALESCE(p_payload ->> 'scheduledDate', '') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
      AND COALESCE(p_payload ->> 'scheduledTime', '') ~ '^[0-9]{2}:[0-9]{2}(:[0-9]{2})?$' THEN
      requested_start := ((p_payload ->> 'scheduledDate') || ' ' || (p_payload ->> 'scheduledTime'))::timestamp AT TIME ZONE 'Asia/Kathmandu';
    ELSE
      RAISE EXCEPTION 'A valid schedule is required' USING ERRCODE = '22023';
    END IF;
    IF requested_start <= now() THEN RAISE EXCEPTION 'Session must be scheduled in the future' USING ERRCODE = '22023'; END IF;

    SELECT
      CASE WHEN service_id IS NULL THEN round(COALESCE(m.hourly_rate, 0) * requested_duration_minutes / 60.0, 2) ELSE ms.price END,
      COALESCE(ms.currency, 'NPR')
    INTO server_amount, server_currency
    FROM public.mentors m
    LEFT JOIN public.mentor_services ms
      ON ms.id = service_id AND ms.mentor_id = m.id AND ms.is_active AND ms.deleted_at IS NULL
    WHERE m.id = target_id AND m.approval_status = 'approved' AND m.is_available AND m.deleted_at IS NULL
      AND (service_id IS NULL OR ms.id IS NOT NULL);
    IF server_amount IS NULL THEN RAISE EXCEPTION 'Mentor service is unavailable' USING ERRCODE = 'P0001'; END IF;

    using_free_trial := COALESCE(p_payload ->> 'useFreeTrial', 'false') = 'true';
    IF using_free_trial THEN
      claimed_trial_duration := public.claim_mentor_trial(target_id, actor, requested_duration_minutes);
      IF claimed_trial_duration IS NULL THEN
        RAISE EXCEPTION 'Free trial is unavailable or has already been used' USING ERRCODE = 'P0001';
      END IF;
      requested_duration_minutes := claimed_trial_duration;
      server_amount := 0;
    END IF;

    requested_end := requested_start + make_interval(mins => requested_duration_minutes);
    IF EXISTS (
      SELECT 1 FROM public.mentor_bookings mb
      WHERE mb.mentor_id = target_id AND mb.status IN ('pending', 'confirmed') AND mb.deleted_at IS NULL
        AND tstzrange(mb.scheduled_start, mb.scheduled_end, '[)') && tstzrange(requested_start, requested_end, '[)')
    ) THEN RAISE EXCEPTION 'Mentor is unavailable at that time' USING ERRCODE = 'P0001'; END IF;

    INSERT INTO public.mentor_bookings(
      mentor_id, mentor_service_id, student_id, scheduled_start, scheduled_end,
      status, payment_status, amount, currency, notes, form_data
    ) VALUES (
      target_id, service_id, actor, requested_start, requested_end,
      CASE WHEN using_free_trial THEN 'confirmed' ELSE 'pending' END,
      CASE WHEN server_amount = 0 THEN 'not_required' ELSE 'pending' END,
      server_amount, server_currency, NULLIF(btrim(p_payload ->> 'notes'), ''), p_payload
    ) RETURNING id, status, created_at INTO submission_id, submission_status, created_time;

    IF server_amount > 0 THEN
      INSERT INTO public.payments(user_id, payment_type, reference_id, amount, currency, status, metadata)
      VALUES (actor, 'mentor_booking', submission_id, server_amount, server_currency, 'pending', jsonb_build_object('module', 'mentor'))
      RETURNING id INTO payment_record_id;
      UPDATE public.mentor_bookings SET payment_id = payment_record_id WHERE id = submission_id;
    END IF;

  ELSE
    target_id := COALESCE(NULLIF(p_payload ->> 'eventId', '')::uuid, NULLIF(p_payload ->> 'event_id', '')::uuid);
    attendee_count := CASE
      WHEN COALESCE(p_payload ->> 'attendeeCount', '') ~ '^[0-9]{1,2}$'
        THEN (p_payload ->> 'attendeeCount')::integer
      ELSE 1
    END;
    IF attendee_count NOT BETWEEN 1 AND 10 THEN RAISE EXCEPTION 'Invalid attendee count' USING ERRCODE = '22023'; END IF;

    SELECT (e.event_type = 'paid'), e.ticket_price * attendee_count, e.currency
    INTO target_is_paid, server_amount, server_currency
    FROM public.events e
    WHERE e.id = target_id AND e.status IN ('approved', 'published') AND e.approval_status = 'approved'
      AND e.is_active AND e.deleted_at IS NULL AND e.end_date > now()
      AND (e.registration_deadline IS NULL OR e.registration_deadline > now())
    FOR UPDATE;
    IF server_amount IS NULL THEN RAISE EXCEPTION 'Event is not accepting registrations' USING ERRCODE = 'P0001'; END IF;

    SELECT COALESCE(sum(er.ticket_quantity), 0) INTO registered_tickets
    FROM public.event_registrations er WHERE er.event_id = target_id AND er.status <> 'cancelled' AND er.deleted_at IS NULL;
    IF EXISTS (SELECT 1 FROM public.events e WHERE e.id = target_id AND e.capacity IS NOT NULL AND registered_tickets + attendee_count > e.capacity) THEN
      RAISE EXCEPTION 'Event capacity has been reached' USING ERRCODE = 'P0001';
    END IF;

    SELECT er.id, er.status, er.registered_at INTO submission_id, submission_status, created_time
    FROM public.event_registrations er WHERE er.event_id = target_id AND er.user_id = actor;
    IF submission_id IS NULL THEN
      INSERT INTO public.event_registrations(
        event_id, user_id, status, payment_status, ticket_quantity, total_amount, form_data
      ) VALUES (
        target_id, actor,
        CASE WHEN target_is_paid THEN 'pending' ELSE 'confirmed' END,
        CASE WHEN target_is_paid THEN 'pending' ELSE 'not_required' END,
        attendee_count, server_amount, p_payload
      ) RETURNING id, status, registered_at INTO submission_id, submission_status, created_time;

      IF target_is_paid AND server_amount > 0 THEN
        INSERT INTO public.payments(user_id, payment_type, reference_id, amount, currency, status, metadata)
        VALUES (actor, 'event_ticket', submission_id, server_amount, server_currency, 'pending', jsonb_build_object('module', 'event'))
        RETURNING id INTO payment_record_id;
        UPDATE public.event_registrations SET payment_id = payment_record_id WHERE id = submission_id;
      END IF;
    END IF;
  END IF;

  SELECT l.id INTO lead_id FROM public.leads l
  WHERE l.source_type = CASE p_module
    WHEN 'college' THEN 'college_application'
    WHEN 'mentor' THEN 'mentor_booking'
    WHEN 'job' THEN 'job_application'
    ELSE 'event_registration'
  END AND l.source_id = submission_id;

  existing_response := jsonb_build_object(
    'id', submission_id,
    'status', submission_status,
    'lead_id', lead_id,
    'leadId', lead_id,
    'payment_id', payment_record_id,
    'paymentId', payment_record_id,
    'created_at', created_time
  );

  UPDATE public.module_form_submissions
  SET domain_submission_id = submission_id, response = existing_response
  WHERE id = form_submission_id;

  RETURN existing_response;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_module_form(text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_module_form(text, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.sync_payment_result()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;

  IF NEW.payment_type = 'mentor_booking' THEN
    UPDATE public.mentor_bookings
    SET payment_status = CASE NEW.status
        WHEN 'success' THEN 'success' WHEN 'failed' THEN 'failed'
        WHEN 'refunded' THEN 'refunded' ELSE payment_status END,
      status = CASE WHEN NEW.status = 'success' THEN 'confirmed' ELSE status END,
      updated_at = now()
    WHERE id = NEW.reference_id;
  ELSIF NEW.payment_type = 'event_ticket' THEN
    UPDATE public.event_registrations
    SET payment_status = CASE NEW.status
        WHEN 'success' THEN 'success' WHEN 'failed' THEN 'failed'
        WHEN 'refunded' THEN 'refunded' ELSE payment_status END,
      status = CASE WHEN NEW.status = 'success' THEN 'confirmed'
        WHEN NEW.status = 'refunded' THEN 'refunded' ELSE status END,
      updated_at = now()
    WHERE id = NEW.reference_id;
  ELSIF NEW.subscription_id IS NOT NULL THEN
    UPDATE public.subscriptions
    SET payment_status = CASE NEW.status
        WHEN 'success' THEN 'success' WHEN 'failed' THEN 'failed'
        WHEN 'refunded' THEN 'refunded' ELSE payment_status END,
      status = CASE WHEN NEW.status = 'success' THEN 'active'
        WHEN NEW.status = 'failed' THEN 'past_due' ELSE status END,
      updated_at = now()
    WHERE id = NEW.subscription_id;
  END IF;

  IF NEW.status IN ('success', 'failed', 'refunded') THEN
    INSERT INTO public.notifications(
      recipient_id, title, message, type, category, channel, status,
      entity_type, entity_id, action_url, metadata
    ) VALUES (
      NEW.user_id,
      CASE NEW.status WHEN 'success' THEN 'Payment successful'
        WHEN 'failed' THEN 'Payment failed' ELSE 'Payment refunded' END,
      CASE NEW.status WHEN 'success' THEN 'Your payment was confirmed.'
        WHEN 'failed' THEN 'Your payment could not be completed.' ELSE 'Your payment was refunded.' END,
      CASE WHEN NEW.status = 'failed' THEN 'warning' ELSE 'success' END,
      'payment', 'dashboard', 'queued', 'payment', NEW.id,
      '/dashboard/payments', jsonb_build_object('payment_status', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_payment_result_trigger ON public.payments;
CREATE TRIGGER sync_payment_result_trigger
AFTER UPDATE OF status ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.sync_payment_result();

CREATE OR REPLACE FUNCTION public.notify_approval_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  recipient uuid;
  approval_value text;
  old_approval_value text;
  subject_name text;
BEGIN
  CASE TG_TABLE_NAME
    WHEN 'institutes' THEN
      recipient := NEW.owner_user_id; approval_value := NEW.status; old_approval_value := OLD.status; subject_name := 'College';
    WHEN 'mentors' THEN
      recipient := NEW.user_id; approval_value := NEW.approval_status; old_approval_value := OLD.approval_status; subject_name := 'Mentor profile';
    WHEN 'jobs' THEN
      recipient := NEW.owner_user_id; approval_value := NEW.approval_status; old_approval_value := OLD.approval_status; subject_name := 'Job';
    WHEN 'events' THEN
      recipient := NEW.organizer_user_id; approval_value := NEW.approval_status; old_approval_value := OLD.approval_status; subject_name := 'Event';
    ELSE RETURN NEW;
  END CASE;

  IF recipient IS NOT NULL AND approval_value IS DISTINCT FROM old_approval_value
    AND approval_value IN ('approved', 'rejected', 'suspended') THEN
    INSERT INTO public.notifications(
      recipient_id, title, message, type, category, channel, status,
      entity_type, entity_id, action_url, metadata
    ) VALUES (
      recipient, subject_name || ' ' || approval_value,
      'The review status is now ' || approval_value || '.',
      CASE WHEN approval_value = 'approved' THEN 'success' ELSE 'warning' END,
      'approval', 'dashboard', 'queued', TG_TABLE_NAME, NEW.id,
      '/dashboard', jsonb_build_object('approval_status', approval_value)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_college_approval_change ON public.institutes;
CREATE TRIGGER notify_college_approval_change AFTER UPDATE OF status ON public.institutes
FOR EACH ROW EXECUTE FUNCTION public.notify_approval_change();
DROP TRIGGER IF EXISTS notify_mentor_approval_change ON public.mentors;
CREATE TRIGGER notify_mentor_approval_change AFTER UPDATE OF approval_status ON public.mentors
FOR EACH ROW EXECUTE FUNCTION public.notify_approval_change();
DROP TRIGGER IF EXISTS notify_job_approval_change ON public.jobs;
CREATE TRIGGER notify_job_approval_change AFTER UPDATE OF approval_status ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.notify_approval_change();
DROP TRIGGER IF EXISTS notify_event_approval_change ON public.events;
CREATE TRIGGER notify_event_approval_change AFTER UPDATE OF approval_status ON public.events
FOR EACH ROW EXECUTE FUNCTION public.notify_approval_change();

CREATE TABLE IF NOT EXISTS public.media_upload_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module text NOT NULL,
  resource_id uuid,
  object_path text NOT NULL UNIQUE,
  declared_size bigint NOT NULL CHECK (declared_size > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS media_upload_intents_rate_idx
ON public.media_upload_intents(user_id, created_at DESC);

ALTER TABLE public.media_upload_intents ENABLE ROW LEVEL SECURITY;
-- Intentionally no direct client policies. The authenticated claim RPC is the
-- only client write surface; service_role can inspect/clean records.

CREATE OR REPLACE FUNCTION public.claim_media_upload_intent(
  p_module text,
  p_resource_id uuid,
  p_object_path text,
  p_declared_size bigint
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  actor uuid := auth.uid();
  intent_count integer;
  intent_bytes bigint;
  module_size_limit bigint;
  inserted_id uuid;
BEGIN
  IF actor IS NULL OR NOT public.is_account_active(actor) THEN RETURN false; END IF;
  IF p_module NOT IN (
    'profile_avatar', 'resume', 'college_logo', 'college_cover', 'college_gallery',
    'mentor_profile', 'job_attachment', 'application_file', 'event_cover',
    'course_thumbnail', 'advertisement'
  ) THEN RETURN false; END IF;

  module_size_limit := CASE
    WHEN p_module = 'college_logo' THEN 3145728
    WHEN p_module IN ('college_cover', 'college_gallery', 'event_cover') THEN 8388608
    WHEN p_module IN (
      'profile_avatar', 'resume', 'mentor_profile', 'job_attachment',
      'application_file', 'course_thumbnail', 'advertisement'
    ) THEN 5242880
    ELSE 0
  END;
  IF p_declared_size IS NULL OR p_declared_size <= 0 OR p_declared_size > module_size_limit THEN
    RETURN false;
  END IF;
  IF NOT public.is_canonical_media_path(
    p_object_path, actor, p_module, COALESCE(p_resource_id::text, 'self')
  ) THEN RETURN false; END IF;
  IF NOT public.authorize_media_access('upload', p_module, p_resource_id, actor) THEN RETURN false; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(actor::text, 0));

  IF EXISTS (
    SELECT 1 FROM public.media_upload_intents mui
    WHERE mui.object_path = p_object_path AND mui.user_id = actor
      AND mui.module = p_module AND mui.resource_id IS NOT DISTINCT FROM p_resource_id
      AND mui.declared_size = p_declared_size
  ) THEN RETURN true; END IF;

  SELECT count(*), COALESCE(sum(mui.declared_size), 0)
  INTO intent_count, intent_bytes
  FROM public.media_upload_intents mui
  WHERE mui.user_id = actor AND mui.created_at > now() - interval '1 hour';

  IF intent_count >= 30 OR intent_bytes + p_declared_size > 104857600 THEN RETURN false; END IF;

  INSERT INTO public.media_upload_intents(
    user_id, module, resource_id, object_path, declared_size
  ) VALUES (
    actor, p_module, p_resource_id, p_object_path, p_declared_size
  )
  ON CONFLICT (object_path) DO NOTHING
  RETURNING id INTO inserted_id;

  RETURN inserted_id IS NOT NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_media_upload_intent(text, uuid, text, bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_media_upload_intent(text, uuid, text, bigint) TO authenticated;

-- ---------------------------------------------------------------------------
-- Account-status guardrails for every direct authenticated table write.
--
-- Existing policies remain the source of row ownership/role authorization.
-- These restrictive policies are an additional AND condition, preventing a
-- suspended or deactivated account with an unexpired JWT from using a legacy
-- direct-Supabase path. Trigger/RPC work performed by the migration owner and
-- service_role continues to bypass RLS as intended.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'advertisements', 'appointments', 'audit_logs', 'badges', 'certificates',
    'college_applications', 'companies', 'competition_participants',
    'competition_registrations', 'competitions', 'contact_queries',
    'conversations', 'course_enrollments', 'course_modules', 'course_referrals',
    'course_tags', 'course_videos', 'courses', 'event_registrations', 'events',
    'featured_items', 'institute_admins', 'institute_notices', 'institutes',
    'institutions', 'job_applications', 'jobs', 'leads', 'lesson_progress',
    'lessons', 'media_upload_intents', 'mentor_bookings', 'mentor_services',
    'mentor_trial_settings', 'mentor_trial_usage', 'mentors',
    'mentorship_sessions', 'messages', 'module_form_definitions',
    'module_form_submissions', 'notifications', 'packages', 'payments',
    'permissions', 'profiles', 'quiz_attempts', 'quiz_questions', 'quizzes',
    'role_permissions', 'skills', 'subscriptions', 'tags', 'user_badges',
    'user_permissions', 'user_roles', 'user_skills'
  ]
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I',
      'Active accounts can insert', table_name
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.is_account_active())',
      'Active accounts can insert', table_name
    );

    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I',
      'Active accounts can update', table_name
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.is_account_active()) WITH CHECK (public.is_account_active())',
      'Active accounts can update', table_name
    );

    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I',
      'Active accounts can delete', table_name
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING (public.is_account_active())',
      'Active accounts can delete', table_name
    );
  END LOOP;
END;
$$;

-- Private authenticated reads require an active account. Public/directory
-- tables are handled separately below so an inactive account sees no more than
-- an anonymous visitor would see.
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'appointments', 'audit_logs', 'certificates', 'college_applications',
    'competition_participants', 'competition_registrations', 'contact_queries',
    'conversations', 'course_enrollments', 'course_referrals',
    'event_registrations', 'institute_admins', 'job_applications', 'leads',
    'lesson_progress', 'media_upload_intents', 'mentor_bookings',
    'mentor_trial_usage', 'mentorship_sessions', 'messages',
    'module_form_submissions', 'notifications', 'payments', 'profiles',
    'quiz_attempts', 'subscriptions', 'user_permissions', 'user_roles'
  ]
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I',
      'Active accounts read private data', table_name
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR SELECT TO authenticated USING (public.is_account_active())',
      'Active accounts read private data', table_name
    );
  END LOOP;
END;
$$;

DROP POLICY IF EXISTS "Inactive accounts only read public institutions" ON public.institutions;
CREATE POLICY "Inactive accounts only read public institutions"
ON public.institutions AS RESTRICTIVE FOR SELECT TO authenticated
USING (public.is_account_active() OR (is_verified = true AND deleted_at IS NULL));

DROP POLICY IF EXISTS "Inactive accounts only read public colleges" ON public.institutes;
CREATE POLICY "Inactive accounts only read public colleges"
ON public.institutes AS RESTRICTIVE FOR SELECT TO authenticated
USING (
  public.is_account_active()
  OR (status = 'approved' AND is_verified = true AND deleted_at IS NULL)
);

DROP POLICY IF EXISTS "Inactive accounts only read public companies" ON public.companies;
CREATE POLICY "Inactive accounts only read public companies"
ON public.companies AS RESTRICTIVE FOR SELECT TO authenticated
USING (
  public.is_account_active()
  OR (status = 'approved' AND is_verified = true AND deleted_at IS NULL)
);

DROP POLICY IF EXISTS "Inactive accounts only read public mentors" ON public.mentors;
CREATE POLICY "Inactive accounts only read public mentors"
ON public.mentors AS RESTRICTIVE FOR SELECT TO authenticated
USING (
  public.is_account_active()
  OR (
    approval_status = 'approved' AND is_available = true AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = mentors.user_id
        AND p.account_status = 'active' AND p.deleted_at IS NULL
    )
  )
);

DROP POLICY IF EXISTS "Inactive accounts only read public competitions" ON public.competitions;
CREATE POLICY "Inactive accounts only read public competitions"
ON public.competitions AS RESTRICTIVE FOR SELECT TO authenticated
USING (public.is_account_active() OR status <> 'draft');

DROP POLICY IF EXISTS "Inactive accounts only read public courses" ON public.courses;
CREATE POLICY "Inactive accounts only read public courses"
ON public.courses AS RESTRICTIVE FOR SELECT TO authenticated
USING (
  public.is_account_active()
  OR (
    is_published = true AND deleted_at IS NULL
    AND (is_partnered = false OR public.is_valid_partner_course_url(redirect_url))
  )
);

DROP POLICY IF EXISTS "Inactive accounts only read public jobs" ON public.jobs;
CREATE POLICY "Inactive accounts only read public jobs"
ON public.jobs AS RESTRICTIVE FOR SELECT TO authenticated
USING (
  public.is_account_active()
  OR (
    status = 'published' AND approval_status = 'approved' AND is_active = true
    AND deleted_at IS NULL AND (expires_at IS NULL OR expires_at > now())
  )
);

DROP POLICY IF EXISTS "Inactive accounts only read public mentor services" ON public.mentor_services;
CREATE POLICY "Inactive accounts only read public mentor services"
ON public.mentor_services AS RESTRICTIVE FOR SELECT TO authenticated
USING (
  public.is_account_active()
  OR (
    is_active = true AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.mentors m
      WHERE m.id = mentor_services.mentor_id
        AND m.approval_status = 'approved' AND m.is_available = true
        AND m.deleted_at IS NULL
    )
  )
);

DROP POLICY IF EXISTS "Inactive accounts only read public events" ON public.events;
CREATE POLICY "Inactive accounts only read public events"
ON public.events AS RESTRICTIVE FOR SELECT TO authenticated
USING (
  public.is_account_active()
  OR (
    status IN ('approved', 'published') AND approval_status = 'approved'
    AND is_active = true AND deleted_at IS NULL AND end_date > now()
  )
);

DROP POLICY IF EXISTS "Inactive accounts only read public mentor trials" ON public.mentor_trial_settings;
CREATE POLICY "Inactive accounts only read public mentor trials"
ON public.mentor_trial_settings AS RESTRICTIVE FOR SELECT TO authenticated
USING (
  public.is_account_active()
  OR EXISTS (
    SELECT 1 FROM public.mentors m
    WHERE m.id = mentor_trial_settings.mentor_id
      AND m.approval_status = 'approved' AND m.deleted_at IS NULL
  )
);

DROP POLICY IF EXISTS "Inactive accounts only read public course videos" ON public.course_videos;
CREATE POLICY "Inactive accounts only read public course videos"
ON public.course_videos AS RESTRICTIVE FOR SELECT TO authenticated
USING (
  public.is_account_active()
  OR EXISTS (
    SELECT 1
    FROM public.lessons l
    JOIN public.course_modules cm ON cm.id = l.module_id
    JOIN public.courses c ON c.id = cm.course_id
    WHERE l.id = course_videos.lesson_id AND c.is_published = true
  )
);

-- ---------------------------------------------------------------------------
-- Storage buckets and object ownership. Object names are generated as:
-- {owner uuid}/{module}/{resource uuid or self}/{object uuid}.{extension}
-- ---------------------------------------------------------------------------

UPDATE storage.buckets SET public = false WHERE id = 'Merotalent';

INSERT INTO storage.buckets(id, name, public, file_size_limit, allowed_mime_types) VALUES
  ('profile-media', 'profile-media', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/avif']),
  ('college-media', 'college-media', true, 8388608, ARRAY['image/jpeg','image/png','image/webp','image/avif']),
  ('mentor-media', 'mentor-media', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/avif']),
  ('event-media', 'event-media', true, 8388608, ARRAY['image/jpeg','image/png','image/webp','image/avif']),
  ('course-media', 'course-media', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/avif']),
  ('ad-media', 'ad-media', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/avif']),
  ('application-files', 'application-files', false, 5242880, ARRAY['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('job-files', 'job-files', false, 5242880, ARRAY['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('resumes', 'resumes', false, 5242880, ARRAY['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public listing media is readable" ON storage.objects;
CREATE POLICY "Public listing media is readable"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id IN ('profile-media','college-media','mentor-media','event-media','course-media','ad-media'));

DROP POLICY IF EXISTS "Owners upload listing media" ON storage.objects;
CREATE POLICY "Owners upload listing media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id IN ('profile-media','college-media','mentor-media','event-media','course-media','ad-media')
  AND (
    public.is_platform_admin()
    OR (
      (storage.foldername(name))[1] = auth.uid()::text
      AND (storage.foldername(name))[3] IS NOT NULL
      AND CASE bucket_id
        WHEN 'profile-media' THEN (storage.foldername(name))[2] = 'profile_avatar'
        WHEN 'college-media' THEN (storage.foldername(name))[2] IN ('college_logo','college_cover','college_gallery')
        WHEN 'mentor-media' THEN (storage.foldername(name))[2] = 'mentor_profile'
        WHEN 'event-media' THEN (storage.foldername(name))[2] = 'event_cover'
        WHEN 'course-media' THEN (storage.foldername(name))[2] = 'course_thumbnail'
        WHEN 'ad-media' THEN (storage.foldername(name))[2] = 'advertisement'
        ELSE false
      END
      AND public.is_canonical_media_path(
        name,
        auth.uid(),
        (storage.foldername(name))[2],
        (storage.foldername(name))[3]
      )
      AND public.authorize_media_access(
        'upload',
        (storage.foldername(name))[2],
        CASE
          WHEN (storage.foldername(name))[3] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
            THEN (storage.foldername(name))[3]::uuid
          ELSE NULL
        END,
        auth.uid()
      )
    )
  )
);

DROP POLICY IF EXISTS "Owners update listing media" ON storage.objects;
CREATE POLICY "Owners update listing media"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id IN ('profile-media','college-media','mentor-media','event-media','course-media','ad-media')
  AND (
    public.is_platform_admin()
    OR (
      (storage.foldername(name))[1] = auth.uid()::text
      AND public.is_canonical_media_path(
        name,
        auth.uid(),
        (storage.foldername(name))[2],
        (storage.foldername(name))[3]
      )
      AND public.authorize_media_access(
        'upload', (storage.foldername(name))[2],
        CASE WHEN (storage.foldername(name))[3] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          THEN (storage.foldername(name))[3]::uuid ELSE NULL END,
        auth.uid()
      )
    )
  )
)
WITH CHECK (
  bucket_id IN ('profile-media','college-media','mentor-media','event-media','course-media','ad-media')
  AND (
    public.is_platform_admin()
    OR (
      (storage.foldername(name))[1] = auth.uid()::text
      AND public.is_canonical_media_path(
        name,
        auth.uid(),
        (storage.foldername(name))[2],
        (storage.foldername(name))[3]
      )
    )
  )
);

DROP POLICY IF EXISTS "Owners delete listing media" ON storage.objects;
CREATE POLICY "Owners delete listing media"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id IN ('profile-media','college-media','mentor-media','event-media','course-media','ad-media')
  AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_platform_admin())
);

DROP POLICY IF EXISTS "Users can upload their own resume" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own resume" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own resume" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own resume" ON storage.objects;
DROP POLICY IF EXISTS "Owners upload private application files" ON storage.objects;
CREATE POLICY "Owners upload private application files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  (storage.foldername(name))[1] = auth.uid()::text
  AND (
    (bucket_id = 'resumes' AND (
      ((storage.foldername(name))[2] = 'resume' AND (storage.foldername(name))[3] = 'self'
        AND public.is_canonical_media_path(name, auth.uid(), 'resume', 'self')
        AND public.authorize_media_access('upload', 'resume', NULL, auth.uid()))
      OR (
        (storage.foldername(name))[2] IS NULL
        AND name ~ ('^' || auth.uid()::text || '/resume(-[0-9]+)?[.](pdf|doc|docx)$')
      )
    ))
    OR (bucket_id = 'application-files' AND (storage.foldername(name))[2] = 'application_file'
      AND public.is_canonical_media_path(
        name, auth.uid(), 'application_file', (storage.foldername(name))[3]
      )
      AND public.authorize_media_access(
        'upload', 'application_file',
        CASE
          WHEN (storage.foldername(name))[3] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
            THEN (storage.foldername(name))[3]::uuid
          ELSE NULL
        END,
        auth.uid()
      ))
    OR (bucket_id = 'job-files' AND (storage.foldername(name))[2] = 'job_attachment'
      AND public.is_canonical_media_path(
        name, auth.uid(), 'job_attachment', (storage.foldername(name))[3]
      )
      AND public.authorize_media_access(
        'upload', 'job_attachment',
        CASE
          WHEN (storage.foldername(name))[3] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
            THEN (storage.foldername(name))[3]::uuid
          ELSE NULL
        END,
        auth.uid()
      ))
  )
);

DROP POLICY IF EXISTS "Owners read private application files" ON storage.objects;
CREATE POLICY "Owners read private application files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id IN ('resumes','application-files','job-files')
  AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_platform_admin())
);

DROP POLICY IF EXISTS "Owners update private application files" ON storage.objects;
CREATE POLICY "Owners update private application files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id IN ('resumes','application-files','job-files')
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id IN ('resumes','application-files','job-files')
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Owners delete private application files" ON storage.objects;
CREATE POLICY "Owners delete private application files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id IN ('resumes','application-files','job-files')
  AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_platform_admin())
);

-- Storage is another direct client surface, so apply the same account-state
-- gate. Inactive accounts retain anonymous-equivalent access to public listing
-- buckets, but cannot read private objects or mutate any object.
DROP POLICY IF EXISTS "Active accounts insert storage objects" ON storage.objects;
CREATE POLICY "Active accounts insert storage objects"
ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (public.is_account_active());

DROP POLICY IF EXISTS "Active accounts update storage objects" ON storage.objects;
CREATE POLICY "Active accounts update storage objects"
ON storage.objects AS RESTRICTIVE FOR UPDATE TO authenticated
USING (public.is_account_active())
WITH CHECK (public.is_account_active());

DROP POLICY IF EXISTS "Active accounts delete storage objects" ON storage.objects;
CREATE POLICY "Active accounts delete storage objects"
ON storage.objects AS RESTRICTIVE FOR DELETE TO authenticated
USING (public.is_account_active());

DROP POLICY IF EXISTS "Inactive accounts only read public storage" ON storage.objects;
CREATE POLICY "Inactive accounts only read public storage"
ON storage.objects AS RESTRICTIVE FOR SELECT TO authenticated
USING (
  public.is_account_active()
  OR bucket_id IN (
    'profile-media', 'college-media', 'mentor-media',
    'event-media', 'course-media', 'ad-media'
  )
);

-- ---------------------------------------------------------------------------
-- Idempotent Vercel cron maintenance. Only the server role can execute it.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.run_platform_maintenance()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  expired_subscription_count integer := 0;
  expired_job_count integer := 0;
  completed_event_count integer := 0;
  expired_ad_count integer := 0;
  notification_count integer := 0;
  upload_intent_cleanup_count integer := 0;
BEGIN
  UPDATE public.subscriptions
  SET status = 'expired', updated_at = now()
  WHERE status IN ('trialing', 'active', 'past_due')
    AND expiry_date <= now() AND deleted_at IS NULL;
  GET DIAGNOSTICS expired_subscription_count = ROW_COUNT;

  INSERT INTO public.notifications(
    recipient_id, title, message, type, category, channel, status,
    entity_type, entity_id, action_url, metadata
  )
  SELECT s.user_id, 'Subscription expired',
    'Your MeroTalent subscription has expired. Renew it to restore premium access.',
    'warning', 'subscription', 'dashboard', 'queued', 'subscription', s.id,
    '/dashboard/subscription', jsonb_build_object('maintenance_event', 'expired')
  FROM public.subscriptions s
  WHERE s.status = 'expired' AND s.expiry_date <= now() AND s.deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.recipient_id = s.user_id AND n.entity_type = 'subscription'
        AND n.entity_id = s.id AND n.category = 'subscription'
        AND n.metadata ->> 'maintenance_event' = 'expired'
    );
  GET DIAGNOSTICS notification_count = ROW_COUNT;

  UPDATE public.jobs
  SET status = 'expired', is_active = false, updated_at = now()
  WHERE status = 'published' AND approval_status = 'approved' AND is_active = true AND deleted_at IS NULL
    AND COALESCE(expires_at, application_deadline) <= now();
  GET DIAGNOSTICS expired_job_count = ROW_COUNT;

  UPDATE public.events
  SET status = 'completed', is_active = false, updated_at = now()
  WHERE status IN ('approved', 'published') AND approval_status = 'approved'
    AND is_active = true AND deleted_at IS NULL AND end_date <= now();
  GET DIAGNOSTICS completed_event_count = ROW_COUNT;

  UPDATE public.advertisements
  SET status = 'expired', is_active = false, updated_at = now()
  WHERE status IN ('scheduled', 'active') AND is_active = true
    AND deleted_at IS NULL AND end_date <= now();
  GET DIAGNOSTICS expired_ad_count = ROW_COUNT;

  DELETE FROM public.media_upload_intents WHERE created_at < now() - interval '7 days';
  GET DIAGNOSTICS upload_intent_cleanup_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'expired_subscriptions', expired_subscription_count,
    'expired_jobs', expired_job_count,
    'completed_events', completed_event_count,
    'expired_advertisements', expired_ad_count,
    'notifications_enqueued', notification_count,
    'upload_intents_removed', upload_intent_cleanup_count,
    'ran_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.run_platform_maintenance() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.run_platform_maintenance() TO service_role;

COMMIT;
