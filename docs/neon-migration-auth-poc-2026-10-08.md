# MeroTalent Supabase → Neon: auth POC and migration decision

MIGRATION STATUS: NO-GO

AUTH STATUS: INSUFFICIENT EVIDENCE

DATABASE STATUS: REQUIRES SOURCE CREDENTIAL

STORAGE STATUS: REQUIRES POC

PRODUCTION CHANGED: NO

Point-in-time research: 2026-10-08, Asia/Kathmandu. Decision classification: **D. INSUFFICIENT EVIDENCE**. No data migration, import, credential rotation, production configuration change, or user-auth POC was performed. The existing isolated Neon `migration-staging` branch (`br-frosty-haze-azsnybmr`) was not populated by this pass. This is not permission to cut over.

This report extends [the baseline inventory](neon-migration-readiness-2026-10-08.md). Counts there are a snapshot, not a frozen export. In particular, the 102 Supabase Auth users and their related rows still belong to the live Supabase system.

## 1. Current architecture and dependency map

| Area | Verified use in this repository | Replacement obligation |
| --- | --- | --- |
| Browser Auth and PostgREST | `src/integrations/supabase/client.ts`; `src/contexts/AuthContext.tsx` subscribes to `onAuthStateChange`, signs up/in/out with password or Google, and reads `profiles`, `user_roles`, and access-context RPCs. | Replace session handling, token verification, browser queries, and role refresh coherently; never infer access from a UI state alone. |
| Server Auth and database client | `src/lib/server/auth.ts` calls `userClient.auth.getUser()` and `get_my_access_context`; `src/lib/server/supabase.ts` creates the privileged and user-scoped clients used by `app/api/v1/**` and `src/lib/server/**`. | Recreate verified identity propagation, least-privilege DB context, and every API authorization check. |
| OAuth callback | `src/screens/auth/OAuthCallback.tsx` invokes `request_initial_module_access` and `get_my_access_context`; `src/lib/auth/public-origin.ts` builds the app callback. | Rebuild callback/session initialization and access request behavior, with separate Google/Neon redirect configuration. |
| Relational data and RLS | `supabase/migrations/` contains the effective model; live inventory: 80 public tables, 390 public RLS policies, 153 public functions, 87 public triggers. Many functions call `auth.uid()` and `auth.users`. | Port a *verified effective schema*; retain FK integrity and deny-by-default policy semantics. Do not blindly replay Supabase-specific history. |
| Membership/capability/entity scope | `src/screens/RequestSubAdminAccess.tsx`, `src/screens/institute/InstituteDashboard.tsx`, `src/screens/role/RoleWorkspace.tsx`, admin access screens, payment routes, and RPCs such as `get_my_access_context`, `has_active_module_capability`, `has_active_entity_assignment`. | Maintain multi-module, multi-entity, subscription-gated privileges and auditability after identity remapping. |
| Colleges | `src/lib/institutes/public-institutes.ts`, institute dashboard/owner components, media routes, claims/applications and server RPCs. | Preserve public listing, owner scope, subscriptions, leads, and private file authorization. |
| Jobs | `src/screens/jobs/JobsPage.tsx`, job detail, `src/lib/server/jobs-service.ts`, `app/api/v1/jobs/applications/route.ts`, review RPCs. | Preserve listings, submission, private application files, poster scope, and approval/status transitions. |
| Mentors | Mentor listing/detail, `src/lib/server/mentorship-service.ts`, `app/api/v1/mentors/bookings/route.ts`, booking/payment RPCs. | Preserve availability, booking/payment reconciliation, mentor ownership, and private session records. |
| Events | `src/lib/server/events-service.ts`, public/event admin routes and registrations. | Preserve event approval, registration, ticket/payment scope. |
| Payments/eSewa | `src/lib/server/esewa-settlement.ts`, `app/api/v1/payments/**`, payment/subscription tables and dashboard. | Preserve signed callback verification, idempotency, references, entitlements, and audit history. No payment retesting against Neon has occurred. |
| Notifications and messaging | `src/hooks/useNotifications.ts` subscribes to `notifications:${user.id}`; `src/components/messaging/MentorMessaging.tsx` subscribes to `messages:${selectedConversation.id}`. Notification tables and `claim_email_notifications` are also used. | Replace Supabase Realtime with a scoped transport/polling model and preserve in-app/email delivery status. |
| Storage | `src/components/media/SignedMediaUploader.tsx` uploads to Supabase Storage; `app/api/v1/media/upload-url/route.ts` and `download-url/route.ts` authorize and sign URLs; profile, job, and other screens use bucket URLs. | Reimplement bucket/path authorization, safe upload validation, public URLs, private signed GET/PUT, retention/deletion, and reference rewrites. |
| Calendar and scheduled work | `src/screens/dashboard/Dashboard.tsx` computes calendar dots/upcoming items from DB-backed registrations/bookings plus local activity; `src/screens/dashboard/Jobs.tsx` shows scheduled interviews. `app/api/cron/maintenance/route.ts` calls maintenance RPCs. | Preserve source events and cron semantics. The UI calendar is not evidence of an external calendar-provider integration. |
| Public SEO/SSR | `app/[[...slug]]/page.tsx` queries public records through the server Supabase client. | Preserve public/private visibility and record-specific metadata. |

Specific identity-bearing columns include `profiles.user_id`, user roles, module capabilities, assignments, college applications, job applications, mentor bookings, event registrations, subscriptions/payments, notifications, audit actor IDs, saved jobs, and ownership/creator fields. This is a risk map, not an exhaustive FK manifest; generate one from catalog metadata before any trial import. The baseline audit observed 70 public functions directly using `auth.uid()` and 80 referencing `auth.`/`storage.`.

## 2. Supabase dependencies and exact boundary

Supabase is not just the database host here: Auth, JWT/RLS identity context, PostgREST/RPC, Storage, Realtime, and maintenance functions are coupled. A raw PostgreSQL copy would not supply equivalent Auth, Storage bytes, Realtime, or payment/cron behavior. The existing browser client is authorized by Supabase JWT and RLS; the privileged server client must not become a general-purpose bypass on Neon. Preserve the production Supabase system intact while this decision is unresolved.

## 3. Source database export findings

The prior credential inventory checked local `.env`, `.env.example`, shell, local PostgreSQL credential files, macOS Keychain lookup, GitHub Actions secret/variable *names*, Vercel Production/Preview/Development variable *names*, and existing Supabase CLI configuration. It found no usable `DATABASE_URL`, `POSTGRES_URL`, `DIRECT_URL`, `SUPABASE_DB_PASSWORD`, or equivalent source PostgreSQL password. `.env.example` contains placeholders, not credentials. Vercel holds API/secret-key variables but no database connection variable. An API service-role key is **not** a PostgreSQL login credential. No secret values were printed or copied.

| Export option | Safe under this task? / changes production? | Complete logical export and RLS | Storage bytes, schema objects, suitability |
| --- | --- | --- | --- |
| Existing local/CI/GitHub/Vercel PG credential | Yes if a pre-existing authorized credential were found / no | None was found; therefore not usable. | No export executed. Recheck a secure password manager only if the owner can provide an existing credential without rotation. |
| Existing Supabase CLI login without DB password | **No** under the no-production-role-change rule: the CLI can create a temporary `cli_login_postgres` role. | The CLI dump default excludes managed schemas and is schema-only unless flags are supplied. Full auth/storage data is not automatic. | Not used. The CLI access token is not evidence of a safe, complete `pg_dump`. |
| Dedicated `backup_reader` | Technically suitable **only after separate authorization** / **yes**, creates a production role/grants. | Supabase documents `pg_read_all_data` plus `BYPASSRLS`, with read-only transactions by default. `pg_dump` otherwise disables row security and can fail on protected tables. | Can dump table data, schema, functions, policies, triggers, indexes, etc. PostgreSQL large objects may need separate SELECT grants or explicit exclusion. Supabase object-storage *bytes* are still separate. **Not created.** |
| Existing `postgres` password + direct/session pooler `pg_dump` | Read-only export possible if an existing valid password is securely obtained / no credential change. | Could include public/auth/storage schemas with explicit scope, schema/data/roles as supported, subject to privileges, extension portability, and snapshot discipline. | No password available. Avoid placing URLs in shell output/history/logs. S3-backed Storage objects are not in the dump. |
| Supabase Management API read-only SQL (beta) | Read-only query endpoint / no | Suitable for bounded inventory queries, **not proven** as a transactional, complete logical backup of all tables/schema/large objects. | No Storage bytes; not a substitute for `pg_dump` or a verified snapshot. |
| Supabase dashboard backup | Viewing existing backup is safe / no; restoring source is not. | Source PostgreSQL 17.6 uses physical backups; Supabase says these are not directly downloadable as logical dumps. | DB backups include storage metadata but **not file bytes**. No export performed. |
| Supabase→Neon Import Data Assistant | Source read access required / Neon staging write only if run. | Neon documents a source PostgreSQL connection string requirement; none is available. Its generic database import is **not** an Auth-provider migration. | Does not solve Storage or Supabase-specific extensions/functions/RLS. Not run. |

Minimum practical export authority: `CONNECT`, schema discovery/usage, read of *all* required tables, views, sequences and catalog metadata including `auth`/`storage`, `BYPASSRLS` for full protected-table dump, and relevant large-object reads if any. `default_transaction_read_only=on` reduces accidental writes but **does not** make a BYPASSRLS role low sensitivity; its credential must be tightly held. A consistent snapshot plus explicit schema and data exports are required. [Supabase's `pg_dump`/RLS guidance](https://supabase.com/docs/guides/troubleshooting/pg_dump-fails-with-query-would-be-affected-by-row-level-security-policy-1d5783), [CLI dump behavior](https://supabase.com/docs/reference/cli/global-flags), [CLI temporary role behavior](https://supabase.com/docs/guides/troubleshooting/permission-denied-when-deleting-the-cli_login_postgres-role-808bae), [read-only query API](https://supabase.com/docs/reference/api/v1-read-only-query), [backups](https://supabase.com/docs/guides/platform/backups), and [Neon import requirements](https://neon.com/migration) are the relevant current contracts. No password reset or production-role creation was attempted.

## 4. Current Neon Managed Auth findings

Current Managed Auth is Better Auth-based, branch-scoped, with `neon_auth` tables and Neon SDK/session handling. It is **not** the former Stack Auth-backed Neon Auth. The current [Neon branch user-creation API](https://api-docs.neon.tech/reference/createbranchneonauthnewuser) documents only `email` and optional `name`; it does not document import fields for source UUID, `emailVerified`, password hash/algorithm, provider account ID, provider tokens/metadata, auth/app metadata, timestamps, ban/deletion state, or old sessions. Current [branch Auth management documentation](https://github.com/neondatabase/website/blob/main/content/docs/auth/guides/manage-auth-api.md) lists management/configuration endpoints but no full-fidelity Supabase identity-import contract. Neon's current architecture states Managed Auth does not support bringing custom Better Auth server handlers/plugins, so a custom legacy-hash verifier cannot be presumed available. This is an **absence of documented support**, not proof that migration is technically impossible.

The older [Neon Supabase migration article](https://neon.com/blog/supabase-auth-neon-auth) sends password hashes to the *old Stack Auth API* and must not be applied to current Managed Auth. The [generic Better Auth guide](https://better-auth.com/docs/guides/supabase-migration-guide) describes direct table import/custom bcrypt verification for a configurable Better Auth server; it does not authorize raw writes into Neon's managed `neon_auth` internals or prove support for Neon Managed Auth. No raw auth-table write was attempted.

## 5. Email/password migration

Current source snapshot has 15 users with non-empty password hashes (not necessarily identical to the 13 email identities); no hashes or user data were exported in this pass. Neon Managed Auth has no documented supported field/API to import Supabase bcrypt hashes or their algorithm configuration. Nor is there a documented import path for verified email, user/app metadata, timestamps, ban/deleted state, or existing Supabase UUID. Therefore **password-continuity without reset is unproven**. A forced-reset route is conceivable, but it is not classified as safe Option B until an official account-linking/recovery mechanism and an isolated synthetic test demonstrate it. Do not email reset links for real users or mark imported emails verified merely because another system reports them verified without an approved transfer procedure.

## 6. Google OAuth migration and branding

The current [Neon OAuth setup guide](https://github.com/neondatabase/website/blob/main/content/docs/auth/guides/setup-oauth.md) supports Google sign-in. For production, an owned Google Web OAuth client, client secret, authorized JavaScript origins/trusted app domains, and the **branch-specific** `{NEON_AUTH_BASE_URL}/callback/google` authorized redirect URI are required. The MeroTalent `callbackURL` is a later return destination and is **not** the Google provider redirect URI. Development shared Google credentials display Neon branding; production should use MeroTalent's own Google consent branding. The guide also notes Google's “Continue to” label normally follows the **Neon Auth callback hostname**, even with a branded app name. A `merotalent.com` “Continue to” hostname is not demonstrated by these docs and requires a supported custom-auth-domain solution, not an improvised OAuth proxy.

Source snapshot: 90 Google identities. Current Neon management API configures Google provider credentials, but it does **not** document importing existing Supabase Google provider/account IDs or linking those IDs to a precreated Managed Auth user. Existing Google users would need a new sign-in to create a Neon session. Whether Google will prompt for consent again depends on the OAuth client and Google policy and is not proven here. **Duplicate-account prevention and ownership verification are not established**. Do not auto-link solely on a matching email, especially if email or provider relationships can differ.

## 7. User-ID continuity

Neon Auth JWT `sub` is the new `neon_auth.user.id`; the current creation endpoint does not accept a caller-supplied legacy UUID. Therefore **preservation of existing Supabase UUIDs is unproven**. A deterministic, tamper-resistant mapping could be modeled as `old_supabase_user_id → stable_merotalent_account_id → neon_auth_user_id`, with unique constraints on each identity, verified claim evidence, and transactional FK/reference migration. This is an architectural *candidate only*, not an implemented or tested solution. Every profile, role, capability, entity assignment, owner/creator, application, booking, registration, payment, notification, audit and private-file reference must retain the correct logical owner. No automatic merge by email. If a future controlled re-auth option is officially supported, specify migration states and recovery/duplicate-account handling before implementation.

## 8. Sessions

Supabase Auth JWTs and refresh/session state are not a Neon Managed Auth session. The [current Neon authentication flow](https://github.com/neondatabase/website/blob/main/content/docs/auth/authentication-flow.md) uses Neon-managed HTTP-only session cookies and Neon-signed JWTs for its Data API. There is no supported session-transfer contract. Treat **all existing sessions as invalid at cutover** and require fresh authentication; this is a planned user-impact statement, not a performed action. The generic Better Auth migration guide also says active sessions are invalidated, but that alone is not a Neon-specific import guarantee.

## 9. Storage migration findings

Baseline inventory: 13 buckets, 22 objects, 8,552,263 bytes. Public: `ad-media`, `college-media`, `course-media`, `event-media`, `mentor-media`, `profile-media`. Private: `application-files`, `chat-attachments`, `event-attachments`, `job-files`, `Merotalent`, `payment-proofs`, `resumes`. The `avatars` bucket referenced by profile UI is **not present** in that live inventory. Neon Object Storage is [S3-compatible, branch-aware, and supports `private` and `public_read` buckets](https://neon.com/blog/building-neon-object-storage); [private access can use presigned URLs](https://neon.com/blog/building-a-private-searchable-photo-library-on-the-neon-backend). It is a candidate, **not yet proven equivalent** to Supabase Storage's RLS-driven object API. Its bucket visibility is configured through Neon, not arbitrary S3 ACL mutations.

Future isolated plan (not executed): inventory each source object with bucket/path, bytes, MIME, relevant metadata, checksum, public/private mode, and all DB references; create matching staging bucket modes; copy *synthetic* public/private files; verify exact key, MIME, checksum, public anonymous access, private denial, signed GET/PUT expiry, replacement/deletion, and entity-scoped authorization. For real data later, copy bytes separately from the Postgres metadata and rewrite all Supabase public/signed URLs or canonical paths through one storage abstraction. A private bucket cannot be made `public_read` merely to simplify the migration. Determine whether signed download/upload semantics and object metadata retention meet each bucket's needs before accepting Neon Object Storage for all uses. No real file was moved.

## 10. RLS, functions, and security equivalence

Neon's [current Auth flow](https://github.com/neondatabase/website/blob/main/content/docs/auth/authentication-flow.md) documents `auth.user_id()` (text) and `auth.uid()` (UUID if JWT `sub` is a UUID) for **Data API** JWT-backed policies. This is an important compatibility aid, but not proof that existing Supabase `auth.uid()`, `auth.jwt()`, `auth.role()`, `auth.users` joins, PostgreSQL role grants, SECURITY DEFINER RPCs, or direct server connections will behave unchanged. Specifically validate how verified identity reaches each browser Data API request and every direct server transaction; a pooled privileged `DATABASE_URL` must not implicitly bypass per-user constraints. Enumerate and port 390 policies and 153 functions from the effective source catalog, including access checks and EXECUTE grants; regenerate triggers, indexes, constraints, enums, views, sequences and extension dependencies. The baseline notes `supabase_vault` and `wrappers` are not available on staging; identify every dependent object before replacement. Test adversarial cross-user, cross-entity, expired-subscription, and anonymous paths before any production cutover.

## 11. POC results

**Not run — deliberate stop at the explicit gate.** The task authorizes a three-synthetic-user POC **only if current official documentation establishes a supported full import path**. The API and current docs do not establish import of existing UUIDs, password hashes, Google account IDs, verification/metadata/status, or session transition. Creating three ordinary fresh accounts would demonstrate new signup, not migration continuity, and could mislead the release decision. The isolated `migration-staging` branch remains available and has no migrated MeroTalent users/files. No synthetic Auth users, OAuth settings, profiles, memberships, or test file objects were created by this pass; thus no synthetic rollback was needed.

Acceptance cases not exercised: A verified password user with application data; a linked Google identity with its existing app account; C password user with profile/college membership/capability/entity scope and job relationship; authentication, verification, logout/new session, password reset, no-duplicate, recovery, and deletion. These remain a future *gated* POC checklist, not passing tests.

## 12. Exact blockers

1. No existing usable source PostgreSQL credential or verified full logical export alternative that obeys the production no-change rule.
2. No current Neon Managed Auth supported full import contract for legacy UUID, Supabase hash, verified state, Google provider/account ID, metadata/status, or account linking. Written Neon support confirmation or current documentation plus a staging test is required.
3. No tested old→new identity mapping, duplicate-account defense, recovery, or session transition.
4. No schema/function/RLS/extension compatibility POC or source snapshot on Neon.
5. No Storage semantics/integrity/private-access POC; real bytes have not moved.
6. No staging end-to-end testing of Jobs, Mentors, Events, Colleges, eSewa, notifications, or calendars.

## 13. Recommended architecture while blocked

Keep Supabase Auth and production services unchanged. Do not use Neon's former Stack Auth instructions, unsupported raw Better Auth table mutation, or an email-only account merge. If a future written Managed Auth import mechanism exists, prefer preserving existing UUIDs where explicitly supported; otherwise design the stable account ID and independently verified immutable identity-link mapping before moving domain FKs. A safer alternative to assess separately is migrating **only the application database** to Neon while retaining Supabase Auth, but that is a different scoped architecture requiring JWT/RLS and API/Storage testing and is **not approved or implemented** here. Do not treat it as a hidden cutover plan.

## 14. Rollback strategy (design only)

For a future *approved* staging exercise, use isolated Neon branch/synthetic identifiers, record created object IDs, test deletion and count-zero postconditions, then discard the branch only after explicit target verification. For a later approved production release, keep Supabase data/Auth/Storage operational, snapshot Vercel settings and OAuth config, define a write-freeze or dual-write reconciliation protocol, and rehearse the reverse path. A Vercel rollback alone cannot reconcile payments, bookings, or applications written solely to Neon. No production rollback action was needed because production was not changed.

## 15. Production cutover prerequisites

- Obtain an **existing** source PG credential through approved secure custody, or separately authorize a dedicated read-only backup role; never reset the source password merely for migration. Prove complete `pg_dump` including auth/storage metadata and catalog objects, plus a separate file-byte manifest.
- Obtain current Neon-supported, written answers for legacy user ID, Supabase password-hash algorithm/import, Google account ID linking, email verification/metadata/status, session behavior, and support boundaries. A support statement must distinguish Managed Auth from self-hosted Better Auth and former Stack Auth.
- Only then run the three-user synthetic POC on the isolated branch with no real emails/credentials; prove relationship mapping, no duplicates, authentication/recovery, and cleanup.
- Port the effective schema to staging and validate every FK, enum, extension, policy, function, trigger, grant, index, sequence and row count. Preserve deny-by-default RLS and least-privilege server access.
- Run synthetic Storage POC, then a separately approved real manifest/copy with checksums and private-denial tests. Verify all existing URL references.
- Run a full Preview UAT and attack regression for Auth, roles/entities/subscriptions, college/job/mentor/event flows, eSewa idempotency, notifications, calendar, media, cron, SEO, and rollback.
- Request explicit approval **after** all gates are evidenced; only then plan production Vercel/OAuth/provider changes and cutover.

## 16. Explicit decision and answers

**D. INSUFFICIENT EVIDENCE; NO-GO.** We can say that the current published Managed Auth management API does not document the required full-fidelity import and current source export access is absent. We cannot truthfully say migration is safely supported, nor that a controlled re-auth path is fully proven. This is more precise than declaring technical impossibility.

1. **Continue toward Neon?** Research/staging design only; not a production migration.
2. **Preserve 102 users?** Their Supabase identities and application associations remain preserved *in place*. Safe preservation inside current Neon Managed Auth is not demonstrated.
3. **Log in again?** Assume yes for any future Auth cutover; existing sessions have no portable contract.
4. **Google OAuth cleanly?** New Google sign-in is documented, but importing/linking old identities without duplicates and a `merotalent.com` “Continue to” hostname are not proven.
5. **Database move cleanly?** PostgreSQL tooling exists, but no safe source PG credential or successful schema/RLS/extension POC exists.
6. **22 files/13 buckets move cleanly?** Object Storage is a candidate; bytes, metadata, paths, signed access and private denials still need a POC.
7. **Exact next blocker?** Obtain a current **Neon Managed Auth** import/linking contract in writing and locate an already-existing source PG credential (or separately authorize a backup-only role). Both are hard gates.
8. **Next Codex prompt:** “Read `docs/neon-migration-auth-poc-2026-10-08.md`. Do not change production. Using a written, current Neon Managed Auth import/linking specification supplied by Neon and an existing approved source PostgreSQL credential (never print it), verify the import fields and run the exact three-synthetic-user identity/relationship/recovery POC only on `migration-staging`. Separately prove a complete read-only source logical export without importing production data. Report pass/fail for each gate; stop if either prerequisite is missing.”

### Sources checked

- [Neon current Managed Auth architecture](https://neon.com/blog/neon-auth-branchable-identity-in-your-database)
- [Neon Managed Auth management API guide](https://github.com/neondatabase/website/blob/main/content/docs/auth/guides/manage-auth-api.md)
- [Neon Auth user-creation API](https://api-docs.neon.tech/reference/createbranchneonauthnewuser)
- [Neon Managed Auth authentication flow](https://github.com/neondatabase/website/blob/main/content/docs/auth/authentication-flow.md)
- [Neon current OAuth configuration and branding](https://github.com/neondatabase/website/blob/main/content/docs/auth/guides/setup-oauth.md)
- [Neon Object Storage design](https://neon.com/blog/building-neon-object-storage)
- [Neon private-file presigned access example](https://neon.com/blog/building-a-private-searchable-photo-library-on-the-neon-backend)
- [Supabase `pg_dump` and RLS](https://supabase.com/docs/guides/troubleshooting/pg_dump-fails-with-query-would-be-affected-by-row-level-security-policy-1d5783)
- [Supabase CLI temporary role behavior](https://supabase.com/docs/guides/troubleshooting/permission-denied-when-deleting-the-cli_login_postgres-role-808bae)
- [Supabase database backups](https://supabase.com/docs/guides/platform/backups)
- [Neon PostgreSQL import](https://neon.com/migration)
