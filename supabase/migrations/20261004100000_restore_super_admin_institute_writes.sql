-- The entitlement migration removed the old college INSERT policy but did not
-- replace the Super Admin path. Restore only platform-admin direct writes;
-- college managers continue to use the existing scoped entitlement policy.
BEGIN;

CREATE POLICY "Platform admins create institute listings"
ON public.institutes FOR INSERT TO authenticated
WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins update institute listings"
ON public.institutes FOR UPDATE TO authenticated
USING (public.is_platform_admin(auth.uid()))
WITH CHECK (public.is_platform_admin(auth.uid()));

COMMIT;
