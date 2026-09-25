BEGIN;

-- Provider secrets are encrypted by trusted server code before this function is
-- invoked. This function only persists opaque ciphertext and creates the audit
-- record in the same transaction, preventing a partial administrative save.
CREATE OR REPLACE FUNCTION public.admin_save_provider_configuration(
  p_actor_user_id uuid,
  p_provider_kind text,
  p_provider_name text,
  p_is_enabled boolean,
  p_public_config jsonb,
  p_secret_ciphertext text DEFAULT NULL,
  p_secret_iv text DEFAULT NULL,
  p_secret_tag text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  existing_has_secret boolean := false;
  saved public.provider_configurations%ROWTYPE;
BEGIN
  IF p_actor_user_id IS NULL
     OR NOT public.is_account_active(p_actor_user_id)
     OR NOT public.is_platform_admin(p_actor_user_id) THEN
    RAISE EXCEPTION 'Only Super Admin can configure providers' USING ERRCODE = '42501';
  END IF;

  IF p_provider_kind NOT IN ('payment', 'ai', 'email')
     OR p_provider_name !~ '^[A-Za-z][A-Za-z0-9-]{1,63}$' THEN
    RAISE EXCEPTION 'Provider configuration is invalid' USING ERRCODE = '22023';
  END IF;
  IF p_public_config IS NULL OR jsonb_typeof(p_public_config) <> 'object' THEN
    RAISE EXCEPTION 'Provider public configuration must be an object' USING ERRCODE = '22023';
  END IF;
  IF (p_secret_ciphertext IS NULL AND (p_secret_iv IS NOT NULL OR p_secret_tag IS NOT NULL))
     OR (p_secret_ciphertext IS NOT NULL AND (p_secret_iv IS NULL OR p_secret_tag IS NULL)) THEN
    RAISE EXCEPTION 'Encrypted provider credential is incomplete' USING ERRCODE = '22023';
  END IF;

  SELECT secret_ciphertext IS NOT NULL AND secret_iv IS NOT NULL AND secret_tag IS NOT NULL
  INTO existing_has_secret
  FROM public.provider_configurations
  WHERE provider_kind = p_provider_kind;
  existing_has_secret := COALESCE(existing_has_secret, false);

  IF p_is_enabled AND p_secret_ciphertext IS NULL AND NOT existing_has_secret THEN
    RAISE EXCEPTION 'A provider secret is required before this provider can be enabled' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.provider_configurations (
    provider_kind, provider_name, is_enabled, public_config,
    secret_ciphertext, secret_iv, secret_tag, configured_by, configured_at, updated_at
  ) VALUES (
    p_provider_kind, p_provider_name, p_is_enabled, p_public_config,
    p_secret_ciphertext, p_secret_iv, p_secret_tag, p_actor_user_id,
    CASE WHEN p_secret_ciphertext IS NOT NULL THEN now() ELSE NULL END, now()
  )
  ON CONFLICT (provider_kind) DO UPDATE SET
    provider_name = EXCLUDED.provider_name,
    is_enabled = EXCLUDED.is_enabled,
    public_config = EXCLUDED.public_config,
    configured_by = EXCLUDED.configured_by,
    configured_at = CASE
      WHEN EXCLUDED.secret_ciphertext IS NOT NULL THEN EXCLUDED.configured_at
      ELSE public.provider_configurations.configured_at
    END,
    updated_at = EXCLUDED.updated_at,
    secret_ciphertext = COALESCE(EXCLUDED.secret_ciphertext, public.provider_configurations.secret_ciphertext),
    secret_iv = COALESCE(EXCLUDED.secret_iv, public.provider_configurations.secret_iv),
    secret_tag = COALESCE(EXCLUDED.secret_tag, public.provider_configurations.secret_tag)
  RETURNING * INTO saved;

  BEGIN
    INSERT INTO public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
    VALUES (
      p_actor_user_id,
      'configure_provider',
      'provider',
      p_provider_kind,
      jsonb_build_object(
        'provider_name', p_provider_name,
        'enabled', p_is_enabled,
        'secret_replaced', p_secret_ciphertext IS NOT NULL
      )
    );
  EXCEPTION WHEN OTHERS THEN
    -- Re-raise from the enclosing transaction so the provider upsert rolls back.
    RAISE EXCEPTION 'Provider configuration audit could not be persisted' USING ERRCODE = 'P0001';
  END;

  RETURN jsonb_build_object(
    'provider_kind', saved.provider_kind,
    'provider_name', saved.provider_name,
    'is_enabled', saved.is_enabled,
    'configured_at', saved.configured_at,
    'updated_at', saved.updated_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_save_provider_configuration(uuid, text, text, boolean, jsonb, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_save_provider_configuration(uuid, text, text, boolean, jsonb, text, text, text) TO service_role;

COMMIT;
