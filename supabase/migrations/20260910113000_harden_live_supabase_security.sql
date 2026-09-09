-- Close legacy Supabase exposure left behind by deployments that predate the
-- repository migration history. This is intentionally additive: it does not
-- alter application data or public listing read policies.

BEGIN;

-- These historical storage policies granted anonymous JPG writes and broad
-- authenticated access to arbitrary objects in the legacy Merotalent bucket.
-- The current app uses the scoped policies below them instead.
DROP POLICY IF EXISTS "Active accounts delete storage objects" ON storage.objects;
DROP POLICY IF EXISTS "Active accounts insert storage objects" ON storage.objects;
DROP POLICY IF EXISTS "Active accounts update storage objects" ON storage.objects;
DROP POLICY IF EXISTS "Give access to a file to user 1wfxz4x_0" ON storage.objects;
DROP POLICY IF EXISTS "Give access to a file to user 1wfxz4x_1" ON storage.objects;
DROP POLICY IF EXISTS "Give access to a file to user 1wfxz4x_2" ON storage.objects;
DROP POLICY IF EXISTS "Give anon users access to JPG images in folder 1wfxz4x_0" ON storage.objects;
DROP POLICY IF EXISTS "Give anon users access to JPG images in folder 1wfxz4x_1" ON storage.objects;
DROP POLICY IF EXISTS "Give anon users access to JPG images in folder 1wfxz4x_2" ON storage.objects;
DROP POLICY IF EXISTS "Give anon users access to JPG images in folder 1wfxz4x_3" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder 1wfxz4x_0" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder 1wfxz4x_1" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder 1wfxz4x_2" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder 1wfxz4x_3" ON storage.objects;
DROP POLICY IF EXISTS "Give users authenticated access to folder 1wfxz4x_0" ON storage.objects;
DROP POLICY IF EXISTS "Give users authenticated access to folder 1wfxz4x_1" ON storage.objects;
DROP POLICY IF EXISTS "Give users authenticated access to folder 1wfxz4x_2" ON storage.objects;
DROP POLICY IF EXISTS "Give users authenticated access to folder 1wfxz4x_3" ON storage.objects;

-- PostgreSQL grants EXECUTE to PUBLIC by default. Trigger functions and
-- SECURITY DEFINER functions must never be available as anonymous RPCs.
DO $$
DECLARE
  routine record;
BEGIN
  FOR routine IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', routine.signature);
  END LOOP;
END;
$$;

-- Restore only the signed-in/server RPC contract used by the application.
GRANT EXECUTE ON FUNCTION public.get_my_access_context() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.authorize_media_access(text, text, uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.claim_media_upload_intent(text, uuid, text, bigint) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.request_sub_admin_access(text[], text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.request_initial_module_access(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_decide_sub_admin_request(uuid, boolean, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_user_access(uuid, public.app_role, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.submit_college_application(jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.submit_module_form(text, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.run_platform_maintenance() TO service_role;

-- RLS predicates and the public college directory retain their minimal access
-- surface. The identity-aware predicates cannot be probed by anonymous users.
GRANT EXECUTE ON FUNCTION public.is_platform_admin(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_college_payment_verified(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_account_active(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_active_subscription(uuid, text, uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_entity_entitlement(uuid, text, uuid, text, text) TO authenticated, service_role;

-- Retired OAuth role assignment remains unavailable to every API caller.
REVOKE ALL ON FUNCTION public.claim_initial_oauth_role(text)
FROM PUBLIC, anon, authenticated;

-- Linter fixes for functions used by constraints, RLS, and triggers.
ALTER FUNCTION public.is_valid_partner_course_url(text) SET search_path = public, pg_temp;
ALTER FUNCTION public.is_canonical_media_path(text, uuid, text, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.is_owned_legacy_resume_path(text, uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.update_page_sections_timestamp() SET search_path = public, pg_temp;

COMMIT;
