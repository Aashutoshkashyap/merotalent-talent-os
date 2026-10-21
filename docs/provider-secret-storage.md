# Provider-secret storage

MeroTalent stores payment, email, and platform-AI provider credentials only as
AES-256-GCM ciphertext in `provider_configurations`. The browser never receives
the provider secret, ciphertext, IV, authentication tag, or the application
encryption key.

## Required server environment variable

Set the following **server-only** variable in every environment where Provider
Center needs to save or use provider credentials:

```text
PROVIDER_CONFIG_ENCRYPTION_KEY
```

Its value must be base64 for exactly 32 random bytes (the AES-256 key). Generate
it in a secure terminal; do not put its output in source control, issue trackers,
or a `NEXT_PUBLIC_*` variable:

```bash
openssl rand -base64 32
```

For Vercel, add it in **Project Settings → Environment Variables** for the
relevant environment (at least Production), then redeploy. The value is an
application encryption key, **not** an eSewa merchant secret, Resend key, or AI
provider key. Enter those provider credentials only through the authenticated
Super Admin Provider Center after this server setting is ready.

## eSewa reference import (2026-10-21)

The supplied MrValuator `src/lib/esewa.ts` uses `ESEWA_MERCHANT_ID`,
`ESEWA_SECRET_KEY`, and `ESEWA_ENVIRONMENT=sandbox`; its `.env.example` instead
names `ESEWA_MERCHANT_CODE` and `ESEWA_BASE_URL`. MeroTalent's canonical operator
names are `ESEWA_MERCHANT_CODE`, `ESEWA_SECRET_KEY`, and `ESEWA_ENVIRONMENT`.
`sandbox` normalizes to `uat`; production must be explicit. The legacy merchant-ID
alias is accepted only when it does not conflict. Optional `ESEWA_BASE_URL` must
match the selected official gateway; arbitrary endpoints are rejected.

Supply these only through the operator's secret environment, never browser
variables. `scripts/configure-neon-staging-esewa-uat.mjs` imports them into the
existing AES-256-GCM Provider Center record on the pinned staging branch only.
It defaults to a read-only dry run; `--apply-staging` explicitly permits that
isolated bootstrap. No new payment tables or entitlement model are introduced.
With no `ESEWA_*` variables, this staging-only helper retains its documented
published UAT defaults. A partial configured environment never silently falls back.

Production retains the existing enabled/disabled Provider Center control and
server-only `PROVIDER_CONFIG_ENCRYPTION_KEY` in Vercel Production. Real merchant
credentials are stored encrypted through that authorized configuration flow;
the reference archive has no real `.env` to import. Neither an environment import
nor a successful redirect enables production payments: the independent
`NEON_PRODUCTION_PAYMENTS_ENABLED` gate remains off until acceptance passes.

The reference signing/form pattern is adapted in `esewa-v2-form.ts`. Its
signature-only verification is intentionally not copied as settlement authority:
MeroTalent still requires the status API, exact original order/amount/merchant,
and atomic idempotent Neon fulfillment. Browser forms use DOM input values instead
of unescaped HTML interpolation, and only exact official form endpoints are allowed.

## Rotation warning

Changing this value makes credentials encrypted with the old key unreadable.
Before rotating, inventory the configured providers, plan a maintenance window,
and retain the old key only long enough to replace each provider credential with
one encrypted by the new key. Never rotate it casually or by committing a new
value. If the old key has been lost, the affected provider credentials must be
entered again by an authorized Super Admin.

## Provider Center states

- **Encrypted secret stored** means all ciphertext, IV, and authentication-tag
  fields exist for the provider; no plaintext is exposed.
- **Secret storage ready** means this deployment has a valid 32-byte base64
  `PROVIDER_CONFIG_ENCRYPTION_KEY` and can safely encrypt/decrypt server-side.
- If storage is not ready, Provider Center disables secret entry and shows an
  actionable deployment message. It does not claim that a provider is usable.
