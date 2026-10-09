# MeroTalent Neon runtime sprint — 2026-10-09

This follow-up supersedes the dated status in `neon-migration-final-status-2026-10-08.md` where facts changed. **Production cutover remains NO-GO.** Supabase production data, Auth, storage, OAuth, and Vercel backend settings were not switched. The pre-existing dirty application worktree was preserved.

## Checkpoint and source inventory

The prior isolated staging checkpoint `8245bbad40d3eb9d4f9679bdba627bf415282cab` was reviewed as a fast-forward of `origin/main` at `027586960d2810cba503c1e7649ca01074b783f1`, scanned for credentials, and pushed to `main` without force. It contains no `.migration.env`, dump, export, or credential file. This push may trigger the repository's ordinary deployment automation, but it does not turn on Neon production mode; `neon-staging` remains prohibited in Vercel production.

The current [file-by-file runtime ledger](neon-runtime-dependency-ledger-2026-10-09.md) records **117 non-test files with direct Supabase imports**, plus 10 referenced tests and 15 migration/seed scripts counted separately. The earlier 116-file count used a different expression, so it is not a measured reduction. Most active browser and server workflows still depend on Supabase; no zero-dependency claim is justified. Central blockers are AuthContext, direct browser table writes, privileged server routes, media consumers, notifications, and messaging.

## Identity status

The [read-only per-user reconciliation](neon-managed-auth-identity-reconciliation-2026-10-09.md) found 103 source users, 104 identities, and zero verified source links to current Neon Managed Auth. Ninety-seven are **candidates for an explicitly approved proof-based linking flow**, five require reset or reauthentication, and one remains unresolved; candidates are not linked or authorized. No production user was imported or contacted. Current Managed Auth import support for Supabase bcrypt hashes and Google provider subjects remains unverified. The reconciliation report captured one synthetic Managed Auth user before the event UAT; the target now has three synthetic Managed Auth users, only the original has an application identity link. The two event-test Auth subjects remain deliberately unlinked because direct writes to managed Auth tables are prohibited. The event UAT cleaned its application profiles and events.

## College runtime increment

A new staging-only College applications inbox reads a selected college's latest 100 admission leads. The database statement combines active-account and verified link, Super Admin or active College capability, exact institute assignment, active module entitlement, and lead-feature predicates in one snapshot. It returns no private lead rows to unrelated or expired actors. A signed-in submission route derives applicant identity/contact details from the linked server-side profile; its single SQL statement gates approval, admissions availability, profile completeness, and a live identity link before `INSERT ... RETURNING`. A real isolated staging transaction inserted and read an application, rejected a substituted Managed Auth subject without a second insert, and rolled back all changes. Focused College tests passed **7/7**. This is **partial**: no real signed-in College-admin HTTP UAT, submission UI wiring, claim/add flow, status writes, media attachments, or idempotency yet.

## Durable event/SSE increment

Applied `neon-staging-application-events.sql` **only** to the guarded isolated Neon migration-staging branch. It creates a durable, recipient-addressed bigint event cursor with a source/recipient uniqueness rule and a recipient/cursor index. Server-side producers can append notification/message references in the same transaction as the source row, checking the actual notification recipient or both conversation participants. Staging `/api/v1/realtime/stream` now uses a bounded 20-second SSE response, stable event IDs, `Last-Event-ID` or explicit cursor replay, no-store headers, live session/link rechecks, recipient filtering, and conversation-membership checks. The query excludes message events after conversation access is revoked. Legacy production mode returns 404.

Unit/security tests passed **5/5**. A real Neon staging transaction test inserted two notification/event pairs, proved each recipient only saw their own cursor and could replay a missed event, then rolled back all source rows. The staging integration suite passed **22/22**, including denial of an unknown conversation. A real staging Managed Auth + localhost HTTP SSE run passed **13/13** checks: unauthenticated/unlinked/unknown-conversation denial, own-recipient delivery, replay using `Last-Event-ID`, and logout denial. An initial attempt timed out on a cold request; the bounded retry passed. Read-only cleanup audit showed zero event-test application profiles, zero persisted event rows, and one original identity link. **Realtime replacement is still partial**, not complete: no browser notification or messaging client has switched off Supabase Realtime; chat write/read migration, producer wiring for live workflows, and production-scale reconnect/load testing remain.

## Notifications, Jobs, storage, and other modules

A staging-only own-notification API now returns the recipient's latest 50 notifications and exact unread count under a live identity link. Mark-read requires same-origin request and atomically checks recipient, active profile, and verified link in the update statement. Unit tests passed **4/4**; a rollback-only staging transaction proved recipient read, mark-read, and unrelated-user denial. This does not wire live notification producers or replace the browser's Supabase Realtime hook.

A staging-only saved-Jobs GET returns published, nondeleted bookmarks for the verified linked user with bounded pagination. Focused tests passed **6/6** and its SQL executed successfully against the real staging schema; no real signed-in HTTP test or Jobs application/recruiter workflow was exercised.

A staging-only private resume route validates PDF type, magic bytes, size, canonical user-scoped path, and same-origin upload, then uses the existing Neon storage abstraction for upload and short-lived signed read. Mocked authorization/storage tests passed **6/6**; a real authenticated route/S3 UAT remains untested. Previously verified 22/22 object hashes prove an object snapshot, not this route's runtime parity.

Mentors, Events, Payments, public College workflows, other storage consumers, and messaging have not completed Neon runtime migration. Partnered-course external redirect is preserved on the legacy path. No payment gateway test or live payment was triggered in this sprint.

## Verification run this sprint

- `npm run typecheck`: PASS.
- `npm run test`: **101 files, 437/437 tests PASS**.
- `npx vitest run --config vitest.staging.config.ts`: **25/25 PASS** against the isolated Neon branch. One intermediate run failed because a policy-only test used a non-UUID placeholder after an authorization cast was added; it was corrected and the full suite reran green.
- Targeted event/runtime/College suite: **18/18 PASS** before the later College/Jobs/notification/storage additions; their focused suites also passed as recorded above.
- `npm run lint`: **0 errors, 53 warnings**.
- `npm run build`: PASS.
- Real authenticated SSE HTTP UAT: **13/13 PASS** on the second bounded run. Prior 16/16 College/profile staging smoke remains historical evidence, not proof of the new lead endpoint.
- `git diff --check`: PASS for changed tracked files and each reviewed staged commit.
- Secret scan: PASS for migration-sprint files; only deliberately invalid `user:pass` / `staging:unused` database URLs in authorization tests matched the URL-pattern check. No real connection string, token, encryption key, export, or dump was staged.

## Minimum remaining gates

1. Establish a Neon-supported current Managed Auth import contract or approve and implement proof-based reauthentication/linking, then reconcile all 103 source users without email-only inference.
2. Migrate the 117 direct-import candidates incrementally, starting with shared Auth/session/client boundaries and server-authorized College write flows; remove active browser Supabase reads/writes instead of changing imports alone.
3. Wire all notification/message producers and clients to the durable event/SSE path and complete authenticated isolation/reconnect/load tests.
4. Complete storage runtime authorization, all module workflows, payment sandbox verification, functional database parity, and final source-to-target delta reconciliation.
5. Rehearse cutover and rollback, obtain explicit production-switch approval, and retain Supabase standby.

No production cutover or full migration claim is authorized by this report.
