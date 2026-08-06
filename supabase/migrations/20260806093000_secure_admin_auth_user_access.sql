-- Auth identities remain in Supabase Auth. This function gives the versioned
-- server API one audited, transactional way to replace a user's primary app
-- role and/or account status without trusting Auth metadata for authorization.

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
    AND p_account_status NOT IN ('pending', 'active', 'suspended', 'deactivated')
  THEN
    RAISE EXCEPTION 'Unsupported account status' USING ERRCODE = '22023';
  END IF;

  -- Serialize access mutations so two concurrent requests cannot each disable
  -- the other currently-active administrator.
  PERFORM pg_advisory_xact_lock(hashtextextended('merotalent:last-active-admin', 0));

  IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = p_user_id) THEN
    RAISE EXCEPTION 'The Auth user does not have a platform profile'
      USING ERRCODE = 'P0002';
  END IF;

  IF p_role IS NOT NULL THEN
    -- Insert first. When replacing admin with another role, the existing
    -- protect_last_admin_role trigger can reject the following delete and the
    -- whole transaction (including this insert) rolls back.
    INSERT INTO public.user_roles(user_id, role)
    VALUES (p_user_id, p_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    DELETE FROM public.user_roles ur
    WHERE ur.user_id = p_user_id AND ur.role <> p_role;
  END IF;

  IF p_account_status IS NOT NULL THEN
    UPDATE public.profiles p
    SET account_status = p_account_status,
        deleted_at = CASE
          WHEN p_account_status = 'deactivated' THEN COALESCE(p.deleted_at, now())
          ELSE NULL
        END
    WHERE p.user_id = p_user_id;
  END IF;

  RETURN QUERY
  SELECT
    p.user_id,
    (
      SELECT ur.role
      FROM public.user_roles ur
      WHERE ur.user_id = p.user_id
      ORDER BY ur.created_at, ur.id
      LIMIT 1
    ),
    p.account_status
  FROM public.profiles p
  WHERE p.user_id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_user_access(uuid, public.app_role, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_user_access(uuid, public.app_role, text) TO authenticated;

-- One-time bootstrap contract:
--   1. Invite a real email address through Supabase Auth.
--   2. The recipient accepts the invitation and verifies the email.
--   3. A trusted server using the service-role key calls
--      bootstrap_first_admin(the_verified_auth_user_id) exactly once.
-- The function cannot create an identity, set a password, run for an
-- unverified/inactive/banned user, or run after any admin assignment exists.
CREATE OR REPLACE FUNCTION public.bootstrap_first_admin(p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  assignment_id uuid;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'First administrator bootstrap requires the service role'
      USING ERRCODE = '42501';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('merotalent:first-admin-bootstrap', 0));

  IF EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.role = 'admin') THEN
    RAISE EXCEPTION 'An administrator assignment already exists'
      USING ERRCODE = 'P0001';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM auth.users au
    JOIN public.profiles p ON p.user_id = au.id
    WHERE au.id = p_user_id
      AND au.email_confirmed_at IS NOT NULL
      AND au.deleted_at IS NULL
      AND (au.banned_until IS NULL OR au.banned_until <= now())
      AND p.account_status = 'active'
      AND p.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'The target must be a verified, active Auth user with an active profile'
      USING ERRCODE = '22023';
  END IF;

  DELETE FROM public.user_roles ur WHERE ur.user_id = p_user_id;
  INSERT INTO public.user_roles(user_id, role)
  VALUES (p_user_id, 'admin')
  RETURNING id INTO assignment_id;

  INSERT INTO public.audit_logs(
    actor_user_id,
    action,
    entity_type,
    entity_id,
    old_data,
    new_data,
    metadata
  ) VALUES (
    NULL,
    'bootstrap_first_admin',
    'user_roles',
    assignment_id::text,
    NULL,
    jsonb_build_object('user_id', p_user_id, 'role', 'admin'),
    jsonb_build_object('provisioning_actor', 'service_role')
  );

  RETURN assignment_id;
END;
$$;

REVOKE ALL ON FUNCTION public.bootstrap_first_admin(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_first_admin(uuid) TO service_role;

COMMIT;
