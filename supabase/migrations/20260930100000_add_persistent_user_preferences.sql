BEGIN;

-- Keep presentation and notification preferences separate from the profile so
-- users can save them safely without opening broader profile fields to writes.
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_preferences jsonb NOT NULL DEFAULT jsonb_build_object(
    'email', true,
    'push', true,
    'competitions', true,
    'mentorship', true,
    'jobs', false,
    'marketing', false
  ),
  theme text NOT NULL DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  language text NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'ne')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_preferences_notification_preferences_object
    CHECK (jsonb_typeof(notification_preferences) = 'object'),
  CONSTRAINT user_preferences_notification_preferences_boolean_values
    CHECK (
      (NOT notification_preferences ? 'email' OR jsonb_typeof(notification_preferences->'email') = 'boolean')
      AND (NOT notification_preferences ? 'push' OR jsonb_typeof(notification_preferences->'push') = 'boolean')
      AND (NOT notification_preferences ? 'competitions' OR jsonb_typeof(notification_preferences->'competitions') = 'boolean')
      AND (NOT notification_preferences ? 'mentorship' OR jsonb_typeof(notification_preferences->'mentorship') = 'boolean')
      AND (NOT notification_preferences ? 'jobs' OR jsonb_typeof(notification_preferences->'jobs') = 'boolean')
      AND (NOT notification_preferences ? 'marketing' OR jsonb_typeof(notification_preferences->'marketing') = 'boolean')
    )
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Active users manage own preferences" ON public.user_preferences;
CREATE POLICY "Active users manage own preferences"
ON public.user_preferences
AS PERMISSIVE
FOR ALL
TO authenticated
USING (auth.uid() = user_id AND public.is_account_active(auth.uid()))
WITH CHECK (auth.uid() = user_id AND public.is_account_active(auth.uid()));

DROP POLICY IF EXISTS "Platform admins supervise user preferences" ON public.user_preferences;
CREATE POLICY "Platform admins supervise user preferences"
ON public.user_preferences
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "Active accounts read own user preferences" ON public.user_preferences;
CREATE POLICY "Active accounts read own user preferences"
ON public.user_preferences
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (public.is_account_active(auth.uid()));

DROP POLICY IF EXISTS "Active accounts insert own user preferences" ON public.user_preferences;
CREATE POLICY "Active accounts insert own user preferences"
ON public.user_preferences
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (public.is_account_active(auth.uid()));

DROP POLICY IF EXISTS "Active accounts update own user preferences" ON public.user_preferences;
CREATE POLICY "Active accounts update own user preferences"
ON public.user_preferences
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (public.is_account_active(auth.uid()))
WITH CHECK (public.is_account_active(auth.uid()));

DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON public.user_preferences;
CREATE TRIGGER update_user_preferences_updated_at
BEFORE UPDATE ON public.user_preferences
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMIT;
