-- Add the two missing DELETE policies.
--
-- The admin UI offers "delete user profile" (AdminUsers) and "delete package"
-- (AdminPackages), but neither public.profiles nor public.packages had a DELETE
-- policy. Under RLS the delete was denied, and because both call sites
-- discarded the Supabase result the UI reported success regardless — a
-- moderation action that silently does nothing.
--
-- Both call sites now surface the error, so without these policies the admin
-- would see an explicit failure. These policies make the intended action work,
-- restricted to an active platform admin.

BEGIN;

DROP POLICY IF EXISTS "Active admins delete profiles" ON public.profiles;
CREATE POLICY "Active admins delete profiles"
ON public.profiles FOR DELETE TO authenticated
USING (public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "Active admins delete packages" ON public.packages;
CREATE POLICY "Active admins delete packages"
ON public.packages FOR DELETE TO authenticated
USING (public.is_platform_admin(auth.uid()));

COMMIT;
