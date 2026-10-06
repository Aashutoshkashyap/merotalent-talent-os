-- A guest may enquire without an account, but must prove possession of both
-- the email address and WhatsApp number used for each college application.
BEGIN;

ALTER TABLE public.college_applications
  ADD COLUMN IF NOT EXISTS whatsapp_number text,
  ADD COLUMN IF NOT EXISTS guest_email_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS guest_whatsapp_verified_at timestamptz;

CREATE TABLE public.guest_college_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_token_hash text NOT NULL,
  college_id uuid NOT NULL REFERENCES public.institutes(id) ON DELETE CASCADE,
  email text NOT NULL,
  whatsapp_number text NOT NULL,
  email_code_hash text,
  whatsapp_code_hash text,
  email_code_expires_at timestamptz,
  whatsapp_code_expires_at timestamptz,
  email_dispatched_at timestamptz,
  whatsapp_dispatched_at timestamptz,
  email_verified_at timestamptz,
  whatsapp_verified_at timestamptz,
  email_attempts integer NOT NULL DEFAULT 0,
  whatsapp_attempts integer NOT NULL DEFAULT 0,
  last_email_requested_at timestamptz,
  last_whatsapp_requested_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '30 minutes',
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (guest_token_hash, college_id),
  CONSTRAINT guest_verification_email_check CHECK (email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'),
  CONSTRAINT guest_verification_whatsapp_check CHECK (whatsapp_number ~ '^[+][1-9][0-9]{7,14}$')
);
CREATE INDEX guest_college_verifications_expires_idx
  ON public.guest_college_verifications (expires_at);

CREATE TABLE public.guest_college_verification_sends (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  channel text NOT NULL CHECK (channel IN ('email', 'whatsapp')),
  destination text NOT NULL,
  guest_token_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX guest_college_verification_sends_destination_idx
  ON public.guest_college_verification_sends (channel, destination, created_at DESC);
CREATE INDEX guest_college_verification_sends_guest_idx
  ON public.guest_college_verification_sends (guest_token_hash, created_at DESC);

ALTER TABLE public.guest_college_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_college_verification_sends ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.guest_college_verifications, public.guest_college_verification_sends
  FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.reserve_guest_college_verification(
  p_guest_token text,
  p_college_id uuid,
  p_email text,
  p_whatsapp_number text,
  p_channel text,
  p_code_hash text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  token_hash text;
  safe_email text := lower(btrim(p_email));
  safe_whatsapp text := btrim(p_whatsapp_number);
  destination text;
  challenge public.guest_college_verifications%ROWTYPE;
  current_time timestamptz := now();
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Application server authorization required' USING ERRCODE = '42501';
  END IF;
  IF p_guest_token IS NULL OR p_college_id IS NULL OR safe_email IS NULL OR safe_whatsapp IS NULL
    OR p_channel IS NULL OR p_code_hash IS NULL
    OR p_guest_token !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89a-bA-B][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$'
    OR safe_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
    OR length(safe_email) > 254
    OR safe_whatsapp !~ '^[+][1-9][0-9]{7,14}$'
    OR p_channel NOT IN ('email', 'whatsapp')
    OR p_code_hash !~ '^[0-9a-f]{64}$'
  THEN
    RAISE EXCEPTION 'Invalid verification request' USING ERRCODE = '22023';
  END IF;
  PERFORM 1 FROM public.institutes i
  WHERE i.id = p_college_id AND i.status = 'approved'
    AND i.applications_enabled AND i.deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'College is not accepting applications' USING ERRCODE = 'P0001';
  END IF;

  token_hash := encode(digest(p_guest_token, 'sha256'), 'hex');
  destination := CASE WHEN p_channel = 'email' THEN safe_email ELSE safe_whatsapp END;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_channel || ':' || destination, 0));
  IF (SELECT count(*) FROM public.guest_college_verification_sends s
      WHERE s.channel = p_channel AND s.destination = destination
        AND s.created_at > current_time - interval '1 hour') >= 5
    OR (SELECT count(*) FROM public.guest_college_verification_sends s
      WHERE s.guest_token_hash = token_hash
        AND s.created_at > current_time - interval '1 hour') >= 10
  THEN
    RAISE EXCEPTION 'Too many verification requests. Try again later' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO challenge FROM public.guest_college_verifications v
  WHERE v.guest_token_hash = token_hash AND v.college_id = p_college_id
  FOR UPDATE;

  IF FOUND AND challenge.email = safe_email
    AND challenge.whatsapp_number = safe_whatsapp
    AND challenge.expires_at > current_time
    AND challenge.consumed_at IS NULL
  THEN
    IF (p_channel = 'email' AND challenge.last_email_requested_at > current_time - interval '60 seconds')
      OR (p_channel = 'whatsapp' AND challenge.last_whatsapp_requested_at > current_time - interval '60 seconds')
    THEN
      RAISE EXCEPTION 'Wait before requesting another code' USING ERRCODE = 'P0001';
    END IF;
    UPDATE public.guest_college_verifications v SET
      email_code_hash = CASE WHEN p_channel = 'email' THEN p_code_hash ELSE v.email_code_hash END,
      whatsapp_code_hash = CASE WHEN p_channel = 'whatsapp' THEN p_code_hash ELSE v.whatsapp_code_hash END,
      email_code_expires_at = CASE WHEN p_channel = 'email' THEN current_time + interval '10 minutes' ELSE v.email_code_expires_at END,
      whatsapp_code_expires_at = CASE WHEN p_channel = 'whatsapp' THEN current_time + interval '10 minutes' ELSE v.whatsapp_code_expires_at END,
      email_dispatched_at = CASE WHEN p_channel = 'email' THEN NULL ELSE v.email_dispatched_at END,
      whatsapp_dispatched_at = CASE WHEN p_channel = 'whatsapp' THEN NULL ELSE v.whatsapp_dispatched_at END,
      email_verified_at = CASE WHEN p_channel = 'email' THEN NULL ELSE v.email_verified_at END,
      whatsapp_verified_at = CASE WHEN p_channel = 'whatsapp' THEN NULL ELSE v.whatsapp_verified_at END,
      email_attempts = CASE WHEN p_channel = 'email' THEN 0 ELSE v.email_attempts END,
      whatsapp_attempts = CASE WHEN p_channel = 'whatsapp' THEN 0 ELSE v.whatsapp_attempts END,
      last_email_requested_at = CASE WHEN p_channel = 'email' THEN current_time ELSE v.last_email_requested_at END,
      last_whatsapp_requested_at = CASE WHEN p_channel = 'whatsapp' THEN current_time ELSE v.last_whatsapp_requested_at END,
      updated_at = current_time
    WHERE v.id = challenge.id;
  ELSE
    INSERT INTO public.guest_college_verifications (
      guest_token_hash, college_id, email, whatsapp_number,
      email_code_hash, whatsapp_code_hash,
      email_code_expires_at, whatsapp_code_expires_at,
      last_email_requested_at, last_whatsapp_requested_at
    ) VALUES (
      token_hash, p_college_id, safe_email, safe_whatsapp,
      CASE WHEN p_channel = 'email' THEN p_code_hash END,
      CASE WHEN p_channel = 'whatsapp' THEN p_code_hash END,
      CASE WHEN p_channel = 'email' THEN current_time + interval '10 minutes' END,
      CASE WHEN p_channel = 'whatsapp' THEN current_time + interval '10 minutes' END,
      CASE WHEN p_channel = 'email' THEN current_time END,
      CASE WHEN p_channel = 'whatsapp' THEN current_time END
    )
    ON CONFLICT (guest_token_hash, college_id) DO UPDATE SET
      id = gen_random_uuid(), email = EXCLUDED.email,
      whatsapp_number = EXCLUDED.whatsapp_number,
      email_code_hash = EXCLUDED.email_code_hash,
      whatsapp_code_hash = EXCLUDED.whatsapp_code_hash,
      email_code_expires_at = EXCLUDED.email_code_expires_at,
      whatsapp_code_expires_at = EXCLUDED.whatsapp_code_expires_at,
      email_dispatched_at = NULL, whatsapp_dispatched_at = NULL,
      email_verified_at = NULL, whatsapp_verified_at = NULL,
      email_attempts = 0, whatsapp_attempts = 0,
      last_email_requested_at = EXCLUDED.last_email_requested_at,
      last_whatsapp_requested_at = EXCLUDED.last_whatsapp_requested_at,
      expires_at = current_time + interval '30 minutes', consumed_at = NULL,
      updated_at = current_time
    RETURNING * INTO challenge;
  END IF;

  INSERT INTO public.guest_college_verification_sends(channel, destination, guest_token_hash)
  VALUES (p_channel, destination, token_hash);
  RETURN challenge.id;
END;
$$;
REVOKE ALL ON FUNCTION public.reserve_guest_college_verification(text, uuid, text, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_guest_college_verification(text, uuid, text, text, text, text)
  TO service_role;

CREATE FUNCTION public.check_guest_college_verification(
  p_verification_id uuid,
  p_guest_token text,
  p_channel text,
  p_code_hash text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  challenge public.guest_college_verifications%ROWTYPE;
  current_time timestamptz := now();
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Application server authorization required' USING ERRCODE = '42501';
  END IF;
  IF p_verification_id IS NULL OR p_guest_token IS NULL OR p_channel IS NULL OR p_code_hash IS NULL
    OR p_channel NOT IN ('email', 'whatsapp') OR p_code_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'Invalid verification request' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO challenge FROM public.guest_college_verifications v
  WHERE v.id = p_verification_id
    AND v.guest_token_hash = encode(digest(p_guest_token, 'sha256'), 'hex')
  FOR UPDATE;
  IF NOT FOUND OR challenge.expires_at <= current_time OR challenge.consumed_at IS NOT NULL THEN
    RETURN false;
  END IF;
  IF p_channel = 'email' THEN
    IF challenge.email_verified_at IS NOT NULL THEN RETURN true; END IF;
    IF challenge.email_attempts >= 5 OR challenge.email_dispatched_at IS NULL
      OR challenge.email_code_expires_at <= current_time THEN RETURN false; END IF;
    UPDATE public.guest_college_verifications v SET
      email_attempts = v.email_attempts + 1,
      email_verified_at = CASE WHEN v.email_code_hash = p_code_hash THEN current_time ELSE NULL END,
      email_code_hash = CASE WHEN v.email_code_hash = p_code_hash THEN NULL ELSE v.email_code_hash END,
      updated_at = current_time WHERE v.id = challenge.id;
    RETURN challenge.email_code_hash = p_code_hash;
  END IF;
  IF challenge.whatsapp_verified_at IS NOT NULL THEN RETURN true; END IF;
  IF challenge.whatsapp_attempts >= 5 OR challenge.whatsapp_dispatched_at IS NULL
    OR challenge.whatsapp_code_expires_at <= current_time THEN RETURN false; END IF;
  UPDATE public.guest_college_verifications v SET
    whatsapp_attempts = v.whatsapp_attempts + 1,
    whatsapp_verified_at = CASE WHEN v.whatsapp_code_hash = p_code_hash THEN current_time ELSE NULL END,
    whatsapp_code_hash = CASE WHEN v.whatsapp_code_hash = p_code_hash THEN NULL ELSE v.whatsapp_code_hash END,
    updated_at = current_time WHERE v.id = challenge.id;
  RETURN challenge.whatsapp_code_hash = p_code_hash;
END;
$$;
REVOKE ALL ON FUNCTION public.check_guest_college_verification(uuid, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_guest_college_verification(uuid, text, text, text)
  TO service_role;

-- The former service-role RPC is retained only as a private implementation.
-- Its existing validation, throttling, and idempotency behavior remains intact.
ALTER FUNCTION public.submit_guest_college_application(jsonb, text, text)
  RENAME TO submit_guest_college_application_before_verification;
REVOKE ALL ON FUNCTION public.submit_guest_college_application_before_verification(jsonb, text, text)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public.submit_guest_college_application(
  p_payload jsonb,
  p_guest_token text,
  p_idempotency_key text,
  p_verification_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  challenge public.guest_college_verifications%ROWTYPE;
  result jsonb;
  application_id uuid;
  existing_application public.college_applications%ROWTYPE;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Application server authorization required' USING ERRCODE = '42501';
  END IF;
  IF p_verification_id IS NULL OR p_guest_token IS NULL OR p_idempotency_key IS NULL THEN
    RAISE EXCEPTION 'Email and WhatsApp verification are required' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO challenge FROM public.guest_college_verifications v
  WHERE v.id = p_verification_id
    AND v.guest_token_hash = encode(digest(p_guest_token, 'sha256'), 'hex')
  FOR UPDATE;
  IF NOT FOUND
    OR challenge.expires_at <= now()
    OR challenge.college_id::text IS DISTINCT FROM p_payload ->> 'collegeId'
    OR challenge.email IS DISTINCT FROM lower(btrim(p_payload ->> 'email'))
    OR challenge.whatsapp_number IS DISTINCT FROM btrim(p_payload ->> 'phone')
  THEN
    RAISE EXCEPTION 'Email and WhatsApp verification are required' USING ERRCODE = '42501';
  END IF;

  -- An identical retry returns the committed application, even though its
  -- verification proof was consumed by the first successful submission.
  SELECT * INTO existing_application FROM public.college_applications ca
  WHERE ca.guest_token_hash = challenge.guest_token_hash
    AND ca.guest_idempotency_key = p_idempotency_key
    AND ca.applicant_id IS NULL
  LIMIT 1;
  IF FOUND THEN
    IF existing_application.institute_id IS DISTINCT FROM challenge.college_id
      OR existing_application.email IS DISTINCT FROM challenge.email
      OR existing_application.whatsapp_number IS DISTINCT FROM challenge.whatsapp_number
    THEN
      RAISE EXCEPTION 'Idempotency key belongs to a different application' USING ERRCODE = '23505';
    END IF;
    RETURN jsonb_build_object('id', existing_application.id,
      'status', existing_application.status,
      'createdAt', existing_application.submitted_at);
  END IF;

  IF challenge.consumed_at IS NOT NULL
    OR challenge.email_verified_at IS NULL
    OR challenge.whatsapp_verified_at IS NULL
  THEN
    RAISE EXCEPTION 'Verify your email and WhatsApp number before applying' USING ERRCODE = '42501';
  END IF;
  result := public.submit_guest_college_application_before_verification(
    p_payload, p_guest_token, p_idempotency_key);
  application_id := (result ->> 'id')::uuid;
  UPDATE public.college_applications ca SET
    whatsapp_number = challenge.whatsapp_number,
    guest_email_verified_at = challenge.email_verified_at,
    guest_whatsapp_verified_at = challenge.whatsapp_verified_at
  WHERE ca.id = application_id AND ca.applicant_id IS NULL;
  UPDATE public.guest_college_verifications v SET
    consumed_at = now(), updated_at = now()
  WHERE v.id = challenge.id;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.submit_guest_college_application(jsonb, text, text, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_guest_college_application(jsonb, text, text, uuid)
  TO service_role;

CREATE FUNCTION public.prune_guest_college_verifications()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  removed_challenges integer;
  removed_sends integer;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Application server authorization required' USING ERRCODE = '42501';
  END IF;
  DELETE FROM public.guest_college_verifications
  WHERE expires_at < now() - interval '7 days';
  GET DIAGNOSTICS removed_challenges = ROW_COUNT;
  DELETE FROM public.guest_college_verification_sends
  WHERE created_at < now() - interval '2 days';
  GET DIAGNOSTICS removed_sends = ROW_COUNT;
  RETURN jsonb_build_object('guest_challenges_removed', removed_challenges, 'guest_rate_records_removed', removed_sends);
END;
$$;
REVOKE ALL ON FUNCTION public.prune_guest_college_verifications()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prune_guest_college_verifications()
  TO service_role;

-- Guest applications may be attached only after the new account proves that
-- it owns the same email address. An unconfirmed account is not enough.
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
  SELECT lower(au.email) INTO trusted_email
  FROM auth.users au
  WHERE au.id = actor AND au.email_confirmed_at IS NOT NULL;
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
REVOKE ALL ON FUNCTION public.claim_guest_college_applications(text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_guest_college_applications(text)
  TO authenticated, service_role;

COMMIT;
