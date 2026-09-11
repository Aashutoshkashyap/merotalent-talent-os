BEGIN;

-- The entitlement migration intentionally replaced the row-scope policies for
-- sensitive module data.  Preserve the independent account-status condition:
-- every direct browser read or mutation below still requires an active account.
-- These are RESTRICTIVE policies, so they narrow existing ownership/admin
-- policies instead of granting access on their own.
DO $$
DECLARE
  target text;
BEGIN
  FOREACH target IN ARRAY ARRAY[
    'audit_logs', 'college_applications', 'companies', 'event_registrations',
    'events', 'institutes', 'job_applications', 'jobs', 'mentor_bookings',
    'mentor_services', 'mentors', 'packages', 'payments', 'profiles',
    'subscriptions', 'user_permissions', 'user_roles'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Active accounts can insert', target);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.is_account_active(auth.uid()))',
      'Active accounts can insert', target
    );

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Active accounts can update', target);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.is_account_active(auth.uid())) WITH CHECK (public.is_account_active(auth.uid()))',
      'Active accounts can update', target
    );

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Active accounts can delete', target);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING (public.is_account_active(auth.uid()))',
      'Active accounts can delete', target
    );

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Active accounts read private data', target);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR SELECT TO authenticated USING (public.is_account_active(auth.uid()))',
      'Active accounts read private data', target
    );
  END LOOP;
END $$;

COMMIT;
