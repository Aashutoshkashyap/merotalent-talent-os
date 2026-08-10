-- Separate editorial approval, application availability, and paid verification.
-- Approved directory entries remain public without implying a paid relationship.

BEGIN;

ALTER TABLE public.institutes
  ADD COLUMN IF NOT EXISTS institution_category text NOT NULL DEFAULT 'college',
  ADD COLUMN IF NOT EXISTS affiliation text,
  ADD COLUMN IF NOT EXISTS level text,
  ADD COLUMN IF NOT EXISTS salient_features text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS scholarships text,
  ADD COLUMN IF NOT EXISTS admission_guidelines text,
  ADD COLUMN IF NOT EXISTS established_year integer,
  ADD COLUMN IF NOT EXISTS applications_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS source_url text;

ALTER TABLE public.institutes
  DROP CONSTRAINT IF EXISTS institutes_institution_category_check;
ALTER TABLE public.institutes
  ADD CONSTRAINT institutes_institution_category_check
  CHECK (institution_category IN ('college', 'school', 'plus_two')) NOT VALID;

ALTER TABLE public.institutes
  DROP CONSTRAINT IF EXISTS institutes_established_year_check;
ALTER TABLE public.institutes
  ADD CONSTRAINT institutes_established_year_check
  CHECK (established_year IS NULL OR established_year BETWEEN 1800 AND 2200) NOT VALID;

ALTER TABLE public.institutes
  DROP CONSTRAINT IF EXISTS institutes_source_url_check;
ALTER TABLE public.institutes
  ADD CONSTRAINT institutes_source_url_check
  CHECK (source_url IS NULL OR source_url ~ '^https://[^[:space:]]+$') NOT VALID;

CREATE INDEX IF NOT EXISTS institutes_public_category_idx
  ON public.institutes(institution_category, is_featured, ranking, name)
  WHERE status = 'approved' AND deleted_at IS NULL;

-- Visibility is an editorial decision. Payment is deliberately not part of
-- public row visibility and cannot be inferred from a client-writable flag.
DROP POLICY IF EXISTS "Public can view approved colleges" ON public.institutes;
CREATE POLICY "Public can view approved colleges"
ON public.institutes FOR SELECT TO anon, authenticated
USING (
  (status = 'approved' AND deleted_at IS NULL)
  OR ((owner_user_id = auth.uid() OR public.is_platform_admin()) AND deleted_at IS NULL)
);

DROP POLICY IF EXISTS "Inactive accounts only read public colleges" ON public.institutes;
CREATE POLICY "Inactive accounts only read public colleges"
ON public.institutes AS RESTRICTIVE FOR SELECT TO authenticated
USING (
  public.is_account_active()
  OR (status = 'approved' AND deleted_at IS NULL)
);

-- College owners may edit content but may not self-approve, enable intake, or
-- alter paid/editorial state. Those fields remain service/admin controlled.
CREATE OR REPLACE FUNCTION public.protect_college_admin_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role'
    AND session_user NOT IN ('postgres', 'supabase_admin')
    AND NOT public.is_platform_admin(auth.uid()) THEN
    IF TG_OP = 'INSERT' THEN
      NEW.status := CASE WHEN NEW.status = 'draft' THEN 'draft' ELSE 'pending' END;
      NEW.is_verified := false;
      NEW.is_featured := false;
      NEW.ranking := NULL;
      NEW.featured_until := NULL;
      NEW.applications_enabled := false;
      NEW.deleted_at := NULL;
    ELSE
      NEW.owner_user_id := OLD.owner_user_id;
      NEW.status := OLD.status;
      NEW.is_verified := OLD.is_verified;
      NEW.is_featured := OLD.is_featured;
      NEW.ranking := OLD.ranking;
      NEW.featured_until := OLD.featured_until;
      NEW.applications_enabled := OLD.applications_enabled;
      NEW.deleted_at := OLD.deleted_at;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- The public contract exposes a paid-verification bit derived from a valid,
-- successful college subscription. A stored/manual boolean is never trusted.
CREATE OR REPLACE FUNCTION public.is_college_payment_verified(_institute_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.institutes i
    JOIN public.subscriptions s
      ON s.user_id = i.owner_user_id
      AND s.entity_type = 'college'
      AND s.entity_id = i.id
    JOIN public.packages p ON p.id = s.package_id
    WHERE i.id = _institute_id
      AND i.status = 'approved'
      AND i.deleted_at IS NULL
      AND s.status = 'active'
      AND s.payment_status = 'success'
      AND s.start_date <= now()
      AND s.expiry_date > now()
      AND s.deleted_at IS NULL
      AND p.is_active = true
      AND p.deleted_at IS NULL
  )
$$;

REVOKE ALL ON FUNCTION public.is_college_payment_verified(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_college_payment_verified(uuid)
TO anon, authenticated, service_role;

DROP VIEW IF EXISTS public.institute_directory;
CREATE VIEW public.institute_directory
WITH (security_invoker = true, security_barrier = true) AS
SELECT
  i.id,
  i.name,
  i.short_name,
  i.slug,
  i.type,
  i.institution_category,
  i.location,
  i.affiliation,
  i.level,
  i.website,
  i.logo_url,
  i.cover_image_url,
  i.gallery_urls,
  i.youtube_url,
  i.description,
  i.salient_features,
  i.scholarships,
  i.admission_guidelines,
  i.established_year,
  i.courses_offered,
  i.contact_info,
  i.contact_email,
  i.contact_phone,
  i.admission_status,
  i.admission_deadline,
  i.total_seats,
  i.available_seats,
  i.status,
  i.ranking,
  i.is_featured,
  i.applications_enabled,
  i.source_url,
  i.created_at,
  i.updated_at,
  public.is_college_payment_verified(i.id) AS payment_verified
FROM public.institutes i
WHERE i.status = 'approved' AND i.deleted_at IS NULL;

REVOKE ALL ON public.institute_directory FROM PUBLIC;
GRANT SELECT ON public.institute_directory TO anon, authenticated;

-- Complimentary intake is an explicit per-listing switch. It allows the
-- current no-payment rollout while keeping paid lead access checks intact for
-- college owners once an owner is attached.
CREATE OR REPLACE FUNCTION public.submit_college_application(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  actor uuid := auth.uid();
  target_id uuid;
  submission_id uuid;
  lead_id uuid;
  created_time timestamptz;
  request_idempotency_key text;
  form_version integer;
  form_submission_id uuid;
  existing_response jsonb;
  result jsonb;
  trusted_name text;
  trusted_email text;
  trusted_payload jsonb;
BEGIN
  IF actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF NOT public.is_account_active(actor) THEN
    RAISE EXCEPTION 'Account is not active' USING ERRCODE = '42501';
  END IF;
  IF NOT public.has_permission(actor, 'application.submit') THEN
    RAISE EXCEPTION 'Student application permission is required' USING ERRCODE = '42501';
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

  SELECT NULLIF(btrim(p.full_name), ''), au.email
  INTO trusted_name, trusted_email
  FROM public.profiles p
  JOIN auth.users au ON au.id = p.user_id
  WHERE p.user_id = actor;
  IF trusted_name IS NULL OR trusted_email IS NULL THEN
    RAISE EXCEPTION 'A verified profile name and email are required' USING ERRCODE = '42501';
  END IF;
  trusted_payload := jsonb_set(
    jsonb_set(p_payload, '{fullName}', to_jsonb(trusted_name), true),
    '{email}', to_jsonb(lower(trusted_email)), true
  ) - '_idempotencyKey';

  request_idempotency_key := NULLIF(btrim(p_payload ->> '_idempotencyKey'), '');
  IF request_idempotency_key IS NULL THEN
    request_idempotency_key := gen_random_uuid()::text;
  END IF;
  form_version := COALESCE((p_payload ->> '_formVersion')::integer, 1);

  SELECT mfs.response INTO existing_response
  FROM public.module_form_submissions mfs
  WHERE mfs.user_id = actor
    AND mfs.module = 'college'
    AND mfs.idempotency_key = request_idempotency_key;
  IF existing_response IS NOT NULL THEN
    RETURN existing_response;
  END IF;

  IF (
    SELECT count(*)
    FROM public.module_form_submissions mfs
    WHERE mfs.user_id = actor
      AND mfs.module = 'college'
      AND mfs.created_at > now() - interval '10 minutes'
  ) >= 10 THEN
    RAISE EXCEPTION 'Too many form submissions; try again later' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.module_form_submissions(
    user_id, module, idempotency_key, form_version
  ) VALUES (
    actor, 'college', request_idempotency_key, form_version
  )
  ON CONFLICT (user_id, module, idempotency_key) DO NOTHING
  RETURNING id INTO form_submission_id;

  IF form_submission_id IS NULL THEN
    SELECT mfs.response INTO existing_response
    FROM public.module_form_submissions mfs
    WHERE mfs.user_id = actor
      AND mfs.module = 'college'
      AND mfs.idempotency_key = request_idempotency_key;
    IF existing_response IS NOT NULL THEN RETURN existing_response; END IF;
    RAISE EXCEPTION 'Submission is already being processed' USING ERRCODE = '40001';
  END IF;

  INSERT INTO public.college_applications(
    institute_id,
    applicant_id,
    full_name,
    email,
    phone,
    program_interest,
    intake,
    message,
    form_data
  ) VALUES (
    target_id,
    actor,
    trusted_name,
    lower(trusted_email),
    btrim(p_payload ->> 'phone'),
    NULLIF(btrim(p_payload ->> 'intendedCourse'), ''),
    NULLIF(btrim(p_payload ->> 'preferredIntake'), ''),
    NULLIF(btrim(p_payload ->> 'message'), ''),
    trusted_payload
  )
  RETURNING id, submitted_at INTO submission_id, created_time;

  SELECT l.id INTO lead_id
  FROM public.leads l
  WHERE l.source_type = 'college_application' AND l.source_id = submission_id;

  result := jsonb_build_object(
    'id', submission_id,
    'status', 'submitted',
    'leadId', lead_id,
    'createdAt', created_time
  );

  UPDATE public.module_form_submissions
  SET domain_submission_id = submission_id, response = result
  WHERE id = form_submission_id;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_college_application(jsonb)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_college_application(jsonb)
TO authenticated;

COMMIT;
