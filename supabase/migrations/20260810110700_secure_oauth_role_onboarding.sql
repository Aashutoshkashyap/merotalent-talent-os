-- OAuth providers cannot receive the signup account_type metadata used by the
-- Auth insert trigger. Permit one tightly-scoped, audited role claim for a new
-- OAuth account while keeping primary roles single-valued and admin forbidden.

BEGIN;

CREATE OR REPLACE FUNCTION public.claim_initial_oauth_role(p_role text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  actor uuid := auth.uid();
  current_role text;
  role_count integer;
  account_created_at timestamptz;
  auth_provider text;
  onboarding_done boolean;
BEGIN
  IF actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF p_role NOT IN ('institution', 'company', 'mentor') THEN
    RAISE EXCEPTION 'Unsupported OAuth account role' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('merotalent:oauth-role:' || actor::text, 0));

  SELECT
    au.created_at,
    COALESCE(au.raw_app_meta_data ->> 'provider', ''),
    COALESCE(p.onboarding_completed, false)
  INTO account_created_at, auth_provider, onboarding_done
  FROM auth.users au
  JOIN public.profiles p ON p.user_id = au.id
  WHERE au.id = actor
    AND au.email_confirmed_at IS NOT NULL
    AND au.deleted_at IS NULL
    AND (au.banned_until IS NULL OR au.banned_until <= now())
    AND p.account_status = 'active'
    AND p.deleted_at IS NULL
  FOR UPDATE OF au, p;

  IF account_created_at IS NULL
    OR account_created_at < now() - interval '30 minutes'
    OR auth_provider NOT IN ('google', 'apple')
    OR onboarding_done
  THEN
    RAISE EXCEPTION 'OAuth role onboarding is no longer available'
      USING ERRCODE = '42501';
  END IF;

  SELECT count(*), min(ur.role::text)
  INTO role_count, current_role
  FROM public.user_roles ur
  WHERE ur.user_id = actor;

  IF role_count <> 1 OR current_role <> 'talent' THEN
    RAISE EXCEPTION 'The account already has a primary role'
      USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.user_roles ur WHERE ur.user_id = actor;
  INSERT INTO public.user_roles(user_id, role)
  VALUES (actor, p_role::public.app_role);

  INSERT INTO public.audit_logs(
    actor_user_id, action, entity_type, entity_id, old_data, new_data, metadata
  ) VALUES (
    actor,
    'claim_initial_oauth_role',
    'user_roles',
    actor::text,
    jsonb_build_object('role', current_role),
    jsonb_build_object('role', p_role),
    jsonb_build_object('provider', auth_provider)
  );

  RETURN public.get_my_access_context();
END;
$$;

REVOKE ALL ON FUNCTION public.claim_initial_oauth_role(text)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_initial_oauth_role(text)
TO authenticated;

COMMIT;
