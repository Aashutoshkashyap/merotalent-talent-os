# Neon cutover-readiness gate — 2026-10-11

**Decision: NO-GO for canonical cutover — genuine eSewa UAT settlement, final fenced synchronization and remaining workflow/recovery gates remain.**
The latest master execution mandate requires genuine sandbox settlement before
promotion; it supersedes the earlier payment-restricted-launch option. CAPTCHA
does not block independent engineering, but cannot be bypassed or counted as a
successful checkout. On 2026-10-20 the user also reported login/CAPTCHA failure in
the prepared official UAT checkout. Production payments remain disabled.
Actual production-candidate Google login, independent source recovery, preserved
application ID, and the explicitly approved owner Super Admin assignment passed
in the isolated preview. These are not canonical production acceptance.
The appended 2026-10-20 continuation in the existing sprint checklist is the current
evidence; historical gate descriptions below are retained as historical findings.
Live application traffic remains on Supabase. The offline Neon production candidate
now has actual forward schema changes and 22 source-row imports; those are not a
traffic cutover. Current execution evidence is in
`docs/neon-runtime-sprint-status-2026-10-09.md`, **Execution continuation — 2026-10-20**:
fresh 106-user source export, nine appended staging source records, one genuine
dual-session source recovery, verified private backup/local restore of the existing
production candidate, and passing final local checks. The 2026-10-19 drift evidence
below remains historical; its 104-user counts and unvalidated-constraint inventory
are not the current checkpoint. Provider settlement/email, source-missing files,
production-target/final-freeze reconciliation and cutover gates remain open. No
live application cutover, commit, push or deployment occurred. Earlier statements
about zero candidate/configuration writes are historical: SMTP/trusted origins
were configured, and reviewed candidate schema/data operations have executed.
Source access was refreshed through the official read-only Management API; the
older direct-PostgreSQL network blocker below does not mean exports are unavailable.
The historical gate table below is not current acceptance; use the latest appended
acceptance matrix in the sprint checklist.
The pre-existing dirty worktree was preserved.

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

---

## Controlled cutover procedure and gate — 2026-10-17

**Current decision: NO-GO.** This is an operator preparation procedure, not cutover authorization. It replaces an earlier draft that overstated staging evidence. Production continues to use its existing Supabase-backed Vercel configuration. No Neon production secret, route, DNS record, deployment, source row, Auth account, storage object, or payment was changed while preparing it.

| Gate | Status | Evidence | Required action before a GO decision |
| --- | --- | --- | --- |
| Target runtime | **PARTIAL** | Isolated Neon staging workflows, storage ACL HTTP checks, and synthetic browser Admin/College sign-in work. | Execute designated-QA and role browser journeys against the approved target after recovery is approved. |
| Source data | **PARTIAL** | The 2026-10-14 encrypted snapshot covers 80 public tables, 2,173 rows, 104 users, 105 identities, 13 buckets and 22 object metadata rows. Its all-public staging comparison had zero unresolved shared business differences. | Take a fresh maintenance-window snapshot, accept its source-only delta plan, apply a reviewed final delta, then reconcile the actual cutover target. |
| Identity | **BLOCKED** | 104 source users have zero verified source-to-Managed-Auth links. There is no verified full-fidelity Managed Auth import contract for Supabase hashes, provider identities or sessions. | Approve and test real-user proof-based recovery; complete the designated QA recovery/sign-in and support process. |
| eSewa | **BLOCKED** | Signed checkout, forged/duplicate/cancelled paths and ledger rules are tested. UAT login reports a reCAPTCHA quota failure; no successful settlement was observed. | eSewa restores UAT access, or the payment owner explicitly authorizes a supervised live test and refund/ledger procedure. |
| Backup and rollback | **PARTIAL** | Combined staging recovery restored 99 tables, 2,338 rows and 23 objects into isolated local recovery storage, including divergent-write detection. | Create and verify source/target production backup identifiers; rehearse target-write reconciliation or approved read-only rollback. |
| Deployment | **BLOCKED** | The application is hosted by Vercel and production currently uses Supabase. No evidence supports a DNS-only data-path switch. | Snapshot Vercel Production configuration by variable name, validate production Neon settings privately, then deploy the approved configuration. |

### Ordered operator procedure

1. Obtain written cutover authorization naming the incident commander, database owner, Auth/OAuth owner, payment owner, Vercel owner, maintenance window and rollback authority. Capture the active Supabase-backed deployment identifier and Production variable *names* in the protected change record.
2. Validate the approved production Neon database, Managed Auth, Object Storage, encryption, payment callback and email configuration in the operator console. Confirm that no secret is exposed through `NEXT_PUBLIC_` variables. Do not copy values into this repository or document.
3. Create restorable source and target database backups plus object-storage manifests. Record opaque backup IDs, timestamps, object counts and SHA-256 manifest digests. Restore both into isolation before continuing.
4. Announce maintenance, enable the application write freeze, and independently verify mutation endpoints and workers have stopped. Record the last accepted event and payment IDs.
5. Take a fresh consistent source snapshot with `node scripts/export-supabase-readonly-snapshot.mjs --include-schema`. Keep its absolute encrypted artifact path in the restricted change record; require expected project, `transactionReadOnly: on`, complete table coverage and encrypted readback verification.
6. Create the final source-only delta plan without writing either system: `node scripts/plan-source-snapshot-delta.mjs --baseline=/absolute/baseline.aes256gcm.json --final=/absolute/final.aes256gcm.json`. It reports opaque row fingerprints and every expected insert, update and deletion. Stop for blocked tables, a changed table set or unreviewed deletion.
7. Apply the separately reviewed idempotent final-delta tool to the approved Neon production target only after the plan is accepted. Re-run lossless all-public reconciliation and identity classification. Require zero unexplained source-only rows, shared business deltas and target mapping conflicts; never copy synthetic staging records to production merely to align counts.
8. Recover only users who complete the approved proof-based flow. Never link by matching email, write Neon Managed Auth internals, import unsupported password hashes, or transfer existing sessions. Verify the designated QA account before opening administrative routes.
9. Update Vercel Production configuration and deploy only after the preceding gates pass. This is the traffic switch; DNS is outside this procedure unless a separate documented domain change is required. Smoke-test login/recovery, College, Jobs, Mentorship, Events, Super Admin, private downloads, notifications and payment failure/cancellation.
10. Monitor error rate, authorization denials, reconciliation, payment callbacks, worker lag and object-download failures. For any critical authorization/data-integrity defect, payment double-processing, unrecoverable authentication failure or agreed sustained 5xx threshold, freeze writes first. If Neon accepted writes, export and reconcile them by stable ID and idempotency key before restoring the prior Supabase-backed Vercel deployment. Never replay payment capture or silently drop applications, bookings, registrations, notifications or messages.

### Final-delta scope and reproducibility

`scripts/plan-source-snapshot-delta.mjs` is a **source-to-source, read-only** planner. Given a baseline and a fresher final encrypted source snapshot, it validates project/database/read-only lineage, timestamp order, an unchanged public table set, final primary-key definitions and unique non-null row keys. It compares lossless JSON row values and emits only SHA-256-based row fingerprints for planned inserts, business-value updates and deletions. It cannot connect to, configure or write Supabase, Neon or Vercel. Its explicit `REQUIRES_SEPARATE_TARGET_RECONCILIATION` result prevents a source-only pass from being misreported as a target-conflict or synthetic-fixture review.

The 2026-10-13 → 2026-10-14 historical dry run completed with 80 public tables, no blocked primary keys and 0 expected inserts, updates or deletes. That result is only a regression check of those two old snapshots; it is **not** a production delta approval. At the write freeze, run the command in step 6 with the newest prior approved artifact and the final maintenance-window artifact, then stop for any blocked table, table-set change, deletion, unknown source-only row or target conflict.

The encrypted source snapshot captures all enumerated `public` base-table rows, columns, constraints, indexes, public functions/triggers/views/policies/enums/sequences/extensions, Auth user/identity metadata, and Storage bucket/object metadata in one read-only source statement. It deliberately excludes password hashes, all Auth session/recovery/OAuth tokens and Storage object bytes. Therefore the final operator checklist must additionally compare approved database/schema migration identifiers, target sequence positions, Auth/recovery ledger states, and a byte/SHA-256/content-type object manifest produced through the separately approved Storage transfer path. Those exclusions are intentional; they may not be silently treated as reconciled.

### Identity and payment readiness evidence

The current read-only identity classification against the 2026-10-14 artifact found 104 source users and 105 source identities: **0 linked**, **104 eligible to start the dual-session proof challenge**, **0 recovery-tested**, **0 ambiguous/unresolved**, and no detected legacy-account collision. “Eligible” is not an identity match and does not grant access: each person must authenticate to the new Managed Auth account and prove the legacy account in the approved flow. The designated QA administrator is not linked/verified. Users who cannot self-recover require a separately approved, audited support-verification procedure; no email equality, imported Supabase password hash, copied Google provider subject, or legacy session is accepted as proof.

**eSewa sandbox verification checklist — do not execute until eSewa restores UAT access:** (1) obtain the UAT incident resolution and record its ticket/reference; (2) create a server-signed, exact-price NPR checkout for a disposable staging fixture; (3) complete one genuine UAT settlement; (4) verify the signed return and provider status server-side against the original reference, merchant code, amount and currency; (5) replay the same callback and prove a single ledger/entitlement/ticket effect; (6) exercise cancellation, expiration, invalid signature/reference/amount and provider-unavailable paths; (7) retain only opaque transaction references and staging audit evidence; (8) clean up the fixture. A supervised live-payment test is a separate financial change requiring explicit payment-owner approval, documented settlement/refund handling and a reconciliation plan; it is not an alternative to silently declaring UAT successful.

For a supervised live-payment alternative, the payment owner must approve the amount, merchant wallet, test purchaser, refund owner and deadline in writing; finance must reconcile the wallet and internal ledger; support must confirm the service/entitlement state; and the payment must be reversed/refunded under the provider's actual process with its evidence retained. A production checkout may not be reused as a test fixture, and neither a browser return nor a manual ledger edit proves settlement.

### Current deployment observation

On 2026-10-17, read-only Vercel inspection showed the latest Production deployment as **READY** from commit `5c739302b2b6a1573ab12a73e58e175a6c4feb66`. The Production environment contains the existing Supabase configuration variable names and no Neon runtime variable names. The canonical `https://www.merotalent.com/` response is served by Vercel and its current Content-Security-Policy permits Supabase hosts. This confirms that the production traffic path remains Supabase-backed; it does not authorize changing it. Cutover is therefore a Vercel production-configuration/deployment traffic switch, not an assumed DNS migration.

### Draft communications — do not send

**Account recovery:** “MeroTalent is upgrading its account platform. On your first sign-in after the upgrade, verify your existing account through the secure recovery flow. Your applications and approved access remain associated with your account. If you cannot complete recovery, contact support using the account-recovery reference shown on screen.”

**Account-recovery support procedure:** Support records only the recovery reference, timestamp and the user’s chosen contact channel—never a password, source token, OAuth token or full identity document in the application. The designated recovery reviewer follows the separately approved identity-verification policy, records an auditable decision and invokes an idempotent, scope-preserving recovery action only after the proof requirements pass. Ambiguous, duplicate or failed proof cases remain locked and are escalated to the incident commander; no email-match override exists. These are drafts for approval, not instructions sent to users or an enabled production support workflow.

**eSewa UAT support:** “Our authorized ePay UAT merchant flow reaches the UAT login page, but it displays ‘This site is exceeding reCAPTCHA Enterprise free quota’ and disables login. Please confirm the UAT status and the required action to restore a successful test settlement. We need to verify a server-signed callback, duplicate callback handling, cancellation, amount/currency validation and ledger entitlement effects. No production credentials or transactions are requested.”

## Staging reconciliation and recovery execution — 2026-10-17

**NO-GO remains.** This pass implemented and executed reconciliation tooling, not production cutover. No source data, source Auth, production credentials, Vercel configuration, DNS or routing was changed. No remote database delta was committed and no real payment was made. Existing worktree edits and accounts remain intact.

### Implemented files and verification boundaries

| Files | Actual implementation |
| --- | --- |
| `scripts/staging-snapshot-delta.mjs`, `scripts/apply-source-snapshot-staging.mjs` | Separate staging-only three-way applier; exact raw JSON values, source hash/schema/PK preflight, dependency ordering, transactional replay, table locks, explicit conflict/deletion rejection, target-only fixture content hashes, post-replay row verification and sequence checks. |
| `scripts/plan-source-snapshot-delta.mjs`, `src/lib/server/source-snapshot-delta-plan.test.ts` | Import-safe source-only planner; exact comparison does not silently discard microsecond differences. |
| `scripts/staging-snapshot-delta.test.mjs`, `scripts/staging-delta-boundary.test.mjs`, `scripts/staging-snapshot-delta-local.test.mjs` | Pure conflict/idempotency/security tests plus a real disposable local PostgreSQL replay/commit/rollback/FK test. No remote production target is accepted. |
| `scripts/snapshot-storage-checks.mjs`, `scripts/reconcile-snapshot-storage-staging.mjs`, `scripts/snapshot-storage-checks.test.mjs`, `scripts/verify-neon-staging-storage-metadata.mjs` | Every approved source object's bytes, size, content type and cache-control checked against staging; opaque reference manifest; unexpected objects retained. Read-only default plus explicitly enabled conditional same-byte cache-header repair, tested on a disposable staging object first. |
| `scripts/recovery-integrity.mjs`, `scripts/recovery-integrity.test.mjs`, `scripts/verify-neon-staging-combined-recovery.mjs` | Exact table and schema fingerprints, structured schema failures, storage metadata archive and interrupted/divergent write recovery into a disposable local database/object archive. |
| `scripts/identity-recovery-classification.mjs`, `scripts/reconcile-source-snapshot-identities.mjs`, `src/lib/server/identity-recovery-classification.test.ts`, `src/test/neon-identity-link.test.ts` | Eligible, attempted, verified and linked states distinguished; missing attempt audit is unknown, not a successful or failed recovery. Google/email/dual-provider proofs preserve the application UUID and do not rewrite roles/capabilities. Expired/repeated invalid proofs fail closed. |
| `src/lib/server/payment-provider.ts`, `src/test/neon-mentor-event-guards.test.ts` | Fixed nonnumeric eSewa amount acceptance caused by `NaN` comparison; require finite positive exact minor units and a provider transaction reference on strict COMPLETE verification. Pending/cancelled/expired results do not become paid. |

### Staging delta: execution and precise blockers

Pinned target: `br-frosty-haze-azsnybmr`, `neondb`, expected staging PostgreSQL host only. The command rejects production execution environments, wrong branches/hosts, URL connection overrides, missing hashes and unapproved apply mode. It never consumes a source database administrator credential; source input is the already-approved encrypted snapshot. Production targets are unsupported, not an alternate CLI flag.

Approved historical artifacts used (restricted paths remain in the operator artifact directory):

- Baseline SHA-256: `2eb29dd47b282c7bcbf812712e32ac2892f3ac57015d36ef5699825510a1a369`.
- Final SHA-256: `45ee1e549d2445956e6cae7c5827f50adf6bffa1a087462ecefeb0e6fc8ac027`.
- Storage manifest SHA-256: `cd1f275e069e865508774033f8f3303ec52e6a853234cc622cb302e84a852a84`.

Executed both dry-run and rollback-probe on all **80 public tables**. Result: **BLOCKED, 0 persisted writes, 2,153 conflicts**. The exact comparison found 2,151 timestamp precision/representation conflicts and two independently modified rows. The independent rows are a previously audited profile update and staging provider configuration. Their contents/secrets were not logged or overwritten. Earlier “zero shared business differences” evidence used a timestamp-tolerant comparison; it is **not exact-value parity** and does not supersede this result.

The final read-only run normalizes equivalent timezone representations **only for schema-declared timestamptz columns**, retaining all six PostgreSQL fractional digits via integer microseconds. Timestamp-looking text/JSON is not normalized. It still reports **2,153 conflicts / 0 operations / 0 schema blockers**. Next reconciliation action: approve a fingerprint-bound restoration policy for confirmed import precision loss; explicitly preserve/adjudicate the profile/provider overrides. Do not globally round timestamps or overwrite staged provider secrets. Current implementation intentionally refuses these differences. Deletions require an approved policy; cyclic/self-referential mutation dependencies, enabled custom triggers/rules, generated/identity fields, side-effectful target defaults and unsafe sequences also fail explicitly instead of bypassing constraints.

Reproducible operator commands (absolute private artifact paths required):

```sh
node scripts/apply-source-snapshot-staging.mjs \
  --target=br-frosty-haze-azsnybmr --mode=dry-run \
  --baseline=/absolute/private/baseline.aes256gcm.json \
  --final=/absolute/private/final.aes256gcm.json \
  --baseline-sha256=APPROVED_BASELINE_SHA256 \
  --final-sha256=APPROVED_FINAL_SHA256 \
  --report=/absolute/private/new-dry-run.json
```

Repeat with `--mode=rollback-probe` and a new report path after the plan is clean. Only a reviewed clean staging plan may use `NEON_STAGING_DELTA_APPLY=br-frosty-haze-azsnybmr` with `--mode=apply-staging`. This pass did **not** do so. Mode dry-run is a read-only transaction; rollback-probe locks and rolls back; explicit apply uses a serializable transaction. Serialization/lock failures require a fresh plan, not blind retry. Unknown commit/report outcomes require target inspection before retry. Reports use exclusive file creation and mode 0600. Unvalidated constraints are reported separately; they are not labelled validated merely because a replay succeeds.

### Storage evidence and metadata gap

Read-only source GETs and staging S3 GET/list calls verified **22/22 source objects byte-for-byte**, SHA-256, size and content type against the approved manifest. Source size metadata matched for all 22. No source object is missing from staging. One unexpected staging object was retained. Five database resume references are absent from both the historical source object inventory and staging; they cannot be recovered from this source snapshot. The empty source bucket `Merotalent` is also absent from staging.

The stricter metadata pass initially found **0/22 matching Cache-Control headers**: source metadata specifies `max-age=3600`. An isolated synthetic object test then proved metadata retention, rejection of a stale ETag with HTTP 412, unchanged bytes after rejection, and verified fixture cleanup. [Neon's current S3 compatibility documentation](https://neon.com/docs/storage/s3-compatibility) lists Cache-Control support on PutObject; the staging test supplied actual execution evidence.

Executed the guarded `repair-cache` mode with the explicit staging target and `NEON_STAGING_STORAGE_METADATA_REPAIR=br-frosty-haze-azsnybmr`. All 22 original objects passed source/target hash preflight before repair. Each conditional same-key PUT preserved the original bytes/content type/custom metadata and checked the resulting bytes and cache header with GET. **Final result: 22/22 bytes, sizes, content types, source-size metadata and cache headers match; 22 staging metadata writes, 0 source/production writes.** No bucket ACL, existing account, object key or database reference changed. The one unexpected object was retained. The test object alone was deleted after testing. Stale-byte updates fail closed; ETag does not constitute a cross-service transaction or a production write-freeze, and the maintenance-window source/target fence remains required.

Repeat the source storage command with the approved `--snapshot`, `--snapshot-sha256`, `--manifest`, `--manifest-sha256` and new absolute private `--report` path. Default mode is `verify` and performs no writes. Cache repair additionally requires `--mode=repair-cache --target=br-frosty-haze-azsnybmr` and the explicit staging enable variable above. A partial failure reports completed metadata writes; re-reconcile before retry. There is no object deletion or production repair mode. Source-provider ETag, lastModified and HTTP status metadata remain fingerprinted in the source snapshot; these provider-generated values are not expected to equal Neon-generated values.

Private/public access is intentionally not inferred from successful credentialed GETs. Existing authenticated HTTP ACL evidence remains separate; no fresh ACL browser test was run here. Repairing metadata must preserve the existing bucket access configuration and repeat the authenticated/public-denial checks.

Private reports: `staging-delta-probe-20261017.json`, `staging-delta-20261017-typed-timestamps.json`, `storage-reconcile-20261017-metadata.json`, `storage-reconcile-20261017-cache-repaired.json`, and `combined-recovery-20261017-full-metadata.json` under the existing restricted `MeroTalent/migration-artifacts` directory. They contain fingerprints, counts and exclusions, not source personal data or credential values.

### Repeatable backup/restore proof

Run `node scripts/verify-neon-staging-combined-recovery.mjs` from the repository with the existing pinned `.migration.env` and local PostgreSQL 18 binaries. It exports a consistent read-only staging transaction, dumps `public` and `neon_auth`, snapshots all staging object bytes and metadata, checks that the source object set has not changed, and restores to a private local Unix-socket PostgreSQL instance and local object archive. It never restores over a remote database. On failure it emits the failing phase and a redacted reason; schema mismatches include the affected category and counts. Scratch resources are removed after the run.

Executed proof: **99 tables / 2,370 rows / 23 objects / 8,552,331 bytes** restored and compared. Schema comparisons include **1,218 columns, 1,072 constraints, 221 indexes, 16 non-extension functions, 47 triggers, 0 policies, 2 views, 6 enum values, 3 sequences and 99 table-security entries**. The report lists each included table with count and content hash, including identity/account-link tables. Interrupted uncommitted DB writes rolled back; interrupted object writes were detected/repaired; committed divergent DB/object writes were detected and restored to matching fingerprints. Cleanup passed.

This proves a **staging-to-local recovery rehearsal**, not a production backup or a second live S3 restoration. The full-metadata rehearsal captured the recovery point before the subsequent cache-header repair; it is not relabelled as a post-repair backup. The metadata archive now covers cache control, disposition, encoding, language, expiration and custom headers as well as content type/size/ETag/modified time. Owner/role grants, non-public/non-neon_auth schemas, live storage ACLs and production recovery-point freshness remain excluded. The five pre-existing missing resume references remain a reported reference-coverage failure, not restored files. A production maintenance-window source backup, target backup, matching object manifests, retention/off-site location, restore identifiers and tested ACL/role restoration remain mandatory before cutover.

### Identity and settlement evidence

Fresh read-only classification: **104 source users / 105 source identities / 104 eligible / 0 verified links / 0 recovery-tested / 0 documented attempts / 104 with attempt evidence unavailable**. Three staging-only application accounts are not counted as recovered source users. No collisions detected; designated QA ownership remains unverified. Do not label missing attempt logs “never attempted.” The tests exercise synthetic trusted proofs, not actual source-user recovery or a Google browser round trip. Actual owners must complete both source and Managed Auth proofs; unresolved support cases need an approved recovery policy without an email-match override.

The eSewa checklist above remains required. This pass used mocked provider responses only, with invalid/missing/nonfinite/sub-cent/mismatched amounts and missing strict settlement references now rejected. No UAT or live settlement was attempted. Provider UAT access must be restored and genuine signed settlement, duplicate-return idempotency and ledger/service state verified before the payment gate can pass.

### Corrections needed before the ordered operator procedure can be executed

1. **Write freeze is not yet an implemented source-wide control.** A UI maintenance flag is insufficient: prove direct database/API mutations, storage uploads, scheduled jobs, admin actions and callbacks cannot create untracked writes. The database/platform/payment owners must approve and rehearse a real source mutation fence and durable callback capture before step 4. No production policies, grants or workers were changed here.
2. **Step 7's production delta adapter remains a separate implementation/authorization gate.** The staging-only tool cannot be pointed at production. Exact conflicts, metadata repair, constraint validation and recovery policy must be resolved first. A new final snapshot under the verified fence replaces these historical artifacts.
3. **Before deployment**, privately verify each approved production DB/Auth/storage/callback origin and server-only secret; record prior Vercel deployment and variable names. Switch only after explicit approval, with designated QA recovery and role-isolation evidence available.
4. **Monitoring proposal for approval:** any cross-entity access, duplicate service activation, payment ledger mismatch or missing committed record triggers immediate write freeze. Proposed availability trigger: more than 1% 5xx for five consecutive minutes or repeated designated-QA sign-in failure; operators must approve thresholds/owners and prove alert delivery before GO.
5. **Rollback after writes is not an environment-only revert.** Freeze target writes and capture an encrypted target delta, object manifest, Auth-link changes and pending callback ledger. Reconcile applications/bookings/registrations/subscriptions and notifications by stable IDs and idempotency keys before reopening Supabase; do not replay payment capture. If reverse replay is not proven, keep the target read-only, preserve all writes, and invoke the approved support/compensation process. No production reverse replay was implemented or rehearsed by the local divergent-write test.

### Focused verification

- Node reconciliation/recovery tests: **15 passed**, including real local PostgreSQL exact numeric/microsecond replay, rollback, idempotency, typed timezone normalization, production/repair-mode rejection and foreign-key rejection.
- Vitest changed-component regression selection: **7 files / 51 tests passed** (source planner, identity classification/proof, provider verification and checkout authorization/configuration).
- `npm run typecheck`: passed.
- ESLint on changed scripts and TypeScript files: passed with no output/warnings.
- `git diff --check`: passed.
- No full-suite/build rerun: this request explicitly calls for focused verification and preservation of earlier passing broad-suite evidence; earlier broad results are not relabelled as current-revision runs.

**Exact cutover blockers:** source/target exact-value conflicts; historical missing-object/empty-bucket policy and fresh ACL verification; verified source-wide write freeze and production final-delta/reverse-replay procedure; designated-QA and real-user proof recovery; real eSewa sandbox settlement; production backup/ACL restoration and monitoring acceptance; final authenticated workflow acceptance and explicit production approval. These are not all external blockers—remaining engineering is called out above. No GO or migration-complete claim is made.

## Staging drift resolution — 2026-10-19

**NO-GO remains. The 2,151 timestamp-only row discrepancies have been corrected in isolated Neon staging.** Two independent staging edits remain explicitly visible. This comparison is against the approved **2026-10-14 encrypted source snapshot**, not a claim about today's live production state. No production connection, credential, configuration, data, storage, account, deployment, push or cutover was changed in this pass.

### Cause, classification and scope

The original `scripts/execute-real-migration.mjs` fetched `SELECT *` through node-postgres's default timestamp parser and passed the resulting JavaScript Date values into parameterized inserts. PostgreSQL microseconds were reduced to JavaScript milliseconds before insertion. The old source/target checks also serialized both sides as Date, which concealed that loss. The current regression reproduces the actual parser and insertion path against disposable PostgreSQL, restores exact microseconds and verifies all other fields stay unchanged.

Every one of the initial **2,153 affected rows** was classified by source table, opaque primary key, field names/types, source/before hashes and source membership. **2,151 timestamp-only rows** matched the exact historical pg Date conversion while their non-timestamp fields matched the approved source; changed timestamps also had to agree between both approved source snapshots. Two rows contained independent staging changes. No timestamp-looking text or nested JSON was globally normalized. No source record was excluded because it looked like test data. Synthetic provenance is not guessed from names: the ledger records source membership, while all **69 target-only records** remain outside source-row parity and were preserved.

`scripts/staging-timestamp-drift.mjs` implements this narrow classification. The existing staging applier now accepts `--repair=pg-date-precision` and requires a reviewed `--expected-ledger-sha256` for rollback-probe/apply. That hash covers the source artifact, all 80 target table fingerprints, schema state and per-row decisions. Concurrent target changes invalidate it. SQL updates also require the complete prior row to match, protecting unrelated staging edits.

Only approved timestamp fields are assigned. Pure `updated_at` triggers are suspended by exact name/body inside the locked transaction and restored to their original enabled mode before verification. Role/payment guards remain enabled and are accepted only with reviewed bodies. `UPDATE OF` guards remain enabled; PostgreSQL skips them when none of their named columns is assigned. A real PostgreSQL regression keeps a rejecting guard enabled and proves a disjoint timestamp update succeeds. The repair never changes roles, capabilities, assignments, subscription/payment state, primary keys or relationships.

Two tooling defects exposed by execution were fixed: the batch SQL alias collided with the real `leads.payload` column, and PostgreSQL catalog `name[]` FK column lists needed explicit `text[]` conversion. Failed probes rolled back with zero persisted writes. Both cases are covered by the real PostgreSQL regression. No constraint or authorization guard was removed to make the corrections pass.

### Corrections actually committed

| Batch | Rollback-only result | Committed staging updates | Remaining differing source rows |
| --- | --- | --- | --- |
| First proven timestamp batch | PASS, 0 persisted writes | 2,126 | 27 |
| Column-specific guard review | PASS, 0 persisted writes | 25 | 2 |
| Audited profile creation date | PASS, 0 persisted writes | 1 | 2 |

Total: **2,152 timestamp-restoration row updates across 44 tables**. This comprises all 2,151 initial timestamp-only rows plus the creation date in the independently edited profile. That profile's later audited `updated_at` was preserved. Every batch compared the complete expected target rows across all 80 tables, including extra target columns and target-only records, before commit. Schema definitions, trigger enabled states and sequence state matched before/after. No record was inserted/deleted and no other field was changed.

Human-readable table ledger (the restricted JSON reports contain every opaque row key and fingerprint):

| Table | Rows corrected |
| --- | ---: |
| audit_logs | 1278 |
| badges | 4 |
| college_applications | 11 |
| companies | 1 |
| competition_registrations | 2 |
| competitions | 1 |
| contact_queries | 1 |
| entity_admin_assignments | 7 |
| entity_feature_grants | 8 |
| entity_scope_requests | 1 |
| event_registrations | 2 |
| events | 2 |
| featured_items | 5 |
| institute_admins | 6 |
| institute_content_ownership | 2 |
| institute_ingestion_provenance | 123 |
| institutes | 295 |
| job_applications | 5 |
| jobs | 3 |
| leads | 24 |
| media_upload_intents | 3 |
| mentor_bookings | 5 |
| mentor_services | 2 |
| mentors | 1 |
| module_capabilities | 5 |
| module_entitlements | 2 |
| module_form_definitions | 4 |
| module_form_submissions | 16 |
| notifications | 30 |
| packages | 9 |
| page_sections | 17 |
| payments | 1 |
| permissions | 10 |
| platform_module_trial_settings | 3 |
| profiles | 103 |
| role_permissions | 13 |
| skills | 10 |
| sub_admin_requests | 3 |
| subscriptions | 3 |
| user_module_capabilities | 9 |
| user_permissions | 11 |
| user_preferences | 1 |
| user_roles | 103 |
| user_skills | 7 |

### Explicit retained-conflict ledger

| Table / opaque primary key | Fresh evidence | Disposition |
| --- | --- | --- |
| profiles / `bef3a01a108de090` | Only `updated_at` now differs. One `migration_source_profile_contact_delta` audit event references an approved snapshot. The associated role, capability and assignment counts remain 1 / 1 / 1. | Retain the audited staging update timestamp. Its original source creation timestamp is now restored. Do not replay this staging timestamp into the production source. |
| provider_configurations / `df807153104158a8` | One `staging_configure_esewa_uat` audit event and the expected eSewa UAT/test merchant configuration. Observed differences are encrypted credential fields, enablement/public configuration and configuration audit fields. Secret values were not emitted. | Retain as an explicit sandbox override because staging checkout depends on it. Do not export its credentials/configuration to production or replace it with source production configuration. |

These exceptions are retained field differences, not silently filtered rows. The final report still reports **2 conflicts**. Strict zero-exception parity is therefore **not claimed**. There are no remaining unclassified rows among the initial 2,153; the two known overrides require acceptance as staging exceptions or a separately authorized disposition before any zero-difference claim.

### Fresh data and schema evidence

The final read-only comparison covers **80 tables, 2,173 source rows and 2,242 staging rows**. All source primary keys remain present, **2,171 source rows match exactly**, two have only the field differences above, and all 69 target-only rows remain intact. Canonical fingerprints preserve numeric precision and microseconds; equivalent timezone representations are compared only for schema-declared timestamptz values. Source-only missing rows: **0**. **95 existing target FK relationships were checked: 0 orphan rows**. The 21 existing unvalidated constraints were preserved and remain explicitly unvalidated; they are not called validated merely because the row correction passed.

The source catalog was compared object-by-object with current staging; definitions are represented by hashes. This exposes the existing schema differences rather than hiding them behind successful row counts:

| Category | Source objects | Staging objects | Exact source matches |
| --- | ---: | ---: | ---: |
| Columns | 1020 | 1140 | 1018 |
| Constraints | 367 | 1001 | 308 |
| Indexes | 177 | 200 | 177 |
| Functions | 153 | 94 | 46 |
| Triggers | 87 | 47 | 47 |
| Views | 2 | 2 | 2 |
| Policies | 390 | 0 | 0 |
| Enum values | 6 | 6 | 6 |
| Sequences | 2 | 3 | 0 |
| Extensions | 7 | 4 | 2 |

Column definition exceptions are `audit_logs.id` and `guest_college_verification_sends.id`; all source columns exist. The sequence catalog includes a missing original `audit_logs_id_seq` name and a differing `guest_college_verification_sends_id_seq` definition/state. Current relevant sequence next-value checks passed, and all sequence state was preserved during repair; copying an older source counter over staging activity would be incorrect. Target-only constraints/objects include additional staging architecture and PostgreSQL catalog differences; they were not dropped. Missing Supabase policies/functions/triggers need their existing Neon runtime/security replacements mapped and accepted. This pass does **not** establish full schema/security parity or authorize copying Supabase Auth-dependent SQL into Neon.

### Reproduction and evidence locations

Private artifacts are in `/Users/aashutoshjha/Library/Application Support/MeroTalent/migration-artifacts/` with owner-only permissions:

- `drift-classification-20261019.json`: all 2,153 initial per-row classifications and reviewed ledger hash.
- `drift-rollback-probe-20261019.json`, `drift-applied-20261019.json`: first 2,126-row probe/application.
- `drift-remaining-classification-20261019.json`, `drift-remaining-probe-20261019.json`, `drift-remaining-applied-20261019.json`: remaining 25-row probe/application.
- `drift-profile-creation-plan-20261019.json`, `drift-profile-creation-probe-20261019.json`, `drift-profile-creation-applied-20261019.json`: creation-date-only correction with the independent audited update preserved.
- `drift-final-parity-20261019-complete.json`: fresh final row, catalog, FK and independent-edit provenance evidence.
- `drift-final-idempotency-20261019.json`: final execution-mode rerun with **0 planned repairs / 0 persisted writes / the same 2 retained conflicts**, schema/sequence fingerprints preserved. Reviewed final ledger hash: `08d26018f10055a4dfafb2a9e6afc6761033c23875170416b01107c5a3d92704`.

Exact final read-only command (a report path must be new; existing evidence is never overwritten):

```sh
node scripts/apply-source-snapshot-staging.mjs \
  --target=br-frosty-haze-azsnybmr --repair=pg-date-precision \
  --mode=dry-run --schema-evidence=yes \
  --baseline='/Users/aashutoshjha/Library/Application Support/MeroTalent/migration-artifacts/source-2026101323084186140000-2eb29dd47b28.aes256gcm.json' \
  --final='/Users/aashutoshjha/Library/Application Support/MeroTalent/migration-artifacts/source-202610140953213311030000-45ee1e549d24.aes256gcm.json' \
  --baseline-sha256=2eb29dd47b282c7bcbf812712e32ac2892f3ac57015d36ef5699825510a1a369 \
  --final-sha256=45ee1e549d2445956e6cae7c5827f50adf6bffa1a087462ecefeb0e6fc8ac027 \
  --report='/Users/aashutoshjha/Library/Application Support/MeroTalent/migration-artifacts/drift-final-parity-20261019-complete.json'
```

Rollback probes use the same base arguments with `--mode=rollback-probe`, a new report path and the dry-run ledger hash. Staging applications additionally set `NEON_STAGING_DELTA_APPLY=br-frosty-haze-azsnybmr` and use `--mode=apply-staging`. Applied ledger hashes were `79cb3ced5e18a5080fe276699d6f496762639e313903328468e96fdf5b4f1fe1`, `0de2c9a41e093f6f3893c9f7f0610b15a659f39fc834319ea6d0e8d36a9b7148`, and `1fa8aab3fb822fb793584482e5ade6cfd29656cd45482c5df0d4b517b8faed4b`. These historical hashes cannot authorize a changed target; a stale plan fails closed.

### Other gates preserved

Fresh read-only identity classification still finds **104 source users / 105 identities / 0 verified source links / 0 recovery-tested**; designated QA ownership remains unverified. No account was linked, deleted or granted access. Three staging-only application accounts are kept separate from the source population. The five historical missing resumes remain documented with no fabricated replacement. No new eSewa settlement, production backup/restore, source-wide write freeze, rollback acceptance or authenticated browser acceptance is claimed. Existing local recovery proofs do not become production backup evidence after these staging changes.

**Remaining work:** accept/adjudicate the two explicit staging overrides; reconcile and accept source-to-Neon schema/security mappings and the unvalidated constraints; take a fresh source snapshot under the verified production write fence; complete proof-based identity recovery, genuine sandbox settlement, authenticated workflow acceptance and production backup/rollback readiness. An explicitly authorized production cutover is still required.

### Verification for this revision

- `node --test scripts/staging-delta-boundary.test.mjs scripts/staging-snapshot-delta.test.mjs scripts/staging-timestamp-drift.test.mjs scripts/staging-schema-evidence.test.mjs scripts/staging-snapshot-delta-local.test.mjs`: **15 tests passed**. Includes actual Date-parser/insertion precision loss, exact correction and rollback, stale-row rejection, payload-column collision, FK catalog conversion, enabled column-specific guards, pinned role/payment bodies and audit-required mixed-profile correction.
- `npm run typecheck`: passed.
- Changed-file ESLint for the applier, delta/precision/schema helpers and their tests: passed, no warnings.
- `git diff --check`: passed.
- Three real staging rollback probes and corresponding applications: passed. Final reconciliation execution: passed with zero writes and both retained edits still present. Foreign-key orphan checks: 95 relationships / zero missing parents.
- Broad successful suites, production build, provider settlement, recovery browser flows and production restore were not rerun or claimed as new evidence. No commit, push or deployment occurred.
