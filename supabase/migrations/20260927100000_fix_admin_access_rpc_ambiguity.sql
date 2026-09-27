-- Resolve ambiguous PL/pgSQL identifiers in the Super Admin access controls.
-- This is intentionally a forward-only repair: the earlier governance
-- migrations are already applied in production and must remain immutable.

BEGIN;

CREATE OR REPLACE FUNCTION public.admin_update_user_access(
  p_user_id uuid,
  p_role public.app_role DEFAULT NULL,
  p_account_status text DEFAULT NULL
)
RETURNS TABLE(user_id uuid, role public.app_role, account_status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
#variable_conflict use_column
BEGIN
  IF NOT public.is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only an active Super Admin can update user access'
      USING ERRCODE = '42501';
  END IF;

  IF p_role IS NULL AND p_account_status IS NULL THEN
    RAISE EXCEPTION 'A role or account status is required'
      USING ERRCODE = '22023';
  END IF;

  IF p_account_status IS NOT NULL
    AND p_account_status NOT IN ('pending', 'active', 'suspended', 'deactivated') THEN
    RAISE EXCEPTION 'Unsupported account status' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('merotalent:last-active-admin', 0));

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles AS profile_record
    WHERE profile_record.user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'The Auth user does not have a platform profile'
      USING ERRCODE = 'P0002';
  END IF;

  IF p_role IS NOT NULL THEN
    INSERT INTO public.user_roles(user_id, role)
    VALUES (p_user_id, p_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    DELETE FROM public.user_roles AS role_record
    WHERE role_record.user_id = p_user_id
      AND role_record.role <> p_role;
  END IF;

  IF p_account_status IS NOT NULL THEN
    UPDATE public.profiles AS profile_record
    SET account_status = p_account_status,
        deleted_at = CASE
          WHEN p_account_status = 'deactivated' THEN COALESCE(profile_record.deleted_at, now())
          ELSE NULL
        END
    WHERE profile_record.user_id = p_user_id;
  END IF;

  RETURN QUERY
  SELECT
    profile_record.user_id,
    (
      SELECT role_record.role
      FROM public.user_roles AS role_record
      WHERE role_record.user_id = profile_record.user_id
      ORDER BY role_record.created_at, role_record.id
      LIMIT 1
    ),
    profile_record.account_status
  FROM public.profiles AS profile_record
  WHERE profile_record.user_id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_assign_entity_scope(
  p_user_id uuid,
  p_module_key text,
  p_entity_type text,
  p_entity_id uuid,
  p_source_request_id uuid DEFAULT NULL,
  p_scopes jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  capability_record public.user_module_capabilities%ROWTYPE;
  module_record public.module_capabilities%ROWTYPE;
  assignment_record public.entity_admin_assignments%ROWTYPE;
BEGIN
  IF NOT public.is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only Super Admin can assign entity scopes' USING ERRCODE = '42501';
  END IF;

  SELECT mc.* INTO module_record
  FROM public.module_capabilities AS mc
  WHERE mc.module_key = public.normalize_module_capability_key(p_module_key)
    AND mc.is_active;
  IF module_record.id IS NULL THEN
    RAISE EXCEPTION 'Module capability is unavailable' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.user_module_capabilities(user_id, capability_id, status, granted_by, source_request_id)
  VALUES (p_user_id, module_record.id, 'active', auth.uid(), p_source_request_id)
  ON CONFLICT (user_id, capability_id) DO UPDATE
    SET status = 'active', revoked_by = NULL, revoked_at = NULL, expires_at = NULL, updated_at = now()
  RETURNING * INTO capability_record;

  INSERT INTO public.entity_admin_assignments(user_id, user_capability_id, entity_type, entity_id, status, assigned_by, source_request_id, scopes)
  VALUES (p_user_id, capability_record.id, p_entity_type, p_entity_id, 'active', auth.uid(), p_source_request_id, COALESCE(p_scopes, '{}'::jsonb))
  ON CONFLICT (user_capability_id, entity_type, entity_id) DO UPDATE
    SET status = 'active', revoked_by = NULL, revoked_at = NULL, scopes = EXCLUDED.scopes, updated_at = now()
  RETURNING * INTO assignment_record;

  INSERT INTO public.audit_logs(actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (
    auth.uid(),
    'assign_entity_scope',
    p_entity_type,
    p_entity_id::text,
    jsonb_build_object('user_id', p_user_id, 'module_key', module_record.module_key, 'assignment_id', assignment_record.id)
  );
  RETURN jsonb_build_object('id', assignment_record.id, 'status', assignment_record.status, 'module_key', module_record.module_key);
END;
$$;

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
  request_record public.sub_admin_requests%ROWTYPE;
  requested_module_key text;
  assigned jsonb := '[]'::jsonb;
  permission_codes text[] := '{}'::text[];
BEGIN
  IF NOT public.is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only Super Admin can decide access requests' USING ERRCODE = '42501';
  END IF;

  SELECT request_row.* INTO request_record
  FROM public.sub_admin_requests AS request_row
  WHERE request_row.id = p_request_id
  FOR UPDATE;
  IF request_record.id IS NULL OR request_record.status <> 'pending' THEN
    RAISE EXCEPTION 'The pending access request was not found' USING ERRCODE = 'P0002';
  END IF;

  IF p_approve THEN
    FOREACH requested_module_key IN ARRAY request_record.requested_modules LOOP
      requested_module_key := public.normalize_module_capability_key(requested_module_key);
      IF requested_module_key IS NULL OR NOT EXISTS (
        SELECT 1
        FROM public.module_capabilities AS mc
        WHERE mc.module_key = requested_module_key AND mc.is_active
      ) THEN
        RAISE EXCEPTION 'Requested module capability is unavailable' USING ERRCODE = '22023';
      END IF;

      INSERT INTO public.user_module_capabilities(user_id, capability_id, status, granted_by, source_request_id)
      SELECT request_record.user_id, mc.id, 'active', auth.uid(), request_record.id
      FROM public.module_capabilities AS mc
      WHERE mc.module_key = requested_module_key
      ON CONFLICT (user_id, capability_id) DO UPDATE
        SET status = 'active', granted_by = EXCLUDED.granted_by, source_request_id = EXCLUDED.source_request_id,
            revoked_by = NULL, revoked_at = NULL, updated_at = now();

      assigned := assigned || jsonb_build_array(requested_module_key);
      permission_codes := permission_codes || CASE requested_module_key
        WHEN 'college' THEN ARRAY['college.manage', 'lead.view', 'media.manage']
        WHEN 'mentor' THEN ARRAY['mentor.manage', 'lead.view', 'media.manage']
        WHEN 'jobs' THEN ARRAY['job.post', 'lead.view', 'media.manage']
        WHEN 'events' THEN ARRAY['event.organize', 'lead.view', 'media.manage']
        WHEN 'courses' THEN ARRAY['course.manage', 'media.manage']
        ELSE '{}'::text[]
      END;
    END LOOP;

    INSERT INTO public.user_permissions(user_id, permission_id, granted_by)
    SELECT request_record.user_id, permission_record.id, auth.uid()
    FROM public.permissions AS permission_record
    WHERE permission_record.code = ANY(permission_codes)
    ON CONFLICT (user_id, permission_id) DO UPDATE
      SET granted_by = EXCLUDED.granted_by, expires_at = NULL;
  END IF;

  UPDATE public.sub_admin_requests AS request_row
  SET status = CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END,
      decision_note = NULLIF(btrim(p_note), ''),
      decided_by = auth.uid(),
      decided_at = now(),
      assigned_capabilities = CASE WHEN p_approve THEN assigned ELSE '[]'::jsonb END,
      updated_at = now()
  WHERE request_row.id = request_record.id
  RETURNING * INTO request_record;

  INSERT INTO public.audit_logs(actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (
    auth.uid(),
    CASE WHEN p_approve THEN 'approve_module_access' ELSE 'reject_module_access' END,
    'sub_admin_requests',
    request_record.id::text,
    jsonb_build_object('user_id', request_record.user_id, 'capabilities', assigned, 'note', request_record.decision_note)
  );

  INSERT INTO public.notifications(recipient_id, title, message, type, category, channel, status, entity_type, entity_id, action_url, metadata)
  VALUES (
    request_record.user_id,
    CASE WHEN p_approve THEN 'Module access approved' ELSE 'Module access request rejected' END,
    CASE WHEN p_approve
      THEN 'Your module capability has been granted. An entity assignment is required before you can manage private records.'
      ELSE COALESCE(request_record.decision_note, 'Your request was not approved.')
    END,
    'info', 'sub_admin_request', 'dashboard', 'queued', 'sub_admin_request', request_record.id, '/dashboard',
    jsonb_build_object('status', request_record.status)
  );

  RETURN jsonb_build_object('id', request_record.id, 'status', request_record.status, 'assigned_capabilities', request_record.assigned_capabilities);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_user_access(uuid, public.app_role, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_user_access(uuid, public.app_role, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_assign_entity_scope(uuid, text, text, uuid, uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_assign_entity_scope(uuid, text, text, uuid, uuid, jsonb) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_decide_sub_admin_request(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_decide_sub_admin_request(uuid, boolean, text) TO authenticated, service_role;

COMMIT;
