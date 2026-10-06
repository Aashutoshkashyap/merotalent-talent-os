BEGIN;

-- 1. Fix the inverted NOT EXISTS guard in request_sub_admin_access
CREATE OR REPLACE FUNCTION public.request_sub_admin_access(
  p_requested_modules text[],
  p_reason text,
  p_organization text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  actor uuid := auth.uid();
  safe_modules text[];
  request_record public.sub_admin_requests%ROWTYPE;
  trusted_name text;
  trusted_email text;
BEGIN
  IF actor IS NULL OR NOT public.is_account_active(actor) THEN
    RAISE EXCEPTION 'An active verified account is required' USING ERRCODE = '42501';
  END IF;

  SELECT array_agg(DISTINCT public.normalize_module_capability_key(value) ORDER BY public.normalize_module_capability_key(value))
  INTO safe_modules
  FROM unnest(COALESCE(p_requested_modules, '{}'::text[])) AS requested(value)
  WHERE public.normalize_module_capability_key(value) IS NOT NULL;

  -- Correct guard: raises exception only if NO valid modules requested OR if ANY requested module is invalid/inactive/unrequestable
  IF safe_modules IS NULL OR cardinality(safe_modules) = 0 OR EXISTS (
    SELECT 1 FROM unnest(safe_modules) AS value(v)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.module_capabilities mc
      WHERE mc.module_key = v AND mc.is_active AND mc.is_requestable
    )
  ) THEN
    RAISE EXCEPTION 'One or more requested modules are unavailable' USING ERRCODE = '22023';
  END IF;

  IF char_length(btrim(COALESCE(p_reason, ''))) NOT BETWEEN 10 AND 2000 THEN
    RAISE EXCEPTION 'A reason between 10 and 2000 characters is required' USING ERRCODE = '22023';
  END IF;

  SELECT NULLIF(btrim(p.full_name), ''), lower(au.email)
  INTO trusted_name, trusted_email
  FROM public.profiles p
  JOIN auth.users au ON au.id = p.user_id
  WHERE p.user_id = actor;

  IF trusted_email IS NULL THEN
    RAISE EXCEPTION 'A platform profile is required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO request_record
  FROM public.sub_admin_requests
  WHERE user_id = actor AND status = 'pending'
  ORDER BY created_at DESC
  LIMIT 1;

  IF request_record.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'id', request_record.id,
      'status', 'pending',
      'existing_request', true
    );
  END IF;

  INSERT INTO public.sub_admin_requests(
    user_id,
    user_name,
    user_email,
    requested_modules,
    reason,
    organization,
    status,
    updated_at
  )
  VALUES (
    actor,
    COALESCE(trusted_name, trusted_email),
    trusted_email,
    safe_modules,
    btrim(p_reason),
    NULLIF(btrim(COALESCE(p_organization, '')), ''),
    'pending',
    now()
  )
  RETURNING * INTO request_record;

  INSERT INTO public.audit_logs(actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (
    actor,
    'request_module_access',
    'sub_admin_requests',
    request_record.id::text,
    jsonb_build_object('requested_modules', safe_modules)
  );

  PERFORM public.notify_platform_admins_of_module_access_request(request_record.id, 'request_access');

  RETURN jsonb_build_object(
    'id', request_record.id,
    'status', request_record.status,
    'requested_modules', safe_modules
  );
END;
$$;

REVOKE ALL ON FUNCTION public.request_sub_admin_access(text[], text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_sub_admin_access(text[], text, text) TO authenticated, service_role;

-- 2. Improve handle_new_user trigger function to properly handle Google OAuth metadata (name, picture)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  requested_role text := NEW.raw_user_meta_data ->> 'account_type';
  requested_modules text[];
  request_record public.sub_admin_requests%ROWTYPE;
  resolved_full_name text := COALESCE(
    NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'name', ''),
    split_part(COALESCE(NEW.email, ''), '@', 1)
  );
  resolved_avatar_url text := COALESCE(
    NEW.raw_user_meta_data ->> 'avatar_url',
    NEW.raw_user_meta_data ->> 'picture',
    NULL
  );
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, avatar_url)
  VALUES (NEW.id, NEW.email, resolved_full_name, resolved_avatar_url)
  ON CONFLICT (user_id) DO UPDATE
  SET
    email = COALESCE(EXCLUDED.email, public.profiles.email),
    full_name = CASE
      WHEN public.profiles.full_name IS NULL OR public.profiles.full_name = '' THEN EXCLUDED.full_name
      ELSE public.profiles.full_name
    END,
    avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'talent'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  requested_modules := CASE requested_role
    WHEN 'institution' THEN ARRAY['institutions']::text[]
    WHEN 'company' THEN ARRAY['companies']::text[]
    WHEN 'mentor' THEN ARRAY['mentors']::text[]
    ELSE NULL
  END;

  IF requested_modules IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.sub_admin_requests r
      WHERE r.user_id = NEW.id AND r.status = 'pending'
    )
  THEN
    INSERT INTO public.sub_admin_requests(
      user_id, user_name, user_email, requested_modules, reason, status, updated_at
    ) VALUES (
      NEW.id,
      COALESCE(NULLIF(resolved_full_name, ''), NEW.email),
      lower(NEW.email),
      requested_modules,
      'Initial workspace access requested during account registration.',
      'pending',
      now()
    )
    RETURNING * INTO request_record;

    PERFORM public.notify_platform_admins_of_module_access_request(request_record.id, 'signup');
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Backfill profiles and default user_roles for any existing Auth users lacking a profile
INSERT INTO public.profiles (user_id, email, full_name, avatar_url)
SELECT
  u.id,
  u.email,
  COALESCE(
    NULLIF(u.raw_user_meta_data ->> 'full_name', ''),
    NULLIF(u.raw_user_meta_data ->> 'name', ''),
    split_part(COALESCE(u.email, ''), '@', 1)
  ),
  COALESCE(
    u.raw_user_meta_data ->> 'avatar_url',
    u.raw_user_meta_data ->> 'picture'
  )
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.user_id = u.id
)
ON CONFLICT (user_id) DO UPDATE
SET
  email = COALESCE(EXCLUDED.email, public.profiles.email),
  full_name = CASE
    WHEN public.profiles.full_name IS NULL OR public.profiles.full_name = '' THEN EXCLUDED.full_name
    ELSE public.profiles.full_name
  END,
  avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url);

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'talent'::public.app_role
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur WHERE ur.user_id = u.id
)
ON CONFLICT (user_id, role) DO NOTHING;

COMMIT;
