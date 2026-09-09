-- Restore the authenticated/guest bridge used by the public Apply Now flow.

BEGIN;

ALTER TABLE public.college_applications
  ALTER COLUMN applicant_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS guest_token_hash text,
  ADD COLUMN IF NOT EXISTS guest_idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS college_applications_guest_idempotency_idx
  ON public.college_applications(guest_token_hash, guest_idempotency_key)
  WHERE applicant_id IS NULL
    AND guest_token_hash IS NOT NULL
    AND guest_idempotency_key IS NOT NULL;

CREATE OR REPLACE FUNCTION public.submit_guest_college_application(
  p_payload jsonb,
  p_guest_token text,
  p_idempotency_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  target_id uuid;
  application_id uuid;
  submitted_time timestamptz;
  safe_name text;
  safe_email text;
  safe_phone text;
  token_hash text;
  safe_idempotency_key text := NULLIF(btrim(p_idempotency_key), '');
  existing_result jsonb;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Guest submission must be processed by the application server' USING ERRCODE = '42501';
  END IF;
  IF p_guest_token !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89a-bA-B][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$' THEN
    RAISE EXCEPTION 'Invalid guest application token' USING ERRCODE = '22023';
  END IF;
  IF safe_idempotency_key IS NOT NULL AND safe_idempotency_key !~ '^[a-zA-Z0-9][a-zA-Z0-9._:-]{7,127}$' THEN
    RAISE EXCEPTION 'Invalid idempotency key' USING ERRCODE = '22023';
  END IF;

  PERFORM public.assert_module_form_payload('college', p_payload);
  target_id := (p_payload ->> 'collegeId')::uuid;
  PERFORM 1 FROM public.institutes i
  WHERE i.id = target_id AND i.status = 'approved' AND i.applications_enabled = true AND i.deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'College is not accepting applications' USING ERRCODE = 'P0001';
  END IF;

  safe_name := NULLIF(btrim(p_payload ->> 'fullName'), '');
  safe_email := lower(NULLIF(btrim(p_payload ->> 'email'), ''));
  safe_phone := NULLIF(btrim(p_payload ->> 'phone'), '');
  IF safe_name IS NULL OR safe_email IS NULL OR safe_phone IS NULL THEN
    RAISE EXCEPTION 'Name, email, and phone are required' USING ERRCODE = '22023';
  END IF;
  token_hash := encode(digest(p_guest_token, 'sha256'), 'hex');

  IF safe_idempotency_key IS NOT NULL THEN
    SELECT jsonb_build_object('id', ca.id, 'status', ca.status, 'createdAt', ca.submitted_at)
    INTO existing_result
    FROM public.college_applications ca
    WHERE ca.guest_token_hash = token_hash AND ca.guest_idempotency_key = safe_idempotency_key
      AND ca.applicant_id IS NULL
    LIMIT 1;
    IF existing_result IS NOT NULL THEN RETURN existing_result; END IF;
  END IF;

  IF (SELECT count(*) FROM public.college_applications ca
      WHERE ca.institute_id = target_id AND lower(ca.email) = safe_email
        AND ca.applicant_id IS NULL AND ca.submitted_at > now() - interval '10 minutes') >= 3 THEN
    RAISE EXCEPTION 'Too many applications; please try again later' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.college_applications(
    institute_id, applicant_id, full_name, email, phone, program_interest,
    intake, message, form_data, guest_token_hash, guest_idempotency_key
  ) VALUES (
    target_id, NULL, safe_name, safe_email, safe_phone,
    NULLIF(btrim(p_payload ->> 'intendedCourse'), ''),
    NULLIF(btrim(p_payload ->> 'preferredIntake'), ''),
    NULLIF(btrim(p_payload ->> 'message'), ''),
    (p_payload - '_idempotencyKey') || jsonb_build_object('_submission_mode', 'guest'),
    token_hash, safe_idempotency_key
  ) RETURNING id, submitted_at INTO application_id, submitted_time;

  RETURN jsonb_build_object('id', application_id, 'status', 'submitted', 'createdAt', submitted_time);
END;
$$;

REVOKE ALL ON FUNCTION public.submit_guest_college_application(jsonb, text, text)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_guest_college_application(jsonb, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.claim_guest_college_applications(p_guest_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  actor uuid := auth.uid();
  trusted_email text;
  claimed_count integer := 0;
BEGIN
  IF actor IS NULL OR NOT public.is_account_active(actor) THEN
    RAISE EXCEPTION 'An active verified account is required' USING ERRCODE = '42501';
  END IF;
  IF p_guest_token !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89a-bA-B][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$' THEN
    RAISE EXCEPTION 'Invalid guest application token' USING ERRCODE = '22023';
  END IF;
  SELECT lower(email) INTO trusted_email FROM auth.users WHERE id = actor;
  IF trusted_email IS NULL THEN
    RAISE EXCEPTION 'A verified account email is required' USING ERRCODE = '42501';
  END IF;

  UPDATE public.college_applications ca
  SET applicant_id = actor, guest_token_hash = NULL, guest_idempotency_key = NULL, updated_at = now()
  WHERE ca.applicant_id IS NULL AND ca.deleted_at IS NULL
    AND ca.guest_token_hash = encode(digest(p_guest_token, 'sha256'), 'hex')
    AND lower(ca.email) = trusted_email;
  GET DIAGNOSTICS claimed_count = ROW_COUNT;

  INSERT INTO public.audit_logs(actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (actor, 'claim_guest_college_applications', 'college_applications', actor::text,
    jsonb_build_object('claimed_count', claimed_count));
  RETURN jsonb_build_object('claimed_count', claimed_count);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_guest_college_applications(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_guest_college_applications(text) TO authenticated, service_role;

COMMIT;
