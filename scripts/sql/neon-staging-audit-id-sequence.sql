-- Restored audit_logs.id is bigint without its original sequence/default.
-- Isolated migration-staging only; retain all copied audit rows.
CREATE SEQUENCE IF NOT EXISTS public.neon_audit_logs_id_seq AS bigint;
SELECT setval('public.neon_audit_logs_id_seq',
  GREATEST(COALESCE((SELECT max(id) FROM public.audit_logs), 0), 1), true);
ALTER SEQUENCE public.neon_audit_logs_id_seq OWNED BY public.audit_logs.id;
ALTER TABLE public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.neon_audit_logs_id_seq');

-- Historical create-request check forbids recording the new institution after
-- approval. Permit the resolved ID only after a decision; pending creates stay
-- unbound and therefore cannot masquerade as an existing college claim.
ALTER TABLE public.entity_scope_requests DROP CONSTRAINT IF EXISTS entity_scope_requests_check;
ALTER TABLE public.entity_scope_requests ADD CONSTRAINT entity_scope_requests_check
  CHECK ((request_kind = 'claim' AND entity_id IS NOT NULL)
    OR (request_kind = 'create' AND
      ((status = 'approved' AND entity_id IS NOT NULL)
       OR (status <> 'approved' AND entity_id IS NULL))));
