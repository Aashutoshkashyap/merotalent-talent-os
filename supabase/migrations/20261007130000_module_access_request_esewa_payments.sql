-- Link delegated module-access requests to the canonical verified payment flow.
-- A successful redirect alone never grants access: Super Admin approval remains
-- authoritative, and an approved paid request must have a verified payment.

BEGIN;

ALTER TABLE public.sub_admin_requests
  ADD COLUMN IF NOT EXISTS package_id uuid REFERENCES public.packages(id),
  ADD COLUMN IF NOT EXISTS payment_id uuid REFERENCES public.payments(id),
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

ALTER TABLE public.sub_admin_requests
  DROP CONSTRAINT IF EXISTS sub_admin_requests_payment_status_check;
ALTER TABLE public.sub_admin_requests
  ADD CONSTRAINT sub_admin_requests_payment_status_check
  CHECK (payment_status IN ('not_started', 'pending', 'success', 'failed', 'cancelled', 'expired'));

CREATE INDEX IF NOT EXISTS sub_admin_requests_payment_idx
  ON public.sub_admin_requests(user_id, payment_status, created_at DESC);

-- Retain the newest active attempt per payable resource before enforcing
-- duplicate-click protection for all checkout consumers.
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY user_id, entity_type, entity_id
           ORDER BY created_at DESC, id DESC
         ) AS position
  FROM public.payment_checkout_sessions
  WHERE status IN ('initiated', 'pending')
)
UPDATE public.payment_checkout_sessions AS checkout
SET status = 'expired', completed_at = now(), updated_at = now()
FROM ranked
WHERE ranked.id = checkout.id AND ranked.position > 1;

CREATE UNIQUE INDEX IF NOT EXISTS payment_checkout_one_active_resource_idx
  ON public.payment_checkout_sessions(user_id, entity_type, entity_id)
  WHERE status IN ('initiated', 'pending');

-- PostgreSQL cannot change the OUT row shape through CREATE OR REPLACE.
-- This RPC has no dependent database objects; replace it atomically inside
-- this migration so callers receive the payment columns after commit.
DROP FUNCTION IF EXISTS public.get_my_module_access_requests();
CREATE FUNCTION public.get_my_module_access_requests()
RETURNS TABLE (
  id uuid,
  requested_modules text[],
  assigned_capabilities jsonb,
  organization text,
  status text,
  decision_note text,
  decided_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  package_id uuid,
  payment_id uuid,
  payment_status text,
  paid_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT r.id, r.requested_modules, r.assigned_capabilities, r.organization,
         r.status, r.decision_note, r.decided_at, r.created_at, r.updated_at,
         r.package_id, r.payment_id, r.payment_status, r.paid_at
  FROM public.sub_admin_requests AS r
  WHERE r.user_id = auth.uid()
  ORDER BY r.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_my_module_access_requests() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_module_access_requests() TO authenticated;

-- Preserve the established approval architecture while preventing a paid-plan
-- request from being approved before the provider payment is verified.
CREATE OR REPLACE FUNCTION public.admin_decide_sub_admin_request(
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
  request_record public.sub_admin_requests%ROWTYPE;
  requested_module_key text;
  assigned jsonb := '[]'::jsonb;
  permission_codes text[] := '{}'::text[];
BEGIN
  IF NOT public.is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only Super Admin can decide access requests' USING ERRCODE = '42501';
  END IF;

  SELECT request_row.* INTO request_record
  FROM public.sub_admin_requests AS request_row
  WHERE request_row.id = p_request_id
  FOR UPDATE;
  IF request_record.id IS NULL OR request_record.status <> 'pending' THEN
    RAISE EXCEPTION 'The pending access request was not found' USING ERRCODE = 'P0002';
  END IF;
  IF p_approve AND request_record.package_id IS NOT NULL
     AND (request_record.payment_status <> 'success' OR request_record.payment_id IS NULL) THEN
    RAISE EXCEPTION 'Verified payment is required before approving this paid access request' USING ERRCODE = '42501';
  END IF;

  IF p_approve THEN
    FOREACH requested_module_key IN ARRAY request_record.requested_modules LOOP
      requested_module_key := public.normalize_module_capability_key(requested_module_key);
      IF requested_module_key IS NULL OR NOT EXISTS (
        SELECT 1 FROM public.module_capabilities AS capability
        WHERE capability.module_key = requested_module_key AND capability.is_active
      ) THEN
        RAISE EXCEPTION 'Requested module capability is unavailable' USING ERRCODE = '22023';
      END IF;

      INSERT INTO public.user_module_capabilities(user_id, capability_id, status, granted_by, source_request_id)
      SELECT request_record.user_id, capability.id, 'active', auth.uid(), request_record.id
      FROM public.module_capabilities AS capability
      WHERE capability.module_key = requested_module_key
      ON CONFLICT (user_id, capability_id) DO UPDATE
        SET status = 'active', granted_by = EXCLUDED.granted_by,
            source_request_id = EXCLUDED.source_request_id,
            revoked_by = NULL, revoked_at = NULL, updated_at = now();

      assigned := assigned || jsonb_build_array(requested_module_key);
      permission_codes := permission_codes || CASE requested_module_key
        WHEN 'college' THEN ARRAY['college.manage', 'lead.view', 'media.manage']
        WHEN 'mentor' THEN ARRAY['mentor.manage', 'lead.view', 'media.manage']
        WHEN 'jobs' THEN ARRAY['job.post', 'lead.view', 'media.manage']
        WHEN 'events' THEN ARRAY['event.organize', 'lead.view', 'media.manage']
        WHEN 'courses' THEN ARRAY['course.manage', 'media.manage']
        ELSE '{}'::text[]
      END;
    END LOOP;

    INSERT INTO public.user_permissions(user_id, permission_id, granted_by)
    SELECT request_record.user_id, permission.id, auth.uid()
    FROM public.permissions AS permission
    WHERE permission.code = ANY(permission_codes)
    ON CONFLICT (user_id, permission_id) DO UPDATE
      SET granted_by = EXCLUDED.granted_by, expires_at = NULL;
  END IF;

  UPDATE public.sub_admin_requests AS request_row
  SET status = CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END,
      decision_note = NULLIF(btrim(p_note), ''),
      decided_by = auth.uid(), decided_at = now(),
      assigned_capabilities = CASE WHEN p_approve THEN assigned ELSE '[]'::jsonb END,
      updated_at = now()
  WHERE request_row.id = request_record.id
  RETURNING * INTO request_record;

  INSERT INTO public.audit_logs(actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (
    auth.uid(),
    CASE WHEN p_approve THEN 'approve_module_access' ELSE 'reject_module_access' END,
    'sub_admin_requests', request_record.id::text,
    jsonb_build_object(
      'user_id', request_record.user_id,
      'capabilities', assigned,
      'note', request_record.decision_note,
      'payment_id', request_record.payment_id
    )
  );

  INSERT INTO public.notifications(recipient_id, title, message, type, category, channel, status, entity_type, entity_id, action_url, metadata)
  VALUES (
    request_record.user_id,
    CASE WHEN p_approve THEN 'Module access approved' ELSE 'Module access request rejected' END,
    CASE WHEN p_approve
      THEN 'Your module capability has been granted. An entity assignment is required before you can manage private records.'
      ELSE COALESCE(request_record.decision_note, 'Your request was not approved.')
    END,
    'info', 'sub_admin_request', 'dashboard', 'queued', 'sub_admin_request', request_record.id, '/dashboard',
    jsonb_build_object('status', request_record.status, 'payment_status', request_record.payment_status)
  );

  RETURN jsonb_build_object(
    'id', request_record.id,
    'status', request_record.status,
    'assigned_capabilities', request_record.assigned_capabilities,
    'payment_status', request_record.payment_status
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_decide_sub_admin_request(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_decide_sub_admin_request(uuid, boolean, text) TO authenticated, service_role;

COMMIT;
