# Supabase to Neon migration: pre-cutover audit

Status: **blocked before data import; production remains on Supabase**. This is a
point-in-time inventory from 2026-10-08 (Asia/Kathmandu), not a completed
migration or an approval to cut over.

## Environments

- Source: Supabase project `dtirpilgzlsfryucanlg`, PostgreSQL 17.6. It remains
  live and unchanged by this migration audit.
- Target: Neon project `summer-sky-63693897`, PostgreSQL 18. Its production
  branch was empty at inspection time.
- Isolated target staging branch: `migration-staging`
  (`br-frosty-haze-azsnybmr`). It was created for migration experiments and
  has no imported MeroTalent data. Do not point production Vercel to it.

## Source inventory

| Area | Observed source state |
| --- | --- |
| Users | 102 `auth.users`, 103 `auth.identities`, 102 `public.profiles` |
| Identity providers | 90 Google identities, 13 email identities; 15 users with password hashes; 96 verified email addresses |
| Schema | 80 public tables, 27 auth tables, 8 storage tables |
| Logic | 153 public functions, 87 public triggers, 390 public RLS policies |
| Other database objects | 177 public indexes, 367 public constraints, 2 public views, 2 public sequences |
| Auth dependencies | 70 public functions directly use `auth.uid()`; 80 reference `auth.` or `storage.` |
| Storage | 13 buckets, 22 objects, 8,552,263 bytes |
| Representative records | 295 institutes, 11 college applications, 3 jobs, 5 job applications, 1 mentor, 5 mentor bookings, 2 events, 2 event registrations, 1 payment, 3 subscriptions, 30 notifications, 1,276 audit logs |

These are *live counts*, not a frozen backup. A fresh source snapshot and
row-by-row validation are required immediately before a trial import/cutover.

### Storage buckets

| Bucket | Access | Objects | Bytes |
| --- | --- | ---: | ---: |
| `ad-media` | public | 0 | 0 |
| `application-files` | private | 0 | 0 |
| `chat-attachments` | private | 0 | 0 |
| `college-media` | public | 7 | 347,676 |
| `course-media` | public | 0 | 0 |
| `event-attachments` | private | 0 | 0 |
| `event-media` | public | 0 | 0 |
| `job-files` | private | 9 | 7,152,643 |
| `mentor-media` | public | 0 | 0 |
| `Merotalent` | private | 0 | 0 |
| `payment-proofs` | private | 0 | 0 |
| `profile-media` | public | 0 | 0 |
| `resumes` | private | 6 | 1,051,944 |

Do not treat storage metadata as the files themselves. File migration requires
an object manifest with bucket, key, size, MIME type, checksum, access mode,
source/target references, and a readable-file/private-access check.

## Application dependency map

| Dependency | Representative implementation | Migration requirement |
| --- | --- | --- |
| Browser client | `src/integrations/supabase/client.ts` | Replace Supabase browser queries and auth APIs across screens/hooks. |
| Session and role context | `src/contexts/AuthContext.tsx` | Replace signup, password login, Google login, logout, access-context RPCs and state subscriptions. |
| Server client and auth | `src/lib/server/supabase.ts`, `src/lib/server/auth.ts` | Verify Neon Auth identity server-side; preserve account state, capability, entity-scope enforcement. |
| API and domain services | `app/api/v1`, `src/lib/server` | Replace table/RPC access with Neon-compatible server transactions or Data API without dropping validation. |
| Private media | `app/api/v1/media/upload-url/route.ts`, `download-url/route.ts` | Preserve per-entity authorization, signed access, safe types/sizes, and private bucket rules. |
| Realtime | `src/hooks/useNotifications.ts`, `src/components/messaging/MentorMessaging.tsx` | Replace channels with scoped polling/events; retain notification/message access checks. |
| Scheduled work | `app/api/cron/maintenance/route.ts` | Replace `run_platform_maintenance` and `prune_guest_college_verifications` RPC calls. |
| Database history | `supabase/migrations/` (94 SQL files at audit) | Port current effective schema and functions forward; do not replay Supabase-specific history directly against Neon. |
| CI and deployment | `.github/workflows/ci.yml`, `.env.example`, Vercel Production variables | Introduce Neon variables only for isolated Preview/Development until validated. Remove Supabase secrets last. |

The code also directly uses Supabase Storage and Realtime. The profile screen
references an `avatars` bucket not present in the source bucket inventory; this
must be reconciled independently before claiming profile image parity.

## Compatibility and authorization gates

1. **Source database export access.** Neon Import Data Assistant needs a
   working source PostgreSQL connection string; `pg_dump` needs equivalent
   credentials. No source database password was available in the repository's
   local environment or linked Vercel configuration inspected. Supabase CLI
   administrative SQL access is not the same as a safe full PostgreSQL dump.
   Do not reset the production database password merely to force an import.
2. **Auth import contract.** Current Neon Managed Auth uses Better Auth and its
   `neon_auth` schema. Neon's 2025 Supabase migration article uses the *former*
   Stack Auth implementation and is not evidence that importing existing
   Supabase password hashes, Google identities, or sessions into current
   managed Better Auth is supported. Establish a current supported import path
   and test it on staging before touching user identities. Existing sessions
   cannot be assumed portable between auth providers; any re-login strategy
   must be documented and tested. Better Auth publishes a Supabase migration
   guide for a *self-hosted/configurable* Better Auth instance, but that does
   not prove Neon Managed Auth exposes the same migration hooks. The guide
   explicitly says active sessions are invalidated.
3. **Stable identity mapping.** Existing application records reference
   Supabase UUIDs. If Managed Auth cannot retain these IDs, create and verify
   a permanent old-ID/new-ID mapping and update every dependent foreign key
   transactionally. Never merge users by email alone.
4. **RLS context.** Supabase `auth.uid()`/`auth.jwt()` and request GUCs are not
   available unchanged on Neon. Audit each policy/function and reproduce the
   same server-verifiable identity context and grants. Do not bypass RLS with
   an all-powerful app connection.
5. **Extensions.** Source has `supabase_vault` and `wrappers`; the staging
   branch lists neither as available. `pg_trgm`, `pgcrypto`, `uuid-ossp`, and
   `pg_stat_statements` are available. Determine actual object dependencies and
   replace unsupported extensions before import, without discarding data.
6. **Object storage.** Private buckets include applications, job files,
   resumes, chat attachments and payment proofs. Provisioning public buckets
   or copying metadata alone is not a security-preserving migration.

## Environment-variable transition

| Current variable(s) | Target / treatment | Purpose | Delete when |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SUPABASE_PROJECT_ID` | Neon Auth public URL and/or app-owned APIs as required by the chosen SDK; no DB secret in browser | Browser auth/API | All browser callers and OAuth redirects are migrated and verified. |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `SUPABASE_JWKS_URL` | Server-only `DATABASE_URL`, Neon Auth verifier configuration, server-only object-storage credentials | Server DB/Auth/Storage | All server callers, jobs and rollback procedures no longer need Supabase. |
| Existing payment/email/AI/provider variables | Preserve unless a verified integration requires a specific change | eSewa, Resend, AI, encryption | Not part of the DB/Auth/Storage replacement. |

No Neon database password, storage secret, auth secret, or production provider
credential may be exposed through a `NEXT_PUBLIC_` variable. Vercel Production
variables remain unchanged until the final cutover is approved.

## Required sequence once gates are resolved

1. Obtain a safe read-only source DB connection with enough dump privileges,
   or a verified official full export path. Freeze a snapshot and verify it.
2. Confirm current Neon Managed Auth import support for password hashes,
   OAuth identities, verification, IDs and session transition. Demonstrate
   representative users on staging, including a Google and password user.
3. Port effective schema/data, resolving extension and auth-context differences.
   Reconcile every table's count, constraints, functions, triggers and sequence.
4. Copy all storage objects to matching access-controlled buckets and compare
   keys, hashes/size, MIME type and private/public behavior.
5. Migrate application DB/Auth/Storage/Realtime callers and CI/Preview env. Run
   integration and adversarial authorization tests against staging.
6. Verify complete Preview UAT for jobs, mentors, events, colleges, payments,
   notifications and calendar. Produce a fresh readiness report.
7. Only after all critical readiness gates are YES, request explicit approval
   for production cutover. Keep Supabase operational for rollback.

## Readiness at this audit

| Gate | Ready? | Why |
| --- | --- | --- |
| Database | NO | No source dump/import or count comparison on Neon. |
| Auth | NO | No supported managed-auth identity import proven. |
| Google OAuth | NO | Neon OAuth client/trusted origins not configured. |
| Storage | NO | No object copy or integrity/private-access comparison. |
| RLS | NO | Supabase identity context still used in source policies/functions. |
| Payments | NO | End-to-end flow not tested against Neon. |
| Jobs | NO | End-to-end flow not tested against Neon. |
| Mentors | NO | End-to-end flow not tested against Neon. |
| Events | NO | End-to-end flow not tested against Neon. |
| Colleges | NO | End-to-end flow not tested against Neon. |
| Notifications | NO | Realtime/data dependencies still on Supabase. |
| Calendar | NO | Neon-backed flow not tested. |
| Tests passing | NO | No Neon-specific tests can run against an empty staging branch. |
| Rollback ready | NO | Source is preserved, but a tested post-cutover rollback is not yet available. |

## Rollback design (not yet tested)

Retain source Supabase database, Auth and Storage, and retain the current
production Vercel environment snapshot. For a future approved cutover, prepare
an explicit write-freeze/data-reconciliation window. Rollback must restore the
previous Vercel env and deployment, Google OAuth callback settings, and storage
routing, then verify user login, file access and payment callbacks. Changes
written *only* to Neon after cutover would need reconciliation back to
Supabase; therefore simply restoring variables is not a complete rollback.

## Current external changes

Only the isolated Neon staging branch was created. No source records or files
were altered, no Neon data was imported, and no Vercel Production variable or
production OAuth setting was changed by this migration pass.

## Documentation used

- [Neon current Managed Auth announcement](https://neon.com/blog/neon-auth-branchable-identity-in-your-database)
- [Neon PostgreSQL migration options](https://neon.com/migration)
- [Older Stack Auth migration article — not applicable to current Managed Auth without verification](https://neon.com/blog/supabase-auth-neon-auth)
- [Better Auth's Supabase guide — useful for identity mapping, not proof of Neon Managed Auth import support](https://better-auth.com/docs/guides/supabase-migration-guide)
