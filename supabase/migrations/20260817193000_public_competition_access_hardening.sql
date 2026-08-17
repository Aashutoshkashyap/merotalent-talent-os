-- Keep the public competition directory limited to registrable, active records.
-- Organizers and platform admins retain their existing authenticated management
-- policy for drafts and historical records.

DROP POLICY IF EXISTS "Anyone can view published competitions" ON public.competitions;
DROP POLICY IF EXISTS "Public views active competitions" ON public.competitions;

CREATE POLICY "Public views active competitions"
ON public.competitions
FOR SELECT
TO anon, authenticated
USING (status IN ('upcoming', 'ongoing'));

GRANT SELECT ON public.competitions TO anon, authenticated;
