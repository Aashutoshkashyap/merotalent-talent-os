# Neon cutover-readiness gate — 2026-10-11

**Decision: NO-GO.** This is a staging assessment, not production cutover authorization. Production remains on Supabase. No migration, production configuration/account change, commit, push, or deployment was performed. The pre-existing dirty worktree was preserved.

## Scope and environment evidence

- The configured database, Managed Auth, and object-storage hosts are the pinned `br-frosty-haze-azsnybmr` migration-staging branch. DNS resolves those Neon hosts outside the filesystem/network sandbox. A TLS-verified, read-only PostgreSQL session connected to `neondb`; isolated Neon tests and authenticated HTTP flows succeeded. Storage was exercised with real staging S3 objects.
- The existing Supabase direct database hostname has an AAAA record but no A record. The current execution host cannot route to its IPv6 address (`EHOSTUNREACH`); its Node resolver reports `ENOTFOUND`. This is a source-network/access failure, not evidence that the source database was deleted. Do not guess a pooler address or rotate production credentials. Obtain a verified, authorized IPv4-compatible read-only connection or IPv6 egress before refreshing the source inventory.
- The local staging server was bound only to `127.0.0.1:3210` and stopped after tests. A request to expose it on `0.0.0.0` was rejected and was not used.
- `.migration.env` contains separate staging DB/Auth/storage configuration; the identity-link synthetic source allowlist is absent. No values of credentials were printed or copied into this report.

## Gates

| Gate | Status | Evidence and remaining condition |
| --- | --- | --- |
| A Infrastructure | **BLOCKED** | Neon staging DB/Auth/S3 reachable and pinned; source PostgreSQL connection remains unreachable from this host. Refresh and compare the live source before any final delta. |
| B Data | **BLOCKED** | Staging has 104 profiles, 5 job applications, 3 jobs, 1 application account, and 1 identity link after synthetic cleanup. No duplicate profile UUIDs or orphaned existing job applications in the aggregate read-only checks. `merotalent_accounts` is **absent**; the implemented anchor is `neon_application_accounts` plus `neon_identity_links`. There is no staging migration-ledger table, so exact SQL-application provenance is unverified. `job_applications.user_id` has no profile FK. 103 profiles currently lack an application-account mapping. Source-to-target delta and full constraint parity remain unverified. |
| C Security | **PARTIAL / NO-GO** | Synthetic recruiter scope, private resume, chat, proof and experience-document tests passed. The identity-link POC is fail-closed without the synthetic source allowlist and unit security tests pass, but live dual-session linking was not exercised. Only successful links are written to `audit_logs`; rejected link attempts have no durable audit event. Orphan cleanup is not safe/operational. Relevant public tables have RLS disabled and no RLS policies; access currently depends on server-only DB credentials and route/business authorization, which needs an explicit production threat-model review. |
| D Runtime | **PARTIAL / NO-GO** | Live synthetic Jobs and Mentor/Event HTTP suites passed; profile, login/logout, job submit, notifications, messaging, avatar, resume, private proof and storage paths were exercised. The application-document path was exercised to a scoped recruiter. A full signed-in graphical UAT, all admin workflows, all routes, real eSewa settlement and historical-account behavior were not verified. |
| E Accounts | **BLOCKED** | Current Better Auth-backed Neon Managed Auth has no verified official Supabase bulk-import contract for existing UUIDs, password hashes, Google provider subjects or sessions. The older Neon Supabase guide targets Stack Auth, not the current Managed Auth service. Dual-session linking is a possible opt-in recovery path only for users who can prove both accounts; it is not an approved migration for all existing accounts. |
| F Operations | **BLOCKED** | No tested final-delta reconciliation, orphan dry-run/cleanup, source snapshot/restore, post-cutover write capture/replay, payment reconciliation, monitoring runbook or rollback exercise. |

## Staging schema and identity findings

Read-only catalog checks confirmed unique `profiles.user_id`, unique `neon_application_accounts.legacy_user_id`, one-to-one unique target subject and account IDs in `neon_identity_links`, a target-subject FK into `neon_auth.user`, and an account FK to `profiles.user_id`. The application account has active/disabled status and the link has verified/disabled status. Those constraints protect the staging POC; they do not prove every legacy identity is reconciled. The stable application UUID remains `profiles.user_id`, with many module/payment/entitlement FKs still referencing it. No bulk FK rewrite is indicated or authorized.

`merotalent_accounts` appears in historical migration planning/scripts but does not exist on this staging branch. Resolve the canonical-table naming and migration ledger before an account mapping run. Current staging has no duplicate profile UUID, no orphan application-account row, and no existing job application missing a profile, but the missing FK means future direct writes are not inherently protected. `jobs` and `job_applications` have core PK/FK/unique constraints; some imported CHECK constraints are `NOT VALID`, so a planned validation pass is needed. No schema migration was applied during this gate.

## Private application-document evidence

The extended synthetic Jobs HTTP run against real Neon staging uploaded an experience PDF to the private `job-files` bucket; rejected a non-PDF and a cross-job reference; submitted an application whose JSON snapshot preserved the exact path; returned a 300-second signed URL only to the scoped recruiter; downloaded the exact test bytes through that URL; denied applicant and anonymous recruiter-endpoint calls; and rejected draft-endpoint deletion after submission. The synthetic DB and S3 fixtures were cleaned up; aggregate staging counts returned to their starting values.

This is **not yet the complete document gate**. A second applicant, unrelated recruiter on the document endpoint, >5 MiB file, failed-submit lifecycle, abandoned draft, and real elapsed expiry of the 300-second URL were not exercised live. Unit tests cover additional parsing/snapshot cases but are not substitutes for those live checks. The signed URL was issued with a 300-second TTL and worked immediately; actual expiry after 300 seconds was not observed.

### Orphan cleanup decision

No deletion policy was implemented or run. The current upload path has no durable draft-object registration, lifecycle state, retention marker, or atomic submit/cleanup lock. S3 `LastModified` alone cannot prove that an object is abandoned or not referenced by a submitted application, and a DB snapshot query can race with submission. Required design: persist `(owner, job, object key, upload time, draft/submitted state)` transactionally or equivalent; define a grace period; lock/mark candidates; recheck submitted references immediately before delete; restrict to the pinned staging bucket; emit dry-run candidate counts and audited actual deletions; test idempotence and submit-vs-cleanup races. Do not infer eligibility from filename or object age alone.

## Current Managed Auth decision matrix

| Existing category | Supported present path | User action | Stable identity / blocker |
| --- | --- | --- | --- |
| Google OAuth, old session available | Sign in separately to Managed Auth, prove a current Supabase session in staging-only dual-session bridge | Reauthenticate to both systems; Google consent may recur | Application UUID can remain in `profiles.user_id`; provider subject and existing session are **not imported**. Production-scale flow not approved. |
| Email/password, old session/password available | Separate Managed Auth signup/reset, then dual-session proof | Reauthenticate to both | Old password hash continuity is **not verified** for current Managed Auth. New credential and explicit linking required. |
| Missing old session or inaccessible provider | No verified self-service link | Supported source recovery plus target signup, or separately approved manual recovery | **Blocker**; email equality must never establish ownership. |
| Missing/conflicting profile, disabled account, duplicate identity | Fail closed and manual adjudication | Case-by-case evidence and administrator review | **Blocker**; no reassignment or bulk FK rewrite. Disabled status must propagate to authorization. |

Current [Neon Managed Auth architecture](https://neon.com/blog/neon-auth-branchable-identity-in-your-database) is Better Auth-backed and managed, without custom server handlers/plugins. Neon's older [Supabase migration article](https://neon.com/blog/supabase-auth-neon-auth) uses Stack Auth APIs and cannot be applied here. No current official Supabase-to-Managed-Auth full-fidelity import contract was confirmed. The POC's success event is transactional and credential-free, but rejected attempts need an auditable design before production use. Sessions should be assumed invalid across providers unless a documented and tested handoff proves otherwise.

## Remaining Supabase dependencies

A fresh direct-import scan still finds **114 non-test `app`/`src` files** importing Supabase. The [dependency ledger](neon-runtime-dependency-ledger-2026-10-09.md) identifies active AuthContext/callback/reset flows, admin user and module workflows, server auth/client factories, browser media paths, and other partial module clients. Several staging branches coexist with legacy production branches; this is intentional, but it means removing Supabase Auth/DB/storage now would break reachable paths. Foreign-key references to legacy profile UUIDs must stay stable; JSON/metadata ownership references require a table-by-table inventory before cutover. Do not remove packages or configuration based on the narrower passing slices.

## Verification actually completed

- `npm run typecheck`: pass.
- `npm run test`: **111 files / 484 tests passed**.
- `npm run lint`: **0 errors, 53 warnings**.
- `npm run build`: pass (Next.js 16.2.12).
- `git diff --check`: pass.
- Isolated real Neon integration suite (`vitest.staging.config.ts`): **2 files / 13 tests passed** (synthetic rollback fixtures).
- Authenticated local Jobs HTTP UAT: all recorded checks passed, including real Managed Auth session, profile, job, resume, application document, recruiter scope, S3 signed download, and logout. The harness created temporary synthetic Managed Auth subjects; its app DB/S3 fixtures were cleaned, but Auth-subject cleanup is a separate staging hygiene concern.
- Authenticated Mentor/Event HTTP UAT: all recorded checks passed, including notification/message SSE, private chat/avatar/proof storage, bookings, pending paid states, free tickets, and logout. eSewa sandbox remains unconfigured and correctly fails closed; no real payment was claimed.
- No current source-DB consistency comparison, live dual-session identity-link test, orphan-cleanup dry-run, signed-URL elapsed-expiry test, full browser UAT, backup restore or rollback rehearsal passed. Do not convert the passing unit/build results into those claims.

## Required next actions before a separate cutover approval

1. Provide a verified source PostgreSQL read-only route reachable from the migration executor (authorized IPv4 pooler or IPv6 egress). Refresh source counts, auth-category inventory, checksums and post-snapshot deltas without touching production writes.
2. Resolve the canonical stable-account table (`merotalent_accounts` versus `neon_application_accounts`), record applied SQL in an auditable migration ledger, validate `NOT VALID` constraints and missing ownership FKs through reviewed forward-only staging migrations.
3. Obtain a supported Managed Auth migration/recovery policy for every account category, including Google users, password users and lost-source-access cases. Test synthetic dual-session linking, conflicts, idempotence and rejected-attempt audit with an explicit synthetic allowlist. Never link by email alone.
4. Design and test conservative draft-object lifecycle/cleanup with dry-run and auditable deletion; complete the untested private-document negative cases and signed-link expiry observation.
5. Complete the remaining direct Supabase runtime replacements and signed-in browser UAT, including admin workflows and provider-backed payments where required.
6. Prepare source and target snapshots, final-delta freeze/reconciliation, monitoring thresholds and a rollback drill. A rollback **after target writes begin** must either replay target writes to Supabase with verified mapping and idempotent payment semantics, or enforce a documented read-only interval and compensate users; simply switching environment variables back would lose those writes. Reconcile storage and Auth actions as well as tables.

Re-evaluate Gates A–F only with fresh evidence and obtain separate explicit approval before any production cutover.
