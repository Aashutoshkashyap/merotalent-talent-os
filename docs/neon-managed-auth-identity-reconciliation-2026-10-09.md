# Neon Managed Auth identity reconciliation — 2026-10-09

This is a read-only migration planning artifact, **not** permission to import or link production users. No production Auth, OAuth, sessions, passwords, or Neon managed Auth tables were changed.

## Current official support boundary

- Current Neon Managed Auth runs Better Auth inside Neon's managed service, with Auth data in `neon_auth`. It is **not** a drop-in self-hosted Better Auth deployment. Neon says custom server-side plugins and handlers are not yet supported. See [Neon's current architecture announcement](https://neon.com/blog/neon-auth-branchable-identity-in-your-database).
- Neon's older [Supabase-to-Neon Auth article](https://neon.com/blog/supabase-auth-neon-auth) uses **Stack Auth** and its user-create API. It does not establish an import API for current Managed Auth.
- Better Auth's [Supabase migration guide](https://better-auth.com/docs/guides/supabase-migration-guide) documents a **self-hosted** database import: preserves source UUIDs and provider account IDs in tables, and requires a custom bcrypt verifier to retain password login. It explicitly invalidates existing sessions. That guide cannot be assumed to work against Neon Managed Auth, because its server-side verifier/plugin control has not been shown available there.
- No current official Neon Managed Auth import contract was found for Supabase password hashes, Google provider identities, legacy UUID preservation, or session transfer. **Do not write directly into managed `neon_auth` tables** as a substitute for a supported import API. This is an absence-of-confirmation finding, not proof that Neon can never support it.

## Deterministic read-only report

Run `node scripts/neon-identity-reconciliation-report.mjs` only in the approved migration environment. The script hard-checks the exact source host and isolated Neon migration-staging compute, uses `REPEATABLE READ READ ONLY` transactions on both databases, and emits no email, UUID, provider ID, password hash, token, or connection string. Each record has a stable SHA-256-based fingerprint; **fingerprints are pseudonyms, not anonymity**, because someone who already knows a source UUID can recompute one. Keep the full JSON report access-restricted.

Observed source snapshot: **103 users, 104 identities**. Target: one synthetic staging Managed Auth user and one synthetic identity link, with **zero** verified source-user links. The synthetic target link is deliberately reported as an orphan from this source-user perspective; it is not a production identity collision.

| Classification | Count | Meaning |
| --- | ---: | --- |
| Explicitly verified source link | 0 | No production user has an approved, valid ledger link. |
| Candidate for approved linking flow | 97 | 91 have a Google provider subject; 6 have a verified email identity. These are **candidates only**; neither source records nor email equality prove ownership in Neon. A live provider assertion or verified recovery challenge and an approved policy are still required. |
| Reset or reauthentication required | 5 | No verified Managed Auth bcrypt import path; the source has a password hash but no classified provider proof path. |
| Collision | 0 | No duplicate normalized source email, source provider account, or target link was observed. |
| Unresolved | 1 | No supported identity-proof path established from the available source attributes. Needs manual, privacy-preserving review. |

The script also reports zero orphan source identities. Its 103 user records and 104 identity records carry only opaque fingerprints, identity type, classification, and non-PII reason codes. Identity classifications inherit their owner's status; orphan identities are unresolved. It intentionally does not create a mapping from an email match.

## Safe next decision

Ask Neon for an explicit **current Managed Auth** import/linking contract covering bcrypt verification, Google subject continuity, UUID preservation, and required session behavior. If none exists, approve a controlled user-action plan: each person signs in through current Managed Auth (or resets credentials), proves ownership of the **legacy** account through a separately verified challenge, then a privileged server transaction creates the one-to-one identity-ledger link. The staging Auth session by itself is insufficient to select a legacy account, and an email match must never grant access. This is still a proposed plan, not an implemented production flow.

Production cutover remains **NO-GO** until all source users are reconciled or explicitly handled and the unrelated runtime migration gates also pass.

## 2026-10-11 staging-only dual-proof implementation

`POST /api/v1/neon-staging/auth/link-legacy` is a bounded **application-ledger linking proof of concept**, not a Neon Managed Auth user import. The browser must hold a current, email-verified Neon Managed Auth session and explicitly provide a current Supabase Auth access token for the legacy account. The server validates that token with the exact existing Supabase Auth `/auth/v1/user` endpoint using a publishable key; it never trusts a browser-supplied legacy UUID or email equality. Both source and target proofs are required. The source token is neither stored nor returned.

The proof endpoint is **fail-closed by default**: `NEON_STAGING_IDENTITY_ALLOWED_SOURCE_ID` must contain exactly one approved synthetic source UUID, and a validated source session for any other account is denied. That environment variable is not configured in the current migration environment. Do not set it to a production person's account. This prevents the proof-of-concept code from linking any of the 103 historical production accounts while staging access remains uncontrolled.

`dryRun: true` checks the same conditions and returns `would_link`, `already_linked`, or a conflict/error without writing. A real staging link locks the migrated profile/account rows, requires an active profile/account, refuses any existing conflicting or disabled mapping, inserts one unique verified ledger link, and records a credential-free audit event in the same database transaction. Retrying an exact verified link returns `already_linked`. Unique-constraint races return a conflict; there is no silent reassignment. `neon_application_accounts.legacy_user_id` remains the original Supabase UUID, so existing profile and ownership foreign keys are not rewritten.

This supports a user-action path for Google and email/password users **only if they can authenticate to both systems**. A Google user must sign in to Managed Auth separately, then prove the old account with a current Supabase session; the original provider identity is not imported. A password user whose old session/password is unavailable needs a supported recovery on the source side and Managed Auth sign-up/reset before dual proof; preserving the old bcrypt hash is **not** claimed. Existing Supabase sessions do not transfer. If legacy proof is impossible, manual recovery needs an approved policy and a separate audited implementation; this endpoint will not map by email.

Rollback/recovery in staging should **disable** the exact ledger link and associated application account through a separately reviewed, audited operator transaction, not delete either Auth user or reassign a UUID. Re-linking a disabled link is deliberately blocked here pending explicit adjudication. The endpoint is staging-only and `getBackendMode()` rejects Neon staging in Vercel Production. A production cutover or enabling this flow for real users requires explicit approval, secure UI/CSRF review, rate limiting, provider-host/credential availability, a live synthetic dual-session test, and reconciliation/rollback rehearsal.

The attempted read-only source/target count refresh on 2026-10-11 failed before connecting because the existing Supabase database host did not resolve (`ENOTFOUND`), including after a permitted-network retry. Thus the **103/104 snapshot and zero verified source links above remain historical, not confirmed current**. No production account or staging link was changed by that check. Current Neon Managed Auth documentation still has no verified official Supabase identity/password-hash/Google-subject import contract; the older Stack Auth article is not applicable to the current Better Auth-backed managed service.

## 2026-10-14 verified source snapshot and recovery UI

The encrypted source artifact now covers one supported Supabase Management
read-only API SELECT at `2026-10-13T23:08:41.8614+00:00`, with verified
`supabase_read_only_user`, read-only transaction state, MVCC snapshot
`3483:3483:`, **80 public tables / 2,173 rows**, **104 Auth users / 105
identities** (92 Google and 13 email identities), and storage metadata for
13 buckets / 22 objects. Password hashes, source sessions, recovery tokens and
OAuth access tokens were excluded. The persistent artifact is encrypted with
AES-256-GCM, owner-readable only, and the encryption key is in the operator's
macOS Keychain. This removes the consistent Auth/source snapshot blocker through
the existing supported read-only API; the dedicated PostgreSQL read-only role
still lacks `auth` schema permission and was not replaced with an administrator
database connection.

`scripts/reconcile-source-snapshot-identities.mjs` reconciles this artifact
against one read-only target transaction and requires verified ledger provenance,
an active source/profile/application account, and an actual Managed Auth user.
The observed target result at `2026-10-14 04:32:32.957677+00` is **0 verified
source links / 104 source users awaiting current ownership proof**, with no
mapping collision and no verified designated `qa.admin@merotalent.com` link.
Staging-only test identities are excluded from that source-linked count.

Current [Neon Supabase migration documentation](https://neon.com/docs/auth/migrate/from-supabase)
explicitly says existing password users need new accounts or OAuth
reauthentication because the hashing algorithms differ. Its Supabase-compatible
SDK guide does not provide a supported historical password-hash, Google-subject,
legacy-UUID or session import contract. The recovery screen therefore uses
provider-supported new-account email verification plus a separate live source
session; it never inserts into managed Auth tables or links by email.

The ignored local `.migration.env` now explicitly enables
`NEON_STAGING_IDENTITY_LINK_MODE=verified-source`. The browser's pinned source
publishable configuration already exists in the ignored `.env`. Only isolated
staging accepts this mode. `/account-recovery` and its source callback are wired
in the application router, and login routes an authenticated but unlinked
Managed Auth subject to the recovery screen. Password recovery retains only a
temporary source session. Google recovery permits only already-approved local
or Vercel preview callback origins; a local source popup requires
`http://localhost:3000` or `http://localhost:3001`, while the general staging HTTP
harness currently uses port 3210. No source OAuth configuration was changed.

The UI now handles unverified existing new-account sign-ins, code resend,
verified-email responses that issue no session, failed ownership proof, backend
link conflicts, and successful server-confirmed linking before redirecting. The
server rejects malformed origin headers and malformed/expired Managed Auth
session expiry. **35/35 focused tests across 8 files passed**, including the new
recovery screen (4 tests) and Managed session validator (2 tests); changed Auth
files have zero ESLint warnings/errors. Additional contact-replay provenance
testing is recorded in the main runtime checklist.

There is still no supplied QA password/session in the workspace's existing
credential configuration, so no real QA account was logged into source Auth,
linked or recredentialed. A current owner-authenticated source session and a
verified Managed Auth account are required to exercise that final account
journey. Possessing database and dashboard access does not replace ownership
proof, and no capabilities or entity scopes were rewritten by the recovery
implementation.
