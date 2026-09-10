BEGIN;

-- Phase 8 release hardening: make the entitlement ledger the effective source
-- of truth for manual grants as well as verified purchases.  This is a
-- forward-only compatibility layer for the older subscription-backed module
-- policies; it does not change historical records or weaken entity scope.

CREATE OR REPLACE FUNCTION public.has_active_entity_subscription(
  p_entity_type text,
  p_entity_id uuid,
  p_feature text DEFAULT NULL,
  p_required_mode text DEFAULT 'read_only'
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.is_account_active(auth.uid()) AND (
    EXISTS (
      SELECT 1
      FROM public.subscriptions s
      JOIN public.packages p ON p.id = s.package_id
      WHERE s.entity_type = p_entity_type
        AND s.entity_id = p_entity_id
        AND s.status IN ('trialing', 'active')
        AND s.payment_status IN ('success', 'not_required')
        AND s.start_date <= now()
        AND s.expiry_date > now()
        AND s.deleted_at IS NULL
        AND p.is_active
        AND p.deleted_at IS NULL
        AND (p_feature IS NULL OR p.features @> jsonb_build_object(p_feature, true))
        AND CASE p_required_mode
          WHEN 'read_only' THEN p.lead_access_mode IN ('read_only', 'full')
          WHEN 'full' THEN p.lead_access_mode = 'full'
          ELSE false
        END
    )
    OR EXISTS (
      SELECT 1
      FROM public.module_entitlements e
      LEFT JOIN public.packages p ON p.id = e.package_id
      WHERE e.user_id = auth.uid()
        AND e.status = 'active'
        AND e.start_at <= now()
        AND (e.expires_at IS NULL OR e.expires_at > now())
        AND (
          (p_entity_type = 'college' AND e.module_key = 'college' AND e.entity_type = 'college' AND e.entity_id = p_entity_id)
          OR (p_entity_type = 'company' AND e.module_key = 'jobs' AND e.entity_type = 'company' AND e.entity_id = p_entity_id)
          OR (p_entity_type = 'mentor' AND e.module_key = 'mentor' AND e.entity_type = 'mentor' AND e.entity_id = p_entity_id)
          OR (p_entity_type IN ('event', 'organizer') AND e.module_key = 'events' AND e.entity_type = 'event' AND e.entity_id = p_entity_id)
        )
        AND (
          p_feature IS NULL
          OR e.features @> jsonb_build_object(p_feature, true)
          OR COALESCE(p.features, '{}'::jsonb) @> jsonb_build_object(p_feature, true)
          OR (p_feature IN ('job_applications', 'mentor_bookings', 'event_registrations', 'college_applications')
              AND (e.features @> '{"lead_viewing": true}'::jsonb OR COALESCE(p.features, '{}'::jsonb) @> '{"lead_viewing": true}'::jsonb))
        )
    )
  )
$$;

CREATE OR REPLACE FUNCTION public.admin_manage_module_entitlement(
  p_target_user_id uuid, p_module_key text, p_entity_type text, p_entity_id uuid,
  p_source text, p_start_at timestamptz, p_expires_at timestamptz DEFAULT NULL,
  p_package_id uuid DEFAULT NULL, p_features jsonb DEFAULT '{}'::jsonb, p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  actor uuid := auth.uid();
  entitlement public.module_entitlements%ROWTYPE;
  setting public.platform_module_trial_settings%ROWTYPE;
  package_features jsonb := '{}'::jsonb;
  effective_features jsonb;
  feature_record record;
BEGIN
  IF actor IS NULL OR NOT public.is_account_active(actor) THEN RAISE EXCEPTION 'Active account required' USING ERRCODE = '42501'; END IF;
  IF p_features IS NULL OR jsonb_typeof(p_features) <> 'object' THEN RAISE EXCEPTION 'Features must be an object' USING ERRCODE = '22023'; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_each(p_features) f WHERE f.key !~ '^[a-z][a-z0-9._-]{0,100}$' OR jsonb_typeof(f.value) <> 'boolean') THEN
    RAISE EXCEPTION 'Features must use safe keys and boolean values' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO setting FROM public.platform_module_trial_settings WHERE module_key = p_module_key;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unsupported module' USING ERRCODE = '22023'; END IF;
  IF NOT public.is_platform_admin(actor) AND NOT (
    public.has_active_module_capability(actor, p_module_key)
    AND public.has_active_entity_assignment(actor, p_module_key, p_entity_type, p_entity_id)
    AND public.has_entity_feature_access(actor, p_module_key, p_entity_type, p_entity_id, 'manage_module_enrollments')
  ) THEN RAISE EXCEPTION 'Enrollment authority is required for this module entity' USING ERRCODE = '42501'; END IF;
  IF NOT public.has_active_module_capability(p_target_user_id, p_module_key)
     OR NOT public.has_active_entity_assignment(p_target_user_id, p_module_key, p_entity_type, p_entity_id) THEN
    RAISE EXCEPTION 'Target user needs the matching capability and entity assignment first' USING ERRCODE = '42501';
  END IF;
  IF p_source NOT IN ('ADMIN_MANUAL', 'SUPER_ADMIN_PACKAGE', 'ADMIN_PACKAGE', 'PROMOTIONAL') THEN RAISE EXCEPTION 'Manual enrollment source is invalid' USING ERRCODE = '22023'; END IF;
  IF p_expires_at IS NULL AND (NOT public.is_platform_admin(actor) OR NOT setting.allow_indefinite_manual) THEN RAISE EXCEPTION 'An explicit expiry is required for this enrollment' USING ERRCODE = '22023'; END IF;
  IF p_expires_at IS NOT NULL AND p_expires_at <= COALESCE(p_start_at, now()) THEN RAISE EXCEPTION 'Expiry must be after start time' USING ERRCODE = '22023'; END IF;
  IF p_source IN ('SUPER_ADMIN_PACKAGE', 'ADMIN_PACKAGE') AND p_package_id IS NULL THEN RAISE EXCEPTION 'A package is required for package enrollment' USING ERRCODE = '22023'; END IF;
  IF p_package_id IS NOT NULL THEN
    SELECT COALESCE(p.features, '{}'::jsonb) INTO package_features
    FROM public.packages p WHERE p.id = p_package_id AND p.is_active AND p.deleted_at IS NULL AND p.module_scope @> ARRAY[p_module_key];
    IF NOT FOUND THEN RAISE EXCEPTION 'Package is not active for this module' USING ERRCODE = '22023'; END IF;
  END IF;
  effective_features := package_features || p_features;
  INSERT INTO public.module_entitlements(user_id,module_key,entity_type,entity_id,package_id,source,status,start_at,expires_at,features,granted_by,reason)
  VALUES (p_target_user_id,p_module_key,p_entity_type,p_entity_id,p_package_id,p_source,'active',COALESCE(p_start_at,now()),p_expires_at,effective_features,actor,NULLIF(trim(p_reason),''))
  RETURNING * INTO entitlement;
  -- Materialize enabled feature selections in the grant table so every
  -- existing module gate sees the change immediately.  Package features are
  -- also copied intentionally; provenance remains on the entitlement row.
  FOR feature_record IN SELECT key FROM jsonb_each(effective_features) WHERE value = 'true'::jsonb LOOP
    INSERT INTO public.entity_feature_grants(user_id,module_key,entity_type,entity_id,feature_key,status,granted_by,granted_at,revoked_at,note)
    VALUES (p_target_user_id,p_module_key,p_entity_type,p_entity_id,feature_record.key,'active',actor,now(),NULL,'Granted with entitlement ' || entitlement.id::text)
    ON CONFLICT (user_id,module_key,entity_type,entity_id,feature_key) DO UPDATE SET
      status = 'active', granted_by = EXCLUDED.granted_by, granted_at = EXCLUDED.granted_at,
      revoked_at = NULL, revoked_by = NULL, note = EXCLUDED.note;
  END LOOP;
  INSERT INTO public.audit_logs(actor_user_id,action,entity_type,entity_id,metadata)
  VALUES (actor,'ADMIN_MANUAL_ENROLLMENT_CREATED',p_entity_type,p_entity_id::text,jsonb_build_object(
    'target_user_id',p_target_user_id,'module',p_module_key,'entitlement_id',entitlement.id,'source',p_source,
    'package_id',p_package_id,'expires_at',p_expires_at,'features',effective_features));
  RETURN jsonb_build_object('id',entitlement.id,'status',entitlement.status,'expires_at',entitlement.expires_at,'features',effective_features);
END $$;

-- A safe read model for the caller's own billing page.  RLS keeps the ledger
-- private; this function returns only the caller's non-secret checkout state.
CREATE OR REPLACE FUNCTION public.get_my_module_entitlements()
RETURNS TABLE (
  id uuid, module_key text, entity_type text, entity_id uuid, package_id uuid,
  package_name text, source text, status text, start_at timestamptz,
  expires_at timestamptz, features jsonb, created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT e.id, e.module_key, e.entity_type, e.entity_id, e.package_id, p.name,
    e.source, e.status, e.start_at, e.expires_at, e.features, e.created_at
  FROM public.module_entitlements e
  LEFT JOIN public.packages p ON p.id = e.package_id
  WHERE e.user_id = auth.uid()
  ORDER BY e.created_at DESC
$$;
REVOKE ALL ON FUNCTION public.get_my_module_entitlements() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_module_entitlements() TO authenticated, service_role;

-- College Admin uses an older workspace RPC.  Include the new entitlement
-- ledger here so a grant becomes visible immediately, while retaining legacy
-- subscriptions for existing customers.
CREATE OR REPLACE FUNCTION public.get_my_college_workspaces()
RETURNS TABLE (
  id uuid, name text, short_name text, description text, location text,
  map_location text, website text, contact_email text, contact_phone text,
  youtube_url text, logo_url text, type text, owner_user_id uuid,
  courses_offered jsonb, total_seats integer, available_seats integer,
  admission_status text, chairperson_name text, chairperson_designation text,
  chairperson_message text, principal_name text, principal_designation text,
  principal_message text, subscription_status text, payment_status text,
  package_name text, lead_access_mode text, expiry_date timestamptz,
  subscription_active boolean, effectively_verified boolean,
  can_edit_profile boolean, can_view_leads boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  WITH accessible AS (
    SELECT i.id, bool_or(i.owner_user_id = auth.uid()) AS is_owner
    FROM public.institutes i
    LEFT JOIN public.entity_admin_assignments a
      JOIN public.user_module_capabilities umc ON umc.id = a.user_capability_id
      JOIN public.module_capabilities mc ON mc.id = umc.capability_id
      ON a.entity_id = i.id AND a.entity_type = 'college' AND mc.module_key = 'college'
      AND a.user_id = auth.uid() AND a.status = 'active' AND umc.status = 'active'
    WHERE i.deleted_at IS NULL AND (i.owner_user_id = auth.uid() OR a.id IS NOT NULL)
    GROUP BY i.id
  )
  SELECT i.id, i.name, i.short_name, i.description, i.location, i.map_location,
    i.website, i.contact_email, i.contact_phone, i.youtube_url, i.logo_url, i.type,
    i.owner_user_id, i.courses_offered, i.total_seats, i.available_seats, i.admission_status,
    i.chairperson_name, i.chairperson_designation, i.chairperson_message,
    i.principal_name, i.principal_designation, i.principal_message,
    CASE WHEN e.id IS NOT NULL THEN 'active' ELSE COALESCE(s.status, 'expired') END,
    CASE WHEN e.id IS NOT NULL THEN CASE WHEN e.source = 'ESEWA_PURCHASE' THEN 'success' ELSE 'not_required' END ELSE COALESCE(s.payment_status, 'pending') END,
    COALESCE(ep.name, p.name),
    CASE WHEN e.features @> '{"lead_viewing": true}'::jsonb OR COALESCE(ep.features, '{}'::jsonb) @> '{"lead_viewing": true}'::jsonb THEN 'read_only' ELSE COALESCE(p.lead_access_mode, 'none') END,
    COALESCE(e.expires_at, s.expiry_date),
    (e.id IS NOT NULL OR public.has_entity_entitlement(auth.uid(), 'college', i.id, NULL, 'read_only')),
    public.is_college_effectively_verified(i.id),
    (e.id IS NOT NULL OR public.has_entity_entitlement(auth.uid(), 'college', i.id, NULL, 'read_only'))
      AND (a.is_owner OR public.has_permission(auth.uid(), 'college.manage')),
    ((e.features @> '{"lead_viewing": true}'::jsonb OR COALESCE(ep.features, '{}'::jsonb) @> '{"lead_viewing": true}'::jsonb)
      OR public.has_entity_entitlement(auth.uid(), 'college', i.id, 'college_applications', 'read_only'))
      AND public.has_permission(auth.uid(), 'lead.view')
  FROM accessible a
  JOIN public.institutes i ON i.id = a.id
  LEFT JOIN LATERAL (
    SELECT s.* FROM public.subscriptions s WHERE s.entity_type = 'college' AND s.entity_id = i.id AND s.deleted_at IS NULL
    ORDER BY (s.status IN ('trialing', 'active') AND s.start_date <= now() AND s.expiry_date > now()) DESC, s.expiry_date DESC NULLS LAST LIMIT 1
  ) s ON true
  LEFT JOIN public.packages p ON p.id = s.package_id
  LEFT JOIN LATERAL (
    SELECT e.* FROM public.module_entitlements e WHERE e.user_id = auth.uid() AND e.module_key = 'college'
      AND e.entity_type = 'college' AND e.entity_id = i.id AND e.status = 'active' AND e.start_at <= now()
      AND (e.expires_at IS NULL OR e.expires_at > now()) ORDER BY e.expires_at DESC NULLS LAST, e.created_at DESC LIMIT 1
  ) e ON true
  LEFT JOIN public.packages ep ON ep.id = e.package_id
$$;

CREATE OR REPLACE FUNCTION public.update_my_college_profile(p_institute_id uuid, p_profile jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE actor uuid := auth.uid(); safe_youtube text := NULLIF(btrim(p_profile ->> 'youtube_url'), ''); updated public.institutes%ROWTYPE;
BEGIN
  IF actor IS NULL OR NOT public.is_account_active(actor) THEN RAISE EXCEPTION 'An active account is required' USING ERRCODE = '42501'; END IF;
  IF NOT public.is_platform_admin(actor) AND NOT (
    (public.has_entity_entitlement(actor, 'college', p_institute_id, NULL, 'read_only')
      OR public.has_active_module_entitlement(actor, 'college', 'college', p_institute_id, NULL))
    AND (public.has_permission(actor, 'college.manage') OR EXISTS (SELECT 1 FROM public.institutes WHERE id = p_institute_id AND owner_user_id = actor))
  ) THEN RAISE EXCEPTION 'Your active college assignment and subscription are required to edit this profile' USING ERRCODE = '42501'; END IF;
  IF safe_youtube IS NOT NULL AND safe_youtube !~* '^https?://(www\\.)?(youtube\\.com|m\\.youtube\\.com|youtu\\.be|youtube-nocookie\\.com)/' THEN RAISE EXCEPTION 'Provide a valid YouTube URL' USING ERRCODE = '22023'; END IF;
  IF char_length(btrim(COALESCE(p_profile ->> 'name', ''))) NOT BETWEEN 2 AND 180 THEN RAISE EXCEPTION 'College name must be 2 to 180 characters' USING ERRCODE = '22023'; END IF;
  UPDATE public.institutes SET name = btrim(p_profile ->> 'name'), short_name = NULLIF(btrim(p_profile ->> 'short_name'), ''), type = NULLIF(btrim(p_profile ->> 'type'), ''), location = NULLIF(btrim(p_profile ->> 'location'), ''), map_location = NULLIF(btrim(p_profile ->> 'map_location'), ''), website = NULLIF(btrim(p_profile ->> 'website'), ''), description = NULLIF(btrim(p_profile ->> 'description'), ''), contact_email = NULLIF(btrim(p_profile ->> 'contact_email'), ''), contact_phone = NULLIF(btrim(p_profile ->> 'contact_phone'), ''), youtube_url = safe_youtube, admission_status = COALESCE(NULLIF(btrim(p_profile ->> 'admission_status'), ''), admission_status), chairperson_name = NULLIF(btrim(p_profile ->> 'chairperson_name'), ''), chairperson_designation = NULLIF(btrim(p_profile ->> 'chairperson_designation'), ''), chairperson_message = NULLIF(btrim(p_profile ->> 'chairperson_message'), ''), principal_name = NULLIF(btrim(p_profile ->> 'principal_name'), ''), principal_designation = NULLIF(btrim(p_profile ->> 'principal_designation'), ''), principal_message = NULLIF(btrim(p_profile ->> 'principal_message'), ''), updated_at = now() WHERE id = p_institute_id AND deleted_at IS NULL RETURNING * INTO updated;
  IF updated.id IS NULL THEN RAISE EXCEPTION 'College was not found' USING ERRCODE = 'P0002'; END IF;
  INSERT INTO public.audit_logs(actor_user_id, action, entity_type, entity_id, metadata) VALUES (actor, 'update_college_profile', 'college', p_institute_id::text, jsonb_build_object('fields', p_profile - 'name'));
  RETURN jsonb_build_object('id', updated.id, 'updated_at', updated.updated_at);
END $$;

COMMIT;
