-- Centralize Super Admin module assignment, scoped access, entitlement dates,
-- and manual payment recording in one audited transaction.

BEGIN;

CREATE OR REPLACE FUNCTION public.admin_assign_module_access_with_payment(
  p_target_user_id uuid,
  p_module_key text,
  p_entity_type text,
  p_entity_id uuid,
  p_start_at timestamptz,
  p_expires_at timestamptz,
  p_amount numeric DEFAULT 0,
  p_transaction_id text DEFAULT NULL,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  actor uuid := auth.uid();
  normalized_module text := public.normalize_module_capability_key(p_module_key);
  safe_entity_type text := lower(btrim(COALESCE(p_entity_type, '')));
  safe_transaction_id text := NULLIF(btrim(COALESCE(p_transaction_id, '')), '');
  safe_note text := NULLIF(btrim(COALESCE(p_note, '')), '');
  entitlement_result jsonb;
  entitlement_id uuid;
  payment_record public.payments%ROWTYPE;
  enabled_features jsonb;
BEGIN
  IF actor IS NULL OR NOT public.is_platform_admin(actor) THEN
    RAISE EXCEPTION 'Only Super Admin can assign module access' USING ERRCODE = '42501';
  END IF;
  IF NOT public.is_account_active(p_target_user_id) THEN
    RAISE EXCEPTION 'The selected user account is not active' USING ERRCODE = '42501';
  END IF;
  IF public.is_platform_admin(p_target_user_id) THEN
    RAISE EXCEPTION 'Super Admin already has platform-wide access and does not require a paid module assignment' USING ERRCODE = '22023';
  END IF;
  IF normalized_module IS NULL OR normalized_module NOT IN ('college', 'jobs', 'mentor', 'events') THEN
    RAISE EXCEPTION 'Unsupported module' USING ERRCODE = '22023';
  END IF;
  IF (normalized_module = 'college' AND safe_entity_type <> 'college')
     OR (normalized_module = 'jobs' AND safe_entity_type <> 'company')
     OR (normalized_module = 'mentor' AND safe_entity_type <> 'mentor')
     OR (normalized_module = 'events' AND safe_entity_type <> 'event') THEN
    RAISE EXCEPTION 'The selected entity does not belong to this module' USING ERRCODE = '22023';
  END IF;
  IF p_start_at IS NULL OR p_expires_at IS NULL OR p_expires_at <= p_start_at THEN
    RAISE EXCEPTION 'Subscription expiry must be after its start date' USING ERRCODE = '22023';
  END IF;
  IF COALESCE(p_amount, 0) < 0 THEN
    RAISE EXCEPTION 'Amount received cannot be negative' USING ERRCODE = '22023';
  END IF;
  IF length(COALESCE(safe_transaction_id, '')) > 180 OR length(COALESCE(safe_note, '')) > 1000 THEN
    RAISE EXCEPTION 'Transaction reference or note is too long' USING ERRCODE = '22023';
  END IF;

  IF safe_entity_type = 'college' AND NOT EXISTS (
    SELECT 1 FROM public.institutes i WHERE i.id = p_entity_id AND i.deleted_at IS NULL
  ) THEN RAISE EXCEPTION 'The selected college was not found' USING ERRCODE = 'P0002'; END IF;
  IF safe_entity_type = 'company' AND NOT EXISTS (
    SELECT 1 FROM public.companies c WHERE c.id = p_entity_id AND c.deleted_at IS NULL
  ) THEN RAISE EXCEPTION 'The selected company was not found' USING ERRCODE = 'P0002'; END IF;
  IF safe_entity_type = 'mentor' AND NOT EXISTS (
    SELECT 1 FROM public.mentors m WHERE m.id = p_entity_id AND m.deleted_at IS NULL
  ) THEN RAISE EXCEPTION 'The selected mentor was not found' USING ERRCODE = 'P0002'; END IF;
  IF safe_entity_type = 'event' AND NOT EXISTS (
    SELECT 1 FROM public.events e WHERE e.id = p_entity_id AND e.deleted_at IS NULL
  ) THEN RAISE EXCEPTION 'The selected event was not found' USING ERRCODE = 'P0002'; END IF;

  PERFORM public.admin_assign_entity_scope(
    p_target_user_id,
    normalized_module,
    safe_entity_type,
    p_entity_id,
    NULL,
    '{}'::jsonb
  );

  enabled_features := CASE normalized_module
    WHEN 'college' THEN '{"profile_editing":true,"media_management":true,"college_applications":true,"lead_viewing":true}'::jsonb
    WHEN 'jobs' THEN '{"job_management":true,"application_management":true,"lead_viewing":true}'::jsonb
    WHEN 'mentor' THEN '{"profile_editing":true,"session_management":true,"booking_management":true,"lead_viewing":true}'::jsonb
    WHEN 'events' THEN '{"event_management":true,"registration_management":true,"lead_viewing":true}'::jsonb
    ELSE '{}'::jsonb
  END;

  entitlement_result := public.admin_manage_module_entitlement(
    p_target_user_id,
    normalized_module,
    safe_entity_type,
    p_entity_id,
    'ADMIN_MANUAL',
    p_start_at,
    p_expires_at,
    NULL,
    enabled_features,
    COALESCE(safe_note, 'Assigned from Super Admin People')
  );
  entitlement_id := (entitlement_result ->> 'id')::uuid;

  IF COALESCE(p_amount, 0) > 0 THEN
    INSERT INTO public.payments(
      user_id, payment_type, reference_id, amount, currency, status,
      payment_method, transaction_id, gateway, gateway_transaction_id,
      paid_at, metadata
    ) VALUES (
      p_target_user_id, 'module_subscription', entitlement_id, p_amount, 'NPR', 'success',
      'manual', COALESCE(safe_transaction_id, 'manual-' || entitlement_id::text),
      'manual', COALESCE(safe_transaction_id, 'manual-' || entitlement_id::text),
      now(), jsonb_build_object(
        'module', normalized_module,
        'entity_type', safe_entity_type,
        'entity_id', p_entity_id,
        'subscription_start', p_start_at,
        'subscription_end', p_expires_at,
        'recorded_by', actor,
        'note', safe_note
      )
    ) RETURNING * INTO payment_record;

    UPDATE public.module_entitlements
    SET payment_id = payment_record.id, updated_at = now()
    WHERE id = entitlement_id;
  END IF;

  INSERT INTO public.audit_logs(actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (
    actor,
    'ASSIGN_MODULE_ACCESS_WITH_PAYMENT',
    safe_entity_type,
    p_entity_id::text,
    jsonb_build_object(
      'target_user_id', p_target_user_id,
      'module_key', normalized_module,
      'entitlement_id', entitlement_id,
      'payment_id', payment_record.id,
      'amount', COALESCE(p_amount, 0),
      'start_at', p_start_at,
      'expires_at', p_expires_at
    )
  );

  RETURN jsonb_build_object(
    'module_key', normalized_module,
    'entity_type', safe_entity_type,
    'entity_id', p_entity_id,
    'entitlement_id', entitlement_id,
    'payment_id', payment_record.id,
    'amount', COALESCE(p_amount, 0),
    'start_at', p_start_at,
    'expires_at', p_expires_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_assign_module_access_with_payment(
  uuid, text, text, uuid, timestamptz, timestamptz, numeric, text, text
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_assign_module_access_with_payment(
  uuid, text, text, uuid, timestamptz, timestamptz, numeric, text, text
) TO authenticated, service_role;

COMMIT;
