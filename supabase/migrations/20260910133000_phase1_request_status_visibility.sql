BEGIN;

-- Users need a safe, read-only view of their own request history. Keeping this
-- behind an RPC means browser code never needs direct access to the review
-- table, which remains Super Admin managed.
CREATE OR REPLACE FUNCTION public.get_my_module_access_requests()
RETURNS TABLE (
  id uuid,
  requested_modules text[],
  assigned_capabilities jsonb,
  organization text,
  status text,
  decision_note text,
  decided_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT r.id, r.requested_modules, r.assigned_capabilities, r.organization,
         r.status, r.decision_note, r.decided_at, r.created_at, r.updated_at
  FROM public.sub_admin_requests r
  WHERE r.user_id = auth.uid()
  ORDER BY r.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_my_module_access_requests() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_module_access_requests() TO authenticated;

COMMIT;
