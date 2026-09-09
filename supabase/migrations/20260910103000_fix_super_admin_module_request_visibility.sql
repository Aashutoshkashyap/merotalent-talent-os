-- Make the Super Admin role authoritative for access-request visibility and
-- notifications. Older migrations only treated the legacy `admin` role as a
-- platform administrator, so a super-admin account could open the dashboard
-- but be blocked by RLS from its request queue.

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';

BEGIN;

-- The remote project predates the hardening migration, so make this patch
-- self-contained instead of assuming these review fields and RLS rules exist.
ALTER TABLE public.sub_admin_requests
  ADD COLUMN IF NOT EXISTS organization text,
  ADD COLUMN IF NOT EXISTS decision_note text,
  ADD COLUMN IF NOT EXISTS decided_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS decided_at timestamptz;

ALTER TABLE public.sub_admin_requests DROP CONSTRAINT IF EXISTS sub_admin_requests_status_check;
ALTER TABLE public.sub_admin_requests ADD CONSTRAINT sub_admin_requests_status_check
  CHECK (status IN ('pending', 'approved', 'rejected')) NOT VALID;

ALTER TABLE public.sub_admin_requests DROP CONSTRAINT IF EXISTS sub_admin_requests_modules_check;
ALTER TABLE public.sub_admin_requests ADD CONSTRAINT sub_admin_requests_modules_check
  CHECK (
    cardinality(requested_modules) BETWEEN 1 AND 7
    AND requested_modules <@ ARRAY[
      'jobs', 'institutions', 'mentors', 'events',
      'competitions', 'lms', 'companies'
    ]::text[]
  ) NOT VALID;

CREATE UNIQUE INDEX IF NOT EXISTS sub_admin_requests_one_pending_user_idx
ON public.sub_admin_requests(user_id)
WHERE status = 'pending';

DROP POLICY IF EXISTS "Users create sub_admin_requests" ON public.sub_admin_requests;
DROP POLICY IF EXISTS "Admins manage sub_admin_requests" ON public.sub_admin_requests;
DROP POLICY IF EXISTS "Users view own sub_admin_requests" ON public.sub_admin_requests;
DROP POLICY IF EXISTS "Active users view own sub admin requests" ON public.sub_admin_requests;

CREATE POLICY "Active users view own sub admin requests"
ON public.sub_admin_requests FOR SELECT TO authenticated
USING (
  (user_id = auth.uid() AND public.is_account_active(auth.uid()))
  OR public.is_platform_admin(auth.uid())
);

CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
  SELECT
    (auth.role() <> 'anon' OR _user_id IS NOT DISTINCT FROM auth.uid())
    AND public.is_account_active(_user_id)
    AND EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = _user_id
        AND ur.role::text IN ('admin', 'super_admin')
    )
$$;

REVOKE ALL ON FUNCTION public.is_platform_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_platform_admin(uuid) TO anon, authenticated, service_role;

-- This internal helper deliberately selects recipient accounts directly rather
-- than calling is_platform_admin(). Account creation can execute from an anon
-- auth context, but the recipient decision must still be based on the trusted
-- profile and role records.
CREATE OR REPLACE FUNCTION public.notify_platform_admins_of_module_access_request(
  p_request_id uuid,
  p_provider_flow text DEFAULT 'request'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  request_record public.sub_admin_requests%ROWTYPE;
BEGIN
  SELECT * INTO request_record
  FROM public.sub_admin_requests
  WHERE id = p_request_id;

  IF request_record.id IS NULL OR request_record.status <> 'pending' THEN
    RETURN;
  END IF;

  INSERT INTO public.notifications(
    recipient_id, title, message, type, category, channel, status,
    entity_type, entity_id, action_url, metadata
  )
  SELECT DISTINCT
    p.user_id,
    'New module access request',
    'A new account requested module workspace access and requires review.',
    'info',
    'sub_admin_request',
    'dashboard',
    'queued',
    'sub_admin_request',
    request_record.id,
    '/admin/access-requests',
    jsonb_build_object(
      'requester_id', request_record.user_id,
      'requested_modules', request_record.requested_modules,
      'provider_flow', p_provider_flow
    )
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.user_id
  WHERE ur.role::text IN ('admin', 'super_admin')
    AND p.account_status = 'active'
    AND p.deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.notifications n
      WHERE n.recipient_id = p.user_id
        AND n.category = 'sub_admin_request'
        AND n.entity_type = 'sub_admin_request'
        AND n.entity_id = request_record.id
        AND n.deleted_at IS NULL
    );
END;
$$;

REVOKE ALL ON FUNCTION public.notify_platform_admins_of_module_access_request(uuid, text)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notify_platform_admins_of_module_access_request(uuid, text)
TO service_role;

CREATE OR REPLACE FUNCTION public.request_sub_admin_access(
  p_requested_modules text[],
  p_reason text,
  p_organization text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  actor uuid := auth.uid();
  trusted_name text;
  trusted_email text;
  safe_modules text[];
  safe_reason text := NULLIF(btrim(p_reason), '');
  safe_organization text := NULLIF(btrim(p_organization), '');
  request_record public.sub_admin_requests%ROWTYPE;
BEGIN
  IF actor IS NULL OR NOT public.is_account_active(actor) THEN
    RAISE EXCEPTION 'An active verified account is required' USING ERRCODE = '42501';
  END IF;
  IF public.is_platform_admin(actor) THEN
    RAISE EXCEPTION 'Super Admin accounts do not need delegated access'
      USING ERRCODE = '22023';
  END IF;

  SELECT array_agg(DISTINCT btrim(module_name) ORDER BY btrim(module_name))
  INTO safe_modules
  FROM unnest(COALESCE(p_requested_modules, '{}'::text[])) AS requested(module_name)
  WHERE btrim(module_name) <> '';

  IF safe_modules IS NULL OR cardinality(safe_modules) NOT BETWEEN 1 AND 7
    OR NOT safe_modules <@ ARRAY[
      'jobs', 'institutions', 'mentors', 'events',
      'competitions', 'lms', 'companies'
    ]::text[]
  THEN
    RAISE EXCEPTION 'One or more requested modules are unsupported'
      USING ERRCODE = '22023';
  END IF;
  IF safe_reason IS NULL OR char_length(safe_reason) NOT BETWEEN 10 AND 2000 THEN
    RAISE EXCEPTION 'A reason between 10 and 2000 characters is required'
      USING ERRCODE = '22023';
  END IF;
  IF safe_organization IS NOT NULL AND char_length(safe_organization) > 200 THEN
    RAISE EXCEPTION 'Organization must be 200 characters or fewer'
      USING ERRCODE = '22023';
  END IF;

  SELECT NULLIF(btrim(p.full_name), ''), lower(au.email)
  INTO trusted_name, trusted_email
  FROM public.profiles p
  JOIN auth.users au ON au.id = p.user_id
  WHERE p.user_id = actor;
  IF trusted_name IS NULL OR trusted_email IS NULL THEN
    RAISE EXCEPTION 'A verified profile name and email are required'
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO request_record
  FROM public.sub_admin_requests r
  WHERE r.user_id = actor AND r.status = 'pending'
  ORDER BY r.created_at DESC
  LIMIT 1;
  IF request_record.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'id', request_record.id,
      'status', 'pending',
      'existing_request', true
    );
  END IF;

  INSERT INTO public.sub_admin_requests(
    user_id, user_name, user_email, requested_modules, reason,
    organization, status, updated_at
  ) VALUES (
    actor, trusted_name, trusted_email, safe_modules, safe_reason,
    safe_organization, 'pending', now()
  )
  RETURNING * INTO request_record;

  INSERT INTO public.audit_logs(
    actor_user_id, action, entity_type, entity_id, old_data, new_data, metadata
  ) VALUES (
    actor, 'request_sub_admin_access', 'sub_admin_requests', request_record.id::text,
    NULL,
    jsonb_build_object(
      'user_id', actor,
      'requested_modules', safe_modules,
      'status', 'pending'
    ),
    jsonb_build_object('organization', safe_organization)
  );

  PERFORM public.notify_platform_admins_of_module_access_request(request_record.id, 'student_dashboard');

  RETURN jsonb_build_object(
    'id', request_record.id,
    'user_id', request_record.user_id,
    'user_name', request_record.user_name,
    'user_email', request_record.user_email,
    'requested_modules', request_record.requested_modules,
    'reason', request_record.reason,
    'status', request_record.status,
    'created_at', request_record.created_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.request_sub_admin_access(text[], text, text)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_sub_admin_access(text[], text, text)
TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_decide_sub_admin_request(
  p_request_id uuid,
  p_approve boolean,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  actor uuid := auth.uid();
  request_record public.sub_admin_requests%ROWTYPE;
  safe_note text := NULLIF(btrim(p_note), '');
  permission_codes text[] := '{}'::text[];
BEGIN
  IF NOT public.is_platform_admin(actor) THEN
    RAISE EXCEPTION 'Only an active Super Admin can decide access requests'
      USING ERRCODE = '42501';
  END IF;
  IF p_request_id IS NULL OR p_approve IS NULL THEN
    RAISE EXCEPTION 'Request and decision are required' USING ERRCODE = '22023';
  END IF;
  IF safe_note IS NOT NULL AND char_length(safe_note) > 2000 THEN
    RAISE EXCEPTION 'Decision note must be 2000 characters or fewer'
      USING ERRCODE = '22023';
  END IF;

  SELECT * INTO request_record
  FROM public.sub_admin_requests r
  WHERE r.id = p_request_id
  FOR UPDATE;
  IF request_record.id IS NULL THEN
    RAISE EXCEPTION 'Access request was not found' USING ERRCODE = 'P0002';
  END IF;
  IF request_record.status <> 'pending' THEN
    RAISE EXCEPTION 'Access request has already been decided' USING ERRCODE = 'P0001';
  END IF;
  IF p_approve AND NOT public.is_account_active(request_record.user_id) THEN
    RAISE EXCEPTION 'Delegated access cannot be granted to an inactive account'
      USING ERRCODE = '42501';
  END IF;

  IF p_approve THEN
    SELECT COALESCE(array_agg(DISTINCT permission_code ORDER BY permission_code), '{}'::text[])
    INTO permission_codes
    FROM (
      SELECT unnest(CASE module_name
        WHEN 'jobs' THEN ARRAY['job.post', 'lead.view', 'media.manage']
        WHEN 'institutions' THEN ARRAY['college.manage', 'lead.view', 'media.manage']
        WHEN 'mentors' THEN ARRAY['mentor.manage', 'lead.view', 'media.manage']
        WHEN 'events' THEN ARRAY['event.organize', 'lead.view', 'media.manage']
        WHEN 'competitions' THEN ARRAY['event.organize', 'media.manage']
        WHEN 'lms' THEN ARRAY['course.manage', 'media.manage']
        WHEN 'companies' THEN ARRAY['job.post', 'lead.view', 'media.manage']
        ELSE '{}'::text[]
      END) AS permission_code
      FROM unnest(request_record.requested_modules) AS requested(module_name)
    ) mapped;

    INSERT INTO public.user_permissions(user_id, permission_id, granted_by)
    SELECT request_record.user_id, p.id, actor
    FROM public.permissions p
    WHERE p.code = ANY(permission_codes)
    ON CONFLICT (user_id, permission_id) DO UPDATE SET
      granted_by = EXCLUDED.granted_by,
      expires_at = NULL;
  END IF;

  UPDATE public.sub_admin_requests
  SET status = CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END,
      decision_note = safe_note,
      decided_by = actor,
      decided_at = now(),
      updated_at = now()
  WHERE id = request_record.id
  RETURNING * INTO request_record;

  INSERT INTO public.audit_logs(
    actor_user_id, action, entity_type, entity_id, old_data, new_data, metadata
  ) VALUES (
    actor,
    CASE WHEN p_approve THEN 'approve_sub_admin_access' ELSE 'reject_sub_admin_access' END,
    'sub_admin_requests', request_record.id::text,
    jsonb_build_object('status', 'pending'),
    jsonb_build_object(
      'status', request_record.status,
      'requested_modules', request_record.requested_modules,
      'granted_permissions', permission_codes
    ),
    jsonb_build_object('target_user_id', request_record.user_id, 'decision_note', safe_note)
  );

  RETURN jsonb_build_object(
    'id', request_record.id,
    'user_id', request_record.user_id,
    'status', request_record.status,
    'requested_modules', request_record.requested_modules,
    'granted_permissions', permission_codes,
    'decided_at', request_record.decided_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_decide_sub_admin_request(uuid, boolean, text)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_decide_sub_admin_request(uuid, boolean, text)
TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  requested_role text := NEW.raw_user_meta_data ->> 'account_type';
  requested_modules text[];
  request_record public.sub_admin_requests%ROWTYPE;
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''))
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'talent'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

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
    )
    RETURNING * INTO request_record;

    PERFORM public.notify_platform_admins_of_module_access_request(request_record.id, 'signup');
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
  FROM public.profiles p
  JOIN auth.users au ON au.id = p.user_id
  WHERE p.user_id = actor;

  SELECT * INTO request_record
  FROM public.sub_admin_requests r
  WHERE r.user_id = actor AND r.status = 'pending'
  ORDER BY r.created_at DESC
  LIMIT 1;
  IF request_record.id IS NOT NULL THEN
    RETURN jsonb_build_object('id', request_record.id, 'status', 'pending', 'existing_request', true);
  END IF;

  INSERT INTO public.sub_admin_requests(
    user_id, user_name, user_email, requested_modules, reason, status, updated_at
  ) VALUES (
    actor, COALESCE(trusted_name, trusted_email), trusted_email, requested_modules,
    'Initial workspace access requested during OAuth sign-in.', 'pending', now()
  )
  RETURNING * INTO request_record;

  PERFORM public.notify_platform_admins_of_module_access_request(request_record.id, 'oauth');

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

COMMIT;
