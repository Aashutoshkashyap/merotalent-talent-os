-- Phase 5: trigger helpers are implementation details, not public RPCs.
-- The triggers remain attached to entity_admin_assignments; revoking direct
-- API execution prevents callers from invoking legacy-sync or validation code
-- outside the table's RLS-controlled mutation path.

REVOKE ALL ON FUNCTION public.validate_entity_admin_assignment()
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_entity_admin_assignment() TO service_role;

REVOKE ALL ON FUNCTION public.sync_legacy_college_admin_assignment()
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_legacy_college_admin_assignment() TO service_role;
