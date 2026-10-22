# Backend and environment ownership

One selected application runtime, never implicit fallback. `backend-mode.ts` is
the server authority; public mode must agree. Platform operator owns Vercel
configuration. Domain administrators cannot choose database/auth/storage hosts.

| Configuration / service | Owner and scope | Failure behavior |
| --- | --- | --- |
| `MEROTALENT_BACKEND_MODE`, `NEXT_PUBLIC_MEROTALENT_BACKEND_MODE` | Vercel platform operator; explicit Neon production | Disagreement rejects configuration |
| `NEON_PRODUCTION_DATABASE_URL`, `NEON_PRODUCTION_BRANCH_ID` | DB operator; server-only approved production tuple | Reject wrong host/branch; never use staging or legacy fallback |
| `NEON_STAGING_DATABASE_URL`, `NEON_STAGING_BRANCH_ID` | Migration operator; isolated staging only | Guards reject production tuple |
| `NEON_AUTH_BASE_URL` | Auth operator; exact selected branch | Provider session must validate before identity mapping |
| `AWS_ENDPOINT_URL_S3`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION` | Storage operator; exact selected branch | Fail closed; private URLs require authorization |
| `PROVIDER_CONFIG_ENCRYPTION_KEY` | Platform operator; server-only 32-byte base64 AES key | Missing/invalid storage blocks credentials; rotation cannot recover old ciphertext |
| `NEON_PRODUCTION_PAYMENTS_ENABLED` | Release/payment owner; separate production gate | Keep disabled until legitimate configuration and acceptance |
| `ESEWA_MERCHANT_CODE`, `ESEWA_SECRET_KEY`, `ESEWA_ENVIRONMENT` | Payment operator; staging bootstrap only as documented | Reject partial/mixed environments; production secrets through authenticated Provider Center |
| Resend key and sender | Email/domain owner; existing secure provider/env configuration | Preserve business state; report unavailable/failure truthfully |
| `SUPABASE_SOURCE_READONLY_DATABASE_URL`, `SUPABASE_SOURCE_EXPECTED_POOLER_HOST`, `SUPABASE_SOURCE_READONLY_ROLE` | Source owner via approved secret channel | No source export when dedicated-role/host/privilege gate fails |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Historical source/recovery configuration | No ordinary Neon runtime requirement; explicit proof-only recovery remains separate |
| Legacy `SUPABASE_SECRET_KEY` / service role | Source operator, historical export/storage tooling | Not a substitute for the read-only SQL gate; never browser-side |
| Auth Google provider / SMTP | Neon control-plane operator | Do not fabricate provider identity, verified email or delivery |
| Vercel/Neon CLI credentials, snapshot encryption key | Operator keychain/private CLI store | Never emit to logs, commit or return to browser |

Routes with `/neon-staging/` in their historical name are mode-aware where
explicitly implemented; the path alone does not establish the environment.
Source reconciliation scripts and SDK-based recovery are operator/proof paths,
not authorization to keep a second application backend active.
