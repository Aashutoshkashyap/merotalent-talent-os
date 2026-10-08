# Neon Managed Auth staging: safety stop (2026-10-08)

This records an isolated, read-only verification. **No production or staging
database rows were changed, no identity was created or linked, and no service
was deployed.** Do not treat the prior institute tests as staging evidence.

## A–B. Auth and target configuration actually discovered

- Neon project: `summer-sky-63693897`.
- Isolated branch: `migration-staging` (`br-frosty-haze-azsnybmr`), compute
  `ep-wispy-credit-azt6tgwj`, database `neondb`.
- Branch Auth URL:
  `https://ep-wispy-credit-azt6tgwj.neonauth.c-3.ap-southeast-1.aws.neon.tech/neondb/auth`.
- Managed Better Auth exists on that branch. `neon_auth` has 9 tables and 0
  users. Unauthenticated `GET /get-session` returned HTTP 200 and `null`.
- In the staging-branch console: email signup/signin are enabled; “Verify at
  Sign-up” is off; Google is listed with shared keys; localhost is allowed;
  the email provider is Neon shared; no trusted application domain was shown.
  These settings do not prove a successful login, callback, or email delivery.
- Local staging runtime requires `MEROTALENT_BACKEND_MODE=neon-staging`, the
  branch-bound `NEON_STAGING_DATABASE_URL`, `NEON_STAGING_BRANCH_ID`, and
  `NEON_AUTH_BASE_URL`. No staging app deployment or browser Auth callback was
  configured or tested. Never set these on Vercel Production.

## Critical database target mismatch

The saved `.migration.env` value named `NEON_STAGING_DATABASE_URL` targets
`ep-polished-flower-azsezy8a-pooler`, which the Neon Console independently
identifies as the **Neon `production` branch** (`br-falling-breeze-azr6q64l`).
Read-only SQL against it showed 80 `public` tables, 102 profiles, and zero
Managed Auth users. Read-only SQL using the same role credential and the
console-verified **actual staging compute** showed zero `public` tables and
zero Managed Auth users. Thus the prior “80 tables / 2,164 rows on staging”
claim and staging integration test results were misattributed. The actual
staging branch has no application `profiles` or `institutes` to link or test.
The Neon Console shows migrated buckets on its default `production` branch
but **no buckets on `migration-staging`**. The earlier 22-object parity claim
cannot be treated as isolated staging storage proof.
This finding does not by itself establish when or how the Neon production
branch acquired the copied data/objects; no corrective migration is performed here.

## C–E. Link and server identity

No `neon_identity_links` table was created because its application-profile FK
cannot target a missing `public.profiles` table on the isolated branch. No
staging test account was created. The existing `neon-session.ts` path still
requires a real verified Neon session and a unique verified link before
resolving a profile; it does not infer identity from email, client UUID, or
roles. This turn added independent branch/compute/Auth-host validation before
that path forwards a cookie or opens the database. The schema intended for a
future approved staging pass is a unique Neon Auth subject FK, unique
application/legacy UUID FK(s), explicit provider, status, provenance,
verification timestamp, and revocation metadata—not an email lookup.

## F–K. Exercises and security

- Actual Auth session/login: **not exercised** (no staging test identity).
- Authenticated institute HTTP GET/PATCH and mutation: **not exercised**.
- Browser login/callback/cookies/logout: **not exercised**.
- Staging Google OAuth and password flows: **not exercised**. Shared Google
  keys and enabled email switches are configuration, not flow proof.
- Unit tests for rejected cross-branch database/Auth URLs, absent sessions,
  and caller-supplied identity: **11 passed across 2 files**. These are not
  a substitute for real Auth or HTTP authorization tests.
- No identity links, user imports, Supabase changes, or production writes.

## L. Eventual identity reconciliation (design only)

For the 102 legacy users / 103 identities (90 Google, 13 email, one dual),
create an offline reconciliation manifest keyed by immutable Supabase user
UUID and provider subject. Verify provider subjects and account ownership
before linking; email equality is only a review signal, never automatic
authorization. Preserve the one dual account as one application UUID with two
proved provider identities. Require manual review of collisions, unverified
emails, mismatched provider IDs, and existing-account conflicts. If current
Managed Auth cannot import password hashes, use a verified reset/set flow;
expect legacy sessions to require re-authentication. The exact supported
import mechanism remains to be proven separately; this is not permission to
import or cut over users.

## M. Stop condition and next authorization

The user expressly prohibited rerunning database migration and modifying
production. The actual staging branch lacks the application schema/data, so
creating a valid FK link or proving an authorized institute update is
impossible under this task's limits. First independently reconcile the earlier
migration report with the two branch endpoints, then obtain separate approval
for a safe staging-only database and object restoration/copy plan. Re-verify
table/row/hash and object/byte/hash parity **on `br-frosty-haze-azsnybmr`**
before resuming Auth linkage. Never
silently reinterpret the Neon production branch as the isolated target.

**Status:** Database and storage parity previously recorded on the wrong Neon
branch; actual staging application database and storage buckets absent. Neon runtime partially migrated; institute
vertical slice only partially verified; Auth blocked; Realtime not migrated;
production cutover **NO-GO**.
