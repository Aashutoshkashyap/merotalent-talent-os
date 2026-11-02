-- Editable certificate presentation, independent of eligibility and financial state.
ALTER TABLE public.event_certificate_templates ADD COLUMN IF NOT EXISTS presentation jsonb NOT NULL DEFAULT '{}';
