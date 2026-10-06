-- Bind college claim/addition requests to verified eSewa payments without
-- granting entity access before Super Admin approval.

BEGIN;

ALTER TABLE public.entity_scope_requests
  ADD COLUMN IF NOT EXISTS package_id uuid REFERENCES public.packages(id),
  ADD COLUMN IF NOT EXISTS payment_id uuid REFERENCES public.payments(id),
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

ALTER TABLE public.entity_scope_requests
  DROP CONSTRAINT IF EXISTS entity_scope_requests_payment_status_check;
ALTER TABLE public.entity_scope_requests
  ADD CONSTRAINT entity_scope_requests_payment_status_check
  CHECK (payment_status IN ('not_started', 'pending', 'success', 'failed', 'cancelled', 'expired'));

CREATE INDEX IF NOT EXISTS entity_scope_requests_payment_idx
  ON public.entity_scope_requests(user_id, payment_status, created_at DESC);

CREATE OR REPLACE FUNCTION public.activate_verified_college_scope_request(p_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  request_record public.entity_scope_requests%ROWTYPE;
  package_record public.packages%ROWTYPE;
  payment_record public.payments%ROWTYPE;
  subscription_record public.subscriptions%ROWTYPE;
  entitlement_record public.module_entitlements%ROWTYPE;
  duration_days integer;
  effective_start timestamptz := now();
  effective_expiry timestamptz;
BEGIN
  SELECT * INTO request_record
  FROM public.entity_scope_requests AS scope_request
  WHERE scope_request.id = p_request_id
  FOR UPDATE;

  IF request_record.id IS NULL THEN
    RAISE EXCEPTION 'College request was not found' USING ERRCODE = 'P0002';
  END IF;
  IF request_record.status <> 'approved' OR request_record.entity_id IS NULL THEN
    RETURN jsonb_build_object('activated', false, 'reason', 'awaiting_approval');
  END IF;
  IF request_record.payment_status <> 'success'
     OR request_record.payment_id IS NULL
     OR request_record.package_id IS NULL THEN
    RETURN jsonb_build_object('activated', false, 'reason', 'awaiting_payment');
  END IF;

  SELECT * INTO payment_record
  FROM public.payments AS payment
  WHERE payment.id = request_record.payment_id
    AND payment.user_id = request_record.user_id
    AND payment.reference_id = request_record.id
    AND payment.payment_type = 'module_access_request'
    AND payment.status = 'success';
  IF payment_record.id IS NULL THEN
    RAISE EXCEPTION 'A verified request payment was not found' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO package_record
  FROM public.packages AS package
  WHERE package.id = request_record.package_id
    AND package.package_kind = 'paid'
    AND package.module_scope @> ARRAY['college']::text[];
  IF package_record.id IS NULL OR package_record.price IS DISTINCT FROM payment_record.amount THEN
    RAISE EXCEPTION 'The verified payment does not match the college plan' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO entitlement_record
  FROM public.module_entitlements AS entitlement
  WHERE entitlement.payment_id = payment_record.id
  LIMIT 1;
  IF entitlement_record.id IS NOT NULL THEN
    RETURN jsonb_build_object('activated', true, 'entitlement_id', entitlement_record.id, 'duplicate', true);
  END IF;

  duration_days := COALESCE(
    package_record.duration_days,
    CASE package_record.billing_interval
      WHEN 'quarter' THEN 90
      WHEN 'year' THEN 365
      ELSE 30
    END
  );

  SELECT * INTO subscription_record
  FROM public.subscriptions AS subscription
  WHERE subscription.user_id = request_record.user_id
    AND subscription.entity_type = 'college'
    AND subscription.entity_id = request_record.entity_id
    AND subscription.status IN ('trialing', 'active')
    AND subscription.deleted_at IS NULL
  FOR UPDATE;

  IF subscription_record.id IS NOT NULL
     AND subscription_record.expiry_date > effective_start THEN
    effective_start := subscription_record.expiry_date;
  END IF;
  effective_expiry := effective_start + make_interval(days => duration_days);

  IF subscription_record.id IS NOT NULL THEN
    UPDATE public.subscriptions
    SET package_id = package_record.id,
        expiry_date = effective_expiry,
        status = 'active',
        payment_status = 'success',
        metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
          'payment_id', payment_record.id,
          'scope_request_id', request_record.id
        ),
        updated_at = now()
    WHERE id = subscription_record.id
    RETURNING * INTO subscription_record;
  ELSE
    INSERT INTO public.subscriptions(
      user_id, package_id, entity_type, entity_id, start_date, expiry_date,
      status, payment_status, metadata
    ) VALUES (
      request_record.user_id, package_record.id, 'college', request_record.entity_id,
      now(), effective_expiry, 'active', 'success',
      jsonb_build_object('payment_id', payment_record.id, 'scope_request_id', request_record.id)
    ) RETURNING * INTO subscription_record;
  END IF;

  INSERT INTO public.module_entitlements(
    user_id, module_key, entity_type, entity_id, package_id, source, status,
    start_at, expires_at, features, payment_id, reason
  ) VALUES (
    request_record.user_id, 'college', 'college', request_record.entity_id,
    package_record.id, 'ESEWA_PURCHASE', 'active', now(), effective_expiry,
    COALESCE(package_record.features, '{}'::jsonb), payment_record.id,
    'Verified eSewa payment for approved college request'
  ) RETURNING * INTO entitlement_record;

  UPDATE public.payments
  SET subscription_id = subscription_record.id, updated_at = now()
  WHERE id = payment_record.id;

  INSERT INTO public.audit_logs(actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (
    auth.uid(), 'COLLEGE_SCOPE_PAYMENT_ACTIVATED', 'college', request_record.entity_id::text,
    jsonb_build_object(
      'scope_request_id', request_record.id,
      'payment_id', payment_record.id,
      'subscription_id', subscription_record.id,
      'entitlement_id', entitlement_record.id
    )
  );

  RETURN jsonb_build_object(
    'activated', true,
    'subscription_id', subscription_record.id,
    'entitlement_id', entitlement_record.id,
    'expires_at', effective_expiry
  );
END;
$$;

REVOKE ALL ON FUNCTION public.activate_verified_college_scope_request(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_verified_college_scope_request(uuid)
  TO service_role;

CREATE OR REPLACE FUNCTION public.admin_decide_entity_scope_request(
  p_request_id uuid,
  p_approve boolean,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  request_record public.entity_scope_requests%ROWTYPE;
  college_id uuid;
  assignment jsonb;
  activation jsonb := jsonb_build_object('activated', false);
BEGIN
  IF NOT public.is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only Super Admin can decide entity scope requests' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO request_record
  FROM public.entity_scope_requests
  WHERE id = p_request_id
  FOR UPDATE;
  IF request_record.id IS NULL OR request_record.status <> 'pending' THEN
    RAISE EXCEPTION 'The pending entity request was not found' USING ERRCODE = 'P0002';
  END IF;

  IF p_approve THEN
    IF request_record.request_kind = 'create' THEN
      INSERT INTO public.institutes(
        name, slug, location, contact_email, contact_phone, description,
        owner_user_id, status, applications_enabled
      ) VALUES (
        btrim(request_record.request_data->>'name'),
        lower(regexp_replace(btrim(request_record.request_data->>'name'), '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(request_record.id::text, 1, 8),
        NULLIF(btrim(request_record.request_data->>'location'), ''),
        NULLIF(lower(btrim(request_record.request_data->>'email')), ''),
        NULLIF(btrim(request_record.request_data->>'phone'), ''),
        NULLIF(btrim(request_record.request_data->>'description'), ''),
        request_record.user_id, 'pending', false
      ) RETURNING id INTO college_id;
    ELSE
      college_id := request_record.entity_id;
    END IF;

    assignment := public.admin_assign_entity_scope(
      request_record.user_id, 'college', 'college', college_id, NULL,
      jsonb_build_object('source', 'entity_scope_request')
    );
    UPDATE public.entity_scope_requests
    SET status = 'approved',
        entity_id = college_id,
        decision_note = NULLIF(btrim(p_note), ''),
        decided_by = auth.uid(),
        decided_at = now(),
        assignment_id = (assignment->>'id')::uuid,
        updated_at = now()
    WHERE id = request_record.id
    RETURNING * INTO request_record;

    activation := public.activate_verified_college_scope_request(request_record.id);
  ELSE
    UPDATE public.entity_scope_requests
    SET status = 'rejected',
        decision_note = NULLIF(btrim(p_note), ''),
        decided_by = auth.uid(),
        decided_at = now(),
        updated_at = now()
    WHERE id = request_record.id
    RETURNING * INTO request_record;
  END IF;

  INSERT INTO public.audit_logs(actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (
    auth.uid(),
    CASE WHEN p_approve THEN 'approve_entity_scope' ELSE 'reject_entity_scope' END,
    'entity_scope_requests', request_record.id::text,
    jsonb_build_object(
      'user_id', request_record.user_id,
      'college_id', college_id,
      'note', request_record.decision_note,
      'activation', activation
    )
  );
  INSERT INTO public.notifications(
    recipient_id, title, message, type, category, channel, status,
    entity_type, entity_id, action_url, metadata
  ) VALUES (
    request_record.user_id,
    CASE WHEN p_approve THEN 'College access approved' ELSE 'College access request rejected' END,
    CASE
      WHEN p_approve AND COALESCE((activation->>'activated')::boolean, false)
        THEN 'Your college administration scope and verified subscription are active.'
      WHEN p_approve
        THEN 'Your college administration scope is approved. Complete a plan payment to unlock protected college data.'
      ELSE COALESCE(request_record.decision_note, 'Your college scope request was not approved.')
    END,
    'info', 'entity_scope_request', 'dashboard', 'queued',
    'entity_scope_request', request_record.id, '/institute',
    jsonb_build_object(
      'status', request_record.status,
      'assignment_id', request_record.assignment_id,
      'payment_status', request_record.payment_status,
      'activation', activation
    )
  );

  RETURN jsonb_build_object(
    'id', request_record.id,
    'status', request_record.status,
    'assignment_id', request_record.assignment_id,
    'college_id', college_id,
    'activation', activation
  );
END;
$$;

COMMIT;
