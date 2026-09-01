-- Guest college enquiries remain owned by the selected college.  They can be
-- claimed only from the same browser after the applicant verifies an account
-- with the same email.  Module workspaces are requested, never self-granted.

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

CREATE INDEX IF NOT EXISTS college_applications_guest_claim_idx
  ON public.college_applications(guest_token_hash, lower(email))
  WHERE applicant_id IS NULL AND deleted_at IS NULL;

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
  lead_id uuid;
  submitted_time timestamptz;
  safe_name text;
  safe_email text;
  safe_phone text;
  token_hash text;
  safe_idempotency_key text := NULLIF(btrim(p_idempotency_key), '');
  existing_result jsonb;
BEGIN
  -- This RPC is invoked only by the server's service-role client. It must not
  -- become a public Supabase RPC merely because the form starts anonymously.
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Guest submission must be processed by the application server'
      USING ERRCODE = '42501';
  END IF;
  IF p_guest_token !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89a-bA-B][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$' THEN
    RAISE EXCEPTION 'Invalid guest application token' USING ERRCODE = '22023';
  END IF;
  IF safe_idempotency_key IS NOT NULL
    AND safe_idempotency_key !~ '^[a-zA-Z0-9][a-zA-Z0-9._:-]{7,127}$' THEN
    RAISE EXCEPTION 'Invalid idempotency key' USING ERRCODE = '22023';
  END IF;

  PERFORM public.assert_module_form_payload('college', p_payload);
  target_id := (p_payload ->> 'collegeId')::uuid;
  PERFORM 1
  FROM public.institutes i
  WHERE i.id = target_id
    AND i.status = 'approved'
    AND i.applications_enabled = true
    AND i.deleted_at IS NULL;
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
    SELECT jsonb_build_object(
      'id', ca.id,
      'status', ca.status,
      'leadId', l.id,
      'createdAt', ca.submitted_at
    )
    INTO existing_result
    FROM public.college_applications ca
    LEFT JOIN public.leads l
      ON l.source_type = 'college_application' AND l.source_id = ca.id
    WHERE ca.guest_token_hash = token_hash
      AND ca.guest_idempotency_key = safe_idempotency_key
      AND ca.applicant_id IS NULL
    LIMIT 1;
    IF existing_result IS NOT NULL THEN
      RETURN existing_result;
    END IF;
  END IF;

  -- A single browser/email pair cannot flood the same college. A production
  -- CAPTCHA may be layered at the edge without changing this ownership model.
  IF (
    SELECT count(*)
    FROM public.college_applications ca
    WHERE ca.institute_id = target_id
      AND lower(ca.email) = safe_email
      AND ca.applicant_id IS NULL
      AND ca.submitted_at > now() - interval '10 minutes'
  ) >= 3 THEN
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
  )
  RETURNING id, submitted_at INTO application_id, submitted_time;

  SELECT l.id INTO lead_id
  FROM public.leads l
  WHERE l.source_type = 'college_application' AND l.source_id = application_id;

  RETURN jsonb_build_object(
    'id', application_id,
    'status', 'submitted',
    'leadId', lead_id,
    'createdAt', submitted_time
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_guest_college_application(jsonb, text, text)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_guest_college_application(jsonb, text, text)
TO service_role;

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
  SET applicant_id = actor,
      guest_token_hash = NULL,
      guest_idempotency_key = NULL,
      updated_at = now()
  WHERE ca.applicant_id IS NULL
    AND ca.deleted_at IS NULL
    AND ca.guest_token_hash = encode(digest(p_guest_token, 'sha256'), 'hex')
    AND lower(ca.email) = trusted_email;
  GET DIAGNOSTICS claimed_count = ROW_COUNT;

  INSERT INTO public.audit_logs(actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (
    actor, 'claim_guest_college_applications', 'college_applications', actor::text,
    jsonb_build_object('claimed_count', claimed_count)
  );
  RETURN jsonb_build_object('claimed_count', claimed_count);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_guest_college_applications(text)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_guest_college_applications(text)
TO authenticated;

-- Existing owners receive the primary lead and notification. This adds the
-- exact college administrators assigned to that listing, not every user who
-- merely requested generic module access.
CREATE OR REPLACE FUNCTION public.notify_assigned_college_admins()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.notifications(
    recipient_id, title, message, type, category, channel, status,
    entity_type, entity_id, action_url, metadata
  )
  SELECT ia.user_id, 'New college application',
    'A new application is available for your assigned college.',
    'info', 'college_application', 'dashboard', 'queued',
    'college_application', NEW.id, '/institute',
    jsonb_build_object('source_type', 'college_application', 'source_id', NEW.id)
  FROM public.institute_admins ia
  JOIN public.profiles p ON p.user_id = ia.user_id
  WHERE ia.institute_id = NEW.institute_id
    AND ia.user_id IS DISTINCT FROM (
      SELECT owner_user_id FROM public.institutes WHERE id = NEW.institute_id
    )
    AND p.account_status = 'active'
    AND p.deleted_at IS NULL;

  INSERT INTO public.notifications(
    recipient_id, title, message, type, category, channel, status,
    entity_type, entity_id, email_to, metadata
  )
  SELECT ia.user_id, 'New college application',
    'A new application is available for your assigned college.',
    'info', 'college_application', 'email', 'queued',
    'college_application', NEW.id, p.email,
    jsonb_build_object('source_type', 'college_application', 'source_id', NEW.id)
  FROM public.institute_admins ia
  JOIN public.profiles p ON p.user_id = ia.user_id
  WHERE ia.institute_id = NEW.institute_id
    AND ia.user_id IS DISTINCT FROM (
      SELECT owner_user_id FROM public.institutes WHERE id = NEW.institute_id
    )
    AND p.account_status = 'active'
    AND p.deleted_at IS NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_assigned_college_admins_trigger ON public.college_applications;
CREATE TRIGGER notify_assigned_college_admins_trigger
AFTER INSERT ON public.college_applications
FOR EACH ROW EXECUTE FUNCTION public.notify_assigned_college_admins();

DROP POLICY IF EXISTS "Applicants view own college applications" ON public.college_applications;
CREATE POLICY "Applicants and assigned college admins view applications"
ON public.college_applications FOR SELECT TO authenticated
USING (
  applicant_id = auth.uid()
  OR public.is_platform_admin()
  OR EXISTS (
    SELECT 1 FROM public.institutes i
    WHERE i.id = college_applications.institute_id
      AND i.owner_user_id = auth.uid()
      AND public.has_permission(auth.uid(), 'lead.view')
      AND public.has_entity_entitlement(auth.uid(), 'college', i.id, 'college_applications', 'read_only')
  )
  OR EXISTS (
    SELECT 1
    FROM public.institutes i
    JOIN public.institute_admins ia ON ia.institute_id = i.id
    WHERE i.id = college_applications.institute_id
      AND ia.user_id = auth.uid()
      AND public.has_permission(auth.uid(), 'lead.view')
      AND public.has_entity_entitlement(i.owner_user_id, 'college', i.id, 'college_applications', 'read_only')
  )
);

DROP POLICY IF EXISTS "Subscribed college owners manage applications" ON public.college_applications;
CREATE POLICY "Assigned college admins manage applications"
ON public.college_applications FOR UPDATE TO authenticated
USING (
  deleted_at IS NULL
  AND (
    public.is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM public.institutes i
      WHERE i.id = college_applications.institute_id
        AND i.owner_user_id = auth.uid()
        AND public.has_permission(auth.uid(), 'lead.view')
        AND public.has_entity_entitlement(auth.uid(), 'college', i.id, 'college_applications', 'full')
    )
    OR EXISTS (
      SELECT 1
      FROM public.institutes i
      JOIN public.institute_admins ia ON ia.institute_id = i.id
      WHERE i.id = college_applications.institute_id
        AND ia.user_id = auth.uid()
        AND public.has_permission(auth.uid(), 'lead.view')
        AND public.has_entity_entitlement(i.owner_user_id, 'college', i.id, 'college_applications', 'full')
    )
  )
)
WITH CHECK (
  deleted_at IS NULL
  AND (
    public.is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM public.institutes i
      WHERE i.id = college_applications.institute_id
        AND i.owner_user_id = auth.uid()
        AND public.has_permission(auth.uid(), 'lead.view')
        AND public.has_entity_entitlement(auth.uid(), 'college', i.id, 'college_applications', 'full')
    )
    OR EXISTS (
      SELECT 1
      FROM public.institutes i
      JOIN public.institute_admins ia ON ia.institute_id = i.id
      WHERE i.id = college_applications.institute_id
        AND ia.user_id = auth.uid()
        AND public.has_permission(auth.uid(), 'lead.view')
        AND public.has_entity_entitlement(i.owner_user_id, 'college', i.id, 'college_applications', 'full')
    )
  )
);

-- New password accounts are always students first. Selecting a workspace only
-- creates a reviewable request; it never assigns an institution/company/mentor
-- role from client-controlled metadata.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  requested_role text := NEW.raw_user_meta_data ->> 'account_type';
  requested_modules text[];
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''))
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'talent'::public.app_role)
  ON CONFLICT (user_id) DO NOTHING;

  requested_modules := CASE requested_role
    WHEN 'institution' THEN ARRAY['institutions']::text[]
    WHEN 'company' THEN ARRAY['companies']::text[]
    WHEN 'mentor' THEN ARRAY['mentors']::text[]
    ELSE NULL
  END;

  IF requested_modules IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.sub_admin_requests r
      WHERE r.user_id = NEW.id AND r.status = 'pending'
    )
  THEN
    INSERT INTO public.sub_admin_requests(
      user_id, user_name, user_email, requested_modules, reason, status, updated_at
    ) VALUES (
      NEW.id, COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''), NEW.email),
      lower(NEW.email), requested_modules,
      'Initial workspace access requested during account registration.', 'pending', now()
    );

    INSERT INTO public.notifications(
      recipient_id, title, message, type, category, channel, status, metadata
    )
    SELECT p.user_id, 'New module access request',
      'A new account requested module workspace access and requires review.',
      'info', 'sub_admin_request', 'dashboard', 'queued',
      jsonb_build_object('requester_id', NEW.id, 'requested_modules', requested_modules)
    FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.user_id
    WHERE ur.role = 'admin'
      AND p.account_status = 'active'
      AND p.deleted_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.request_initial_module_access(p_role text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  actor uuid := auth.uid();
  requested_modules text[];
  trusted_name text;
  trusted_email text;
  request_record public.sub_admin_requests%ROWTYPE;
  already_allowed boolean := false;
BEGIN
  IF actor IS NULL OR NOT public.is_account_active(actor) THEN
    RAISE EXCEPTION 'An active verified account is required' USING ERRCODE = '42501';
  END IF;
  requested_modules := CASE p_role
    WHEN 'institution' THEN ARRAY['institutions']::text[]
    WHEN 'company' THEN ARRAY['companies']::text[]
    WHEN 'mentor' THEN ARRAY['mentors']::text[]
    ELSE NULL
  END;
  IF requested_modules IS NULL THEN
    RAISE EXCEPTION 'Unsupported module workspace' USING ERRCODE = '22023';
  END IF;

  already_allowed := public.is_platform_admin(actor)
    OR (p_role = 'institution' AND (public.has_role(actor, 'institution') OR public.has_permission(actor, 'college.manage')))
    OR (p_role = 'company' AND (public.has_role(actor, 'company') OR public.has_permission(actor, 'job.post')))
    OR (p_role = 'mentor' AND (public.has_role(actor, 'mentor') OR public.has_permission(actor, 'mentor.manage')));
  IF already_allowed THEN
    RETURN jsonb_build_object('status', 'approved', 'existing_access', true);
  END IF;

  SELECT NULLIF(btrim(p.full_name), ''), lower(au.email)
  INTO trusted_name, trusted_email
  FROM public.profiles p JOIN auth.users au ON au.id = p.user_id
  WHERE p.user_id = actor;

  SELECT * INTO request_record
  FROM public.sub_admin_requests r
  WHERE r.user_id = actor AND r.status = 'pending'
  ORDER BY r.created_at DESC LIMIT 1;
  IF request_record.id IS NOT NULL THEN
    RETURN jsonb_build_object('id', request_record.id, 'status', 'pending', 'existing_request', true);
  END IF;

  INSERT INTO public.sub_admin_requests(
    user_id, user_name, user_email, requested_modules, reason, status, updated_at
  ) VALUES (
    actor, COALESCE(trusted_name, trusted_email), trusted_email, requested_modules,
    'Initial workspace access requested during OAuth sign-in.', 'pending', now()
  ) RETURNING * INTO request_record;

  INSERT INTO public.notifications(
    recipient_id, title, message, type, category, channel, status, metadata
  )
  SELECT p.user_id, 'New module access request',
    'A Google/Apple account requested module workspace access and requires review.',
    'info', 'sub_admin_request', 'dashboard', 'queued',
    jsonb_build_object('requester_id', actor, 'requested_modules', requested_modules)
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.user_id
  WHERE ur.role = 'admin' AND p.account_status = 'active' AND p.deleted_at IS NULL;

  INSERT INTO public.audit_logs(actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (
    actor, 'request_initial_module_access', 'sub_admin_requests', request_record.id::text,
    jsonb_build_object('requested_modules', requested_modules, 'provider_flow', 'oauth')
  );
  RETURN jsonb_build_object('id', request_record.id, 'status', 'pending');
END;
$$;

REVOKE ALL ON FUNCTION public.request_initial_module_access(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_initial_module_access(text) TO authenticated;

-- Retire the legacy OAuth role-claim endpoint. The new OAuth flow submits an
-- access request and keeps the primary account role as talent until approval.
REVOKE ALL ON FUNCTION public.claim_initial_oauth_role(text) FROM PUBLIC, anon, authenticated;

COMMIT;
