-- Repair the college claim/create RPC without editing its applied migration.
-- The old local `module_key` variable conflicted with the column named in
-- INSERT ... ON CONFLICT, so every real claim failed before a request was saved.
BEGIN;

CREATE OR REPLACE FUNCTION public.request_entity_scope(
  p_module_key text,
  p_entity_type text,
  p_entity_id uuid DEFAULT NULL,
  p_request_kind text DEFAULT 'claim',
  p_request_data jsonb DEFAULT '{}'::jsonb,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  actor uuid := auth.uid();
  normalized_module_key text := public.normalize_module_capability_key(p_module_key);
  request_record public.entity_scope_requests%ROWTYPE;
  safe_kind text := lower(btrim(COALESCE(p_request_kind, '')));
  safe_data jsonb := COALESCE(p_request_data, '{}'::jsonb);
BEGIN
  IF actor IS NULL OR NOT public.is_account_active(actor) THEN
    RAISE EXCEPTION 'An active verified account is required' USING ERRCODE = '42501';
  END IF;
  IF normalized_module_key IS NULL OR NOT public.has_active_module_capability(actor, normalized_module_key) THEN
    RAISE EXCEPTION 'An approved module capability is required before requesting an entity scope' USING ERRCODE = '42501';
  END IF;
  IF safe_kind NOT IN ('claim', 'create') OR p_entity_type <> 'college' OR normalized_module_key <> 'college' THEN
    RAISE EXCEPTION 'Only college claim and college creation requests are available in this phase' USING ERRCODE = '22023';
  END IF;
  IF safe_kind = 'claim' AND NOT EXISTS (
    SELECT 1 FROM public.institutes AS institute_record
    WHERE institute_record.id = p_entity_id AND institute_record.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'The college is no longer available to claim' USING ERRCODE = 'P0002';
  END IF;
  IF safe_kind = 'create' AND char_length(btrim(COALESCE(safe_data->>'name', ''))) NOT BETWEEN 2 AND 180 THEN
    RAISE EXCEPTION 'A college name between 2 and 180 characters is required' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.entity_scope_requests(user_id, module_key, entity_type, entity_id, request_kind, request_data, reason)
  VALUES (
    actor, normalized_module_key, 'college',
    CASE WHEN safe_kind = 'claim' THEN p_entity_id ELSE NULL END,
    safe_kind, safe_data, btrim(p_reason)
  )
  ON CONFLICT (user_id, module_key, entity_type, COALESCE(entity_id, '00000000-0000-0000-0000-000000000000'::uuid), request_kind)
    WHERE status = 'pending'
  DO UPDATE SET reason = EXCLUDED.reason, request_data = EXCLUDED.request_data, updated_at = now()
  RETURNING * INTO request_record;

  INSERT INTO public.audit_logs(actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (
    actor, 'request_entity_scope', 'entity_scope_requests', request_record.id::text,
    jsonb_build_object('module_key', normalized_module_key, 'request_kind', safe_kind, 'entity_id', p_entity_id)
  );

  INSERT INTO public.notifications(recipient_id, title, message, type, category, channel, status, entity_type, entity_id, action_url, metadata)
  SELECT DISTINCT profile_record.user_id, 'College scope request', 'A college claim or addition request requires review.',
    'info', 'entity_scope_request', 'dashboard', 'queued', 'entity_scope_request', request_record.id,
    '/admin/access-requests', jsonb_build_object('requester_id', actor)
  FROM public.profiles AS profile_record
  JOIN public.user_roles AS role_record ON role_record.user_id = profile_record.user_id
  WHERE profile_record.account_status = 'active'
    AND profile_record.deleted_at IS NULL
    AND role_record.role IN ('admin', 'super_admin');

  RETURN jsonb_build_object('id', request_record.id, 'status', request_record.status, 'request_kind', request_record.request_kind);
END;
$$;

REVOKE ALL ON FUNCTION public.request_entity_scope(text, text, uuid, text, jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_entity_scope(text, text, uuid, text, jsonb, text) TO authenticated, service_role;

COMMIT;
