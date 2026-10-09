# MeroTalent Neon runtime sprint — 2026-10-09

This follow-up supersedes the dated status in `neon-migration-final-status-2026-10-08.md` where facts changed. **Production cutover remains NO-GO.** Supabase production data, Auth, storage, OAuth, and Vercel backend settings were not switched. The pre-existing dirty application worktree was preserved.

## Checkpoint and source inventory

The prior isolated staging checkpoint `8245bbad40d3eb9d4f9679bdba627bf415282cab` was reviewed as a fast-forward of `origin/main` at `027586960d2810cba503c1e7649ca01074b783f1`, scanned for credentials, and pushed to `main` without force. It contains no `.migration.env`, dump, export, or credential file. This push may trigger the repository's ordinary deployment automation, but it does not turn on Neon production mode; `neon-staging` remains prohibited in Vercel production.

The current [file-by-file runtime ledger](neon-runtime-dependency-ledger-2026-10-09.md) records **117 non-test files with direct Supabase imports**, plus 10 referenced tests and 15 migration/seed scripts counted separately. The earlier 116-file count used a different expression, so it is not a measured reduction. Most active browser and server workflows still depend on Supabase; no zero-dependency claim is justified. Central blockers are AuthContext, direct browser table writes, privileged server routes, media consumers, notifications, and messaging.

## Identity status

The [read-only per-user reconciliation](neon-managed-auth-identity-reconciliation-2026-10-09.md) found 103 source users, 104 identities, and zero verified source links to current Neon Managed Auth. Ninety-seven are **candidates for an explicitly approved proof-based linking flow**, five require reset or reauthentication, and one remains unresolved; candidates are not linked or authorized. No production user was imported or contacted. Current Managed Auth import support for Supabase bcrypt hashes and Google provider subjects remains unverified. The reconciliation report captured one synthetic Managed Auth user before the event UAT; the target now has three synthetic Managed Auth users, only the original has an application identity link. The two event-test Auth subjects remain deliberately unlinked because direct writes to managed Auth tables are prohibited. The event UAT cleaned its application profiles and events.

## College runtime increment

A new staging-only College applications inbox reads a selected college's latest 100 admission leads. The database statement combines active-account, Super Admin or active College capability, exact institute assignment, active module entitlement, and lead-feature predicates in one snapshot. It returns no private lead rows to unrelated or expired actors. Focused tests passed **4/4**, and read-only stage SQL checks confirmed one unentitled actor received no rows while an active platform admin was authorized. This is **partial**: lead submission, status writes, media, claim/add workflows, College UI wiring, and a real signed-in College-admin HTTP UAT remain.

## Durable event/SSE increment

Applied `neon-staging-application-events.sql` **only** to the guarded isolated Neon migration-staging branch. It creates a durable, recipient-addressed bigint event cursor with a source/recipient uniqueness rule and a recipient/cursor index. Server-side producers can append notification/message references in the same transaction as the source row, checking the actual notification recipient or both conversation participants. Staging `/api/v1/realtime/stream` now uses a bounded 20-second SSE response, stable event IDs, `Last-Event-ID` or explicit cursor replay, no-store headers, live session/link rechecks, recipient filtering, and conversation-membership checks. The query excludes message events after conversation access is revoked. Legacy production mode returns 404.

Unit/security tests passed **5/5**. A real Neon staging transaction test inserted two notification/event pairs, proved each recipient only saw their own cursor and could replay a missed event, then rolled back all source rows. The staging integration suite passed **22/22**, including denial of an unknown conversation. A real staging Managed Auth + localhost HTTP SSE run passed **13/13** checks: unauthenticated/unlinked/unknown-conversation denial, own-recipient delivery, replay using `Last-Event-ID`, and logout denial. An initial attempt timed out on a cold request; the bounded retry passed. Read-only cleanup audit showed zero event-test application profiles, zero persisted event rows, and one original identity link. **Realtime replacement is still partial**, not complete: no browser notification or messaging client has switched off Supabase Realtime; chat write/read migration, producer wiring for live workflows, and production-scale reconnect/load testing remain.

## Other modules and storage

Jobs, Mentors, Events, Payments, public College workflows, application storage consumers, and messaging have not completed Neon runtime migration. Partnered-course external redirect is preserved on the legacy path. Previously verified 22/22 object hashes prove a storage snapshot, not runtime upload/download parity. No payment gateway test or live payment was triggered in this sprint.

## Verification run this sprint

- `npm run typecheck`: PASS.
- `npm run test`: **97 files, 418/418 tests PASS**.
- `npx vitest run --config vitest.staging.config.ts`: **22/22 PASS** against the isolated Neon branch.
- Targeted event/runtime/College suite: **18/18 PASS**.
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
