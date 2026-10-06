-- Migration: Payment Proof & Exception Reconciliation
-- Secure, auditable exception recovery mechanism anchored to public.payments

BEGIN;

-- 1. Create public.payment_proofs table
CREATE TABLE IF NOT EXISTS public.payment_proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  uploaded_by_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  storage_path text NOT NULL,
  mime_type text NOT NULL,
  file_size integer NOT NULL CHECK (file_size > 0 AND file_size <= 5242880),
  proof_type text NOT NULL DEFAULT 'screenshot'
    CHECK (proof_type IN ('screenshot', 'bank_voucher', 'statement', 'receipt', 'other')),
  user_note text NOT NULL CHECK (char_length(btrim(user_note)) BETWEEN 5 AND 2000),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'rejected')),
  reviewed_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payment_proofs_payment_idx ON public.payment_proofs(payment_id);
CREATE INDEX IF NOT EXISTS payment_proofs_user_idx ON public.payment_proofs(uploaded_by_user_id);
CREATE INDEX IF NOT EXISTS payment_proofs_status_idx ON public.payment_proofs(status);

ALTER TABLE public.payment_proofs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own payment proofs"
ON public.payment_proofs FOR SELECT TO authenticated
USING (uploaded_by_user_id = auth.uid() OR public.is_platform_admin());

CREATE POLICY "Users create own payment proofs"
ON public.payment_proofs FOR INSERT TO authenticated
WITH CHECK (uploaded_by_user_id = auth.uid());

CREATE POLICY "Super Admin manages payment proofs"
ON public.payment_proofs FOR ALL TO authenticated
USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

-- 2. Configure private Storage Bucket for payment proofs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-proofs', 'payment-proofs', false, 5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Authenticated users upload own payment proofs" ON storage.objects;
CREATE POLICY "Authenticated users upload own payment proofs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'payment-proofs'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND lower(regexp_replace(name, '^.*\\.', '')) IN ('jpg', 'jpeg', 'png', 'webp', 'pdf')
);

DROP POLICY IF EXISTS "Users and Admins read payment proofs" ON storage.objects;
CREATE POLICY "Users and Admins read payment proofs"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_platform_admin())
);

DROP POLICY IF EXISTS "Users delete own payment proofs" ON storage.objects;
CREATE POLICY "Users delete own payment proofs"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. RPC: submit_payment_proof
CREATE OR REPLACE FUNCTION public.submit_payment_proof(
  p_payment_id uuid,
  p_file_name text,
  p_storage_path text,
  p_mime_type text,
  p_file_size integer,
  p_proof_type text,
  p_user_note text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_payment public.payments%ROWTYPE;
  v_proof public.payment_proofs%ROWTYPE;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_payment
  FROM public.payments
  WHERE id = p_payment_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment record % not found.', p_payment_id USING ERRCODE = 'P0002';
  END IF;

  -- Users can only attach proofs to their own payments unless Super Admin
  IF v_payment.user_id <> v_actor_id AND NOT public.is_platform_admin(v_actor_id) THEN
    RAISE EXCEPTION 'You are not authorized to submit proof for this payment.' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.payment_proofs (
    payment_id,
    uploaded_by_user_id,
    file_name,
    storage_path,
    mime_type,
    file_size,
    proof_type,
    user_note,
    status
  ) VALUES (
    p_payment_id,
    v_actor_id,
    btrim(p_file_name),
    btrim(p_storage_path),
    lower(btrim(p_mime_type)),
    p_file_size,
    lower(btrim(p_proof_type)),
    btrim(p_user_note),
    'pending'
  )
  RETURNING * INTO v_proof;

  -- Flag payment for manual review without automatically granting access
  UPDATE public.payments
  SET reconciliation_status = 'manual_review_required',
      updated_at = now()
  WHERE id = p_payment_id;

  -- Notify Super Admins
  INSERT INTO public.notifications (
    recipient_id,
    title,
    message,
    type,
    category,
    channel,
    status,
    entity_type,
    entity_id,
    action_url,
    metadata
  )
  SELECT DISTINCT
    p.user_id,
    'Payment proof submitted for review',
    'A user submitted payment evidence for transaction ' || substr(p_payment_id::text, 1, 8) || '.',
    'warning',
    'payment_exception',
    'dashboard',
    'queued',
    'payment',
    p_payment_id,
    '/admin/payments',
    jsonb_build_object('proof_id', v_proof.id, 'payment_id', p_payment_id, 'uploader_id', v_actor_id)
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.user_id
  WHERE p.account_status = 'active'
    AND p.deleted_at IS NULL
    AND ur.role IN ('admin', 'super_admin');

  -- Audit log
  INSERT INTO public.audit_logs (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) VALUES (
    v_actor_id,
    'SUBMIT_PAYMENT_PROOF',
    'payment_proof',
    v_proof.id,
    jsonb_build_object(
      'payment_id', p_payment_id,
      'proof_type', p_proof_type,
      'file_name', p_file_name,
      'file_size', p_file_size
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'proof_id', v_proof.id,
    'payment_id', p_payment_id,
    'status', v_proof.status
  );
END;
$$;

-- 4. RPC: admin_review_payment_proof
CREATE OR REPLACE FUNCTION public.admin_review_payment_proof(
  p_proof_id uuid,
  p_decision text,
  p_review_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_proof public.payment_proofs%ROWTYPE;
  v_payment public.payments%ROWTYPE;
  v_decision text := lower(btrim(p_decision));
BEGIN
  IF NOT public.is_platform_admin(v_actor_id) THEN
    RAISE EXCEPTION 'Only platform administrators can review payment proofs.' USING ERRCODE = '42501';
  END IF;

  IF v_decision NOT IN ('accepted', 'rejected') THEN
    RAISE EXCEPTION 'Decision must be accepted or rejected.' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_proof
  FROM public.payment_proofs
  WHERE id = p_proof_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment proof % not found.', p_proof_id USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_payment
  FROM public.payments
  WHERE id = v_proof.payment_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Associated payment % not found.', v_proof.payment_id USING ERRCODE = 'P0002';
  END IF;

  -- Update proof record
  UPDATE public.payment_proofs
  SET status = v_decision,
      reviewed_by_user_id = v_actor_id,
      reviewed_at = now(),
      review_note = p_review_note,
      updated_at = now()
  WHERE id = p_proof_id;

  IF v_decision = 'accepted' THEN
    -- Authoritatively reconcile existing payment
    UPDATE public.payments
    SET status = 'success',
        reconciliation_status = 'reconciled',
        verified_by_user_id = v_actor_id,
        verification_note = COALESCE(p_review_note, 'Payment proof verified by Super Admin'),
        paid_at = COALESCE(paid_at, now()),
        updated_at = now()
    WHERE id = v_payment.id;

    -- Trigger existing activation if applicable
    IF v_payment.payment_type = 'module_access_request' THEN
      PERFORM public.activate_verified_college_scope_request(v_payment.reference_id);
    ELSIF v_payment.payment_type = 'mentor_booking' THEN
      UPDATE public.mentor_bookings
      SET payment_status = 'success',
          status = 'confirmed',
          payment_id = v_payment.id,
          updated_at = now()
      WHERE id = v_payment.reference_id;
    ELSIF v_payment.payment_type = 'event_ticket' THEN
      UPDATE public.event_registrations
      SET payment_status = 'success',
          status = 'confirmed',
          payment_id = v_payment.id,
          updated_at = now()
      WHERE id = v_payment.reference_id;
    END IF;

    -- Notify user of approval
    INSERT INTO public.notifications (
      recipient_id, title, message, type, category, channel, status, entity_type, entity_id, action_url
    ) VALUES (
      v_payment.user_id,
      'Payment verified',
      'Your payment evidence for transaction ' || substr(v_payment.id::text, 1, 8) || ' was verified and accepted by Super Admin.',
      'success', 'payment', 'dashboard', 'queued', 'payment', v_payment.id, '/dashboard/payments'
    );
  ELSE
    -- Rejected proof keeps payment failed/unresolved
    UPDATE public.payments
    SET reconciliation_status = 'unresolved',
        verification_note = COALESCE(p_review_note, 'Payment proof was rejected upon review'),
        updated_at = now()
    WHERE id = v_payment.id;

    -- Notify user of rejection
    INSERT INTO public.notifications (
      recipient_id, title, message, type, category, channel, status, entity_type, entity_id, action_url
    ) VALUES (
      v_payment.user_id,
      'Payment proof rejected',
      'Your payment evidence for transaction ' || substr(v_payment.id::text, 1, 8) || ' was not approved: ' || COALESCE(p_review_note, 'Invalid or mismatched payment evidence.'),
      'error', 'payment', 'dashboard', 'queued', 'payment', v_payment.id, '/dashboard/payments'
    );
  END IF;

  -- Audit log
  INSERT INTO public.audit_logs (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) VALUES (
    v_actor_id,
    CASE WHEN v_decision = 'accepted' THEN 'ACCEPT_PAYMENT_PROOF' ELSE 'REJECT_PAYMENT_PROOF' END,
    'payment_proof',
    p_proof_id,
    jsonb_build_object(
      'payment_id', v_payment.id,
      'decision', v_decision,
      'review_note', p_review_note
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'proof_id', p_proof_id,
    'decision', v_decision,
    'payment_id', v_payment.id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_payment_proof(uuid, text, text, text, integer, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_payment_proof(uuid, text, text, text, integer, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_review_payment_proof(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_review_payment_proof(uuid, text, text) TO authenticated;

COMMIT;
