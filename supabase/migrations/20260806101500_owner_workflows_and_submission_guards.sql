-- Follow-up hardening for owner-managed applications/attendees and direct RPC
-- callers. This migration deliberately leaves previously applied migrations
-- unchanged.

BEGIN;

-- ---------------------------------------------------------------------------
-- Owner update guards
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.protect_mentor_booking_owner_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  requested_status text := NEW.status;
BEGIN
  IF auth.role() = 'service_role'
    OR public.is_platform_admin(auth.uid())
    OR current_setting('app.merotalent_validated_submission', true) = 'on'
  THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.mentors m
    WHERE m.id = OLD.mentor_id
      AND m.user_id = auth.uid()
      AND m.deleted_at IS NULL
      AND public.has_permission(auth.uid(), 'mentor.manage')
  ) THEN
    RAISE EXCEPTION 'Only the booking mentor can manage this booking'
      USING ERRCODE = '42501';
  END IF;

  -- The mentor may move the workflow state only. Identity, schedule, the
  -- student's submitted details, and every financial field stay server-owned.
  NEW := OLD;

  IF requested_status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'pending'
    AND requested_status IN ('declined', 'cancelled')
  THEN
    NEW.status := requested_status;
  ELSIF OLD.status = 'pending'
    AND requested_status = 'confirmed'
    AND OLD.payment_status IN ('success', 'not_required')
  THEN
    NEW.status := requested_status;
  ELSIF OLD.status = 'confirmed'
    AND requested_status IN ('completed', 'cancelled', 'no_show')
  THEN
    NEW.status := requested_status;
  ELSE
    RAISE EXCEPTION 'Unsupported mentor booking status transition'
      USING ERRCODE = '22023';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_mentor_booking_owner_update()
FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS protect_mentor_booking_owner_update_trigger
ON public.mentor_bookings;
CREATE TRIGGER protect_mentor_booking_owner_update_trigger
BEFORE UPDATE ON public.mentor_bookings
FOR EACH ROW EXECUTE FUNCTION public.protect_mentor_booking_owner_update();

CREATE OR REPLACE FUNCTION public.protect_college_application_owner_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  requested_status text := NEW.status;
BEGIN
  IF auth.role() = 'service_role' OR public.is_platform_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  IF auth.uid() = OLD.applicant_id THEN
    -- The applicant withdrawal policy is intentionally narrow: attempting to
    -- change contact, application, attachment, or ownership data is ignored.
    NEW := OLD;
    NEW.status := 'withdrawn';
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.institutes i
    WHERE i.id = OLD.institute_id
      AND i.owner_user_id = auth.uid()
      AND i.deleted_at IS NULL
      AND public.has_permission(auth.uid(), 'college.manage')
      AND public.has_permission(auth.uid(), 'lead.view')
      AND public.has_active_subscription(auth.uid(), 'college', i.id, NULL)
  ) THEN
    RAISE EXCEPTION 'A subscribed college owner is required'
      USING ERRCODE = '42501';
  END IF;

  -- College owners manage workflow status only. Applicant identity, supplied
  -- answers, attachments, timestamps, and ownership remain immutable.
  NEW := OLD;

  IF requested_status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'submitted'
    AND requested_status IN ('reviewing', 'contacted', 'accepted', 'rejected')
  THEN
    NEW.status := requested_status;
  ELSIF OLD.status = 'reviewing'
    AND requested_status IN ('contacted', 'accepted', 'rejected')
  THEN
    NEW.status := requested_status;
  ELSIF OLD.status = 'contacted'
    AND requested_status IN ('accepted', 'rejected')
  THEN
    NEW.status := requested_status;
  ELSE
    RAISE EXCEPTION 'Unsupported college application status transition'
      USING ERRCODE = '22023';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_college_application_owner_update()
FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS protect_college_application_owner_update_trigger
ON public.college_applications;
CREATE TRIGGER protect_college_application_owner_update_trigger
BEFORE UPDATE ON public.college_applications
FOR EACH ROW EXECUTE FUNCTION public.protect_college_application_owner_update();

DROP POLICY IF EXISTS "Subscribed college owners manage applications"
ON public.college_applications;
CREATE POLICY "Subscribed college owners manage applications"
ON public.college_applications FOR UPDATE TO authenticated
USING (
  deleted_at IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.institutes i
    WHERE i.id = college_applications.institute_id
      AND i.owner_user_id = auth.uid()
      AND i.deleted_at IS NULL
      AND public.has_permission(auth.uid(), 'college.manage')
      AND public.has_permission(auth.uid(), 'lead.view')
      AND public.has_active_subscription(auth.uid(), 'college', i.id, NULL)
  )
)
WITH CHECK (
  deleted_at IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.institutes i
    WHERE i.id = college_applications.institute_id
      AND i.owner_user_id = auth.uid()
      AND i.deleted_at IS NULL
      AND public.has_permission(auth.uid(), 'college.manage')
      AND public.has_permission(auth.uid(), 'lead.view')
      AND public.has_active_subscription(auth.uid(), 'college', i.id, NULL)
  )
);

CREATE OR REPLACE FUNCTION public.protect_event_registration_owner_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  requested_status text := NEW.status;
BEGIN
  IF auth.role() = 'service_role'
    OR public.is_platform_admin(auth.uid())
    OR current_setting('app.merotalent_validated_submission', true) = 'on'
  THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.events e
    WHERE e.id = OLD.event_id
      AND e.organizer_user_id = auth.uid()
      AND e.deleted_at IS NULL
      AND public.has_permission(auth.uid(), 'event.organize')
      AND public.has_permission(auth.uid(), 'lead.view')
      AND public.has_active_subscription(auth.uid(), NULL, NULL, NULL)
  ) THEN
    RAISE EXCEPTION 'An authorized subscribed event organizer is required'
      USING ERRCODE = '42501';
  END IF;

  -- Organizers may manage attendance state only. Registration identity,
  -- ticket quantities, submitted answers, and payment fields are immutable.
  NEW := OLD;

  IF requested_status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'pending' AND requested_status = 'cancelled' THEN
    NEW.status := requested_status;
  ELSIF OLD.status = 'pending'
    AND requested_status = 'confirmed'
    AND OLD.payment_status IN ('success', 'not_required')
  THEN
    NEW.status := requested_status;
  ELSIF OLD.status = 'confirmed'
    AND requested_status IN ('attended', 'cancelled')
  THEN
    NEW.status := requested_status;
  ELSE
    RAISE EXCEPTION 'Unsupported event registration status transition'
      USING ERRCODE = '22023';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_event_registration_owner_update()
FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS protect_event_registration_owner_update_trigger
ON public.event_registrations;
CREATE TRIGGER protect_event_registration_owner_update_trigger
BEFORE UPDATE ON public.event_registrations
FOR EACH ROW EXECUTE FUNCTION public.protect_event_registration_owner_update();

DROP POLICY IF EXISTS "Authorized organizers manage event attendees"
ON public.event_registrations;
CREATE POLICY "Authorized organizers manage event attendees"
ON public.event_registrations FOR UPDATE TO authenticated
USING (
  deleted_at IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.events e
    WHERE e.id = event_registrations.event_id
      AND e.organizer_user_id = auth.uid()
      AND e.deleted_at IS NULL
      AND public.has_permission(auth.uid(), 'event.organize')
      AND public.has_permission(auth.uid(), 'lead.view')
      AND public.has_active_subscription(auth.uid(), NULL, NULL, NULL)
  )
)
WITH CHECK (
  deleted_at IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.events e
    WHERE e.id = event_registrations.event_id
      AND e.organizer_user_id = auth.uid()
      AND e.deleted_at IS NULL
      AND public.has_permission(auth.uid(), 'event.organize')
      AND public.has_permission(auth.uid(), 'lead.view')
      AND public.has_active_subscription(auth.uid(), NULL, NULL, NULL)
  )
);

-- ---------------------------------------------------------------------------
-- Direct PostgREST RPC validation
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_valid_module_form_date(_value text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  IF _value IS NULL OR _value !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN
    RETURN false;
  END IF;
  RETURN to_char(to_date(_value, 'YYYY-MM-DD'), 'YYYY-MM-DD') = _value;
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.is_valid_module_form_date(text)
FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.assert_module_form_payload(
  p_module text,
  p_payload jsonb
)
RETURNS void
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  allowed_keys text[];
  unexpected_key text;
  phone_value text;
  target_key text;
  target_value text;
  item jsonb;
BEGIN
  IF p_module NOT IN ('college', 'mentor', 'job', 'event') THEN
    RAISE EXCEPTION 'Unsupported module' USING ERRCODE = '22023';
  END IF;
  IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' THEN
    RAISE EXCEPTION 'Form payload must be a JSON object' USING ERRCODE = '22023';
  END IF;
  IF octet_length(p_payload::text) > 32768 THEN
    RAISE EXCEPTION 'Form payload exceeds 32768 bytes' USING ERRCODE = '22023';
  END IF;

  allowed_keys := CASE p_module
    WHEN 'college' THEN ARRAY[
      'collegeId', 'fullName', 'email', 'phone', 'intendedCourse',
      'preferredIntake', 'currentQualification', 'message',
      '_formVersion', '_idempotencyKey'
    ]
    WHEN 'job' THEN ARRAY[
      'jobId', 'fullName', 'email', 'phone', 'resumeUrl', 'coverLetter',
      'portfolioUrl', 'skills', 'expectedSalary', 'availableFrom',
      '_formVersion', '_idempotencyKey'
    ]
    WHEN 'mentor' THEN ARRAY[
      'mentorId', 'fullName', 'email', 'phone', 'scheduledDate',
      'scheduledTime', 'durationMinutes', 'topic', 'notes', 'paymentMethod',
      '_formVersion', '_idempotencyKey'
    ]
    ELSE ARRAY[
      'eventId', 'fullName', 'email', 'phone', 'ticketType',
      'attendeeCount', 'organization', 'specialRequirements', 'consent',
      '_formVersion', '_idempotencyKey'
    ]
  END;

  SELECT keys.key_name INTO unexpected_key
  FROM jsonb_object_keys(p_payload) AS keys(key_name)
  WHERE NOT (keys.key_name = ANY(allowed_keys))
  LIMIT 1;
  IF unexpected_key IS NOT NULL THEN
    RAISE EXCEPTION 'Unexpected form field: %', unexpected_key
      USING ERRCODE = '22023';
  END IF;

  IF p_payload ? '_formVersion'
    AND (
      jsonb_typeof(p_payload -> '_formVersion') <> 'number'
      OR p_payload ->> '_formVersion' <> '1'
    )
  THEN
    RAISE EXCEPTION 'Unsupported form version' USING ERRCODE = '22023';
  END IF;
  IF p_payload ? '_idempotencyKey'
    AND jsonb_typeof(p_payload -> '_idempotencyKey') <> 'null'
    AND (
      jsonb_typeof(p_payload -> '_idempotencyKey') <> 'string'
      OR p_payload ->> '_idempotencyKey' !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$'
    )
  THEN
    RAISE EXCEPTION 'Invalid idempotency key' USING ERRCODE = '22023';
  END IF;

  target_key := CASE p_module
    WHEN 'college' THEN 'collegeId'
    WHEN 'mentor' THEN 'mentorId'
    WHEN 'job' THEN 'jobId'
    ELSE 'eventId'
  END;
  IF jsonb_typeof(p_payload -> target_key) IS DISTINCT FROM 'string' THEN
    RAISE EXCEPTION 'A target resource is required' USING ERRCODE = '22023';
  END IF;
  target_value := p_payload ->> target_key;
  IF target_value !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RAISE EXCEPTION 'Invalid target resource identifier' USING ERRCODE = '22023';
  END IF;

  IF jsonb_typeof(p_payload -> 'fullName') IS DISTINCT FROM 'string'
    OR char_length(btrim(p_payload ->> 'fullName')) NOT BETWEEN 2 AND 120
  THEN
    RAISE EXCEPTION 'Full name must contain 2 to 120 characters'
      USING ERRCODE = '22023';
  END IF;
  IF jsonb_typeof(p_payload -> 'email') IS DISTINCT FROM 'string'
    OR char_length(btrim(p_payload ->> 'email')) NOT BETWEEN 3 AND 254
    OR btrim(p_payload ->> 'email') !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
  THEN
    RAISE EXCEPTION 'A valid email address is required' USING ERRCODE = '22023';
  END IF;
  IF jsonb_typeof(p_payload -> 'phone') IS DISTINCT FROM 'string' THEN
    RAISE EXCEPTION 'A phone number is required' USING ERRCODE = '22023';
  END IF;
  phone_value := btrim(p_payload ->> 'phone');
  IF char_length(phone_value) NOT BETWEEN 7 AND 20
    OR phone_value !~ '^[+]?[-()[:space:]0-9]{7,20}$'
    OR char_length(regexp_replace(phone_value, '[^0-9]', '', 'g')) NOT BETWEEN 7 AND 15
  THEN
    RAISE EXCEPTION 'A valid phone number is required' USING ERRCODE = '22023';
  END IF;

  IF p_module = 'college' THEN
    IF p_payload ? 'intendedCourse' AND (
      jsonb_typeof(p_payload -> 'intendedCourse') <> 'string'
      OR char_length(btrim(p_payload ->> 'intendedCourse')) > 160
    ) THEN RAISE EXCEPTION 'Course of interest is too long' USING ERRCODE = '22023'; END IF;
    IF p_payload ? 'preferredIntake' AND (
      jsonb_typeof(p_payload -> 'preferredIntake') <> 'string'
      OR char_length(btrim(p_payload ->> 'preferredIntake')) > 80
    ) THEN RAISE EXCEPTION 'Preferred intake is too long' USING ERRCODE = '22023'; END IF;
    IF p_payload ? 'currentQualification' AND (
      jsonb_typeof(p_payload -> 'currentQualification') <> 'string'
      OR char_length(btrim(p_payload ->> 'currentQualification')) > 120
    ) THEN RAISE EXCEPTION 'Current qualification is too long' USING ERRCODE = '22023'; END IF;
    IF p_payload ? 'message' AND (
      jsonb_typeof(p_payload -> 'message') <> 'string'
      OR char_length(btrim(p_payload ->> 'message')) > 2000
    ) THEN RAISE EXCEPTION 'Application message is too long' USING ERRCODE = '22023'; END IF;

  ELSIF p_module = 'job' THEN
    IF jsonb_typeof(p_payload -> 'resumeUrl') IS DISTINCT FROM 'string'
      OR char_length(p_payload ->> 'resumeUrl') NOT BETWEEN 1 AND 1024
    THEN RAISE EXCEPTION 'A valid resume reference is required' USING ERRCODE = '22023'; END IF;
    IF p_payload ? 'coverLetter' AND (
      jsonb_typeof(p_payload -> 'coverLetter') <> 'string'
      OR char_length(btrim(p_payload ->> 'coverLetter')) > 5000
    ) THEN RAISE EXCEPTION 'Cover letter is too long' USING ERRCODE = '22023'; END IF;
    IF p_payload ? 'portfolioUrl' AND (
      jsonb_typeof(p_payload -> 'portfolioUrl') <> 'string'
      OR char_length(p_payload ->> 'portfolioUrl') > 2048
      OR p_payload ->> 'portfolioUrl' !~ '^https?://[^[:space:]]+$'
    ) THEN RAISE EXCEPTION 'A valid portfolio URL is required' USING ERRCODE = '22023'; END IF;
    IF p_payload ? 'skills' THEN
      IF jsonb_typeof(p_payload -> 'skills') <> 'array' THEN
        RAISE EXCEPTION 'Skills must be an array of at most 30 items' USING ERRCODE = '22023';
      END IF;
      IF jsonb_array_length(p_payload -> 'skills') > 30 THEN
        RAISE EXCEPTION 'Skills must be an array of at most 30 items' USING ERRCODE = '22023';
      END IF;
      FOR item IN SELECT value FROM jsonb_array_elements(p_payload -> 'skills') LOOP
        IF jsonb_typeof(item) <> 'string'
          OR char_length(btrim(item #>> '{}')) NOT BETWEEN 1 AND 100
        THEN RAISE EXCEPTION 'Each skill must contain 1 to 100 characters' USING ERRCODE = '22023'; END IF;
      END LOOP;
    END IF;
    IF p_payload ? 'expectedSalary' THEN
      IF jsonb_typeof(p_payload -> 'expectedSalary') <> 'number' THEN
        RAISE EXCEPTION 'Expected salary must be a valid whole amount' USING ERRCODE = '22023';
      END IF;
      IF (p_payload ->> 'expectedSalary')::numeric < 0
        OR (p_payload ->> 'expectedSalary')::numeric > 100000000
        OR trunc((p_payload ->> 'expectedSalary')::numeric) <> (p_payload ->> 'expectedSalary')::numeric
      THEN RAISE EXCEPTION 'Expected salary must be a valid whole amount' USING ERRCODE = '22023'; END IF;
    END IF;
    IF p_payload ? 'availableFrom'
      AND (
        jsonb_typeof(p_payload -> 'availableFrom') <> 'string'
        OR NOT public.is_valid_module_form_date(p_payload ->> 'availableFrom')
      )
    THEN RAISE EXCEPTION 'Available-from date is invalid' USING ERRCODE = '22023'; END IF;

  ELSIF p_module = 'mentor' THEN
    IF jsonb_typeof(p_payload -> 'scheduledDate') IS DISTINCT FROM 'string'
      OR NOT public.is_valid_module_form_date(p_payload ->> 'scheduledDate')
    THEN RAISE EXCEPTION 'A valid session date is required' USING ERRCODE = '22023'; END IF;
    IF jsonb_typeof(p_payload -> 'scheduledTime') IS DISTINCT FROM 'string'
      OR p_payload ->> 'scheduledTime' !~ '^(?:[01][0-9]|2[0-3]):[0-5][0-9](?::[0-5][0-9])?$'
    THEN RAISE EXCEPTION 'A valid session time is required' USING ERRCODE = '22023'; END IF;
    IF jsonb_typeof(p_payload -> 'durationMinutes') IS DISTINCT FROM 'string'
      OR p_payload ->> 'durationMinutes' NOT IN ('30', '60', '90', '120')
    THEN RAISE EXCEPTION 'A supported session duration is required' USING ERRCODE = '22023'; END IF;
    IF jsonb_typeof(p_payload -> 'topic') IS DISTINCT FROM 'string'
      OR char_length(btrim(p_payload ->> 'topic')) NOT BETWEEN 2 AND 180
    THEN RAISE EXCEPTION 'A session topic is required' USING ERRCODE = '22023'; END IF;
    IF p_payload ? 'notes' AND (
      jsonb_typeof(p_payload -> 'notes') <> 'string'
      OR char_length(btrim(p_payload ->> 'notes')) > 2000
    ) THEN RAISE EXCEPTION 'Session notes are too long' USING ERRCODE = '22023'; END IF;
    IF jsonb_typeof(p_payload -> 'paymentMethod') IS DISTINCT FROM 'string'
      OR p_payload ->> 'paymentMethod' NOT IN ('khalti', 'esewa', 'card', 'bank_transfer')
    THEN RAISE EXCEPTION 'A supported payment method is required' USING ERRCODE = '22023'; END IF;

  ELSE
    IF p_payload ? 'ticketType' AND (
      jsonb_typeof(p_payload -> 'ticketType') <> 'string'
      OR char_length(btrim(p_payload ->> 'ticketType')) > 100
    ) THEN RAISE EXCEPTION 'Ticket type is too long' USING ERRCODE = '22023'; END IF;
    IF jsonb_typeof(p_payload -> 'attendeeCount') IS DISTINCT FROM 'number' THEN
      RAISE EXCEPTION 'Attendee count must be a whole number from 1 to 10' USING ERRCODE = '22023';
    END IF;
    IF (p_payload ->> 'attendeeCount')::numeric NOT BETWEEN 1 AND 10
      OR trunc((p_payload ->> 'attendeeCount')::numeric) <> (p_payload ->> 'attendeeCount')::numeric
    THEN RAISE EXCEPTION 'Attendee count must be a whole number from 1 to 10' USING ERRCODE = '22023'; END IF;
    IF p_payload ? 'organization' AND (
      jsonb_typeof(p_payload -> 'organization') <> 'string'
      OR char_length(btrim(p_payload ->> 'organization')) > 160
    ) THEN RAISE EXCEPTION 'Organization is too long' USING ERRCODE = '22023'; END IF;
    IF p_payload ? 'specialRequirements' AND (
      jsonb_typeof(p_payload -> 'specialRequirements') <> 'string'
      OR char_length(btrim(p_payload ->> 'specialRequirements')) > 1000
    ) THEN RAISE EXCEPTION 'Special requirements are too long' USING ERRCODE = '22023'; END IF;
    IF p_payload -> 'consent' IS DISTINCT FROM 'true'::jsonb THEN
      RAISE EXCEPTION 'Event terms must be accepted' USING ERRCODE = '22023';
    END IF;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.assert_module_form_payload(text, jsonb)
FROM PUBLIC, anon, authenticated;

-- Preserve the already-deployed implementation as a private implementation
-- detail, then expose a validated wrapper at the original PostgREST RPC name.
ALTER FUNCTION public.submit_module_form(text, jsonb)
RENAME TO submit_module_form_internal;

REVOKE ALL ON FUNCTION public.submit_module_form_internal(text, jsonb)
FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.submit_module_form(
  p_module text,
  p_payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.assert_module_form_payload(p_module, p_payload);
  PERFORM set_config('app.merotalent_validated_submission', 'on', true);
  RETURN public.submit_module_form_internal(p_module, p_payload);
END;
$$;

REVOKE ALL ON FUNCTION public.submit_module_form(text, jsonb)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_module_form(text, jsonb)
TO authenticated;

COMMIT;
