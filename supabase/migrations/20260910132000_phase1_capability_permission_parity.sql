-- Keep the legacy permission-based route guards in parity with the new module
-- capability source of truth. A capability is not usable until both the
-- capability and its corresponding permissions are active.

BEGIN;

CREATE OR REPLACE FUNCTION public.module_capability_permissions(p_module_key text)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT CASE public.normalize_module_capability_key(p_module_key)
    WHEN 'college' THEN ARRAY['college.manage', 'lead.view', 'media.manage']
    WHEN 'mentor' THEN ARRAY['mentor.manage', 'lead.view', 'media.manage']
    WHEN 'jobs' THEN ARRAY['job.post', 'lead.view', 'media.manage']
    WHEN 'events' THEN ARRAY['event.organize', 'lead.view', 'media.manage']
    WHEN 'courses' THEN ARRAY['course.manage', 'media.manage']
    ELSE '{}'::text[]
  END
$$;

CREATE OR REPLACE FUNCTION public.admin_grant_role(p_user_id uuid, p_role public.app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE grant_module_key text;
BEGIN
  IF NOT public.is_platform_admin(auth.uid()) THEN RAISE EXCEPTION 'Only Super Admin can grant roles' USING ERRCODE = '42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = p_user_id AND deleted_at IS NULL) THEN RAISE EXCEPTION 'Profile not found' USING ERRCODE = 'P0002'; END IF;
  IF p_role IN ('admin', 'super_admin') THEN
    DELETE FROM public.user_roles WHERE user_id = p_user_id;
    INSERT INTO public.user_roles(user_id, role) VALUES (p_user_id, p_role) ON CONFLICT (user_id, role) DO NOTHING;
  ELSIF p_role = 'talent' THEN
    DELETE FROM public.user_roles WHERE user_id = p_user_id AND role NOT IN ('admin', 'super_admin');
    INSERT INTO public.user_roles(user_id, role) VALUES (p_user_id, 'talent') ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    grant_module_key := CASE p_role WHEN 'institution' THEN 'college' WHEN 'company' THEN 'jobs' WHEN 'mentor' THEN 'mentor' END;
    INSERT INTO public.user_module_capabilities(user_id, capability_id, granted_by)
    SELECT p_user_id, mc.id, auth.uid() FROM public.module_capabilities mc WHERE mc.module_key = grant_module_key
    ON CONFLICT (user_id, capability_id) DO UPDATE SET status = 'active', revoked_by = NULL, revoked_at = NULL, updated_at = now();
    INSERT INTO public.user_permissions(user_id, permission_id, granted_by)
    SELECT p_user_id, p.id, auth.uid() FROM public.permissions p
    WHERE p.code = ANY(public.module_capability_permissions(grant_module_key))
    ON CONFLICT (user_id, permission_id) DO UPDATE SET granted_by = EXCLUDED.granted_by, expires_at = NULL;
  END IF;
  INSERT INTO public.audit_logs(actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), 'grant_role_or_capability', 'user', p_user_id::text, jsonb_build_object('role', p_role::text));
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_revoke_role(p_user_id uuid, p_role public.app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE revoke_module_key text;
BEGIN
  IF NOT public.is_platform_admin(auth.uid()) THEN RAISE EXCEPTION 'Only Super Admin can revoke roles' USING ERRCODE = '42501'; END IF;
  IF p_role IN ('admin', 'super_admin') AND (SELECT count(*) FROM public.user_roles WHERE role IN ('admin', 'super_admin')) <= 1 THEN RAISE EXCEPTION 'The last Super Admin role cannot be removed' USING ERRCODE = 'P0001'; END IF;
  IF p_role IN ('admin', 'super_admin', 'talent') THEN
    DELETE FROM public.user_roles WHERE user_id = p_user_id AND role = p_role;
    INSERT INTO public.user_roles(user_id, role) VALUES (p_user_id, 'talent') ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    revoke_module_key := CASE p_role WHEN 'institution' THEN 'college' WHEN 'company' THEN 'jobs' WHEN 'mentor' THEN 'mentor' END;
    UPDATE public.user_module_capabilities umc SET status = 'revoked', revoked_by = auth.uid(), revoked_at = now(), updated_at = now()
    FROM public.module_capabilities mc
    WHERE umc.capability_id = mc.id AND umc.user_id = p_user_id AND mc.module_key = revoke_module_key;
    -- Remove permissions only when no other active capability needs them.
    DELETE FROM public.user_permissions up
    USING public.permissions p
    WHERE up.user_id = p_user_id AND up.permission_id = p.id
      AND p.code = ANY(public.module_capability_permissions(revoke_module_key))
      AND NOT EXISTS (
        SELECT 1 FROM public.user_module_capabilities umc
        JOIN public.module_capabilities mc ON mc.id = umc.capability_id
        WHERE umc.user_id = p_user_id AND umc.status = 'active'
          AND p.code = ANY(public.module_capability_permissions(mc.module_key))
      );
  END IF;
  INSERT INTO public.audit_logs(actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), 'revoke_role_or_capability', 'user', p_user_id::text, jsonb_build_object('role', p_role::text));
END;
$$;

REVOKE ALL ON FUNCTION public.module_capability_permissions(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.module_capability_permissions(text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_grant_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_grant_role(uuid, public.app_role) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_revoke_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_revoke_role(uuid, public.app_role) TO authenticated;

COMMIT;
