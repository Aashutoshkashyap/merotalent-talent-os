-- pgcrypto is installed in the extensions schema on hosted Supabase. Keep the
-- security-definer paths explicit so digest() resolves without exposing an
-- attacker-controlled schema.
ALTER FUNCTION public.submit_guest_college_application_before_verification(jsonb, text, text)
  SET search_path = public, auth, extensions, pg_temp;
ALTER FUNCTION public.claim_guest_college_applications(text)
  SET search_path = public, auth, extensions, pg_temp;
ALTER FUNCTION public.reserve_guest_college_verification(text, uuid, text, text, text, text)
  SET search_path = public, auth, extensions, pg_temp;
ALTER FUNCTION public.check_guest_college_verification(uuid, text, text, text)
  SET search_path = public, auth, extensions, pg_temp;
ALTER FUNCTION public.submit_guest_college_application(jsonb, text, text, uuid)
  SET search_path = public, auth, extensions, pg_temp;

CREATE OR REPLACE FUNCTION public._upsert_free_module_entitlement(
  p_target_user_id uuid,
  p_module_key text,
  p_entity_type text,
  p_entity_id uuid,
  p_package_id uuid,
  p_granted_by uuid DEFAULT NULL,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  package_features jsonb := '{}'::jsonb;
  module_default_features jsonb := '{}'::jsonb;
  effective_features jsonb;
  entitlement public.module_entitlements%ROWTYPE;
  feature_record record;
BEGIN
  IF p_module_key NOT IN ('college', 'jobs', 'mentor', 'events') OR p_entity_id IS NULL THEN
    RETURN jsonb_build_object('applicable', false);
  END IF;
  IF NOT public.has_active_module_capability(p_target_user_id, p_module_key)
     OR NOT public.has_active_entity_assignment(p_target_user_id, p_module_key, p_entity_type, p_entity_id) THEN
    RAISE EXCEPTION 'Target user needs the matching capability and entity assignment first' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(p.features, '{}'::jsonb) INTO package_features
  FROM public.packages p
  WHERE p.id = p_package_id AND p.package_kind = 'free' AND p.is_active AND p.deleted_at IS NULL
    AND p.module_scope @> ARRAY[p_module_key];
  IF NOT FOUND THEN
    RAISE EXCEPTION 'An active Free package for the module is required' USING ERRCODE = '22023';
  END IF;

  SELECT COALESCE(settings.default_features, '{}'::jsonb) INTO module_default_features
  FROM public.platform_module_trial_settings settings
  WHERE settings.module_key = p_module_key;
  effective_features := package_features || module_default_features;

  SELECT * INTO entitlement
  FROM public.module_entitlements e
  WHERE e.user_id = p_target_user_id AND e.module_key = p_module_key
    AND e.entity_type = p_entity_type AND e.entity_id = p_entity_id
    AND e.source = 'FREE' AND e.status = 'active'
  ORDER BY e.created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF entitlement.id IS NULL THEN
    INSERT INTO public.module_entitlements(
      user_id, module_key, entity_type, entity_id, package_id, source, status,
      start_at, expires_at, features, granted_by, reason
    ) VALUES (
      p_target_user_id, p_module_key, p_entity_type, p_entity_id, p_package_id,
      'FREE', 'active', now(), NULL, effective_features, p_granted_by,
      NULLIF(trim(p_reason), '')
    ) RETURNING * INTO entitlement;
  ELSE
    UPDATE public.module_entitlements
    SET package_id = p_package_id, start_at = now(), expires_at = NULL,
        features = effective_features, granted_by = p_granted_by,
        reason = NULLIF(trim(p_reason), ''), updated_at = now(), revoked_at = NULL
    WHERE id = entitlement.id
    RETURNING * INTO entitlement;
  END IF;

  FOR feature_record IN SELECT feature.key FROM jsonb_each(effective_features) feature WHERE feature.value = 'true'::jsonb LOOP
    INSERT INTO public.entity_feature_grants(
      user_id, module_key, entity_type, entity_id, feature_key, status,
      granted_by, granted_at, note
    ) VALUES (
      p_target_user_id, p_module_key, p_entity_type, p_entity_id, feature_record.key,
      'active', p_granted_by, now(), 'Granted with Free entitlement ' || entitlement.id::text
    ) ON CONFLICT (user_id, module_key, entity_type, entity_id, feature_key) DO UPDATE
      SET status = 'active', granted_by = EXCLUDED.granted_by,
          granted_at = EXCLUDED.granted_at, revoked_at = NULL, revoked_by = NULL,
          note = EXCLUDED.note;
  END LOOP;

  RETURN jsonb_build_object('applicable', true, 'id', entitlement.id, 'features', effective_features);
END;
$$;

REVOKE ALL ON FUNCTION public._upsert_free_module_entitlement(uuid, text, text, uuid, uuid, uuid, text)
  FROM PUBLIC, anon, authenticated, service_role;
