-- Remove the public execute grant from the local-development email-confirmation
-- fixture.
--
-- 20260820163000 created public.confirm_test_user_email(text) as SECURITY
-- DEFINER and granted EXECUTE to anon, which let any unauthenticated caller set
-- auth.users.email_confirmed_at for any address ending @merotalent.com. That
-- domain is not neutral: src/contexts/AuthContext.tsx previously mapped
-- superadmin@merotalent.com and qa.admin@merotalent.com to the admin role.
--
-- It was the only anon-granted function in this schema that performs a write;
-- every other one is a read-only predicate used inside RLS policies.
--
-- The client no longer calls this function at all, so nothing depends on the
-- public grant. This migration is written to be a no-op in any environment that
-- never applied the fixture, which includes production.

BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'confirm_test_user_email'
  ) THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.confirm_test_user_email(text) FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.confirm_test_user_email(text) TO service_role';
  END IF;
END
$$;

COMMIT;
