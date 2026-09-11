BEGIN;

-- The entitlement ledger is the authorization source of truth.  Legacy
-- subscriptions remain billing/history records and must not independently
-- unlock module administration.
ALTER TABLE public.module_entitlements
  DROP CONSTRAINT IF EXISTS module_entitlements_source_check;
ALTER TABLE public.module_entitlements
  ADD CONSTRAINT module_entitlements_source_check CHECK (
    source IN ('FREE', 'TRIAL', 'ESEWA_PURCHASE', 'ADMIN_MANUAL', 'SUPER_ADMIN_PACKAGE', 'ADMIN_PACKAGE', 'RENEWAL', 'PROMOTIONAL')
  );

-- Empty scopes are not valid checkout targets. Retain historical packages but
-- remove them from self-service selection until Super Admin scopes them.
UPDATE public.packages
SET is_publicly_selectable = false, updated_at = now()
WHERE is_active AND deleted_at IS NULL
  AND package_kind IN ('free', 'paid')
  AND COALESCE(cardinality(module_scope), 0) = 0;

CREATE OR REPLACE FUNCTION public.has_entity_feature_access(
  p_user_id uuid, p_module_key text, p_entity_type text, p_entity_id uuid, p_feature_key text
)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT (p_user_id = auth.uid() OR public.is_platform_admin(auth.uid()))
    AND public.is_account_active(p_user_id)
    AND (
      public.is_platform_admin(p_user_id)
      OR (
        public.has_active_module_entitlement(p_user_id, p_module_key, p_entity_type, p_entity_id, NULL)
        AND (
          EXISTS (
            SELECT 1 FROM public.entity_feature_grants g
            WHERE g.user_id = p_user_id AND g.module_key = p_module_key
              AND g.entity_type = p_entity_type AND g.entity_id = p_entity_id
              AND g.feature_key = p_feature_key AND g.status = 'active'
          )
          OR public.has_active_module_entitlement(p_user_id, p_module_key, p_entity_type, p_entity_id, p_feature_key)
        )
      )
    )
$$;

CREATE OR REPLACE FUNCTION public.authorize_module_access(
  p_user_id uuid, p_module_key text, p_entity_type text, p_entity_id uuid, p_feature_key text DEFAULT NULL
)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT (p_user_id = auth.uid() OR public.is_platform_admin(auth.uid()))
    AND public.is_account_active(p_user_id)
    AND (
      public.is_platform_admin(p_user_id)
      OR (
        public.has_active_module_capability(p_user_id, p_module_key)
        AND public.has_active_entity_assignment(p_user_id, p_module_key, p_entity_type, p_entity_id)
        AND public.has_active_module_entitlement(p_user_id, p_module_key, p_entity_type, p_entity_id, NULL)
        AND (p_feature_key IS NULL OR public.has_entity_feature_access(p_user_id, p_module_key, p_entity_type, p_entity_id, p_feature_key))
      )
    )
$$;

CREATE OR REPLACE FUNCTION public.has_active_entity_subscription(
  p_entity_type text, p_entity_id uuid, p_feature text DEFAULT NULL, p_required_mode text DEFAULT 'read_only'
)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT CASE
    WHEN p_entity_type = 'college' THEN public.authorize_module_access(auth.uid(), 'college', 'college', p_entity_id, p_feature)
    WHEN p_entity_type = 'company' THEN public.authorize_module_access(auth.uid(), 'jobs', 'company', p_entity_id, p_feature)
    WHEN p_entity_type = 'job' THEN public.authorize_module_access(auth.uid(), 'jobs', 'job', p_entity_id, p_feature)
    WHEN p_entity_type = 'mentor' THEN public.authorize_module_access(auth.uid(), 'mentor', 'mentor', p_entity_id, p_feature)
    WHEN p_entity_type IN ('event', 'organizer') THEN public.authorize_module_access(auth.uid(), 'events', 'event', p_entity_id, p_feature)
    ELSE false
  END
$$;

CREATE OR REPLACE FUNCTION public.has_entity_entitlement(
  _user_id uuid, _entity_type text, _entity_id uuid, _feature text DEFAULT NULL, _required_mode text DEFAULT 'read_only'
)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT CASE
    WHEN _entity_type = 'college' THEN public.authorize_module_access(_user_id, 'college', 'college', _entity_id, _feature)
    WHEN _entity_type = 'company' THEN public.authorize_module_access(_user_id, 'jobs', 'company', _entity_id, _feature)
    WHEN _entity_type = 'job' THEN public.authorize_module_access(_user_id, 'jobs', 'job', _entity_id, _feature)
    WHEN _entity_type = 'mentor' THEN public.authorize_module_access(_user_id, 'mentor', 'mentor', _entity_id, _feature)
    WHEN _entity_type IN ('event', 'organizer') THEN public.authorize_module_access(_user_id, 'events', 'event', _entity_id, _feature)
    ELSE false
  END
$$;

-- Manual grants are platform controls.  A module administrator can never
-- create an entitlement for themselves or another account through this RPC.
CREATE OR REPLACE FUNCTION public.admin_manage_module_entitlement(
  p_target_user_id uuid, p_module_key text, p_entity_type text, p_entity_id uuid,
  p_source text, p_start_at timestamptz, p_expires_at timestamptz DEFAULT NULL,
  p_package_id uuid DEFAULT NULL, p_features jsonb DEFAULT '{}'::jsonb, p_reason text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE actor uuid := auth.uid(); entitlement public.module_entitlements%ROWTYPE; package_features jsonb := '{}'::jsonb; effective_features jsonb; feature_record record;
BEGIN
  IF actor IS NULL OR NOT public.is_account_active(actor) OR NOT public.is_platform_admin(actor) THEN
    RAISE EXCEPTION 'Only Super Admin can manage module entitlements' USING ERRCODE = '42501';
  END IF;
  IF p_features IS NULL OR jsonb_typeof(p_features) <> 'object' OR EXISTS (SELECT 1 FROM jsonb_each(p_features) f WHERE f.key !~ '^[a-z][a-z0-9._-]{0,100}$' OR jsonb_typeof(f.value) <> 'boolean') THEN
    RAISE EXCEPTION 'Features must use safe keys and boolean values' USING ERRCODE = '22023';
  END IF;
  IF p_source NOT IN ('FREE', 'ADMIN_MANUAL', 'SUPER_ADMIN_PACKAGE', 'ADMIN_PACKAGE', 'PROMOTIONAL') THEN
    RAISE EXCEPTION 'Manual entitlement source is invalid' USING ERRCODE = '22023';
  END IF;
  IF p_expires_at IS NOT NULL AND p_expires_at <= COALESCE(p_start_at, now()) THEN RAISE EXCEPTION 'Expiry must be after start time' USING ERRCODE = '22023'; END IF;
  IF p_source = 'FREE' AND p_package_id IS NULL THEN RAISE EXCEPTION 'A free package is required for a free entitlement' USING ERRCODE = '22023'; END IF;
  IF p_package_id IS NOT NULL THEN
    SELECT COALESCE(features, '{}'::jsonb) INTO package_features FROM public.packages
    WHERE id = p_package_id AND is_active AND deleted_at IS NULL AND module_scope @> ARRAY[p_module_key]
      AND (p_source <> 'FREE' OR package_kind = 'free');
    IF NOT FOUND THEN RAISE EXCEPTION 'Package is not active for this module and tier' USING ERRCODE = '22023'; END IF;
  END IF;
  IF NOT public.has_active_module_capability(p_target_user_id, p_module_key)
     OR NOT public.has_active_entity_assignment(p_target_user_id, p_module_key, p_entity_type, p_entity_id) THEN
    RAISE EXCEPTION 'Target user needs the matching capability and entity assignment first' USING ERRCODE = '42501';
  END IF;
  effective_features := package_features || p_features;
  INSERT INTO public.module_entitlements(user_id,module_key,entity_type,entity_id,package_id,source,status,start_at,expires_at,features,granted_by,reason)
  VALUES (p_target_user_id,p_module_key,p_entity_type,p_entity_id,p_package_id,p_source,'active',COALESCE(p_start_at,now()),p_expires_at,effective_features,actor,NULLIF(trim(p_reason),'')) RETURNING * INTO entitlement;
  FOR feature_record IN SELECT key FROM jsonb_each(effective_features) WHERE value = 'true'::jsonb LOOP
    INSERT INTO public.entity_feature_grants(user_id,module_key,entity_type,entity_id,feature_key,status,granted_by,granted_at,note)
    VALUES (p_target_user_id,p_module_key,p_entity_type,p_entity_id,feature_record.key,'active',actor,now(),'Granted with entitlement ' || entitlement.id::text)
    ON CONFLICT (user_id,module_key,entity_type,entity_id,feature_key) DO UPDATE SET status='active', granted_by=EXCLUDED.granted_by, granted_at=EXCLUDED.granted_at, revoked_at=NULL, revoked_by=NULL, note=EXCLUDED.note;
  END LOOP;
  INSERT INTO public.audit_logs(actor_user_id,action,entity_type,entity_id,metadata)
  VALUES (actor,'MODULE_ENTITLEMENT_GRANTED',p_entity_type,p_entity_id::text,jsonb_build_object('target_user_id',p_target_user_id,'module',p_module_key,'entitlement_id',entitlement.id,'source',p_source,'package_id',p_package_id,'expires_at',p_expires_at,'features',effective_features));
  RETURN jsonb_build_object('id',entitlement.id,'status',entitlement.status,'expires_at',entitlement.expires_at,'features',effective_features);
END $$;

-- The old policies were permissive to every active account.  RLS policies are
-- OR-ed, so remove them before adding the entitlement-aware policies below.
DO $$
DECLARE target text; policy record;
BEGIN
  FOREACH target IN ARRAY ARRAY['audit_logs','college_applications','companies','event_registrations','events','institutes','job_applications','jobs','mentor_bookings','mentor_services','mentors','packages','payments','profiles','subscriptions','user_permissions','user_roles'] LOOP
    FOR policy IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=target AND policyname IN ('Active accounts can delete','Active accounts can insert','Active accounts can update','Active accounts read private data') LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy.policyname, target);
    END LOOP;
  END LOOP;
END $$;

-- Remove legacy ownership/assignment paths that omitted entitlement checks.
DROP POLICY IF EXISTS "Authorized owners create jobs" ON public.jobs;
DROP POLICY IF EXISTS "Authorized owners update jobs" ON public.jobs;
DROP POLICY IF EXISTS "Scoped managers create company jobs" ON public.jobs;
DROP POLICY IF EXISTS "Scoped managers update jobs" ON public.jobs;
DROP POLICY IF EXISTS "Scoped managers view non-public jobs" ON public.jobs;
DROP POLICY IF EXISTS "Mentors create own profile" ON public.mentors;
DROP POLICY IF EXISTS "Mentors update own profile" ON public.mentors;
DROP POLICY IF EXISTS "Mentor owners create services" ON public.mentor_services;
DROP POLICY IF EXISTS "Mentor owners update services" ON public.mentor_services;
DROP POLICY IF EXISTS "Scoped mentor managers create services" ON public.mentor_services;
DROP POLICY IF EXISTS "Scoped mentor managers update services" ON public.mentor_services;
DROP POLICY IF EXISTS "Scoped mentor managers view services" ON public.mentor_services;
DROP POLICY IF EXISTS "Authorized organizers create events" ON public.events;
DROP POLICY IF EXISTS "Authorized organizers update events" ON public.events;
DROP POLICY IF EXISTS "Scoped organizers update events" ON public.events;
DROP POLICY IF EXISTS "Scoped organizers view events" ON public.events;
DROP POLICY IF EXISTS "Company owners create profiles" ON public.companies;
DROP POLICY IF EXISTS "Company owners update profiles" ON public.companies;
DROP POLICY IF EXISTS "Owners can create college profiles" ON public.institutes;
DROP POLICY IF EXISTS "Owners can update college profiles" ON public.institutes;

CREATE POLICY "Entitled college admins manage assigned profiles" ON public.institutes FOR UPDATE TO authenticated
USING (public.authorize_module_access(auth.uid(), 'college', 'college', id, 'profile_editing'))
WITH CHECK (deleted_at IS NULL);
CREATE POLICY "Entitled jobs admins manage assigned jobs" ON public.jobs FOR SELECT TO authenticated
USING (public.authorize_module_access(auth.uid(), 'jobs', 'company', company_id, 'job_management') OR public.authorize_module_access(auth.uid(), 'jobs', 'job', id, 'job_management'));
CREATE POLICY "Entitled jobs admins create assigned company jobs" ON public.jobs FOR INSERT TO authenticated
WITH CHECK (company_id IS NOT NULL AND owner_user_id = auth.uid() AND public.authorize_module_access(auth.uid(), 'jobs', 'company', company_id, 'job_management') AND status IN ('draft','pending_approval'));
CREATE POLICY "Entitled jobs admins update assigned jobs" ON public.jobs FOR UPDATE TO authenticated
USING (public.authorize_module_access(auth.uid(), 'jobs', 'company', company_id, 'job_management') OR public.authorize_module_access(auth.uid(), 'jobs', 'job', id, 'job_management'))
WITH CHECK (deleted_at IS NULL);
CREATE POLICY "Entitled mentor admins manage assigned profiles" ON public.mentors FOR UPDATE TO authenticated
USING (public.authorize_module_access(auth.uid(), 'mentor', 'mentor', id, 'profile_editing'))
WITH CHECK (deleted_at IS NULL);
CREATE POLICY "Entitled mentor admins manage assigned services" ON public.mentor_services FOR ALL TO authenticated
USING (public.authorize_module_access(auth.uid(), 'mentor', 'mentor', mentor_id, 'session_management'))
WITH CHECK (public.authorize_module_access(auth.uid(), 'mentor', 'mentor', mentor_id, 'session_management'));
CREATE POLICY "Entitled events admins manage assigned events" ON public.events FOR UPDATE TO authenticated
USING (public.authorize_module_access(auth.uid(), 'events', 'event', id, 'event_management'))
WITH CHECK (deleted_at IS NULL);

-- Private lead data remains available to applicants and Super Admin; module
-- administrators need an entitlement for the exact owning entity and feature.
DROP POLICY IF EXISTS "Applicants and subscribed owners view job applications" ON public.job_applications;
DROP POLICY IF EXISTS "Scoped managers view job applications" ON public.job_applications;
DROP POLICY IF EXISTS "Subscribed job owners manage application status" ON public.job_applications;
DROP POLICY IF EXISTS "Scoped managers update job applications" ON public.job_applications;
CREATE POLICY "Entitled jobs admins manage applications" ON public.job_applications FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.is_platform_admin() OR EXISTS (SELECT 1 FROM public.jobs j WHERE j.id=job_applications.job_id AND public.authorize_module_access(auth.uid(),'jobs','company',j.company_id,'job_applications')));
CREATE POLICY "Entitled jobs admins update applications" ON public.job_applications FOR UPDATE TO authenticated
USING (public.is_platform_admin() OR EXISTS (SELECT 1 FROM public.jobs j WHERE j.id=job_applications.job_id AND public.authorize_module_access(auth.uid(),'jobs','company',j.company_id,'job_applications')))
WITH CHECK (deleted_at IS NULL);

DROP POLICY IF EXISTS "Booking participants view mentor bookings" ON public.mentor_bookings;
DROP POLICY IF EXISTS "Mentors and admins update mentor bookings" ON public.mentor_bookings;
DROP POLICY IF EXISTS "Scoped mentor managers view bookings" ON public.mentor_bookings;
DROP POLICY IF EXISTS "Scoped mentor managers update bookings" ON public.mentor_bookings;
CREATE POLICY "Entitled mentor admins manage bookings" ON public.mentor_bookings FOR SELECT TO authenticated
USING (student_id=auth.uid() OR public.is_platform_admin() OR public.authorize_module_access(auth.uid(),'mentor','mentor',mentor_id,'mentor_bookings'));
CREATE POLICY "Entitled mentor admins update bookings" ON public.mentor_bookings FOR UPDATE TO authenticated
USING (public.is_platform_admin() OR public.authorize_module_access(auth.uid(),'mentor','mentor',mentor_id,'mentor_bookings'))
WITH CHECK (deleted_at IS NULL);

DROP POLICY IF EXISTS "Registrants and subscribed organizers view event registrations" ON public.event_registrations;
DROP POLICY IF EXISTS "Authorized organizers manage event attendees" ON public.event_registrations;
DROP POLICY IF EXISTS "Scoped organizers view registrations" ON public.event_registrations;
DROP POLICY IF EXISTS "Scoped organizers update registrations" ON public.event_registrations;
CREATE POLICY "Entitled events admins manage registrations" ON public.event_registrations FOR SELECT TO authenticated
USING (user_id=auth.uid() OR public.is_platform_admin() OR public.authorize_module_access(auth.uid(),'events','event',event_id,'event_registrations'));
CREATE POLICY "Entitled events admins update registrations" ON public.event_registrations FOR UPDATE TO authenticated
USING (public.is_platform_admin() OR public.authorize_module_access(auth.uid(),'events','event',event_id,'event_registrations'))
WITH CHECK (deleted_at IS NULL);

-- Platform records and identity/billing data are never writable directly by an
-- ordinary authenticated browser session.
CREATE POLICY "Super Admin controls packages" ON public.packages FOR ALL TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
CREATE POLICY "Super Admin controls subscriptions" ON public.subscriptions FOR ALL TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
CREATE POLICY "Super Admin controls payments" ON public.payments FOR ALL TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
CREATE POLICY "Super Admin controls audit logs" ON public.audit_logs FOR ALL TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.profiles(user_id),
  module_key text NOT NULL, entity_type text NOT NULL, entity_id uuid NOT NULL,
  feature_key text NOT NULL DEFAULT 'ai.description.generate', provider_name text, status text NOT NULL CHECK (status IN ('succeeded','failed')),
  input_characters integer NOT NULL DEFAULT 0, output_characters integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS ai_usage_logs_admin_idx ON public.ai_usage_logs(module_key, entity_type, entity_id, created_at DESC);
CREATE POLICY "Super Admin views AI usage metadata" ON public.ai_usage_logs FOR SELECT TO authenticated USING (public.is_platform_admin());

REVOKE ALL ON FUNCTION public.authorize_module_access(uuid,text,text,uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.authorize_module_access(uuid,text,text,uuid,text) TO authenticated, service_role;

COMMIT;
