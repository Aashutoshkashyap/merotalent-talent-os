-- Align the request table's legacy check constraint with the canonical module
-- keys produced by normalize_module_capability_key() and stored in
-- module_capabilities. Legacy values remain accepted so historical records and
-- older clients are not broken while all server-side decisions continue to
-- normalize them before granting access.

BEGIN;

ALTER TABLE public.sub_admin_requests
  DROP CONSTRAINT IF EXISTS sub_admin_requests_modules_check;

ALTER TABLE public.sub_admin_requests
  ADD CONSTRAINT sub_admin_requests_modules_check
  CHECK (
    cardinality(requested_modules) BETWEEN 1 AND 7
    AND requested_modules <@ ARRAY[
      -- Canonical capability keys.
      'college', 'jobs', 'mentor', 'events', 'courses',
      -- Supported legacy aliases retained for existing records/clients.
      'institutions', 'mentors', 'competitions', 'lms', 'companies'
    ]::text[]
  ) NOT VALID;

COMMENT ON CONSTRAINT sub_admin_requests_modules_check
  ON public.sub_admin_requests IS
  'Allows canonical module capability keys plus supported legacy aliases; authorization functions normalize before granting access.';

COMMIT;
