# MeroTalent Neon migration status — 2026-10-08

This is an evidence-based **NO-GO** checkpoint, not a production cutover approval. Supabase production remains active and unmodified. The one synthetic Neon identity below exists only on the isolated `migration-staging` branch.

## 1. Source architecture

The live application still uses Supabase PostgreSQL, Supabase Auth, Supabase Storage, and Supabase Realtime. Vercel serves the Next.js application. The source credential was used for read-only identity inventory; no source Auth records were changed.

## 2. Target architecture

The intended target is Neon PostgreSQL, Neon Managed Auth, Neon Object Storage, server-side application authorization, and durable user-scoped application events/SSE. Only portions of this architecture run in staging. Production backend mode remains `legacy` and Neon staging mode is rejected when `VERCEL_ENV=production`.

## 3. Database migration evidence — VERIFIED snapshot, PARTIAL current parity

The prior controlled snapshot had 80/80 tables, 2,168/2,168 rows, and 80/80 table SHA-256 matches. That evidence remains valid **for that snapshot**. This sprint deliberately added one synthetic staging profile plus the two identity-ledger tables, so a new whole-database parity claim would be false. A final source-to-target delta reconciliation is required before cutover.

## 4. Storage migration evidence — VERIFIED objects, PARTIAL buckets/runtime

The prior snapshot verified 22/22 objects, 8,552,263 bytes, and 22/22 object SHA-256 matches. 12/13 bucket names are present; the excluded `Merotalent` bucket was empty and unmapped. Runtime storage consumers are not fully migrated.

## 5. Auth migration evidence — PARTIAL

The isolated staging endpoint accepted one synthetic email/password signup and issued a real Managed Auth session. A local staging HTTP UAT exercised 16 checks: public college 200, no/invalid session 401, unlinked and disabled identity 403, linked profile 200, authorized own-profile write 200, cross-entity read/write 403 with unchanged institute data, and logout followed by 401. No production identity was imported, no Google OAuth login was exercised, and the synthetic test password was not logged or committed.

## 6. Identity reconciliation — PARTIAL / production import BLOCKED

`public.neon_application_accounts` preserves an application-account ID and unique legacy Supabase UUID. `public.neon_identity_links` uniquely binds a Managed Auth subject to that account with explicit verified/disabled state. Runtime access requires a real Managed Auth session and a verified link; it never links by email or infers an admin role from email. One synthetic staging mapping was tested.

The read-only source dry run found **103 users, 104 identities, 91 Google identities, 13 email identities, 97 verified emails, 15 password hashes, and one dual-identity user**. This differs from the prompt's older 102/103/90/13/96 snapshot: source Auth changed, so those counts must not be used for cutover. There were zero missing identities, orphan identities, normalized-email collisions, or provider-account collisions in that read. **Zero of the 103 source users have a verified Neon mapping.**

Current Neon Managed Auth is Better Auth-based, not the former Stack Auth service. The older Neon Stack Auth import article does not establish a supported import route for the current managed service. Better Auth's self-hosted Supabase guide describes bcrypt migration by configuring a custom password verifier, which has **not** been shown configurable in Neon Managed Auth. Do not write directly into managed `neon_auth` tables or claim password/Google portability. The safe fallback is a controlled reauthentication/password-reset plan with explicit subject linking after proof of ownership. Existing sessions are not transferable.

References: [Neon Managed Auth architecture](https://neon.com/blog/neon-auth-branchable-identity-in-your-database), [Better Auth Supabase migration guide](https://better-auth.com/docs/guides/supabase-migration-guide).

## 7. Runtime migration — PARTIAL

The staging DB, repositories, authorization, object-storage boundaries, public institute route, and synthetic own-profile route exist. Most public/admin/student workflows still use Supabase. A source search currently finds **116 runtime files** matching Supabase client, RPC, storage, or Realtime patterns (a broad candidate count, not a fully adjudicated dependency inventory). No production runtime fallback was changed.

## 8. Authorization model — PARTIAL

The desired path is verified Auth subject → unique identity link → active application profile → role → module capability → exact entity assignment → active entitlement → operation. The current institute slice enforces the relevant checks server-side, and staging denial tests passed. The remainder of the product has not yet received equivalent Neon authorization. Supabase RLS was not copied blindly.

## 9. Realtime replacement — BLOCKED

Notifications and messaging still depend on Supabase Realtime. The staging SSE endpoint is intentionally closed. Durable event persistence, topic authorization, conversation isolation, reconnect, and end-to-end tests are not implemented; an in-process emitter is not a Vercel-compatible replacement.

## 10. Module verification

| Module | Neon runtime status |
| --- | --- |
| Colleges | PARTIAL: public institute and protected description/profile slices only |
| Jobs | BLOCKED: live student/recruiter flows not migrated or authenticated in Neon |
| Mentors | BLOCKED: booking/payment/administration not migrated or authenticated in Neon |
| Events | BLOCKED: registration/payment/tickets not migrated or authenticated in Neon |
| Partnered courses | PARTIAL: existing external redirect remains on the legacy runtime; no internal LMS |
| Payments | BLOCKED: live eSewa/settlement/subscription runtime not migrated or verified in Neon |
| Notifications | BLOCKED: Supabase Realtime/runtime dependencies remain |
| Messaging | BLOCKED: Supabase Realtime/runtime dependencies remain |

## 11. Final delta synchronization — NOT TESTED

Before any cutover, take a new read-only source snapshot, compare every application table and object by primary key/version/hash, classify inserts/updates/deletes and conflicts, and produce a dry-run report. Freeze writes in a controlled window, reconcile Auth identities separately, then apply idempotent deltas to the **production** Neon branch only after a reviewed plan and backup. Never blindly overwrite newer target records. Current source Auth count drift demonstrates why this step is required.

## 12. Production cutover steps — NOT APPROVED

Require green Auth import/reauthentication, full runtime dependency removal, functional schema parity, full module UAT, event transport, storage runtime UAT, and final delta reconciliation. Then verify distinct production/staging DB/Auth/storage targets, prepare secrets and OAuth callbacks, schedule a controlled write window, take backups, switch Vercel configuration, deploy, smoke-test, monitor, and preserve Supabase standby. None of these production switches occurred in this sprint.

## 13. Rollback procedure — PARTIAL PLAN, NOT VERIFIED

Keep the last Supabase-backed Vercel deployment and its environment configuration available. If a cutover fails, freeze writes and payment callbacks first; record the last successful transaction/event IDs and the exact cutover timestamp. Restore the prior deployment and Supabase DB/Auth/Storage/Realtime environment variables **as a set**. Keep gateway webhooks pointed at one active verifier. Reconcile Neon-only writes back to Supabase by stable IDs and idempotency keys before reopening writes. Explicitly deduplicate payments, job/event applications, notifications, and messages; never replay a payment capture. Test this procedure in staging before calling rollback verified.

## 14. Supabase standby — REQUIRED

Do not delete, rotate away, or disable Supabase during migration or the observation period. Preserve backups, credentials, OAuth configuration, storage, and a documented read/write ownership decision so rollback does not create two active payment or write processors.

## 15. Dependency scan — REMAINING

Broad application search: 116 non-test files match Supabase client/import, RPC, storage, or Realtime patterns. Confirmed Realtime consumers include notifications and mentor messaging. The current production runtime has **not** reached zero Supabase dependencies. Guarded migration tooling may retain Supabase source reads during the rollback period.

## 16. Exact tests

The isolated real-Auth HTTP smoke passed 16/16 checks. The 103-user identity inventory was read-only. The unit suite passed **409/409 tests in 95 files**; the isolated staging integration suite passed **20/20 tests** after explicitly excluding the single synthetic staging profile from the baseline row-count assertion. Typecheck passed, lint returned **0 errors / 53 warnings**, and production build passed. These checks validate only the implemented slice, not full migration readiness.

## 17. Known limitations and next boundary

The smallest external clarification is a **Neon-supported import/reauthentication mechanism for current Managed Auth** that covers existing Google provider identities and 15 bcrypt password hashes without trusting email alone. A verified user-action reauthentication path is acceptable if direct import is unsupported. Even after that, substantial code remains: 116 runtime candidates, 40 deferred triggers, 153 source functions/RPCs, 58 Auth-linked FKs, full storage/realtime/payment/module UAT, and final data delta. **PRODUCTION CUTOVER: NO-GO.**
