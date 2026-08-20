-- Migration to permit auto-confirming test user emails for local development fixtures
BEGIN;

CREATE OR REPLACE FUNCTION public.confirm_test_user_email(p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  IF lower(p_email) LIKE '%@merotalent.com' THEN
    UPDATE auth.users
    SET email_confirmed_at = COALESCE(email_confirmed_at, now())
    WHERE lower(email) = lower(p_email);
    RETURN true;
  END IF;
  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_test_user_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_test_user_email(text) TO anon, authenticated;

COMMIT;
