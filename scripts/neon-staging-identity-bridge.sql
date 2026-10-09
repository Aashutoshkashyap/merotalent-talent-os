-- Apply only to the verified isolated migration-staging branch.
-- Application accounts preserve the legacy UUID used by existing authorization
-- tables while keeping the Managed Auth subject in a separate unique ledger.
CREATE TABLE IF NOT EXISTS public.neon_application_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(user_id),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.neon_identity_links (
  neon_auth_user_id uuid PRIMARY KEY REFERENCES neon_auth."user"(id),
  application_account_id uuid NOT NULL UNIQUE REFERENCES public.neon_application_accounts(id),
  status text NOT NULL CHECK (status IN ('verified', 'disabled')),
  verification_method text NOT NULL,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT verified_link_has_timestamp CHECK (status <> 'verified' OR verified_at IS NOT NULL)
);

REVOKE ALL ON public.neon_application_accounts FROM PUBLIC;
REVOKE ALL ON public.neon_identity_links FROM PUBLIC;
