BEGIN;

-- Compatibility bridge: subscriptions remain billing/history records, but any
-- legacy default-Free operation must create or revoke the authoritative ledger
-- row that server/RLS authorization actually checks.
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
  default_features jsonb := '{}'::jsonb;
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

  SELECT COALESCE(features, '{}'::jsonb) INTO package_features
  FROM public.packages
  WHERE id = p_package_id AND package_kind = 'free' AND is_active AND deleted_at IS NULL
    AND module_scope @> ARRAY[p_module_key];
  IF NOT FOUND THEN
    RAISE EXCEPTION 'An active Free package for the module is required' USING ERRCODE = '22023';
  END IF;

  SELECT COALESCE(default_features, '{}'::jsonb) INTO default_features
  FROM public.platform_module_trial_settings
  WHERE module_key = p_module_key;
  effective_features := package_features || default_features;

  SELECT * INTO entitlement
  FROM public.module_entitlements
  WHERE user_id = p_target_user_id AND module_key = p_module_key
    AND entity_type = p_entity_type AND entity_id = p_entity_id
    AND source = 'FREE' AND status = 'active'
  ORDER BY created_at DESC
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
        reason = NULLIF(trim(p_reason), ''), updated_at = now(),
        revoked_at = NULL
    WHERE id = entitlement.id
    RETURNING * INTO entitlement;
  END IF;

  FOR feature_record IN SELECT key FROM jsonb_each(effective_features) WHERE value = 'true'::jsonb LOOP
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

REVOKE ALL ON FUNCTION public._upsert_free_module_entitlement(uuid, text, text, uuid, uuid, uuid, text) FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_provision_module_free_entitlement(
  p_target_user_id uuid,
  p_module_key text,
  p_entity_type text,
  p_entity_id uuid,
  p_package_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE actor uuid := auth.uid();
BEGIN
  IF actor IS NULL OR NOT public.is_account_active(actor) OR NOT public.is_platform_admin(actor) THEN
    RAISE EXCEPTION 'Only Super Admin can provision Free module entitlements' USING ERRCODE = '42501';
  END IF;
  RETURN public._upsert_free_module_entitlement(
    p_target_user_id, p_module_key, p_entity_type, p_entity_id, p_package_id,
    actor, p_reason
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_provision_module_free_entitlement(uuid, text, text, uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_provision_module_free_entitlement(uuid, text, text, uuid, uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_revoke_module_entitlement(
  p_entitlement_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  actor uuid := auth.uid();
  entitlement public.module_entitlements%ROWTYPE;
BEGIN
  IF actor IS NULL OR NOT public.is_account_active(actor) OR NOT public.is_platform_admin(actor) THEN
    RAISE EXCEPTION 'Only Super Admin can revoke module entitlements' USING ERRCODE = '42501';
  END IF;
  UPDATE public.module_entitlements
  SET status = 'revoked', revoked_at = now(), granted_by = actor,
      reason = COALESCE(NULLIF(trim(p_reason), ''), reason), updated_at = now()
  WHERE id = p_entitlement_id AND status = 'active'
  RETURNING * INTO entitlement;
  IF entitlement.id IS NULL THEN
    RAISE EXCEPTION 'Active entitlement not found' USING ERRCODE = 'P0002';
  END IF;
  INSERT INTO public.audit_logs(actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (
    actor, 'MODULE_ENTITLEMENT_REVOKED', entitlement.entity_type, entitlement.entity_id::text,
    jsonb_build_object('target_user_id', entitlement.user_id, 'module', entitlement.module_key,
      'entitlement_id', entitlement.id, 'source', entitlement.source)
  );
  RETURN jsonb_build_object('id', entitlement.id, 'status', entitlement.status);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_revoke_module_entitlement(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_revoke_module_entitlement(uuid, text) TO authenticated;

-- Legacy subscription-based Free provisioning now mirrors a matching ledger
-- entitlement. It remains an explicit Super Admin action and cannot bypass
-- capability or entity assignment checks.
CREATE OR REPLACE FUNCTION public.admin_provision_default_free_tier(
  p_user_id uuid,
  p_entity_type text,
  p_entity_id uuid DEFAULT NULL,
  p_module text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  actor uuid := auth.uid();
  result jsonb;
  ledger_result jsonb := jsonb_build_object('applicable', false);
  package_id uuid;
BEGIN
  IF NOT public.is_platform_admin(actor) THEN
    RAISE EXCEPTION 'Only an active Super Admin can provision free-tier access' USING ERRCODE = '42501';
  END IF;
  result := public._provision_default_free_tier(p_user_id, p_entity_type, p_entity_id, p_module, actor, 'admin');
  package_id := NULLIF(result->>'package_id', '')::uuid;
  ledger_result := public._upsert_free_module_entitlement(p_user_id, p_module, p_entity_type, p_entity_id, package_id, actor, 'Legacy Free tier synchronized to entitlement ledger');
  RETURN result || jsonb_build_object('entitlement', ledger_result);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_revoke_default_free_tier(
  p_user_id uuid,
  p_entity_type text,
  p_entity_id uuid DEFAULT NULL,
  p_module text DEFAULT NULL,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  actor uuid := auth.uid();
  result jsonb;
  revoked_entitlements integer := 0;
BEGIN
  IF NOT public.is_platform_admin(actor) THEN
    RAISE EXCEPTION 'Only an active Super Admin can revoke free-tier access' USING ERRCODE = '42501';
  END IF;
  result := public._revoke_default_free_tier(p_user_id, p_entity_type, p_entity_id, p_module, p_reason, actor, 'admin');
  UPDATE public.module_entitlements
  SET status = 'revoked', revoked_at = now(), granted_by = actor,
      reason = COALESCE(NULLIF(trim(p_reason), ''), 'Free tier revoked by Super Admin'),
      updated_at = now()
  WHERE user_id = p_user_id AND module_key = p_module
    AND entity_type = p_entity_type AND entity_id IS NOT DISTINCT FROM p_entity_id
    AND source = 'FREE' AND status = 'active';
  GET DIAGNOSTICS revoked_entitlements = ROW_COUNT;
  RETURN result || jsonb_build_object('revoked_entitlements', revoked_entitlements);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_provision_default_free_tier(uuid, text, uuid, text), public.admin_revoke_default_free_tier(uuid, text, uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_provision_default_free_tier(uuid, text, uuid, text), public.admin_revoke_default_free_tier(uuid, text, uuid, text, text) TO authenticated;

COMMIT;
