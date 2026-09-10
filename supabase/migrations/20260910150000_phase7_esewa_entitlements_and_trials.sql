BEGIN;

-- A separate ledger preserves the provenance of a trial, verified purchase,
-- promotion or manual grant. It never manufactures a payment row.
CREATE TABLE IF NOT EXISTS public.platform_module_trial_settings (
  module_key text PRIMARY KEY CHECK (module_key IN ('college', 'jobs', 'mentor', 'events')),
  is_enabled boolean NOT NULL DEFAULT true,
  duration_days integer NOT NULL DEFAULT 7 CHECK (duration_days BETWEEN 1 AND 365),
  allow_indefinite_manual boolean NOT NULL DEFAULT false,
  updated_by uuid REFERENCES public.profiles(user_id),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.platform_module_trial_settings ENABLE ROW LEVEL SECURITY;
INSERT INTO public.platform_module_trial_settings(module_key) VALUES ('college'), ('jobs'), ('mentor'), ('events') ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.module_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(user_id),
  module_key text NOT NULL CHECK (module_key IN ('college', 'jobs', 'mentor', 'events')),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  package_id uuid REFERENCES public.packages(id),
  source text NOT NULL CHECK (source IN ('TRIAL', 'ESEWA_PURCHASE', 'ADMIN_MANUAL', 'SUPER_ADMIN_PACKAGE', 'ADMIN_PACKAGE', 'RENEWAL', 'PROMOTIONAL')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'revoked', 'expired')),
  start_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  features jsonb NOT NULL DEFAULT '{}'::jsonb,
  granted_by uuid REFERENCES public.profiles(user_id),
  reason text,
  payment_id uuid REFERENCES public.payments(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  CHECK (expires_at IS NULL OR expires_at > start_at)
);
ALTER TABLE public.module_entitlements ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS module_entitlements_effective_idx ON public.module_entitlements(user_id, module_key, entity_type, entity_id, status, expires_at);
CREATE UNIQUE INDEX IF NOT EXISTS module_entitlements_one_trial_idx ON public.module_entitlements(user_id, module_key, entity_type, entity_id) WHERE source = 'TRIAL';

CREATE OR REPLACE FUNCTION public.has_active_module_entitlement(
  p_user_id uuid, p_module_key text, p_entity_type text, p_entity_id uuid, p_feature_key text DEFAULT NULL
)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT public.is_account_active(p_user_id) AND (
    public.is_platform_admin(p_user_id)
    OR EXISTS (
      SELECT 1 FROM public.module_entitlements e
      LEFT JOIN public.packages p ON p.id = e.package_id
      WHERE e.user_id = p_user_id AND e.module_key = p_module_key
        AND e.entity_type = p_entity_type AND e.entity_id = p_entity_id
        AND e.status = 'active' AND e.start_at <= now() AND (e.expires_at IS NULL OR e.expires_at > now())
        AND (p_feature_key IS NULL OR e.features @> jsonb_build_object(p_feature_key, true) OR COALESCE(p.features, '{}'::jsonb) @> jsonb_build_object(p_feature_key, true))
    )
  )
$$;
REVOKE ALL ON FUNCTION public.has_active_module_entitlement(uuid, text, text, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_active_module_entitlement(uuid, text, text, uuid, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.has_entity_feature_access(
  p_user_id uuid, p_module_key text, p_entity_type text, p_entity_id uuid, p_feature_key text
)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT public.is_account_active(p_user_id) AND (
    public.is_platform_admin(p_user_id)
    OR EXISTS (SELECT 1 FROM public.entity_feature_grants g WHERE g.user_id = p_user_id AND g.module_key = p_module_key AND g.entity_type = p_entity_type AND g.entity_id = p_entity_id AND g.feature_key = p_feature_key AND g.status = 'active')
    OR public.has_active_module_entitlement(p_user_id, p_module_key, p_entity_type, p_entity_id, p_feature_key)
  )
$$;

CREATE OR REPLACE FUNCTION public.is_college_effectively_verified(p_institute_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.institutes i WHERE i.id = p_institute_id AND i.status = 'approved' AND i.deleted_at IS NULL
      AND EXISTS (SELECT 1 FROM public.entity_admin_assignments a JOIN public.user_module_capabilities umc ON umc.id = a.user_capability_id JOIN public.module_capabilities mc ON mc.id = umc.capability_id WHERE mc.module_key = 'college' AND a.entity_type = 'college' AND a.entity_id = i.id AND a.status = 'active' AND umc.status = 'active')
      AND EXISTS (SELECT 1 FROM public.module_entitlements e WHERE e.module_key = 'college' AND e.entity_type = 'college' AND e.entity_id = i.id AND e.status = 'active' AND e.start_at <= now() AND (e.expires_at IS NULL OR e.expires_at > now()))
  )
$$;

CREATE OR REPLACE FUNCTION public.admin_manage_module_entitlement(
  p_target_user_id uuid, p_module_key text, p_entity_type text, p_entity_id uuid,
  p_source text, p_start_at timestamptz, p_expires_at timestamptz DEFAULT NULL,
  p_package_id uuid DEFAULT NULL, p_features jsonb DEFAULT '{}'::jsonb, p_reason text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE actor uuid := auth.uid(); entitlement public.module_entitlements%ROWTYPE; setting public.platform_module_trial_settings%ROWTYPE;
BEGIN
  IF NOT public.is_account_active(actor) THEN RAISE EXCEPTION 'Active account required' USING ERRCODE = '42501'; END IF;
  SELECT * INTO setting FROM public.platform_module_trial_settings WHERE module_key = p_module_key;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unsupported module' USING ERRCODE = '22023'; END IF;
  IF NOT public.is_platform_admin(actor) AND NOT (
    public.has_active_module_capability(actor, p_module_key)
    AND public.has_active_entity_assignment(actor, p_module_key, p_entity_type, p_entity_id)
    AND public.has_entity_feature_access(actor, p_module_key, p_entity_type, p_entity_id, 'manage_module_enrollments')
  ) THEN RAISE EXCEPTION 'Enrollment authority is required for this module entity' USING ERRCODE = '42501'; END IF;
  IF NOT public.has_active_module_capability(p_target_user_id, p_module_key) OR NOT public.has_active_entity_assignment(p_target_user_id, p_module_key, p_entity_type, p_entity_id) THEN RAISE EXCEPTION 'Target user needs the matching capability and entity assignment first' USING ERRCODE = '42501'; END IF;
  IF p_source NOT IN ('ADMIN_MANUAL', 'SUPER_ADMIN_PACKAGE', 'ADMIN_PACKAGE', 'PROMOTIONAL') THEN RAISE EXCEPTION 'Manual enrollment source is invalid' USING ERRCODE = '22023'; END IF;
  IF p_expires_at IS NULL AND (NOT public.is_platform_admin(actor) OR NOT setting.allow_indefinite_manual) THEN RAISE EXCEPTION 'An explicit expiry is required for this enrollment' USING ERRCODE = '22023'; END IF;
  IF p_package_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.packages p WHERE p.id = p_package_id AND p.is_active AND p.deleted_at IS NULL AND p.module_scope @> ARRAY[p_module_key]) THEN RAISE EXCEPTION 'Package is not active for this module' USING ERRCODE = '22023'; END IF;
  INSERT INTO public.module_entitlements(user_id,module_key,entity_type,entity_id,package_id,source,status,start_at,expires_at,features,granted_by,reason)
  VALUES (p_target_user_id,p_module_key,p_entity_type,p_entity_id,p_package_id,p_source,'active',COALESCE(p_start_at,now()),p_expires_at,COALESCE(p_features,'{}'::jsonb),actor,NULLIF(trim(p_reason),'')) RETURNING * INTO entitlement;
  INSERT INTO public.audit_logs(actor_user_id,action,entity_type,entity_id,metadata) VALUES (actor,'ADMIN_MANUAL_ENROLLMENT_CREATED',p_entity_type,p_entity_id::text,jsonb_build_object('target_user_id',p_target_user_id,'module',p_module_key,'entitlement_id',entitlement.id,'source',p_source,'expires_at',p_expires_at));
  RETURN jsonb_build_object('id',entitlement.id,'status',entitlement.status,'expires_at',entitlement.expires_at);
END $$;

CREATE OR REPLACE FUNCTION public.admin_start_module_trial(p_target_user_id uuid, p_module_key text, p_entity_type text, p_entity_id uuid, p_reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE actor uuid := auth.uid(); setting public.platform_module_trial_settings%ROWTYPE; entitlement public.module_entitlements%ROWTYPE;
BEGIN
  IF NOT public.is_platform_admin(actor) THEN RAISE EXCEPTION 'Only Super Admin can start a trial' USING ERRCODE = '42501'; END IF;
  SELECT * INTO setting FROM public.platform_module_trial_settings WHERE module_key = p_module_key AND is_enabled; IF NOT FOUND THEN RAISE EXCEPTION 'Trial is disabled for this module' USING ERRCODE = '42501'; END IF;
  IF NOT public.has_active_module_capability(p_target_user_id,p_module_key) OR NOT public.has_active_entity_assignment(p_target_user_id,p_module_key,p_entity_type,p_entity_id) THEN RAISE EXCEPTION 'Target user needs matching access first' USING ERRCODE = '42501'; END IF;
  INSERT INTO public.module_entitlements(user_id,module_key,entity_type,entity_id,source,status,start_at,expires_at,features,granted_by,reason)
  VALUES(p_target_user_id,p_module_key,p_entity_type,p_entity_id,'TRIAL','active',now(),now() + make_interval(days => setting.duration_days),'{}'::jsonb,actor,NULLIF(trim(p_reason),'')) RETURNING * INTO entitlement;
  INSERT INTO public.audit_logs(actor_user_id,action,entity_type,entity_id,metadata) VALUES(actor,'TRIAL_STARTED',p_entity_type,p_entity_id::text,jsonb_build_object('target_user_id',p_target_user_id,'module',p_module_key,'entitlement_id',entitlement.id,'duration_days',setting.duration_days));
  RETURN jsonb_build_object('id',entitlement.id,'expires_at',entitlement.expires_at,'duration_days',setting.duration_days);
EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'This user has already used a trial for this module entity' USING ERRCODE = '23505';
END $$;

REVOKE ALL ON FUNCTION public.admin_manage_module_entitlement(uuid,text,text,uuid,text,timestamptz,timestamptz,uuid,jsonb,text), public.admin_start_module_trial(uuid,text,text,uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_manage_module_entitlement(uuid,text,text,uuid,text,timestamptz,timestamptz,uuid,jsonb,text), public.admin_start_module_trial(uuid,text,text,uuid,text) TO authenticated;

COMMIT;
