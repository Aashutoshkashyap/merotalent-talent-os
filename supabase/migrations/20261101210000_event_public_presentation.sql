-- Public presentation only. No participant, payment, identity or access-grant changes.
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS gallery_urls text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS contact_email text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS contact_phone text;
