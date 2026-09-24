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
