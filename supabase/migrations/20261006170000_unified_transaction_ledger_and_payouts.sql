-- Migration: Unified Transaction Ledger, Mentor Payouts, Additive Extensions, and Audit Trail
-- Ensures single source of truth for all platform financial transactions.

BEGIN;

-- 1. Extend public.payments with settlement, payout, and reconciliation columns
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS parent_payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payout_status text DEFAULT 'not_applicable',
  ADD COLUMN IF NOT EXISTS payout_amount numeric(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_amount numeric(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payout_reference text,
  ADD COLUMN IF NOT EXISTS payout_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verification_note text,
  ADD COLUMN IF NOT EXISTS reconciliation_status text DEFAULT 'reconciled';

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_payout_status_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_payout_status_check
  CHECK (payout_status IN ('not_applicable', 'pending', 'processed', 'failed', 'cancelled')) NOT VALID;

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_reconciliation_status_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_reconciliation_status_check
  CHECK (reconciliation_status IN ('reconciled', 'unresolved', 'manual_review_required', 'disputed')) NOT VALID;

CREATE INDEX IF NOT EXISTS payments_parent_payment_idx ON public.payments(parent_payment_id);
CREATE INDEX IF NOT EXISTS payments_reconciliation_idx ON public.payments(reconciliation_status);
CREATE INDEX IF NOT EXISTS payments_payout_status_idx ON public.payments(payout_status);

-- 2. Additive Subscription Extension RPC
CREATE OR REPLACE FUNCTION public.admin_extend_subscription(
  p_subscription_id uuid,
  p_additional_days integer,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_sub public.subscriptions%ROWTYPE;
  v_base_time timestamptz;
  v_new_expiry timestamptz;
BEGIN
  IF NOT public.is_platform_admin(v_actor_id) THEN
    RAISE EXCEPTION 'Only platform administrators can extend subscriptions.'
      USING ERRCODE = '42501';
  END IF;

  IF p_additional_days <= 0 THEN
    RAISE EXCEPTION 'Additional days must be greater than zero.'
      USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_sub
  FROM public.subscriptions
  WHERE id = p_subscription_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subscription % not found.', p_subscription_id
      USING ERRCODE = 'P0002';
  END IF;

  -- Additive extension rule: GREATEST(now(), current_expiry) + days
  v_base_time := GREATEST(now(), v_sub.expiry_date);
  v_new_expiry := v_base_time + (p_additional_days || ' days')::interval;

  UPDATE public.subscriptions
  SET expiry_date = v_new_expiry,
      status = 'active',
      updated_at = now()
  WHERE id = p_subscription_id;

  -- Keep module_entitlements in sync if present
  UPDATE public.module_entitlements
  SET expires_at = v_new_expiry,
      status = 'active',
      updated_at = now()
  WHERE user_id = v_sub.user_id
    AND entity_type = v_sub.entity_type
    AND (entity_id = v_sub.entity_id OR (entity_id IS NULL AND v_sub.entity_id IS NULL))
    AND status IN ('active', 'expired');

  INSERT INTO public.audit_logs (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) VALUES (
    v_actor_id,
    'ADMIN_EXTEND_SUBSCRIPTION',
    'subscription',
    p_subscription_id,
    jsonb_build_object(
      'previous_expiry', v_sub.expiry_date,
      'new_expiry', v_new_expiry,
      'additional_days', p_additional_days,
      'note', p_note
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'subscription_id', p_subscription_id,
    'previous_expiry', v_sub.expiry_date,
    'new_expiry', v_new_expiry,
    'additional_days', p_additional_days
  );
END;
$$;

-- 3. Super Admin Payment Verification & Reconciliation RPC
CREATE OR REPLACE FUNCTION public.admin_verify_and_reconcile_payment(
  p_payment_id uuid,
  p_status text,
  p_note text DEFAULT NULL,
  p_reconciliation_status text DEFAULT 'reconciled'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_payment public.payments%ROWTYPE;
  v_prev_status text;
  v_prev_recon text;
BEGIN
  IF NOT public.is_platform_admin(v_actor_id) THEN
    RAISE EXCEPTION 'Only platform administrators can reconcile payments.'
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_payment
  FROM public.payments
  WHERE id = p_payment_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment % not found.', p_payment_id
      USING ERRCODE = 'P0002';
  END IF;

  v_prev_status := v_payment.status;
  v_prev_recon := v_payment.reconciliation_status;

  UPDATE public.payments
  SET status = p_status,
      reconciliation_status = p_reconciliation_status,
      verified_by_user_id = v_actor_id,
      verification_note = p_note,
      paid_at = CASE WHEN p_status = 'success' AND paid_at IS NULL THEN now() ELSE paid_at END,
      updated_at = now()
  WHERE id = p_payment_id;

  INSERT INTO public.audit_logs (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) VALUES (
    v_actor_id,
    'ADMIN_RECONCILE_PAYMENT',
    'payment',
    p_payment_id,
    jsonb_build_object(
      'previous_status', v_prev_status,
      'new_status', p_status,
      'previous_reconciliation', v_prev_recon,
      'new_reconciliation', p_reconciliation_status,
      'note', p_note
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'payment_id', p_payment_id,
    'status', p_status,
    'reconciliation_status', p_reconciliation_status
  );
END;
$$;

-- 4. Record Mentor Payout Linked Settlement RPC
CREATE OR REPLACE FUNCTION public.admin_record_mentor_payout(
  p_payment_id uuid,
  p_payout_amount numeric,
  p_commission_amount numeric DEFAULT 0,
  p_payout_reference text DEFAULT NULL,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_payment public.payments%ROWTYPE;
  v_payout_payment_id uuid;
BEGIN
  IF NOT public.is_platform_admin(v_actor_id) THEN
    RAISE EXCEPTION 'Only platform administrators can record mentor payouts.'
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_payment
  FROM public.payments
  WHERE id = p_payment_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Original payment % not found.', p_payment_id
      USING ERRCODE = 'P0002';
  END IF;

  IF v_payment.payment_type <> 'mentor_booking' THEN
    RAISE EXCEPTION 'Payouts can only be recorded against mentor booking transactions.'
      USING ERRCODE = '22023';
  END IF;

  -- Update original payment payout status
  UPDATE public.payments
  SET payout_status = 'processed',
      payout_amount = p_payout_amount,
      commission_amount = p_commission_amount,
      payout_reference = p_payout_reference,
      payout_at = now(),
      updated_at = now()
  WHERE id = p_payment_id;

  -- Create linked settlement payment row
  INSERT INTO public.payments (
    user_id,
    payment_type,
    reference_id,
    parent_payment_id,
    amount,
    currency,
    status,
    gateway,
    gateway_transaction_id,
    payout_status,
    paid_at,
    metadata
  ) VALUES (
    v_payment.user_id,
    'mentor_payout_settlement',
    v_payment.reference_id,
    v_payment.id,
    p_payout_amount,
    v_payment.currency,
    'success',
    'manual_payout',
    p_payout_reference,
    'processed',
    now(),
    jsonb_build_object(
      'original_payment_id', v_payment.id,
      'booking_id', v_payment.reference_id,
      'commission_amount', p_commission_amount,
      'note', p_note,
      'recorded_by', v_actor_id
    )
  )
  RETURNING id INTO v_payout_payment_id;

  INSERT INTO public.audit_logs (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) VALUES (
    v_actor_id,
    'ADMIN_RECORD_MENTOR_PAYOUT',
    'payment',
    p_payment_id,
    jsonb_build_object(
      'payout_payment_id', v_payout_payment_id,
      'payout_amount', p_payout_amount,
      'commission_amount', p_commission_amount,
      'payout_reference', p_payout_reference,
      'note', p_note
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'original_payment_id', p_payment_id,
    'payout_payment_id', v_payout_payment_id,
    'payout_amount', p_payout_amount,
    'commission_amount', p_commission_amount
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_extend_subscription(uuid, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_extend_subscription(uuid, integer, text) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_verify_and_reconcile_payment(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_verify_and_reconcile_payment(uuid, text, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_record_mentor_payout(uuid, numeric, numeric, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_record_mentor_payout(uuid, numeric, numeric, text, text) TO authenticated;

COMMIT;
