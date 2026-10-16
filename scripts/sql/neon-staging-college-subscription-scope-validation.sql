-- Isolated Neon staging forward adjustment. The copied legacy trigger assumed
-- one institution owner and an institution user-role; Phase 1 uses independent
-- module capability plus exact multi-college entity assignment instead.
-- No historical Supabase migration is edited and this is not a production cutover.
CREATE OR REPLACE FUNCTION public.validate_subscription_entity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE package_audience public.app_role;
BEGIN
  SELECT p.audience INTO package_audience FROM public.packages p
  WHERE p.id=NEW.package_id AND p.is_active AND p.deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subscription package is unavailable' USING ERRCODE='23503';
  END IF;

  IF NEW.entity_type='college' THEN
    IF NEW.entity_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.institutes i
      JOIN public.entity_admin_assignments a ON a.entity_type='college'
        AND a.entity_id=i.id AND a.user_id=NEW.user_id AND a.status='active'
      JOIN public.user_module_capabilities umc ON umc.id=a.user_capability_id
        AND umc.user_id=NEW.user_id AND umc.status='active'
        AND (umc.expires_at IS NULL OR umc.expires_at>now())
      JOIN public.module_capabilities mc ON mc.id=umc.capability_id
        AND mc.module_key='college' AND mc.is_active
      JOIN public.packages p ON p.id=NEW.package_id
        AND p.module_scope @> ARRAY['college']::text[]
      JOIN public.profiles profile ON profile.user_id=NEW.user_id
        AND profile.account_status='active' AND profile.deleted_at IS NULL
      WHERE i.id=NEW.entity_id AND i.deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'College subscription requires an active exact entity assignment and capability'
        USING ERRCODE='42501';
    END IF;
  ELSE
    IF package_audience IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.user_roles ur WHERE ur.user_id=NEW.user_id AND ur.role=package_audience
    ) THEN
      RAISE EXCEPTION 'Package audience does not match the subscriber role' USING ERRCODE='22023';
    END IF;
    IF NEW.entity_type='user' THEN
      IF NEW.entity_id IS NOT NULL THEN RAISE EXCEPTION 'User subscriptions cannot claim an entity' USING ERRCODE='22023'; END IF;
    ELSIF NEW.entity_type='mentor' THEN
      IF NEW.entity_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.mentors m
        WHERE m.id=NEW.entity_id AND m.user_id=NEW.user_id AND m.deleted_at IS NULL)
      THEN RAISE EXCEPTION 'Mentor subscription ownership mismatch' USING ERRCODE='42501'; END IF;
    ELSIF NEW.entity_type='company' THEN
      IF NEW.entity_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.companies c
        WHERE c.id=NEW.entity_id AND c.user_id=NEW.user_id AND c.deleted_at IS NULL)
      THEN RAISE EXCEPTION 'Company subscription ownership mismatch' USING ERRCODE='42501'; END IF;
    ELSIF NEW.entity_type='organizer' THEN
      IF NEW.entity_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.events e
        WHERE e.id=NEW.entity_id AND e.organizer_user_id=NEW.user_id AND e.deleted_at IS NULL)
      THEN RAISE EXCEPTION 'Organizer subscription ownership mismatch' USING ERRCODE='42501'; END IF;
    ELSE
      RAISE EXCEPTION 'Unsupported subscription entity type' USING ERRCODE='22023';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_subscription_entity() FROM PUBLIC;
