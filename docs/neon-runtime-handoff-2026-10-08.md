# Neon runtime migration handoff (staging only)

This is an implementation inventory, not a cutover approval. The separately
verified application-data and object migrations must not be rerun. Legacy
production remains on Supabase. No production configuration was changed here.

## Runtime dependency inventory

`rg` over `app/` and `src/` (excluding tests) initially found 110 files importing a
Supabase client or the server auth/Supabase facade, 33 files calling `.rpc(`,
five live files using `.storage.`, and two Realtime channel consumers. These
counts include the current dirty worktree and should be refreshed after merges.

| Area | Current runtime entry points | Replacement requirement |
| --- | --- | --- |
| Browser client/auth | `src/integrations/supabase/client.ts`, `src/contexts/AuthContext.tsx`, `src/screens/Login.tsx`, `Signup.tsx`, `ResetPassword.tsx`, `src/screens/auth/OAuthCallback.tsx`, `src/lib/auth/sign-out.ts` | Neon Managed Auth client, branch-scoped sessions, verified identity mapping; legacy client selected by an explicit staging-only switch. |
| Server auth/admin | `src/lib/server/supabase.ts`, `src/lib/server/auth.ts`, `src/lib/admin/admin-auth-user-service.ts`, `app/api/v1/admin/auth-users/**`, `app/api/v1/admin/permissions/route.ts` | Verify Managed Auth session server-side, map to legacy UUID, enforce roles/capabilities/entity scopes in SQL and service layer. No service-role equivalent in browsers. |
| Browser data | `src/screens/admin/**`, `src/screens/dashboard/**`, `src/screens/institute/**`, `src/screens/role/**`, public institute/job/mentor/course screens, `src/hooks/useSiteCMS.ts`, `useStudentActivity.ts` | Typed staging API/repository methods; preserve public visibility and private RLS semantics. Do not point existing Supabase JS queries at Neon credentials. |
| Server data | `app/api/v1/**`, `app/api/cron/maintenance/route.ts`, `app/[[...slug]]/page.tsx`, `src/lib/server/{jobs-service,events-service,mentorship-service,esewa-settlement,provider-config-service,email-queue}.ts` | Parameterized Neon SQL, explicit authorization, transaction boundaries, and parity tests for each route. |
| RPC/business rules | 33 caller files; especially `auth.ts`, `AuthContext.tsx`, access requests/roles/subscriptions/payments, institute workspaces, media authorization, mentor booking | Port each RPC as a reviewed service/SQL operation. In particular preserve capability + entity assignment + active entitlement checks, not just UI guards. |
| Storage | `src/components/media/SignedMediaUploader.tsx`, `src/components/messaging/MentorMessaging.tsx`, `src/lib/institutes/public-institutes.ts`, `src/screens/dashboard/Profile.tsx`, `app/api/v1/media/download-url/route.ts` | Route through server-authorized Neon S3 presigning/public URL abstraction, retaining MIME/size/path rules. |
| Realtime | `src/hooks/useNotifications.ts`, `src/components/messaging/MentorMessaging.tsx` | Durable multi-instance event delivery, authenticated user/topic membership, reconnect and missed-event recovery. |
| Generated types | `src/integrations/supabase/types.ts` and all `Tables`/`Database` imports | Replace with types generated from the verified Neon schema; validate nullable/default semantics. |
| Configuration | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` | Keep in legacy; use distinct staging-only Neon DB, Managed Auth, and S3 values, never exposed to browser except a public branch Auth URL where required. |

Relevant source searches: `rg -l 'supabase|createClient|auth.getUser|auth.getSession|onAuthStateChange|\\.rpc\\(|\\.storage\\.|\\.channel\\(|\\.subscribe\\(' app src`; also search `signIn`, `signUp`, `signOut`, `resetPassword`, `exchangeCodeForSession`, `generateLink`, `getPublicUrl`, `createSignedUrl`, `upload`, and `download`. No Next middleware or server-action files were found in the inspected checkout; route handlers are the server entry points.

## Auth migration design

Target **Neon Managed Auth**, not a separately hosted Better Auth server. The
old Stack Auth migration article is not evidence for current Managed Auth.
The staging branch requires its own Auth endpoint and non-production OAuth,
trusted origins, and email configuration. The 102 legacy users and 103
identities remain *unmigrated*.

1. Create a deterministic `legacy_supabase_uuid -> neon_auth_user_id` mapping
   with unique constraints and an explicit provenance/status. Never match or
   grant a privileged identity solely from an email string.
2. For Google, authenticate through the configured staging Google provider and
   link only after a verified provider subject plus an approved legacy-identity
   reconciliation. Preserve the single dual-identity relationship explicitly.
3. For email/password, determine a documented, supported current Managed Auth
   hash-import path. If unavailable, require a verified password-set/reset
   flow; do not activate an account merely because an email matches.
4. Supabase sessions are not assumed portable; require re-authentication.
5. Resolve roles, capabilities, entity assignments, subscription entitlement,
   and super-admin status from application tables using the mapped legacy UUID.
   Test suspended/deactivated users and cross-entity denial.
6. Reconcile all 102 users/103 identities in staging, including admins, before
   any later production cutover proposal. No production user import is authorized.

Neon says current Managed Auth is a branch-scoped managed Better Auth service
with a `neon_auth` schema and branch Auth URL. This does **not** prove an
official bulk import for Supabase identities, hashes, provider links, or
sessions; those require explicit API validation before implementation.

## Current implementation and blockers

- The default server auth path remains Supabase. `MEROTALENT_BACKEND_MODE` is a
  staging guard, **not yet a complete runtime switch**.
- `src/lib/server/db.ts` now provides a guarded, pooled Neon staging connection,
  parameterized queries, and transactions. `neon-authorization.ts` and
  `neon-repositories.ts` implement narrow, checked profile/institute/job/
  application/notification operations. The public institute HTTP route switches
  actual database backend in staging; private routes remain gated pending Auth.
- `src/lib/server/application-storage.ts` provides the staging S3 boundary for
  public signed reads, private owner-authorized reads, and validated uploads.
  Existing live media routes still use Supabase. Anonymous GET of a migrated
  object returned 403, so direct S3 URLs must not be treated as public access.
- `src/lib/neon/neon-db.ts`, `neon-auth.ts`, and `neon-storage.ts` now fail
  closed instead of fabricating rows, identity links, or signed URLs.
- `/api/auth/[...all]` does not mount the self-hosted Better Auth prototype.
  `/api/v1/realtime/stream` is closed until topic authorization and a durable
  bus exist. Legacy Supabase Realtime remains unchanged.
- Staging mode requires `NEON_STAGING_DATABASE_URL`, `NEON_AUTH_BASE_URL`,
  `NEON_STAGING_BRANCH_ID`, `AWS_ENDPOINT_URL_S3`, `AWS_ACCESS_KEY_ID`,
  `AWS_SECRET_ACCESS_KEY`, and `AWS_REGION` where applicable. These must be
  scoped to an isolated staging deployment; do not set them in production.
- Representative read-only staging SQL returned 295 institutes, 102 profiles,
  and five job applications. That verifies connectivity/data presence, **not**
  runtime authorization or feature parity.

## Cutover prerequisites

Complete a supported Managed Auth identity plan and safe staging proof;
implement each data/RPC authorization path and storage route; replace realtime
with a durable, authorized transport; validate all requested signup/login,
CRUD, upload, notifications, messages, admin, payment, and module journeys on
staging; reconcile identities and data changes since the verified snapshot;
prepare rollback, monitoring, and an explicit production change window. Only
then seek separate approval for any production OAuth/env/DNS cutover.

Detailed operation/RPC disposition and limitations are in
`docs/neon-runtime-parity-2026-10-08.md`.

Status: DATABASE VERIFIED; STORAGE VERIFIED; RUNTIME DATABASE PARTIALLY
MIGRATED; AUTH NOT YET MIGRATED; STORAGE RUNTIME IN PROGRESS; REALTIME NOT YET
MIGRATED; PRODUCTION CUTOVER NO-GO.

Checkpoint gates: DATABASE ROW PARITY: VERIFIED; DATABASE SCHEMA FUNCTIONAL
PARITY: PARTIAL; STORAGE OBJECT PARITY: VERIFIED; STORAGE BUCKET PARITY:
PARTIAL; RUNTIME: PARTIALLY MIGRATED; AUTH: BLOCKED; REALTIME: NOT MIGRATED;
PRODUCTION CUTOVER: NO-GO.
