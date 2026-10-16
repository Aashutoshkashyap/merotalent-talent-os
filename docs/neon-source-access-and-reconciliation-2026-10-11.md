# Supabase source access and Neon reconciliation — 2026-10-11

**Decision: NO-GO. Source reconciliation is blocked.** Production remains on Supabase. This task made no source or production changes, ran no migration, and did not commit, push or deploy. The dirty worktree on `main` (18 commits ahead of `origin/main`) was preserved.

## 1. Source connection and credential result

The authoritative local Supabase project reference is `dtirpilgzlsfryucanlg` (`supabase/config.toml` and the production Supabase URL). `.migration.env` contains one source PostgreSQL URL for `db.dtirpilgzlsfryucanlg.supabase.co:5432/postgres`, but its username is the default **`postgres` admin/owner role**, not a dedicated read-only role. No `DATABASE_URL`, `POSTGRES_URL`, or read-only source database URL was found in the inspected local environment files. A read-only metadata listing of Vercel Production, Preview and Development environment-variable **names** showed no PostgreSQL connection variable; it did not reveal values. The local Supabase CLI credential directory did not provide a database role credential.

The configured direct source host currently has an IPv6 AAAA record and no IPv4 A record. This host has no IPv6 route to that address. Thus DNS record availability, network routing and database authentication are distinct: the configured endpoint is plausible, but TCP/database identity and credential privileges **could not be verified**. No privileged source connection was attempted. The Supabase REST project URL and historical project reference do not prove current PostgreSQL identity or read-only access.

Supabase's current [connection guide](https://supabase.com/docs/guides/database/connecting-to-postgres) says the shared **session pooler** is the IPv4 option for this kind of client, on port `5432`, and a custom role uses `[ROLE].[PROJECT-REF]` as its pooler username. Its pooler host **cannot be derived from the region**; it must be copied from this project's Dashboard **Connect → Session pooler**. No actual project pooler host or custom-role credential is present in the inspected configuration, so none was guessed or substituted. Network restrictions, if configured, must also allow the migration executor; see [Supabase network restrictions](https://supabase.com/docs/guides/platform/network-restrictions).

**Required external prerequisite:** an authorized Supabase administrator must provision or identify a dedicated login role with only the required `CONNECT`, schema `USAGE`, catalog access and `SELECT` privileges for the approved inventory tables/columns (including `auth.users`, `auth.identities`, `public.profiles`, and relevant ownership tables). It must have no inherited INSERT/UPDATE/DELETE/TRUNCATE/CREATE or mutating-function execution rights. Supply its actual project-specific session-pooler connection URL through an approved secret manager, not chat, Git, shell history, the report, or Vercel Production. This is an external prerequisite, not a permission to modify production in this task. A `READ ONLY` transaction alone is insufficient proof that a privileged login cannot write outside that transaction.

The first use of that credential should be a bounded, TLS-verified, read-only connection with `REPEATABLE READ READ ONLY`, a short statement timeout, `current_database()`, `current_user`, `inet_server_addr()`, project-specific identity checks, and catalog privilege checks **before** any application-data query. Fail closed on unexpected host, role, project, grants, or write privilege. Do not use the current `postgres` source URL for this workflow.

## 2. Fresh isolated Neon staging inventory

A TLS-verified `REPEATABLE READ READ ONLY` transaction connected to the pinned migration-staging branch database `neondb`. Aggregate results (no PII or record IDs exported):

| Metric | Current staging count |
| --- | ---: |
| `public.profiles` | 104 |
| `public.neon_application_accounts` | 1 |
| `public.neon_identity_links` | 1 |
| `neon_auth.user` | 31 |
| `neon_auth.account`, credential provider | 31 |
| `public.job_applications` | 5 |
| `public.jobs` | 3 |
| `public.mentor_bookings` | 5 |
| `public.event_registrations` | 2 |
| `public.payments` | 1 |

All 104 staging profiles currently have `account_status='active'`. There are 103 profiles without an application-account row, 30 staging Managed Auth users without a link, no duplicate `profiles.user_id`, no application-account row missing a profile, and no existing job application missing a profile. The 31 target Auth users include synthetic staging test accounts and **must not** be interpreted as migrated production users. The sole existing verified staging link is not evidence of a link to a current production source user.

`merotalent_accounts` is absent on this branch. The actual one-to-one identity anchor is `neon_application_accounts.legacy_user_id → profiles.user_id` plus `neon_identity_links.application_account_id → neon_application_accounts.id` and `neon_identity_links.neon_auth_user_id → neon_auth.user.id`. Unique constraints and FKs protect those mapping keys in staging. Existing application ownership still uses the stable legacy UUID, not the new Auth subject. Resolve the naming discrepancy in migration documents before any bulk plan.

## 3. Source inventory and reconciliation

**Not performed.** No verified source read-only login is available, so current source Auth users, provider categories, profiles, orphan/missing records, disabled/deleted states, foreign-key ownership counts, and source-to-staging deltas are **unknown**. The earlier **103 users / 104 identities** snapshot in the [identity report](neon-managed-auth-identity-reconciliation-2026-10-09.md) is historical, not a fresh source inventory. Comparing it to today's 104 staging profiles would be invalid. No email equality or unverified provider metadata was used to assign identity links.

The existing `scripts/neon-identity-reconciliation-report.mjs` must **not** be run unchanged for this task: it hardpins the IPv6 direct host and reads `encrypted_password` values into process memory to classify password users, even though it does not print them. Before an approved future run, adapt it to the verified read-only session-pooler endpoint and use a boolean presence expression (not raw hashes), with strict role/project pinning and a restricted output location. Its 96-bit fingerprints are pseudonyms, not anonymous data. No change to this script was made without a usable source credential to validate the revised path.

After source access is available, obtain one consistent source snapshot, aggregate counts, missing/orphan/duplicate checks, account-state distributions and stable-UUID ownership counts. Compare against a target snapshot at a documented time, plus an explicit list of writes after that time. Reconcile per-account only by stable source UUID and verified one-to-one ledger links, not by matching email. Include UUID references in FKs and JSON/metadata, and classify every discrepancy without exposing passwords, OAuth tokens or private documents.

## 4. Account-category decision matrix

| Category | Current disposition | Required supported operation and user action | Stable identity / rollback |
| --- | --- | --- | --- |
| Verified one-to-one link | One staging link; relation to current source unverified | Confirm source UUID and dual proof against a read-only source snapshot; no new link now | Preserve `profiles.user_id`; disable a bad link through an approved audited process, do not rewrite FKs. |
| Source account without target Auth identity | Current count unknown | Current Managed Auth signup/Google sign-in plus an approved, independently verified source-account proof | Preserve source UUID in application ledger; user action required unless Neon documents an import path. |
| Target Auth identity without source link | 30 staging users, mostly test-fixture candidates; source relationship unknown | Reconcile fixture provenance and separately prove source ownership; never auto-link by email | Do not grant historical private data without verified link. |
| Google OAuth account | Current source count unknown | Fresh Managed Auth Google sign-in and approved source proof, unless Neon provides an official subject-import contract | Existing Google provider subject and session continuity **unverified**; consent/reconnection may be required. |
| Email/password account | Current source count unknown | Fresh Managed Auth credential setup/reset and source proof, unless Neon documents compatible hash import | Existing hashes were not read/exported; password continuity **unverified**. |
| Missing profile, conflicting/duplicate mapping, disabled/deleted account, lost source access | Current source counts unknown | Fail closed; evidence-based manual adjudication and recovery policy approved before any linking | No automatic reassignment; carry source account status and audit history into authorization. |

Current [Neon Managed Auth](https://neon.com/blog/neon-auth-branchable-identity-in-your-database) is Better Auth-backed and managed, without customer server-side plugins/handlers. Neon's older [Supabase-to-Neon article](https://neon.com/blog/supabase-auth-neon-auth) imports into **Stack Auth**, not this current service. No official current Supabase password-hash, Google subject, legacy UUID or session-import contract was established. This is a lack of verified support, not proof that an option can never exist. The staging-only dual-session proof endpoint remains disabled by default; it was not enabled or used for real users.

## 5. Data integrity, runtime and rollback prerequisites

- Source snapshot/export: dedicated read-only role, stable MVCC snapshot or a reviewed backup/export mechanism, explicit start/end timestamps, aggregate checksums and repeated delta capture. Do not write helper functions to production to perform an export.
- Schema: reconcile the canonical identity table name, staging migration provenance, `NOT VALID` constraints, ownership FKs, indices, triggers, grants and authorization policy differences before cutover.
- Ownership: retain legacy application UUIDs in profiles, applications, bookings, registrations, payments, entitlements and audit rows; inventory UUID references in JSON/metadata and storage paths. Target Auth subject maps through the unique ledger, never an email join.
- Writes in flight: choose a documented short read-only/freeze window or a tested change-capture/final-delta mechanism. Prevent double fulfillment and reconcile payment callbacks, bookings, applications, files and notifications by immutable transaction/reference IDs.
- Backup/restore: take and verify restorable source and target snapshots, rehearse restoration in isolation and record recovery point/time objectives. A rollback after target-side writes begin needs **replay/reconciliation of those writes** to Supabase or an approved compensating process; switching environment variables alone loses data.
- Runtime: the latest dependency inventory still has **114 non-test direct Supabase import files**. AuthContext/callback/reset, admin user management and other reachable module/browser/server paths remain partly legacy. Do not remove or disable Supabase until each route has staging evidence and ownership/security checks.

No rollback, restore or live source-delta procedure was exercised in this task. The previously passing 484 unit tests, 13 staging integration tests and authenticated HTTP suites remain **historical** results; they do not prove source reconciliation. Only configuration-name inspection, DNS/route diagnosis, official-document review and the fresh staging read-only aggregate/catalog queries were run. No code changed, so no test suite was rerun. `git diff --check` should be evaluated before any future commit; this report is an untracked documentation artifact.

## 6. Exact next actions

1. **Supabase project administrator:** provide a dedicated least-privilege read-only PostgreSQL login and the exact `dtirpilgzlsfryucanlg` **Session pooler** URL via an approved secret manager; verify any network allowlist. Do not rotate the current production password or alter application configuration.
2. **Migration operator:** verify TLS, source database/project identity and privilege boundaries before data queries; adapt the reconciliation script to the approved pooler and avoid handling raw password hashes.
3. **Migration operator:** run privacy-conscious source/staging snapshots and classify every source UUID, provider category, profile and ownership discrepancy; retain a restricted audit trail of aggregate evidence.
4. **Product/security owner and Neon support:** approve a supported Managed Auth account-recovery/import policy for Google, password and lost-access categories before real-user linking.
5. **Release owner:** complete remaining runtime, storage, payment, cleanup, backup and rollback gates; request a separate explicit production cutover approval only after they pass.

Until then: **NO-GO**.

## Implementation update (later on 2026-10-11)

The original observations above remain a historical snapshot. The source-access
remedy is now implemented in `scripts/require-supabase-source-readonly.mjs` and
used by the identity, schema, and storage reconciliation commands. They no
longer accept `SUPABASE_DATABASE_URL` as their inventory source. Before any
source-data query they require:

- `SUPABASE_SOURCE_READONLY_DATABASE_URL`: the actual project Session Pooler
  URL supplied through an approved secret channel;
- `SUPABASE_SOURCE_EXPECTED_POOLER_HOST`: the exact host copied from this
  project's Connect screen, never guessed from the region;
- `SUPABASE_SOURCE_READONLY_ROLE`: a dedicated role name, excluding `postgres`.

The gate requires the exact project-ref role suffix, port 5432, TLS certificate
verification, an explicit read-only repeatable-read transaction, and a role
without table mutation, database/schema creation, or administrator attributes.
The identity report now asks only whether a password hash exists; it does not
load the hash. This is code-path verification, **not a successful source
connection**: the required pooler host and read-only credential are still not
configured, so no source inventory or reconciliation has run. No production
cutover is authorized.

## Retry evidence (2026-10-11)

Using the existing authenticated Supabase CLI credential only for a read-only
Management API request (`GET /v1/projects/dtirpilgzlsfryucanlg/config/database/pooler`),
the project's actual shared-pooler host was retrieved as
`aws-0-ap-southeast-2.pooler.supabase.com`. The API returned its transaction
mode on port 6543; the same project pooler host's **session mode on port 5432**
is documented by Supabase and an IPv4 TCP connection from this machine
succeeded. This resolves host discovery and network reachability, **not**
database authentication or least-privilege authorization. No source data was
queried. `SUPABASE_SOURCE_READONLY_DATABASE_URL` and
`SUPABASE_SOURCE_READONLY_ROLE` remain unavailable. The existing `postgres`
administrator credential remains excluded.

`scripts/verify-neon-staging-backup-restore.mjs` now performs a staging-only
dump/restore rehearsal: it writes two synthetic rows in a uniquely named
temporary schema on the pinned Neon migration-staging database, creates a
PostgreSQL custom-format archive, restores it into an isolated local PostgreSQL
18 cluster, checks both rows and uniqueness, then removes the synthetic staging
schema and local cluster/archive. The live run passed. This establishes the
mechanics of target extraction and isolated restoration, **not** a full-data
backup, a production restore, or a rollback after divergent writes.
