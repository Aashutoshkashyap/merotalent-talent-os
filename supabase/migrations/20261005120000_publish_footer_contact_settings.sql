BEGIN;

-- Support contacts are deliberately public site information. Never expose
-- arbitrary site settings or provider secrets through this change.
UPDATE public.site_settings
SET is_public = true
WHERE key IN ('support_email', 'support_phone');

COMMIT;
