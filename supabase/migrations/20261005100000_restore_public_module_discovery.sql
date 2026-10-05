-- Public mentor eligibility must use the intentionally public, active-profile
-- directory. An anonymous RLS policy cannot see rows in private profiles.
BEGIN;

DROP POLICY IF EXISTS "Public views approved mentors" ON public.mentors;
CREATE POLICY "Public views approved mentors"
ON public.mentors FOR SELECT TO anon, authenticated
USING (
  (
    approval_status = 'approved'
    AND is_available = true
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.public_profile_directory profile
      WHERE profile.user_id = mentors.user_id
    )
  )
  OR user_id = auth.uid()
  OR public.is_platform_admin()
);

DROP POLICY IF EXISTS "Inactive accounts only read public mentors" ON public.mentors;
CREATE POLICY "Inactive accounts only read public mentors"
ON public.mentors AS RESTRICTIVE FOR SELECT TO authenticated
USING (
  public.is_account_active()
  OR (
    approval_status = 'approved'
    AND is_available = true
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.public_profile_directory profile
      WHERE profile.user_id = mentors.user_id
    )
  )
);

-- The existing competition policy targets authenticated users only. Let
-- visitors discover live competitions without exposing drafts or cancellations.
CREATE POLICY "Public views live competitions"
ON public.competitions FOR SELECT TO anon
USING (status IN ('upcoming', 'ongoing'));

COMMIT;
