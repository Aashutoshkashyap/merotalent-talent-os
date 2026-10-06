-- Signed-in students must save application-ready contact details in their
-- profile before any module submission. Guest college enquiries remain on
-- their separate, existing RPC and are deliberately unaffected.
BEGIN;

CREATE OR REPLACE FUNCTION public.assert_student_profile_ready(p_module text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  actor uuid := auth.uid();
  saved_name text;
  saved_phone text;
  saved_location text;
  saved_education text;
  saved_email text;
BEGIN
  IF actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT p.full_name, p.phone, p.location, p.education, au.email
  INTO saved_name, saved_phone, saved_location, saved_education, saved_email
  FROM public.profiles p
  JOIN auth.users au ON au.id = p.user_id
  WHERE p.user_id = actor;

  IF NOT FOUND
    OR length(btrim(coalesce(saved_name, ''))) NOT BETWEEN 2 AND 120
    OR length(btrim(coalesce(saved_phone, ''))) NOT BETWEEN 7 AND 20
    OR btrim(coalesce(saved_phone, '')) !~ '^[+]?[-()[:space:]0-9]{7,20}$'
    OR length(regexp_replace(coalesce(saved_phone, ''), '[^0-9]', '', 'g')) NOT BETWEEN 7 AND 15
    OR btrim(coalesce(saved_location, '')) = ''
    OR btrim(coalesce(saved_email, '')) = ''
    OR (p_module IN ('college', 'job') AND btrim(coalesce(saved_education, '')) = '')
  THEN
    RAISE EXCEPTION 'Complete your student profile before submitting'
      USING ERRCODE = '42501';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.assert_student_profile_ready(text)
FROM PUBLIC, anon, authenticated, service_role;

-- Keep the existing validation, entitlement, idempotency, and lead ownership
-- implementations intact. These new public wrappers close the direct-RPC
-- bypass of the application API's profile-completion check.
ALTER FUNCTION public.submit_module_form(text, jsonb)
RENAME TO submit_module_form_before_profile_gate;
REVOKE ALL ON FUNCTION public.submit_module_form_before_profile_gate(text, jsonb)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_module_form_before_profile_gate(text, jsonb)
TO service_role;

CREATE FUNCTION public.submit_module_form(p_module text, p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  trusted_phone text;
BEGIN
  PERFORM public.assert_student_profile_ready(p_module);
  SELECT btrim(p.phone) INTO trusted_phone
  FROM public.profiles p WHERE p.user_id = auth.uid();
  RETURN public.submit_module_form_before_profile_gate(
    p_module,
    jsonb_set(p_payload, '{phone}', to_jsonb(trusted_phone), true)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.submit_module_form(text, jsonb)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_module_form(text, jsonb)
TO authenticated, service_role;

ALTER FUNCTION public.submit_college_application(jsonb)
RENAME TO submit_college_application_before_profile_gate;
REVOKE ALL ON FUNCTION public.submit_college_application_before_profile_gate(jsonb)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_college_application_before_profile_gate(jsonb)
TO service_role;

CREATE FUNCTION public.submit_college_application(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  trusted_phone text;
  trusted_education text;
  trusted_payload jsonb;
BEGIN
  PERFORM public.assert_student_profile_ready('college');
  SELECT btrim(p.phone), btrim(p.education)
  INTO trusted_phone, trusted_education
  FROM public.profiles p WHERE p.user_id = auth.uid();
  trusted_payload := jsonb_set(p_payload, '{phone}', to_jsonb(trusted_phone), true);
  IF nullif(btrim(p_payload ->> 'currentQualification'), '') IS NULL THEN
    trusted_payload := jsonb_set(trusted_payload, '{currentQualification}', to_jsonb(trusted_education), true);
  END IF;
  RETURN public.submit_college_application_before_profile_gate(trusted_payload);
END;
$$;
REVOKE ALL ON FUNCTION public.submit_college_application(jsonb)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_college_application(jsonb)
TO authenticated, service_role;

COMMIT;
