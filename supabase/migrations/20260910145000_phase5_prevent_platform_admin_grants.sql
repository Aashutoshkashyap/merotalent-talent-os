-- Super Admin is a bootstrap-only platform role. Operational administration
-- must be delegated through a module capability plus an entity assignment.
-- This replaces the previously applied function without altering role history.

BEGIN;

CREATE OR REPLACE FUNCTION public.admin_grant_role(p_user_id uuid, p_role public.app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE grant_module_key text;
BEGIN
  IF NOT public.is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only Super Admin can grant roles' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = p_user_id AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Profile not found' USING ERRCODE = 'P0002';
  END IF;

  IF p_role IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Platform Admin role cannot be granted through role management. Grant a module capability and entity assignment instead.'
      USING ERRCODE = '42501';
  ELSIF p_role = 'talent' THEN
    DELETE FROM public.user_roles
      WHERE user_id = p_user_id AND role NOT IN ('admin', 'super_admin');
    INSERT INTO public.user_roles(user_id, role)
      VALUES (p_user_id, 'talent')
      ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    grant_module_key := CASE p_role
      WHEN 'institution' THEN 'college'
      WHEN 'company' THEN 'jobs'
      WHEN 'mentor' THEN 'mentor'
    END;
    INSERT INTO public.user_module_capabilities(user_id, capability_id, granted_by)
      SELECT p_user_id, mc.id, auth.uid()
      FROM public.module_capabilities mc
      WHERE mc.module_key = grant_module_key
      ON CONFLICT (user_id, capability_id) DO UPDATE
        SET status = 'active', revoked_by = NULL, revoked_at = NULL, updated_at = now();
    INSERT INTO public.user_permissions(user_id, permission_id, granted_by)
      SELECT p_user_id, p.id, auth.uid()
      FROM public.permissions p
      WHERE p.code = ANY(public.module_capability_permissions(grant_module_key))
      ON CONFLICT (user_id, permission_id) DO UPDATE
        SET granted_by = EXCLUDED.granted_by, expires_at = NULL;
  END IF;

  INSERT INTO public.audit_logs(actor_user_id, action, entity_type, entity_id, metadata)
    VALUES (
      auth.uid(),
      'grant_role_or_capability',
      'user',
      p_user_id::text,
      jsonb_build_object('role', p_role::text)
    );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_grant_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_grant_role(uuid, public.app_role) TO authenticated, service_role;

COMMIT;
