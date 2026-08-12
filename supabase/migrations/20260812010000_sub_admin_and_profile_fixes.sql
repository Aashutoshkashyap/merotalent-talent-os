-- Database migration for Sub-Admin access requests, profile schema fixes, and default page sections seed

BEGIN;

-- 1. Add missing columns to profiles table if not present
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS bio text;

-- 2. Create sub_admin_requests table
CREATE TABLE IF NOT EXISTS public.sub_admin_requests (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  user_name         text NOT NULL,
  user_email        text NOT NULL,
  requested_modules text[] NOT NULL DEFAULT '{}',
  reason            text NOT NULL,
  status            text NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sub_admin_requests ENABLE ROW LEVEL SECURITY;

-- Drop policies if exist to prevent duplicate error
DROP POLICY IF EXISTS "Users view own sub_admin_requests" ON public.sub_admin_requests;
DROP POLICY IF EXISTS "Users create sub_admin_requests" ON public.sub_admin_requests;
DROP POLICY IF EXISTS "Admins manage sub_admin_requests" ON public.sub_admin_requests;

-- RLS Policies for sub_admin_requests
CREATE POLICY "Users view own sub_admin_requests"
ON public.sub_admin_requests FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users create sub_admin_requests"
ON public.sub_admin_requests FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage sub_admin_requests"
ON public.sub_admin_requests FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
);

-- 3. Pre-load default page sections if table is empty
INSERT INTO public.page_sections (page, section_key, title, subtitle, body, cta_label, cta_url, display_order, is_visible)
VALUES
  (
    'home',
    'hero_banner',
    'Empowering Nepal’s Next Generation of Talent',
    'Discover premier colleges, expert mentors, verified career opportunities, and national skill hackathons.',
    'MeroTalent bridges the gap between ambition and opportunity for students, institutes, and enterprise partners across Nepal.',
    'Explore Opportunities',
    '/explore',
    1,
    true
  ),
  (
    'home',
    'features_grid',
    'Why MeroTalent?',
    'Built for students, academic institutions, and industry leaders',
    'Comprehensive OS offering verified profiles, mentor sessions, university admissions, and hiring pipelines.',
    'View Modules',
    '/about',
    2,
    true
  ),
  (
    'home',
    'latest_news',
    'Announcements & Platform Updates',
    'Stay updated with recent events, admissions, and hackathons',
    'Track upcoming national student hackathons, university scholarship drives, and mentor webinars.',
    'Read News',
    '/events',
    3,
    true
  ),
  (
    'home',
    'cta_banner',
    'Ready to Transform Your Career?',
    'Join thousands of talent and partners on Nepal’s premier platform',
    'Create your verified profile today or request sub-admin access to manage institution modules.',
    'Get Started',
    '/auth',
    4,
    true
  )
ON CONFLICT (page, section_key) DO NOTHING;

-- 4. Pre-load default site settings if table is empty
INSERT INTO public.site_settings (key, value)
VALUES
  ('site_title', 'MeroTalent - Higher Education & Career OS'),
  ('meta_description', 'Connect with top colleges, mentors, jobs, and competitions across Nepal.'),
  ('contact_email', 'support@merotalent.com'),
  ('contact_phone', '+977-01-4400000')
ON CONFLICT (key) DO NOTHING;

COMMIT;
