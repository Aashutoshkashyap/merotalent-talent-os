BEGIN;

-- These helpers remain executable by authenticated callers because RLS policies
-- and the app need them, but a caller may only probe their own entitlement
-- unless they are an active Super Admin. This prevents user-ID enumeration.
CREATE OR REPLACE FUNCTION public.has_active_module_entitlement(
  p_user_id uuid, p_module_key text, p_entity_type text, p_entity_id uuid, p_feature_key text DEFAULT NULL
)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT (p_user_id = auth.uid() OR public.is_platform_admin(auth.uid()))
    AND public.is_account_active(p_user_id) AND (
      public.is_platform_admin(p_user_id)
      OR EXISTS (
        SELECT 1 FROM public.module_entitlements e LEFT JOIN public.packages p ON p.id = e.package_id
        WHERE e.user_id = p_user_id AND e.module_key = p_module_key AND e.entity_type = p_entity_type AND e.entity_id = p_entity_id
          AND e.status = 'active' AND e.start_at <= now() AND (e.expires_at IS NULL OR e.expires_at > now())
          AND (p_feature_key IS NULL OR e.features @> jsonb_build_object(p_feature_key, true) OR COALESCE(p.features, '{}'::jsonb) @> jsonb_build_object(p_feature_key, true))
      )
    )
$$;

CREATE OR REPLACE FUNCTION public.has_entity_feature_access(
  p_user_id uuid, p_module_key text, p_entity_type text, p_entity_id uuid, p_feature_key text
)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT (p_user_id = auth.uid() OR public.is_platform_admin(auth.uid()))
    AND public.is_account_active(p_user_id) AND (
      public.is_platform_admin(p_user_id)
      OR EXISTS (SELECT 1 FROM public.entity_feature_grants g WHERE g.user_id = p_user_id AND g.module_key = p_module_key AND g.entity_type = p_entity_type AND g.entity_id = p_entity_id AND g.feature_key = p_feature_key AND g.status = 'active')
      OR public.has_active_module_entitlement(p_user_id, p_module_key, p_entity_type, p_entity_id, p_feature_key)
    )
$$;

COMMIT;
