-- Page Sections CMS table for admin-managed visual content.
-- Allows editing of homepage hero, banners, about sections, CTAs etc.

BEGIN;

CREATE TABLE IF NOT EXISTS public.page_sections (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key text NOT NULL,
  title       text NOT NULL,
  subtitle    text,
  body        text,
  image_url   text,
  image_alt   text,
  cta_label   text,
  cta_url     text,
  display_order integer NOT NULL DEFAULT 0,
  is_visible  boolean NOT NULL DEFAULT true,
  page        text NOT NULL DEFAULT 'home',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (page, section_key)
);

ALTER TABLE public.page_sections ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins manage page sections"
ON public.page_sections FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
);

-- Anyone can read visible sections (public content)
CREATE POLICY "Public read visible sections"
ON public.page_sections FOR SELECT TO anon, authenticated
USING (is_visible = true);

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION public.update_page_sections_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_page_sections_updated_at ON public.page_sections;
CREATE TRIGGER set_page_sections_updated_at
  BEFORE UPDATE ON public.page_sections
  FOR EACH ROW EXECUTE FUNCTION public.update_page_sections_timestamp();

COMMIT;
