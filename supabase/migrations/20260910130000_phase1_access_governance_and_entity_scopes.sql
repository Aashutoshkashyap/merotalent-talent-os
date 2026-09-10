-- Phase 1: central capability and entity-scope governance.
-- This is intentionally a forward migration. The production project was
-- baselined in supabase_migrations before this file was introduced.

BEGIN;

CREATE TABLE IF NOT EXISTS public.module_capabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_key text NOT NULL UNIQUE,
  label text NOT NULL,
  description text,
  is_requestable boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (module_key ~ '^[a-z][a-z0-9_]{1,63}$')
);

CREATE TABLE IF NOT EXISTS public.user_module_capabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  capability_id uuid NOT NULL REFERENCES public.module_capabilities(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active',
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  source_request_id uuid REFERENCES public.sub_admin_requests(id) ON DELETE SET NULL,
  revoked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  revoked_at timestamptz,
  expires_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, capability_id),
  CHECK (status IN ('active', 'suspended', 'revoked'))
);

CREATE TABLE IF NOT EXISTS public.entity_admin_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_capability_id uuid NOT NULL REFERENCES public.user_module_capabilities(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'active',
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  source_request_id uuid REFERENCES public.sub_admin_requests(id) ON DELETE SET NULL,
  revoked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  revoked_at timestamptz,
  scopes jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_capability_id, entity_type, entity_id),
  CHECK (entity_type IN ('college', 'mentor', 'company', 'event', 'job', 'course')),
  CHECK (status IN ('active', 'suspended', 'revoked'))
);

CREATE INDEX IF NOT EXISTS user_module_capabilities_active_user_idx
  ON public.user_module_capabilities(user_id, capability_id)
  WHERE status = 'active';
CREATE INDEX IF NOT EXISTS entity_admin_assignments_active_entity_idx
  ON public.entity_admin_assignments(entity_type, entity_id, user_id)
  WHERE status = 'active';

INSERT INTO public.module_capabilities (module_key, label, description, is_requestable)
VALUES
  ('college', 'College administration', 'Manage assigned college profiles and admission leads.', true),
  ('mentor', 'Mentor administration', 'Manage assigned mentor profiles, sessions and bookings.', true),
  ('jobs', 'Jobs administration', 'Manage assigned companies and their job postings.', true),
  ('events', 'Events administration', 'Manage assigned events and registrations.', true),
  ('courses', 'Partner courses administration', 'Manage partnered course listings and approved redirects.', true)
ON CONFLICT (module_key) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  updated_at = now();

ALTER TABLE public.sub_admin_requests
  ADD COLUMN IF NOT EXISTS requested_entity_scopes jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS assigned_capabilities jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.sub_admin_requests
  DROP CONSTRAINT IF EXISTS sub_admin_requests_status_check;
ALTER TABLE public.sub_admin_requests
  ADD CONSTRAINT sub_admin_requests_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')) NOT VALID;

CREATE OR REPLACE FUNCTION public.normalize_module_capability_key(p_value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT CASE lower(btrim(COALESCE(p_value, '')))
    WHEN 'institution' THEN 'college'
    WHEN 'institutions' THEN 'college'
    WHEN 'college' THEN 'college'
    WHEN 'colleges' THEN 'college'
    WHEN 'mentor' THEN 'mentor'
    WHEN 'mentors' THEN 'mentor'
    WHEN 'job' THEN 'jobs'
    WHEN 'jobs' THEN 'jobs'
    WHEN 'company' THEN 'jobs'
    WHEN 'companies' THEN 'jobs'
    WHEN 'event' THEN 'events'
    WHEN 'events' THEN 'events'
    WHEN 'competition' THEN 'events'
    WHEN 'competitions' THEN 'events'
    WHEN 'course' THEN 'courses'
    WHEN 'courses' THEN 'courses'
    WHEN 'lms' THEN 'courses'
    ELSE NULL
  END
$$;

CREATE OR REPLACE FUNCTION public.has_active_module_capability(
  p_user_id uuid,
  p_module_key text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
  SELECT public.is_platform_admin(p_user_id)
    OR EXISTS (
      SELECT 1
      FROM public.user_module_capabilities umc
      JOIN public.module_capabilities mc ON mc.id = umc.capability_id
      WHERE umc.user_id = p_user_id
        AND mc.module_key = public.normalize_module_capability_key(p_module_key)
        AND mc.is_active
        AND umc.status = 'active'
        AND (umc.expires_at IS NULL OR umc.expires_at > now())
    )
$$;

CREATE OR REPLACE FUNCTION public.has_active_entity_assignment(
  p_user_id uuid,
  p_module_key text,
  p_entity_type text,
  p_entity_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
  SELECT public.is_platform_admin(p_user_id)
    OR EXISTS (
      SELECT 1
      FROM public.entity_admin_assignments ea
      JOIN public.user_module_capabilities umc ON umc.id = ea.user_capability_id
      JOIN public.module_capabilities mc ON mc.id = umc.capability_id
      WHERE ea.user_id = p_user_id
        AND ea.entity_type = p_entity_type
        AND ea.entity_id = p_entity_id
        AND ea.status = 'active'
        AND umc.status = 'active'
        AND mc.is_active
        AND mc.module_key = public.normalize_module_capability_key(p_module_key)
        AND (umc.expires_at IS NULL OR umc.expires_at > now())
    )
$$;

CREATE OR REPLACE FUNCTION public.validate_entity_admin_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  capability_module text;
  entity_exists boolean := false;
BEGIN
  SELECT mc.module_key INTO capability_module
  FROM public.user_module_capabilities umc
  JOIN public.module_capabilities mc ON mc.id = umc.capability_id
  WHERE umc.id = NEW.user_capability_id AND umc.user_id = NEW.user_id;

  IF capability_module IS NULL THEN
    RAISE EXCEPTION 'Capability does not belong to the assigned user' USING ERRCODE = '42501';
  END IF;
  IF capability_module <> public.normalize_module_capability_key(
    CASE NEW.entity_type
      WHEN 'college' THEN 'college'
      WHEN 'mentor' THEN 'mentor'
      WHEN 'company' THEN 'jobs'
      WHEN 'job' THEN 'jobs'
      WHEN 'event' THEN 'events'
      WHEN 'course' THEN 'courses'
    END
  ) THEN
    RAISE EXCEPTION 'Capability cannot be assigned to this entity type' USING ERRCODE = '22023';
  END IF;

  CASE NEW.entity_type
    WHEN 'college' THEN SELECT EXISTS (SELECT 1 FROM public.institutes WHERE id = NEW.entity_id AND deleted_at IS NULL) INTO entity_exists;
    WHEN 'mentor' THEN SELECT EXISTS (SELECT 1 FROM public.mentors WHERE id = NEW.entity_id AND deleted_at IS NULL) INTO entity_exists;
    WHEN 'company' THEN SELECT EXISTS (SELECT 1 FROM public.companies WHERE id = NEW.entity_id AND deleted_at IS NULL) INTO entity_exists;
    WHEN 'event' THEN SELECT EXISTS (SELECT 1 FROM public.events WHERE id = NEW.entity_id AND deleted_at IS NULL) INTO entity_exists;
    WHEN 'job' THEN SELECT EXISTS (SELECT 1 FROM public.jobs WHERE id = NEW.entity_id AND deleted_at IS NULL) INTO entity_exists;
    WHEN 'course' THEN SELECT EXISTS (SELECT 1 FROM public.courses WHERE id = NEW.entity_id AND deleted_at IS NULL) INTO entity_exists;
  END CASE;
  IF NOT entity_exists THEN
    RAISE EXCEPTION 'The requested entity does not exist' USING ERRCODE = 'P0002';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_entity_admin_assignment_trigger ON public.entity_admin_assignments;
CREATE TRIGGER validate_entity_admin_assignment_trigger
BEFORE INSERT OR UPDATE OF user_id, user_capability_id, entity_type, entity_id
ON public.entity_admin_assignments
FOR EACH ROW EXECUTE FUNCTION public.validate_entity_admin_assignment();

ALTER TABLE public.module_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_module_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_admin_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public reads active module capabilities" ON public.module_capabilities;
CREATE POLICY "Public reads active module capabilities"
ON public.module_capabilities FOR SELECT TO authenticated
USING (is_active OR public.is_platform_admin());
DROP POLICY IF EXISTS "Super Admin manages module capabilities" ON public.module_capabilities;
CREATE POLICY "Super Admin manages module capabilities"
ON public.module_capabilities FOR ALL TO authenticated
USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS "Users view own module capabilities" ON public.user_module_capabilities;
CREATE POLICY "Users view own module capabilities"
ON public.user_module_capabilities FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_platform_admin());
DROP POLICY IF EXISTS "Super Admin manages user module capabilities" ON public.user_module_capabilities;
CREATE POLICY "Super Admin manages user module capabilities"
ON public.user_module_capabilities FOR ALL TO authenticated
USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS "Users view own entity assignments" ON public.entity_admin_assignments;
CREATE POLICY "Users view own entity assignments"
ON public.entity_admin_assignments FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_platform_admin());
DROP POLICY IF EXISTS "Super Admin manages entity assignments" ON public.entity_admin_assignments;
CREATE POLICY "Super Admin manages entity assignments"
ON public.entity_admin_assignments FOR ALL TO authenticated
USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

-- Preserve existing college assignments while making generic assignment the
-- source of truth for new approvals.
INSERT INTO public.user_module_capabilities(user_id, capability_id, granted_by, metadata)
SELECT DISTINCT ia.user_id, mc.id, NULL::uuid, jsonb_build_object('source', 'legacy_institute_admin')
FROM public.institute_admins ia
JOIN public.module_capabilities mc ON mc.module_key = 'college'
ON CONFLICT (user_id, capability_id) DO NOTHING;

INSERT INTO public.entity_admin_assignments(user_id, user_capability_id, entity_type, entity_id, assigned_by, scopes, metadata)
SELECT ia.user_id, umc.id, 'college', ia.institute_id, NULL::uuid,
  jsonb_build_object(
    'edit_profile', ia.can_edit_profile,
    'manage_courses', ia.can_manage_courses,
    'post_notices', ia.can_post_notices
  ),
  jsonb_build_object('source', 'legacy_institute_admin')
FROM public.institute_admins ia
JOIN public.module_capabilities mc ON mc.module_key = 'college'
JOIN public.user_module_capabilities umc ON umc.user_id = ia.user_id AND umc.capability_id = mc.id
ON CONFLICT (user_capability_id, entity_type, entity_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.sync_legacy_college_admin_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.entity_type = 'college' THEN
      DELETE FROM public.institute_admins WHERE institute_id = OLD.entity_id AND user_id = OLD.user_id;
    END IF;
    RETURN OLD;
  END IF;
  IF NEW.entity_type = 'college' THEN
    IF NEW.status = 'active' THEN
      INSERT INTO public.institute_admins(institute_id, user_id, can_edit_profile, can_manage_courses, can_post_notices)
      VALUES (NEW.entity_id, NEW.user_id, true, true, true)
      ON CONFLICT (institute_id, user_id) DO UPDATE SET
        can_edit_profile = EXCLUDED.can_edit_profile,
        can_manage_courses = EXCLUDED.can_manage_courses,
        can_post_notices = EXCLUDED.can_post_notices;
    ELSE
      DELETE FROM public.institute_admins WHERE institute_id = NEW.entity_id AND user_id = NEW.user_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_legacy_college_admin_assignment_trigger ON public.entity_admin_assignments;
CREATE TRIGGER sync_legacy_college_admin_assignment_trigger
AFTER INSERT OR UPDATE OF status OR DELETE ON public.entity_admin_assignments
FOR EACH ROW EXECUTE FUNCTION public.sync_legacy_college_admin_assignment();

CREATE OR REPLACE FUNCTION public.admin_grant_role(p_user_id uuid, p_role public.app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_platform_admin(auth.uid()) THEN RAISE EXCEPTION 'Only Super Admin can grant roles' USING ERRCODE = '42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = p_user_id AND deleted_at IS NULL) THEN RAISE EXCEPTION 'Profile not found' USING ERRCODE = 'P0002'; END IF;
  -- user_roles remains a primary-account role. Module authority is granted
  -- through user_module_capabilities, so do not reintroduce multi-primary-role
  -- accumulation merely to give someone a workspace.
  IF p_role IN ('admin', 'super_admin') THEN
    DELETE FROM public.user_roles WHERE user_id = p_user_id;
    INSERT INTO public.user_roles(user_id, role) VALUES (p_user_id, p_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSIF p_role = 'talent' THEN
    DELETE FROM public.user_roles WHERE user_id = p_user_id AND role NOT IN ('admin', 'super_admin');
    INSERT INTO public.user_roles(user_id, role) VALUES (p_user_id, 'talent')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    INSERT INTO public.user_module_capabilities(user_id, capability_id, granted_by)
    SELECT p_user_id, id, auth.uid()
    FROM public.module_capabilities
    WHERE module_key = CASE p_role
      WHEN 'institution' THEN 'college'
      WHEN 'company' THEN 'jobs'
      WHEN 'mentor' THEN 'mentor'
    END
    ON CONFLICT (user_id, capability_id) DO UPDATE SET status = 'active', revoked_by = NULL, revoked_at = NULL, updated_at = now();
  END IF;
  INSERT INTO public.audit_logs(actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), 'grant_role', 'user_roles', p_user_id::text, jsonb_build_object('role', p_role::text));
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_revoke_role(p_user_id uuid, p_role public.app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_platform_admin(auth.uid()) THEN RAISE EXCEPTION 'Only Super Admin can revoke roles' USING ERRCODE = '42501'; END IF;
  IF p_role IN ('admin', 'super_admin') AND (SELECT count(*) FROM public.user_roles WHERE role IN ('admin', 'super_admin')) <= 1 THEN
    RAISE EXCEPTION 'The last Super Admin role cannot be removed' USING ERRCODE = 'P0001';
  END IF;
  IF p_role IN ('admin', 'super_admin', 'talent') THEN
    DELETE FROM public.user_roles WHERE user_id = p_user_id AND role = p_role;
    INSERT INTO public.user_roles(user_id, role) VALUES (p_user_id, 'talent') ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    UPDATE public.user_module_capabilities umc
    SET status = 'revoked', revoked_by = auth.uid(), revoked_at = now(), updated_at = now()
    FROM public.module_capabilities mc
    WHERE umc.capability_id = mc.id AND umc.user_id = p_user_id
      AND mc.module_key = CASE p_role
        WHEN 'institution' THEN 'college'
        WHEN 'company' THEN 'jobs'
        WHEN 'mentor' THEN 'mentor'
      END;
  END IF;
  INSERT INTO public.audit_logs(actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), 'revoke_role', 'user_roles', p_user_id::text, jsonb_build_object('role', p_role::text));
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
DECLARE capability_record public.user_module_capabilities%ROWTYPE;
DECLARE module_record public.module_capabilities%ROWTYPE;
DECLARE assignment_record public.entity_admin_assignments%ROWTYPE;
BEGIN
  IF NOT public.is_platform_admin(auth.uid()) THEN RAISE EXCEPTION 'Only Super Admin can assign entity scopes' USING ERRCODE = '42501'; END IF;
  SELECT * INTO module_record FROM public.module_capabilities WHERE module_key = public.normalize_module_capability_key(p_module_key) AND is_active;
  IF module_record.id IS NULL THEN RAISE EXCEPTION 'Module capability is unavailable' USING ERRCODE = '22023'; END IF;
  INSERT INTO public.user_module_capabilities(user_id, capability_id, status, granted_by, source_request_id)
  VALUES (p_user_id, module_record.id, 'active', auth.uid(), p_source_request_id)
  ON CONFLICT (user_id, capability_id) DO UPDATE SET status = 'active', revoked_by = NULL, revoked_at = NULL, expires_at = NULL, updated_at = now()
  RETURNING * INTO capability_record;
  INSERT INTO public.entity_admin_assignments(user_id, user_capability_id, entity_type, entity_id, status, assigned_by, source_request_id, scopes)
  VALUES (p_user_id, capability_record.id, p_entity_type, p_entity_id, 'active', auth.uid(), p_source_request_id, COALESCE(p_scopes, '{}'::jsonb))
  ON CONFLICT (user_capability_id, entity_type, entity_id) DO UPDATE SET status = 'active', revoked_by = NULL, revoked_at = NULL, scopes = EXCLUDED.scopes, updated_at = now()
  RETURNING * INTO assignment_record;
  INSERT INTO public.audit_logs(actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), 'assign_entity_scope', p_entity_type, p_entity_id::text, jsonb_build_object('user_id', p_user_id, 'module_key', module_record.module_key, 'assignment_id', assignment_record.id));
  RETURN jsonb_build_object('id', assignment_record.id, 'status', assignment_record.status, 'module_key', module_record.module_key);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_revoke_entity_scope(p_assignment_id uuid, p_note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE assignment_record public.entity_admin_assignments%ROWTYPE;
BEGIN
  IF NOT public.is_platform_admin(auth.uid()) THEN RAISE EXCEPTION 'Only Super Admin can revoke entity scopes' USING ERRCODE = '42501'; END IF;
  UPDATE public.entity_admin_assignments SET status = 'revoked', revoked_by = auth.uid(), revoked_at = now(), updated_at = now()
  WHERE id = p_assignment_id AND status <> 'revoked' RETURNING * INTO assignment_record;
  IF assignment_record.id IS NULL THEN RAISE EXCEPTION 'Assignment was not found or already revoked' USING ERRCODE = 'P0002'; END IF;
  INSERT INTO public.audit_logs(actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), 'revoke_entity_scope', assignment_record.entity_type, assignment_record.entity_id::text, jsonb_build_object('assignment_id', assignment_record.id, 'user_id', assignment_record.user_id, 'note', NULLIF(btrim(p_note), '')));
  RETURN jsonb_build_object('id', assignment_record.id, 'status', assignment_record.status);
END;
$$;

CREATE OR REPLACE FUNCTION public.request_sub_admin_access(p_requested_modules text[], p_reason text, p_organization text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE actor uuid := auth.uid();
DECLARE safe_modules text[];
DECLARE request_record public.sub_admin_requests%ROWTYPE;
DECLARE trusted_name text;
DECLARE trusted_email text;
BEGIN
  IF actor IS NULL OR NOT public.is_account_active(actor) THEN RAISE EXCEPTION 'An active verified account is required' USING ERRCODE = '42501'; END IF;
  SELECT array_agg(DISTINCT public.normalize_module_capability_key(value) ORDER BY public.normalize_module_capability_key(value))
  INTO safe_modules FROM unnest(COALESCE(p_requested_modules, '{}'::text[])) AS requested(value)
  WHERE public.normalize_module_capability_key(value) IS NOT NULL;
  IF safe_modules IS NULL OR cardinality(safe_modules) = 0 OR NOT EXISTS (
    SELECT 1 FROM unnest(safe_modules) AS value WHERE NOT EXISTS (SELECT 1 FROM public.module_capabilities mc WHERE mc.module_key = value AND mc.is_active AND mc.is_requestable)
  ) THEN RAISE EXCEPTION 'One or more requested modules are unavailable' USING ERRCODE = '22023'; END IF;
  IF char_length(btrim(COALESCE(p_reason, ''))) NOT BETWEEN 10 AND 2000 THEN RAISE EXCEPTION 'A reason between 10 and 2000 characters is required' USING ERRCODE = '22023'; END IF;
  SELECT NULLIF(btrim(p.full_name), ''), lower(au.email) INTO trusted_name, trusted_email
  FROM public.profiles p JOIN auth.users au ON au.id = p.user_id WHERE p.user_id = actor;
  IF trusted_email IS NULL THEN RAISE EXCEPTION 'A platform profile is required' USING ERRCODE = '42501'; END IF;
  SELECT * INTO request_record FROM public.sub_admin_requests WHERE user_id = actor AND status = 'pending' ORDER BY created_at DESC LIMIT 1;
  IF request_record.id IS NOT NULL THEN RETURN jsonb_build_object('id', request_record.id, 'status', 'pending', 'existing_request', true); END IF;
  INSERT INTO public.sub_admin_requests(user_id, user_name, user_email, requested_modules, reason, organization, status, updated_at)
  VALUES (actor, COALESCE(trusted_name, trusted_email), trusted_email, safe_modules, btrim(p_reason), NULLIF(btrim(p_organization), ''), 'pending', now()) RETURNING * INTO request_record;
  INSERT INTO public.audit_logs(actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (actor, 'request_module_access', 'sub_admin_requests', request_record.id::text, jsonb_build_object('requested_modules', safe_modules));
  PERFORM public.notify_platform_admins_of_module_access_request(request_record.id, 'request_access');
  RETURN jsonb_build_object('id', request_record.id, 'status', request_record.status, 'requested_modules', safe_modules);
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_module_access_request(p_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE request_record public.sub_admin_requests%ROWTYPE;
BEGIN
  UPDATE public.sub_admin_requests SET status = 'cancelled', updated_at = now()
  WHERE id = p_request_id AND user_id = auth.uid() AND status = 'pending' RETURNING * INTO request_record;
  IF request_record.id IS NULL THEN RAISE EXCEPTION 'Only your pending request can be cancelled' USING ERRCODE = '42501'; END IF;
  INSERT INTO public.audit_logs(actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), 'cancel_module_access_request', 'sub_admin_requests', request_record.id::text, '{}'::jsonb);
  RETURN jsonb_build_object('id', request_record.id, 'status', request_record.status);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_decide_sub_admin_request(p_request_id uuid, p_approve boolean, p_note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE request_record public.sub_admin_requests%ROWTYPE;
DECLARE module_key text;
DECLARE assigned jsonb := '[]'::jsonb;
DECLARE permission_codes text[] := '{}'::text[];
BEGIN
  IF NOT public.is_platform_admin(auth.uid()) THEN RAISE EXCEPTION 'Only Super Admin can decide access requests' USING ERRCODE = '42501'; END IF;
  SELECT * INTO request_record FROM public.sub_admin_requests WHERE id = p_request_id FOR UPDATE;
  IF request_record.id IS NULL OR request_record.status <> 'pending' THEN RAISE EXCEPTION 'The pending access request was not found' USING ERRCODE = 'P0002'; END IF;
  IF p_approve THEN
    FOREACH module_key IN ARRAY request_record.requested_modules LOOP
      module_key := public.normalize_module_capability_key(module_key);
      IF module_key IS NULL OR NOT EXISTS (SELECT 1 FROM public.module_capabilities WHERE module_capabilities.module_key = module_key AND is_active) THEN
        RAISE EXCEPTION 'Requested module capability is unavailable' USING ERRCODE = '22023';
      END IF;
      INSERT INTO public.user_module_capabilities(user_id, capability_id, status, granted_by, source_request_id)
      SELECT request_record.user_id, id, 'active', auth.uid(), request_record.id FROM public.module_capabilities WHERE module_capabilities.module_key = module_key
      ON CONFLICT (user_id, capability_id) DO UPDATE SET status = 'active', granted_by = EXCLUDED.granted_by, source_request_id = EXCLUDED.source_request_id, revoked_by = NULL, revoked_at = NULL, updated_at = now();
      assigned := assigned || jsonb_build_array(module_key);
      permission_codes := permission_codes || CASE module_key
        WHEN 'college' THEN ARRAY['college.manage', 'lead.view', 'media.manage']
        WHEN 'mentor' THEN ARRAY['mentor.manage', 'lead.view', 'media.manage']
        WHEN 'jobs' THEN ARRAY['job.post', 'lead.view', 'media.manage']
        WHEN 'events' THEN ARRAY['event.organize', 'lead.view', 'media.manage']
        WHEN 'courses' THEN ARRAY['course.manage', 'media.manage']
        ELSE '{}'::text[] END;
    END LOOP;
    INSERT INTO public.user_permissions(user_id, permission_id, granted_by)
    SELECT request_record.user_id, p.id, auth.uid() FROM public.permissions p WHERE p.code = ANY(permission_codes)
    ON CONFLICT (user_id, permission_id) DO UPDATE SET granted_by = EXCLUDED.granted_by, expires_at = NULL;
  END IF;
  UPDATE public.sub_admin_requests
  SET status = CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END,
      decision_note = NULLIF(btrim(p_note), ''), decided_by = auth.uid(), decided_at = now(),
      assigned_capabilities = CASE WHEN p_approve THEN assigned ELSE '[]'::jsonb END, updated_at = now()
  WHERE id = request_record.id RETURNING * INTO request_record;
  INSERT INTO public.audit_logs(actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), CASE WHEN p_approve THEN 'approve_module_access' ELSE 'reject_module_access' END, 'sub_admin_requests', request_record.id::text, jsonb_build_object('user_id', request_record.user_id, 'capabilities', assigned, 'note', request_record.decision_note));
  INSERT INTO public.notifications(recipient_id, title, message, type, category, channel, status, entity_type, entity_id, action_url, metadata)
  VALUES (request_record.user_id, CASE WHEN p_approve THEN 'Module access approved' ELSE 'Module access request rejected' END,
    CASE WHEN p_approve THEN 'Your module capability has been granted. An entity assignment is required before you can manage private records.' ELSE COALESCE(request_record.decision_note, 'Your request was not approved.') END,
    'info', 'sub_admin_request', 'dashboard', 'queued', 'sub_admin_request', request_record.id, '/dashboard', jsonb_build_object('status', request_record.status));
  RETURN jsonb_build_object('id', request_record.id, 'status', request_record.status, 'assigned_capabilities', request_record.assigned_capabilities);
END;
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
      SELECT 1 FROM public.subscriptions s JOIN public.packages p ON p.id = s.package_id
      WHERE s.entity_type = _entity_type AND s.entity_id = _entity_id
        AND s.status IN ('trialing', 'active') AND s.payment_status IN ('success', 'not_required')
        AND s.start_date <= now() AND s.expiry_date > now() AND s.deleted_at IS NULL
        AND p.is_active AND p.deleted_at IS NULL
        AND (_feature IS NULL OR p.features @> jsonb_build_object(_feature, true))
        AND CASE _required_mode WHEN 'read_only' THEN p.lead_access_mode IN ('read_only', 'full') WHEN 'full' THEN p.lead_access_mode = 'full' ELSE false END
    )
    AND (
      (_entity_type = 'college' AND EXISTS (SELECT 1 FROM public.institutes i WHERE i.id = _entity_id AND i.owner_user_id = _user_id))
      OR public.has_active_entity_assignment(_user_id,
        CASE _entity_type WHEN 'college' THEN 'college' WHEN 'mentor' THEN 'mentor' WHEN 'company' THEN 'jobs' WHEN 'organizer' THEN 'events' ELSE _entity_type END,
        CASE WHEN _entity_type = 'organizer' THEN 'event' ELSE _entity_type END, _entity_id)
    )
  )
$$;

DROP POLICY IF EXISTS "Applicants view own college applications" ON public.college_applications;
CREATE POLICY "Applicants view own college applications"
ON public.college_applications FOR SELECT TO authenticated
USING (
  applicant_id = auth.uid() OR public.is_platform_admin()
  OR (
    public.has_active_entity_assignment(auth.uid(), 'college', 'college', institute_id)
    AND public.has_permission(auth.uid(), 'lead.view')
    AND public.has_entity_entitlement(auth.uid(), 'college', institute_id, 'college_applications', 'read_only')
  )
  OR EXISTS (
    SELECT 1 FROM public.institutes i WHERE i.id = college_applications.institute_id AND i.owner_user_id = auth.uid()
      AND public.has_permission(auth.uid(), 'lead.view')
      AND public.has_entity_entitlement(auth.uid(), 'college', i.id, 'college_applications', 'read_only')
  )
);

DROP POLICY IF EXISTS "Subscribed college owners manage applications" ON public.college_applications;
CREATE POLICY "Subscribed college owners manage applications"
ON public.college_applications FOR UPDATE TO authenticated
USING (
  deleted_at IS NULL AND (
    public.is_platform_admin()
    OR (public.has_active_entity_assignment(auth.uid(), 'college', 'college', institute_id)
      AND public.has_permission(auth.uid(), 'lead.view')
      AND public.has_entity_entitlement(auth.uid(), 'college', institute_id, 'college_applications', 'full'))
    OR EXISTS (SELECT 1 FROM public.institutes i WHERE i.id = college_applications.institute_id AND i.owner_user_id = auth.uid()
      AND public.has_permission(auth.uid(), 'lead.view')
      AND public.has_entity_entitlement(auth.uid(), 'college', i.id, 'college_applications', 'full'))
  )
) WITH CHECK (deleted_at IS NULL);

DROP POLICY IF EXISTS "Owners can update college profiles" ON public.institutes;
CREATE POLICY "Owners can update college profiles"
ON public.institutes FOR UPDATE TO authenticated
USING (
  public.is_platform_admin()
  OR (owner_user_id = auth.uid() AND public.has_entity_entitlement(auth.uid(), 'college', id, NULL, 'read_only'))
  OR (public.has_active_entity_assignment(auth.uid(), 'college', 'college', id)
    AND public.has_permission(auth.uid(), 'college.manage')
    AND public.has_entity_entitlement(auth.uid(), 'college', id, NULL, 'read_only'))
)
WITH CHECK (deleted_at IS NULL);

REVOKE ALL ON FUNCTION public.normalize_module_capability_key(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.normalize_module_capability_key(text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.has_active_module_capability(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_active_module_capability(uuid, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.has_active_entity_assignment(uuid, text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_active_entity_assignment(uuid, text, text, uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_grant_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_grant_role(uuid, public.app_role) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_revoke_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_revoke_role(uuid, public.app_role) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_assign_entity_scope(uuid, text, text, uuid, uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_assign_entity_scope(uuid, text, text, uuid, uuid, jsonb) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_revoke_entity_scope(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_revoke_entity_scope(uuid, text) TO authenticated;
REVOKE ALL ON FUNCTION public.request_sub_admin_access(text[], text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_sub_admin_access(text[], text, text) TO authenticated;
REVOKE ALL ON FUNCTION public.cancel_module_access_request(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_module_access_request(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_decide_sub_admin_request(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_decide_sub_admin_request(uuid, boolean, text) TO authenticated;

COMMIT;
