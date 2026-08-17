-- Enable multi-role support: one user can simultaneously be a mentor, company
-- owner, institution admin, and talent. Two new RPCs let super-admins add or
-- remove individual roles without replacing the entire set.

BEGIN;

-- ─── admin_grant_role ────────────────────────────────────────────────────────
-- Adds a role to a user WITHOUT removing their existing roles.
-- Automatically provisions the matching entity row when granting "mentor".
CREATE OR REPLACE FUNCTION public.admin_grant_role(
  p_user_id uuid,
  p_role public.app_role
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only an active Super Admin can grant roles'
      USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = p_user_id) THEN
    RAISE EXCEPTION 'The Auth user does not have a platform profile'
      USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.user_roles(user_id, role)
  VALUES (p_user_id, p_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Auto-provision a mentor row when granting the mentor role.
  IF p_role = 'mentor' THEN
    INSERT INTO public.mentors(user_id)
    VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_grant_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_grant_role(uuid, public.app_role) TO authenticated;


-- ─── admin_revoke_role ───────────────────────────────────────────────────────
-- Removes a single role from a user. The protect_last_admin_role trigger
-- prevents removing the last admin. Revoking all non-talent roles is allowed;
-- the user simply falls back to a talent-only account.
CREATE OR REPLACE FUNCTION public.admin_revoke_role(
  p_user_id uuid,
  p_role public.app_role
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only an active Super Admin can revoke roles'
      USING ERRCODE = '42501';
  END IF;

  -- The existing protect_last_admin_role trigger will block this DELETE
  -- if it would remove the last admin from the platform.
  DELETE FROM public.user_roles ur
  WHERE ur.user_id = p_user_id AND ur.role = p_role;

  -- Ensure the user always retains at least the talent role.
  INSERT INTO public.user_roles(user_id, role)
  VALUES (p_user_id, 'talent')
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_revoke_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_revoke_role(uuid, public.app_role) TO authenticated;

COMMIT;
