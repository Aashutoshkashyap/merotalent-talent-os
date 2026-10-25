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

### Checkout release gate versus provider configuration

Provider Center's **Configured — active** describes the encrypted provider, not
permission for every customer to start live checkout. A nonempty
`NEON_PRODUCTION_PAYMENT_VALIDATION_USER_ID` restricts all paid initiation to that
exact verified application account, even when `NEON_PRODUCTION_PAYMENTS_ENABLED`
is true. Invalid validation IDs fail closed. Public activation requires an
explicit operator decision, the public flag set to `true`, and the owner-only
validation restriction cleared, followed by deployment. Do not clear the
restriction as a side effect of saving a merchant credential.

The authenticated, non-cached `/api/v1/payments/availability` endpoint reports the
effective checkout mode and readiness for the current user without returning
merchant settings, credentials or the designated validation identity. Mentors,
event tickets, module enrollment, College requests and renewals use this same
preflight. Checkout still repeats authorization, pricing and payment-gate checks;
an available response is neither a payment nor an entitlement. Provider Center
shows checkout access separately from provider readiness.

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

The authenticated Neon provider-status response also includes
`secretStorageStatus`: `missing`, `invalid`, or `ready`. Readiness requires the
canonical 32-byte key and an in-memory AES-GCM encryption/decryption self-test;
the probe, key and ciphertext are never returned or persisted. A ready storage
key does not imply that historical provider credentials decrypt under that key.

## MeroTalent eSewa return configuration

The canonical production return URL is:

```text
https://www.merotalent.com/api/v1/neon-staging/payments/esewa/return
```

The deployed checkout sends this as `success_url`. Its `failure_url` uses the
same route with the server-generated `reference` and `state=failed` query
parameters. Keep HTTPS and the canonical `www.merotalent.com` hostname. Despite
the historical path name, this route uses the explicitly selected Neon runtime.

If the merchant account has website/return-URL allowlisting, its owner must
register the canonical website origin and the above return route, including
support for the generated failure query string, with eSewa merchant operations.
The application cannot prove or change merchant-side allowlisting without
authorized merchant-portal access. ePay sends return URLs in its checkout form;
do not describe a separate webhook as registered or mandatory without evidence
from that merchant account. Portal registration remains unverified until the
actual portal settings or eSewa's confirmation are inspected.
