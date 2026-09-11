BEGIN;

-- Forward-only extension of the entitlement model. Trial access must grant the
-- same explicit module features that Free and paid ledger records use.
ALTER TABLE public.platform_module_trial_settings
  ADD COLUMN IF NOT EXISTS default_features jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.platform_module_trial_settings
SET default_features = CASE module_key
  WHEN 'college' THEN '{"profile_editing": true}'::jsonb
  WHEN 'jobs' THEN '{"job_management": true}'::jsonb
  WHEN 'mentor' THEN '{"profile_editing": true, "session_management": true}'::jsonb
  WHEN 'events' THEN '{"event_management": true}'::jsonb
  ELSE '{}'::jsonb
END
WHERE default_features = '{}'::jsonb;

CREATE OR REPLACE FUNCTION public.admin_start_module_trial(
  p_target_user_id uuid, p_module_key text, p_entity_type text, p_entity_id uuid, p_reason text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  actor uuid := auth.uid();
  setting public.platform_module_trial_settings%ROWTYPE;
  entitlement public.module_entitlements%ROWTYPE;
  feature_record record;
BEGIN
  IF actor IS NULL OR NOT public.is_account_active(actor) OR NOT public.is_platform_admin(actor) THEN
    RAISE EXCEPTION 'Only Super Admin can start a trial' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO setting
  FROM public.platform_module_trial_settings
  WHERE module_key = p_module_key AND is_enabled;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trial is disabled for this module' USING ERRCODE = '42501';
  END IF;

  IF NOT public.has_active_module_capability(p_target_user_id, p_module_key)
     OR NOT public.has_active_entity_assignment(p_target_user_id, p_module_key, p_entity_type, p_entity_id) THEN
    RAISE EXCEPTION 'Target user needs matching access first' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.module_entitlements(
    user_id, module_key, entity_type, entity_id, source, status,
    start_at, expires_at, features, granted_by, reason
  ) VALUES (
    p_target_user_id, p_module_key, p_entity_type, p_entity_id, 'TRIAL', 'active',
    now(), now() + make_interval(days => setting.duration_days), setting.default_features,
    actor, NULLIF(trim(p_reason), '')
  ) RETURNING * INTO entitlement;

  FOR feature_record IN SELECT key FROM jsonb_each(setting.default_features) WHERE value = 'true'::jsonb LOOP
    INSERT INTO public.entity_feature_grants(
      user_id, module_key, entity_type, entity_id, feature_key, status,
      granted_by, granted_at, note
    ) VALUES (
      p_target_user_id, p_module_key, p_entity_type, p_entity_id, feature_record.key,
      'active', actor, now(), 'Granted with trial ' || entitlement.id::text
    ) ON CONFLICT (user_id, module_key, entity_type, entity_id, feature_key) DO UPDATE
      SET status = 'active', granted_by = EXCLUDED.granted_by,
          granted_at = EXCLUDED.granted_at, revoked_at = NULL, revoked_by = NULL,
          note = EXCLUDED.note;
  END LOOP;

  INSERT INTO public.audit_logs(actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (
    actor, 'TRIAL_STARTED', p_entity_type, p_entity_id::text,
    jsonb_build_object(
      'target_user_id', p_target_user_id, 'module', p_module_key,
      'entitlement_id', entitlement.id, 'duration_days', setting.duration_days,
      'features', setting.default_features
    )
  );

  RETURN jsonb_build_object(
    'id', entitlement.id, 'expires_at', entitlement.expires_at,
    'duration_days', setting.duration_days, 'features', setting.default_features
  );
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION 'This user has already used a trial for this module entity' USING ERRCODE = '23505';
END $$;

REVOKE ALL ON FUNCTION public.admin_start_module_trial(uuid, text, text, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_start_module_trial(uuid, text, text, uuid, text) TO authenticated;

COMMIT;
