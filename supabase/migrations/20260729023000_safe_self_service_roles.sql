-- Allow users to select a non-privileged account type during onboarding.
-- Admin access can only be granted by an existing admin.
DROP POLICY IF EXISTS "Users can insert own initial role" ON public.user_roles;

CREATE POLICY "Users can insert own non privileged role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND role IN ('talent', 'institution', 'company', 'mentor')
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested_role public.app_role;
BEGIN
  requested_role := CASE NEW.raw_user_meta_data ->> 'account_type'
    WHEN 'institution' THEN 'institution'::public.app_role
    WHEN 'company' THEN 'company'::public.app_role
    WHEN 'mentor' THEN 'mentor'::public.app_role
    ELSE 'talent'::public.app_role
  END;

  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')
  )
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, requested_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;
