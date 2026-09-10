BEGIN;

-- These tables are server-owned.  Secret material is encrypted by the app
-- before it arrives here and is never readable through PostgREST.
CREATE TABLE IF NOT EXISTS public.provider_configurations (
  provider_kind text PRIMARY KEY CHECK (provider_kind IN ('payment', 'ai', 'email')),
  provider_name text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT false,
  public_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  secret_ciphertext text,
  secret_iv text,
  secret_tag text,
  configured_by uuid REFERENCES public.profiles(user_id),
  configured_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (secret_ciphertext IS NULL AND secret_iv IS NULL AND secret_tag IS NULL)
    OR (secret_ciphertext IS NOT NULL AND secret_iv IS NOT NULL AND secret_tag IS NOT NULL)
  )
);

ALTER TABLE public.provider_configurations ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.module_ai_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(user_id),
  module_key text NOT NULL CHECK (module_key IN ('college', 'jobs', 'mentor', 'events')),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  provider_name text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  secret_ciphertext text NOT NULL,
  secret_iv text NOT NULL,
  secret_tag text NOT NULL,
  configured_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  disabled_at timestamptz,
  UNIQUE (user_id, module_key, entity_type, entity_id)
);

ALTER TABLE public.module_ai_credentials ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.entity_feature_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(user_id),
  module_key text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  feature_key text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  granted_by uuid REFERENCES public.profiles(user_id),
  revoked_by uuid REFERENCES public.profiles(user_id),
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  note text,
  UNIQUE (user_id, module_key, entity_type, entity_id, feature_key)
);

ALTER TABLE public.entity_feature_grants ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS entity_feature_grants_access_idx
  ON public.entity_feature_grants(user_id, module_key, entity_type, entity_id, feature_key)
  WHERE status = 'active';

CREATE TABLE IF NOT EXISTS public.payment_checkout_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(user_id),
  package_id uuid NOT NULL REFERENCES public.packages(id),
  entity_type text NOT NULL,
  entity_id uuid,
  provider_name text NOT NULL,
  provider_reference text NOT NULL UNIQUE,
  amount numeric NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'NPR',
  status text NOT NULL DEFAULT 'initiated' CHECK (status IN ('initiated', 'pending', 'successful', 'failed', 'cancelled', 'expired')),
  expires_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_checkout_sessions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.payment_webhook_events (
  provider_name text NOT NULL,
  event_id text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  outcome text NOT NULL DEFAULT 'received',
  PRIMARY KEY (provider_name, event_id)
);

ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_entity_feature_access(
  p_user_id uuid,
  p_module_key text,
  p_entity_type text,
  p_entity_id uuid,
  p_feature_key text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.is_account_active(p_user_id) AND (
    public.is_platform_admin(p_user_id)
    OR EXISTS (
      SELECT 1 FROM public.entity_feature_grants g
      WHERE g.user_id = p_user_id
        AND g.module_key = p_module_key
        AND g.entity_type = p_entity_type
        AND g.entity_id = p_entity_id
        AND g.feature_key = p_feature_key
        AND g.status = 'active'
    )
    OR public.has_active_entity_subscription(
      p_entity_type, p_entity_id, p_feature_key, 'read_only'
    )
  )
$$;

REVOKE ALL ON FUNCTION public.has_entity_feature_access(uuid, text, text, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_entity_feature_access(uuid, text, text, uuid, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_set_entity_feature_grant(
  p_user_id uuid,
  p_module_key text,
  p_entity_type text,
  p_entity_id uuid,
  p_feature_key text,
  p_active boolean,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE feature_record public.entity_feature_grants%ROWTYPE;
BEGIN
  IF NOT public.is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only Super Admin can manage feature grants' USING ERRCODE = '42501';
  END IF;
  IF NOT public.has_active_module_capability(p_user_id, p_module_key) THEN
    RAISE EXCEPTION 'The user does not have the requested module capability' USING ERRCODE = '42501';
  END IF;
  IF NOT public.has_active_entity_assignment(p_user_id, p_module_key, p_entity_type, p_entity_id) THEN
    RAISE EXCEPTION 'The user is not assigned to this entity' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.entity_feature_grants(
    user_id, module_key, entity_type, entity_id, feature_key, status,
    granted_by, revoked_by, granted_at, revoked_at, note
  ) VALUES (
    p_user_id, p_module_key, p_entity_type, p_entity_id, p_feature_key,
    CASE WHEN p_active THEN 'active' ELSE 'revoked' END,
    CASE WHEN p_active THEN auth.uid() ELSE NULL END,
    CASE WHEN p_active THEN NULL ELSE auth.uid() END,
    now(), CASE WHEN p_active THEN NULL ELSE now() END, NULLIF(trim(p_note), '')
  ) ON CONFLICT (user_id, module_key, entity_type, entity_id, feature_key)
  DO UPDATE SET
    status = EXCLUDED.status,
    granted_by = CASE WHEN p_active THEN auth.uid() ELSE entity_feature_grants.granted_by END,
    revoked_by = CASE WHEN p_active THEN NULL ELSE auth.uid() END,
    granted_at = CASE WHEN p_active THEN now() ELSE entity_feature_grants.granted_at END,
    revoked_at = CASE WHEN p_active THEN NULL ELSE now() END,
    note = EXCLUDED.note
  RETURNING * INTO feature_record;

  INSERT INTO public.audit_logs(actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (
    auth.uid(),
    CASE WHEN p_active THEN 'grant_entity_feature' ELSE 'revoke_entity_feature' END,
    p_entity_type,
    p_entity_id::text,
    jsonb_build_object('user_id', p_user_id, 'module', p_module_key, 'feature', p_feature_key)
  );

  RETURN jsonb_build_object('id', feature_record.id, 'status', feature_record.status);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_entity_feature_grant(uuid, text, text, uuid, text, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_entity_feature_grant(uuid, text, text, uuid, text, boolean, text) TO authenticated;

COMMIT;
