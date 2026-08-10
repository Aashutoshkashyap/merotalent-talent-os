-- Close role accumulation and bind premium lead access to the exact owner
-- entity instead of accepting any unrelated active subscription.

BEGIN;

DROP POLICY IF EXISTS "Users can insert own non privileged role" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert own initial role" ON public.user_roles;

-- The legacy insert policies allowed users to accumulate primary roles. Keep
-- admin where present; otherwise retain the oldest assignment and audit every
-- role removed before enforcing one primary role per account.
WITH ranked_roles AS (
  SELECT
    ur.id,
    ur.user_id,
    ur.role,
    row_number() OVER (
      PARTITION BY ur.user_id
      ORDER BY CASE WHEN ur.role = 'admin' THEN 0 ELSE 1 END, ur.created_at, ur.id
    ) AS role_rank
  FROM public.user_roles ur
)
INSERT INTO public.audit_logs(
  actor_user_id, action, entity_type, entity_id, old_data, new_data, metadata
)
SELECT
  NULL,
  'remove_duplicate_primary_role',
  'user_roles',
  rr.id::text,
  jsonb_build_object('user_id', rr.user_id, 'role', rr.role),
  NULL,
  jsonb_build_object('source', '20260810110500_rbac_and_entitlement_hardening')
FROM ranked_roles rr
WHERE rr.role_rank > 1;

WITH ranked_roles AS (
  SELECT
    ur.id,
    row_number() OVER (
      PARTITION BY ur.user_id
      ORDER BY CASE WHEN ur.role = 'admin' THEN 0 ELSE 1 END, ur.created_at, ur.id
    ) AS role_rank
  FROM public.user_roles ur
)
DELETE FROM public.user_roles ur
USING ranked_roles rr
WHERE ur.id = rr.id AND rr.role_rank > 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.user_roles'::regclass
      AND conname = 'user_roles_one_primary_role'
  ) THEN
    ALTER TABLE public.user_roles
      ADD CONSTRAINT user_roles_one_primary_role
      UNIQUE (user_id) DEFERRABLE INITIALLY DEFERRED;
  END IF;
END;
$$;

INSERT INTO public.permissions(code, description)
VALUES ('application.submit', 'Submit student applications, registrations, and bookings')
ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description;

INSERT INTO public.role_permissions(role, permission_id)
SELECT 'talent'::public.app_role, p.id
FROM public.permissions p
WHERE p.code = 'application.submit'
ON CONFLICT DO NOTHING;

-- Job posting and event organization are explicit grants, not side effects of
-- choosing an institution, company, or mentor primary role.
DELETE FROM public.role_permissions rp
USING public.permissions p
WHERE rp.permission_id = p.id
  AND p.code IN ('job.post', 'event.organize');

CREATE OR REPLACE FUNCTION public.is_account_active(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN auth.users au ON au.id = p.user_id
    WHERE p.user_id = _user_id
      AND p.account_status = 'active'
      AND p.deleted_at IS NULL
      AND au.email_confirmed_at IS NOT NULL
      AND au.deleted_at IS NULL
      AND (au.banned_until IS NULL OR au.banned_until <= now())
  )
$$;

CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
  SELECT public.is_account_active(_user_id) AND EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id AND ur.role = 'admin'
  )
$$;

CREATE OR REPLACE FUNCTION public.has_entity_entitlement(
  _user_id uuid,
  _entity_type text,
  _entity_id uuid,
  _feature text DEFAULT NULL,
  _required_mode text DEFAULT 'read_only'
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.is_account_active(_user_id) AND (
    public.is_platform_admin(_user_id)
    OR EXISTS (
      SELECT 1
      FROM public.subscriptions s
      JOIN public.packages p ON p.id = s.package_id
      WHERE s.user_id = _user_id
        AND s.entity_type = _entity_type
        AND (
          (s.entity_type = 'user' AND s.entity_id IS NULL AND _entity_id IS NULL)
          OR (s.entity_type <> 'user' AND _entity_id IS NOT NULL AND s.entity_id = _entity_id)
        )
        AND s.status IN ('trialing', 'active')
        AND s.payment_status IN ('success', 'not_required')
        AND s.start_date <= now()
        AND s.expiry_date > now()
        AND s.deleted_at IS NULL
        AND p.is_active = true
        AND p.deleted_at IS NULL
        AND (_feature IS NULL OR p.features @> jsonb_build_object(_feature, true))
        AND CASE _required_mode
          WHEN 'read_only' THEN p.lead_access_mode IN ('read_only', 'full')
          WHEN 'full' THEN p.lead_access_mode = 'full'
          ELSE false
        END
    )
  )
$$;

REVOKE ALL ON FUNCTION public.has_entity_entitlement(uuid, text, uuid, text, text)
FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_entity_entitlement(uuid, text, uuid, text, text)
TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.validate_subscription_entity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  package_audience public.app_role;
BEGIN
  SELECT p.audience INTO package_audience
  FROM public.packages p
  WHERE p.id = NEW.package_id AND p.is_active = true AND p.deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subscription package is unavailable' USING ERRCODE = '23503';
  END IF;

  IF package_audience IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = NEW.user_id AND ur.role = package_audience
  ) THEN
    RAISE EXCEPTION 'Package audience does not match the subscriber role'
      USING ERRCODE = '22023';
  END IF;

  IF NEW.entity_type = 'user' THEN
    IF NEW.entity_id IS NOT NULL THEN
      RAISE EXCEPTION 'User subscriptions cannot claim an entity' USING ERRCODE = '22023';
    END IF;
  ELSIF NEW.entity_type = 'college' THEN
    IF NEW.entity_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.institutes i
      WHERE i.id = NEW.entity_id AND i.owner_user_id = NEW.user_id AND i.deleted_at IS NULL
    ) THEN RAISE EXCEPTION 'College subscription ownership mismatch' USING ERRCODE = '42501'; END IF;
  ELSIF NEW.entity_type = 'mentor' THEN
    IF NEW.entity_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.mentors m
      WHERE m.id = NEW.entity_id AND m.user_id = NEW.user_id AND m.deleted_at IS NULL
    ) THEN RAISE EXCEPTION 'Mentor subscription ownership mismatch' USING ERRCODE = '42501'; END IF;
  ELSIF NEW.entity_type = 'company' THEN
    IF NEW.entity_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = NEW.entity_id AND c.user_id = NEW.user_id AND c.deleted_at IS NULL
    ) THEN RAISE EXCEPTION 'Company subscription ownership mismatch' USING ERRCODE = '42501'; END IF;
  ELSIF NEW.entity_type = 'organizer' THEN
    IF NEW.entity_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = NEW.entity_id AND e.organizer_user_id = NEW.user_id AND e.deleted_at IS NULL
    ) THEN RAISE EXCEPTION 'Organizer subscription ownership mismatch' USING ERRCODE = '42501'; END IF;
  ELSE
    RAISE EXCEPTION 'Unsupported subscription entity type' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_subscription_entity_trigger ON public.subscriptions;
CREATE TRIGGER validate_subscription_entity_trigger
BEFORE INSERT OR UPDATE OF user_id, package_id, entity_type, entity_id
ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.validate_subscription_entity();

DROP POLICY IF EXISTS "Applicants view own college applications" ON public.college_applications;
CREATE POLICY "Applicants view own college applications"
ON public.college_applications FOR SELECT TO authenticated
USING (
  applicant_id = auth.uid()
  OR public.is_platform_admin()
  OR EXISTS (
    SELECT 1 FROM public.institutes i
    WHERE i.id = college_applications.institute_id
      AND i.owner_user_id = auth.uid()
      AND public.has_permission(auth.uid(), 'lead.view')
      AND public.has_entity_entitlement(
        auth.uid(), 'college', i.id, 'college_applications', 'read_only'
      )
  )
);

DROP POLICY IF EXISTS "Subscribed college owners manage applications" ON public.college_applications;
CREATE POLICY "Subscribed college owners manage applications"
ON public.college_applications FOR UPDATE TO authenticated
USING (
  deleted_at IS NULL
  AND EXISTS (
    SELECT 1 FROM public.institutes i
    WHERE i.id = college_applications.institute_id
      AND i.owner_user_id = auth.uid()
      AND public.has_permission(auth.uid(), 'lead.view')
      AND public.has_entity_entitlement(
        auth.uid(), 'college', i.id, 'college_applications', 'full'
      )
  )
)
WITH CHECK (
  deleted_at IS NULL
  AND EXISTS (
    SELECT 1 FROM public.institutes i
    WHERE i.id = college_applications.institute_id
      AND i.owner_user_id = auth.uid()
      AND public.has_permission(auth.uid(), 'lead.view')
      AND public.has_entity_entitlement(
        auth.uid(), 'college', i.id, 'college_applications', 'full'
      )
  )
);

DROP POLICY IF EXISTS "Applicants and subscribed owners view job applications" ON public.job_applications;
CREATE POLICY "Applicants and subscribed owners view job applications"
ON public.job_applications FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR public.is_platform_admin()
  OR EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = job_applications.job_id
      AND j.owner_user_id = auth.uid()
      AND public.has_permission(auth.uid(), 'lead.view')
      AND (
        (j.company_id IS NOT NULL AND public.has_entity_entitlement(
          auth.uid(), 'company', j.company_id, 'job_applications', 'read_only'
        ))
        OR (j.company_id IS NULL AND public.has_entity_entitlement(
          auth.uid(), 'user', NULL::uuid, 'job_applications', 'read_only'
        ))
      )
  )
);

CREATE OR REPLACE FUNCTION public.protect_job_application_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  requested_status text := NEW.status;
  is_owner boolean := false;
BEGIN
  IF auth.role() = 'service_role' OR public.is_platform_admin() THEN RETURN NEW; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = OLD.job_id
      AND j.owner_user_id = auth.uid()
      AND public.has_permission(auth.uid(), 'lead.view')
      AND (
        (j.company_id IS NOT NULL AND public.has_entity_entitlement(
          auth.uid(), 'company', j.company_id, 'job_applications', 'full'
        ))
        OR (j.company_id IS NULL AND public.has_entity_entitlement(
          auth.uid(), 'user', NULL::uuid, 'job_applications', 'full'
        ))
      )
  ) INTO is_owner;

  NEW := OLD;
  IF OLD.user_id = auth.uid() THEN
    IF OLD.status NOT IN ('submitted', 'screening') OR requested_status <> 'withdrawn' THEN
      RAISE EXCEPTION 'Only a pending application can be withdrawn' USING ERRCODE = '22023';
    END IF;
    NEW.status := 'withdrawn';
  ELSIF is_owner THEN
    IF (OLD.status = 'submitted' AND requested_status IN ('screening', 'rejected'))
      OR (OLD.status = 'screening' AND requested_status IN ('interview', 'rejected'))
      OR (OLD.status = 'interview' AND requested_status IN ('offered', 'rejected'))
    THEN
      NEW.status := requested_status;
    ELSE
      RAISE EXCEPTION 'Unsupported job application status transition' USING ERRCODE = '22023';
    END IF;
  ELSE
    RAISE EXCEPTION 'Application update is not allowed' USING ERRCODE = '42501';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_job_application_update_trigger ON public.job_applications;
CREATE TRIGGER protect_job_application_update_trigger
BEFORE UPDATE ON public.job_applications
FOR EACH ROW EXECUTE FUNCTION public.protect_job_application_update();

DROP POLICY IF EXISTS "Students withdraw job applications" ON public.job_applications;
CREATE POLICY "Students withdraw job applications"
ON public.job_applications FOR UPDATE TO authenticated
USING (auth.uid() = user_id AND status IN ('submitted', 'screening'))
WITH CHECK (auth.uid() = user_id AND status = 'withdrawn');

CREATE POLICY "Subscribed job owners manage application status"
ON public.job_applications FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.jobs j
  WHERE j.id = job_applications.job_id
    AND j.owner_user_id = auth.uid()
    AND public.has_permission(auth.uid(), 'lead.view')
    AND (
      (j.company_id IS NOT NULL AND public.has_entity_entitlement(
        auth.uid(), 'company', j.company_id, 'job_applications', 'full'
      ))
      OR (j.company_id IS NULL AND public.has_entity_entitlement(
        auth.uid(), 'user', NULL::uuid, 'job_applications', 'full'
      ))
    )
))
WITH CHECK (true);

DROP POLICY IF EXISTS "Booking participants view mentor bookings" ON public.mentor_bookings;
CREATE POLICY "Booking participants view mentor bookings"
ON public.mentor_bookings FOR SELECT TO authenticated
USING (
  student_id = auth.uid()
  OR public.is_platform_admin()
  OR EXISTS (
    SELECT 1 FROM public.mentors m
    WHERE m.id = mentor_bookings.mentor_id
      AND m.user_id = auth.uid()
      AND public.has_permission(auth.uid(), 'lead.view')
      AND public.has_entity_entitlement(
        auth.uid(), 'mentor', m.id, 'mentor_bookings', 'read_only'
      )
  )
);

DROP POLICY IF EXISTS "Registrants and subscribed organizers view event registrations" ON public.event_registrations;
CREATE POLICY "Registrants and subscribed organizers view event registrations"
ON public.event_registrations FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_platform_admin()
  OR EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_registrations.event_id
      AND e.organizer_user_id = auth.uid()
      AND public.has_permission(auth.uid(), 'lead.view')
      AND public.has_entity_entitlement(
        auth.uid(),
        CASE WHEN e.organizer_type IN ('college', 'mentor', 'company')
          THEN e.organizer_type ELSE 'organizer' END,
        COALESCE(e.organizer_id, e.id),
        'event_registrations',
        'read_only'
      )
  )
);

DROP POLICY IF EXISTS "Subscribed owners view leads" ON public.leads;
CREATE POLICY "Subscribed owners view leads"
ON public.leads FOR SELECT TO authenticated
USING (
  public.is_platform_admin()
  OR (
    public.has_permission(auth.uid(), 'lead.view')
    AND CASE organization_type
      WHEN 'college' THEN EXISTS (
        SELECT 1 FROM public.institutes i
        WHERE i.id = leads.organization_id
          AND i.owner_user_id = auth.uid()
          AND i.deleted_at IS NULL
          AND public.has_entity_entitlement(
            auth.uid(), 'college', i.id, 'college_applications', 'read_only'
          )
      )
      WHEN 'mentor' THEN EXISTS (
        SELECT 1 FROM public.mentors m
        WHERE m.id = leads.organization_id
          AND m.user_id = auth.uid()
          AND m.deleted_at IS NULL
          AND public.has_entity_entitlement(
            auth.uid(), 'mentor', m.id, 'mentor_bookings', 'read_only'
          )
      )
      WHEN 'event_organizer' THEN EXISTS (
        SELECT 1
        FROM public.event_registrations er
        JOIN public.events e ON e.id = er.event_id
        WHERE er.id = leads.source_id
          AND e.organizer_user_id = auth.uid()
          AND e.deleted_at IS NULL
          AND public.has_entity_entitlement(
            auth.uid(),
            CASE WHEN e.organizer_type IN ('college', 'mentor', 'company')
              THEN e.organizer_type ELSE 'organizer' END,
            COALESCE(e.organizer_id, e.id),
            'event_registrations',
            'read_only'
          )
      )
      WHEN 'job_owner' THEN EXISTS (
        SELECT 1
        FROM public.job_applications ja
        JOIN public.jobs j ON j.id = ja.job_id
        WHERE ja.id = leads.source_id
          AND j.owner_user_id = auth.uid()
          AND j.deleted_at IS NULL
          AND public.has_entity_entitlement(
            auth.uid(),
            CASE WHEN j.company_id IS NULL THEN 'user' ELSE 'company' END,
            j.company_id,
            'job_applications',
            'read_only'
          )
      )
      ELSE false
    END
  )
);

-- Keep the validated public RPC name, but enforce student permission and an
-- exact premium entitlement before the private implementation creates leads.
CREATE OR REPLACE FUNCTION public.submit_module_form(p_module text, p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  actor uuid := auth.uid();
  target_id uuid;
  target_owner uuid;
  target_entity_type text;
  target_entity_id uuid;
  target_feature text;
  trusted_name text;
  trusted_email text;
  trusted_payload jsonb;
BEGIN
  PERFORM public.assert_module_form_payload(p_module, p_payload);
  IF actor IS NULL OR NOT public.has_permission(actor, 'application.submit') THEN
    RAISE EXCEPTION 'Student application permission is required' USING ERRCODE = '42501';
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
  );

  IF p_module = 'mentor' THEN
    target_id := (p_payload ->> 'mentorId')::uuid;
    SELECT m.user_id, 'mentor', m.id, 'mentor_bookings'
    INTO target_owner, target_entity_type, target_entity_id, target_feature
    FROM public.mentors m WHERE m.id = target_id AND m.deleted_at IS NULL;
  ELSIF p_module = 'job' THEN
    target_id := (p_payload ->> 'jobId')::uuid;
    SELECT j.owner_user_id,
      CASE WHEN j.company_id IS NULL THEN 'user' ELSE 'company' END,
      j.company_id,
      'job_applications'
    INTO target_owner, target_entity_type, target_entity_id, target_feature
    FROM public.jobs j WHERE j.id = target_id AND j.deleted_at IS NULL;
  ELSIF p_module = 'event' THEN
    target_id := (p_payload ->> 'eventId')::uuid;
    SELECT e.organizer_user_id,
      CASE WHEN e.organizer_type IN ('college', 'mentor', 'company')
        THEN e.organizer_type ELSE 'organizer' END,
      COALESCE(e.organizer_id, e.id),
      'event_registrations'
    INTO target_owner, target_entity_type, target_entity_id, target_feature
    FROM public.events e WHERE e.id = target_id AND e.deleted_at IS NULL;
  ELSE
    RAISE EXCEPTION 'College applications use the dedicated secure function'
      USING ERRCODE = '22023';
  END IF;

  IF target_owner IS NULL OR NOT public.has_entity_entitlement(
    target_owner, target_entity_type, target_entity_id, target_feature, 'full'
  ) THEN
    RAISE EXCEPTION 'The target is not accepting new leads' USING ERRCODE = 'P0001';
  END IF;

  PERFORM set_config('app.merotalent_validated_submission', 'on', true);
  RETURN public.submit_module_form_internal(p_module, trusted_payload);
END;
$$;

REVOKE ALL ON FUNCTION public.submit_module_form(text, jsonb)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_module_form(text, jsonb)
TO authenticated;

COMMIT;
