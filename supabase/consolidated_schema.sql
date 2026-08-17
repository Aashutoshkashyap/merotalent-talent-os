-- ==============================================================================
-- MEROTALENT - CONSOLIDATED PRODUCTION DATABASE SCHEMA & INITIALIZATION
-- ==============================================================================
-- This consolidated script initializes all extensions, custom types, relational tables,
-- foreign keys, high-performance GIN/B-tree indexes, RLS policies, triggers, and
-- storage bucket configurations for the complete MeroTalent ecosystem.
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 2. ENUM TYPES
DO $$ BEGIN
  CREATE TYPE app_role AS ENUM ('super_admin', 'admin', 'talent', 'institution', 'company', 'mentor');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE institute_category AS ENUM ('college', 'school', 'plus_two');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE admission_state AS ENUM ('open', 'closed', 'upcoming');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE entity_status AS ENUM ('draft', 'pending', 'approved', 'suspended', 'rejected', 'published', 'archived');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 3. CORE PROFILES & USER ROLES
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  bio TEXT,
  location TEXT,
  linkedin_url TEXT,
  education TEXT,
  experience_level TEXT,
  skills TEXT[] DEFAULT ARRAY[]::TEXT[],
  resume_url TEXT,
  onboarding_completed BOOLEAN DEFAULT false,
  account_status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  assigned_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role)
);

CREATE TABLE IF NOT EXISTS public.admin_access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  reason TEXT,
  requested_role TEXT DEFAULT 'admin',
  status TEXT DEFAULT 'pending', -- pending, approved, rejected
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. INSTITUTES & EDUCATION DIRECTORY
CREATE TABLE IF NOT EXISTS public.institutes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  short_name TEXT,
  slug TEXT UNIQUE,
  type TEXT DEFAULT 'engineering',
  institution_category TEXT DEFAULT 'college',
  affiliation TEXT,
  level TEXT,
  description TEXT,
  location TEXT,
  website TEXT,
  youtube_url TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  admission_status TEXT DEFAULT 'closed', -- open, closed, upcoming
  ranking INTEGER,                       -- Admin display priority (1 = Top position)
  is_featured BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  total_seats INTEGER,
  available_seats INTEGER,
  courses_offered JSONB DEFAULT '[]'::JSONB,
  logo_url TEXT,
  cover_image_url TEXT,
  gallery_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
  applications_enabled BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'approved',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Full-text search document view / table for blazing fast directory filtering
CREATE TABLE IF NOT EXISTS public.institute_directory (
  id UUID PRIMARY KEY REFERENCES public.institutes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  short_name TEXT,
  slug TEXT,
  institution_category TEXT,
  type TEXT,
  affiliation TEXT,
  level TEXT,
  description TEXT,
  location TEXT,
  website TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  admission_status TEXT,
  ranking INTEGER,
  is_featured BOOLEAN,
  is_verified BOOLEAN,
  payment_verified BOOLEAN DEFAULT true,
  total_seats INTEGER,
  available_seats INTEGER,
  courses_offered JSONB,
  logo_url TEXT,
  cover_image_url TEXT,
  gallery_urls TEXT[],
  applications_enabled BOOLEAN,
  status TEXT,
  search_document TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

-- 5. COMPANIES, JOBS & CAREERS
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  description TEXT,
  logo_url TEXT,
  cover_image_url TEXT,
  website TEXT,
  location TEXT,
  is_verified BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'approved',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  requirements TEXT,
  job_type TEXT DEFAULT 'full_time', -- full_time, part_time, internship, contract
  experience_level TEXT DEFAULT 'entry',
  location TEXT,
  salary_min NUMERIC,
  salary_max NUMERIC,
  currency TEXT DEFAULT 'NPR',
  is_remote BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'published',
  approval_status TEXT DEFAULT 'approved',
  application_deadline TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  resume_url TEXT,
  cover_letter TEXT,
  status TEXT DEFAULT 'submitted', -- submitted, reviewing, shortlisted, rejected, accepted
  applied_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. MENTORS & SESSIONS
CREATE TABLE IF NOT EXISTS public.mentors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  headline TEXT,
  description TEXT,
  profile_image_url TEXT,
  expertise TEXT[] DEFAULT ARRAY[]::TEXT[],
  hourly_rate NUMERIC DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  timezone TEXT DEFAULT 'Asia/Kathmandu',
  years_experience NUMERIC DEFAULT 0,
  rating NUMERIC DEFAULT 5.0,
  total_sessions INTEGER DEFAULT 0,
  approval_status TEXT DEFAULT 'approved',
  commission_rate NUMERIC DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mentor_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES public.mentors(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_end TIMESTAMPTZ NOT NULL,
  meeting_url TEXT,
  notes TEXT,
  amount NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'NPR',
  status TEXT DEFAULT 'pending', -- pending, confirmed, completed, cancelled
  payment_status TEXT DEFAULT 'not_required', -- pending, paid, refunded, not_required
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. EVENTS & COMPETITIONS
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  organizer_type TEXT DEFAULT 'company',
  organizer_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT DEFAULT 'free', -- free, paid
  format TEXT DEFAULT 'in_person', -- online, in_person, hybrid
  location TEXT,
  meeting_url TEXT,
  cover_image_url TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  capacity INTEGER,
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'published',
  approval_status TEXT DEFAULT 'approved',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.event_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticket_quantity INTEGER DEFAULT 1,
  total_amount NUMERIC DEFAULT 0,
  payment_status TEXT DEFAULT 'not_required',
  status TEXT DEFAULT 'confirmed',
  registered_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.competitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'hackathon', -- hackathon, robotics, game_jam, olympiad, design
  format TEXT DEFAULT 'hybrid',   -- online, offline, hybrid
  prize_pool TEXT,
  max_participants INTEGER,
  is_team_based BOOLEAN DEFAULT true,
  registration_deadline TIMESTAMPTZ,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  cover_image_url TEXT,
  organizer_name TEXT,
  status TEXT DEFAULT 'published',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. COURSES & LMS
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  thumbnail_url TEXT,
  redirect_url TEXT,
  partner_name TEXT,
  is_partnered BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 1,
  status TEXT DEFAULT 'published',
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 9. LEADS & STUDENT PIPELINES
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL, -- college_application, job_application, mentor_booking, event_registration
  source_id UUID,
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_type TEXT NOT NULL, -- college, company, mentor
  applicant_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'new', -- new, contacted, enrolled, closed
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 10. SUBSCRIPTION PACKAGES, SUBSCRIPTIONS & PAYMENTS
CREATE TABLE IF NOT EXISTS public.subscription_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  package_kind TEXT DEFAULT 'free', -- free, pro, enterprise
  entity_type TEXT NOT NULL,       -- college, mentor, company
  price_npr NUMERIC DEFAULT 0,
  duration_days INTEGER DEFAULT 365,
  is_default_free BOOLEAN DEFAULT false,
  module_scope TEXT[] DEFAULT ARRAY[]::TEXT[],
  features JSONB DEFAULT '{}'::JSONB,
  sort_order INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  package_id UUID REFERENCES public.subscription_packages(id),
  entity_type TEXT NOT NULL,
  entity_id UUID,
  start_date TIMESTAMPTZ DEFAULT now(),
  expiry_date TIMESTAMPTZ,
  status TEXT DEFAULT 'active', -- active, expired, cancelled
  payment_status TEXT DEFAULT 'not_required',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_type TEXT NOT NULL,
  reference_id UUID,
  amount NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'NPR',
  status TEXT DEFAULT 'success', -- pending, success, failed, refunded
  payment_method TEXT DEFAULT 'system',
  gateway TEXT DEFAULT 'system',
  transaction_id TEXT,
  paid_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. ADVERTISEMENTS & FEATURED ITEMS
CREATE TABLE IF NOT EXISTS public.advertisements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  placement TEXT DEFAULT 'homepage_banner',
  image_url TEXT NOT NULL,
  destination_url TEXT,
  sponsor_name TEXT,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  priority INTEGER DEFAULT 10,
  status TEXT DEFAULT 'active',
  is_active BOOLEAN DEFAULT true,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.featured_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL, -- college, job, mentor, course, event
  entity_id UUID NOT NULL,
  title TEXT,
  placement TEXT DEFAULT 'homepage',
  priority INTEGER DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 12. CMS PAGE SECTIONS & SITE BRANDING
CREATE TABLE IF NOT EXISTS public.page_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES public.page_sections(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL,
  title TEXT,
  subtitle TEXT,
  body TEXT,
  image_url TEXT,
  image_alt TEXT,
  cta_label TEXT,
  cta_url TEXT,
  display_order INTEGER DEFAULT 1,
  is_visible BOOLEAN DEFAULT true,
  page TEXT DEFAULT 'home',
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.site_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 13. AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  resource_id TEXT,
  metadata JSONB DEFAULT '{}'::JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 14. HIGH-PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_institutes_category ON public.institutes(institution_category);
CREATE INDEX IF NOT EXISTS idx_institutes_admission_status ON public.institutes(admission_status);
CREATE INDEX IF NOT EXISTS idx_institutes_ranking ON public.institutes(ranking ASC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_institutes_is_featured ON public.institutes(is_featured DESC);
CREATE INDEX IF NOT EXISTS idx_institutes_name ON public.institutes(name);
CREATE INDEX IF NOT EXISTS idx_directory_search_gin ON public.institute_directory USING gin(search_document gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_jobs_company ON public.jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_jobs_active ON public.jobs(is_active, status);
CREATE INDEX IF NOT EXISTS idx_mentors_user ON public.mentors(user_id);
CREATE INDEX IF NOT EXISTS idx_events_start ON public.events(start_date);
CREATE INDEX IF NOT EXISTS idx_competitions_deadline ON public.competitions(registration_deadline);
CREATE INDEX IF NOT EXISTS idx_leads_owner ON public.leads(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON public.subscriptions(user_id, status);

-- 15. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institute_directory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.featured_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Helper RLS security function to verify administrative privileges
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Public read policies for published directory content
CREATE POLICY "Public read for profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Public read for institutes" ON public.institutes FOR SELECT USING (true);
CREATE POLICY "Admins manage institutes" ON public.institutes FOR ALL USING (public.is_admin());

CREATE POLICY "Public read for institute directory" ON public.institute_directory FOR SELECT USING (true);
CREATE POLICY "Admins manage institute directory" ON public.institute_directory FOR ALL USING (public.is_admin());

CREATE POLICY "Public read for jobs" ON public.jobs FOR SELECT USING (is_active = true OR public.is_admin());
CREATE POLICY "Admins manage jobs" ON public.jobs FOR ALL USING (public.is_admin());

CREATE POLICY "Public read for mentors" ON public.mentors FOR SELECT USING (true);
CREATE POLICY "Admins manage mentors" ON public.mentors FOR ALL USING (public.is_admin());

CREATE POLICY "Public read for events" ON public.events FOR SELECT USING (true);
CREATE POLICY "Admins manage events" ON public.events FOR ALL USING (public.is_admin());

CREATE POLICY "Public read for competitions" ON public.competitions FOR SELECT USING (true);
CREATE POLICY "Admins manage competitions" ON public.competitions FOR ALL USING (public.is_admin());

CREATE POLICY "Public read for courses" ON public.courses FOR SELECT USING (is_published = true OR public.is_admin());
CREATE POLICY "Admins manage courses" ON public.courses FOR ALL USING (public.is_admin());

CREATE POLICY "Public read for advertisements" ON public.advertisements FOR SELECT USING (is_active = true OR public.is_admin());
CREATE POLICY "Admins manage advertisements" ON public.advertisements FOR ALL USING (public.is_admin());

CREATE POLICY "Public read for featured items" ON public.featured_items FOR SELECT USING (true);
CREATE POLICY "Admins manage featured items" ON public.featured_items FOR ALL USING (public.is_admin());

CREATE POLICY "Public read for page sections" ON public.page_sections FOR SELECT USING (true);
CREATE POLICY "Admins manage page sections" ON public.page_sections FOR ALL USING (public.is_admin());

CREATE POLICY "Public read for site settings" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "Admins manage site settings" ON public.site_settings FOR ALL USING (public.is_admin());

-- 16. STORAGE BUCKET CONFIGURATIONS
INSERT INTO storage.buckets (id, name, public) VALUES
  ('college-media', 'college-media', true),
  ('mentor-media', 'mentor-media', true),
  ('event-media', 'event-media', true),
  ('course-media', 'course-media', true),
  ('ad-media', 'ad-media', true),
  ('resumes', 'resumes', false)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;
