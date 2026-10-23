# MeroTalent Neon runtime sprint — 2026-10-09

This follow-up supersedes the dated status in `neon-migration-final-status-2026-10-08.md` where facts changed. **Production cutover remains NO-GO.** Supabase production data, Auth, storage, OAuth, and Vercel backend settings were not switched. The pre-existing dirty application worktree was preserved.

**Current phase-closure status (2026-10-12): PRE-CUTOVER / STAGING FOUNDATION.**
The final closure checklist at the end of this document supersedes older
"next task" notes; those notes remain as historical implementation evidence.
The subsequent active-migration continuation below supersedes the closure's
suggestion that ordinary Supabase development is the long-term direction:
Neon remains the target; legacy Supabase is temporary production compatibility.

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

## Jobs module follow-up — 2026-10-09 (uncommitted)

**Status: PARTIAL.** The existing mode-aware Jobs routes now validate input and use the isolated Neon path for public search/category/pagination/detail, own preferences and bookmarks, application submission, and scoped recruiter application review/status writes. Application submission derives contact and resume information from the server-side linked profile, checks published/unexpired job eligibility, and prevents duplicate applications. Private writes require a current linked identity and same-origin browser request. Recruiter reads and status writes require current role, active Jobs capability and entitlement, and exact company/job assignment; state transitions and interview timestamps are validated server-side. A transaction error-boundary bug that had converted an authorization denial into HTTP 500 is fixed.

Evidence: 5/5 real isolated-Neon transaction tests passed. A separate authenticated localhost HTTP run passed 29/29 checks, including public reads, invalid/unlinked session denial, save/unsave, apply and database effect, recruiter company isolation, unauthorized-write denial, status update and database effect, same-origin protection, private PDF upload/authorized read/cross-user denial, and logout denial. That HTTP run removed its application database and S3 object fixtures. It left 12 unlinked synthetic Managed Auth test subjects in isolated staging across retries; these are not production users and must be excluded from identity parity accounting. No raw Managed Auth table deletion was attempted.

Final verification for this follow-up: `npm run typecheck` passed; `npm run test` passed 441/441 across 102 files; `npm run lint` returned 0 errors and 53 warnings; `npm run build` passed; `git diff --check` passed. The full isolated-staging suite passed 12/12 across 2 files after its older Jobs fixture was corrected to use a verified synthetic identity and rollback-only profile completion. The first staging attempt could not resolve Neon from the sandbox, and two subsequent attempts exposed the stale fixture; those attempts failed and are not counted as passing runs. The new HTTP harness references runtime environment variable names only; no credential value was added to source control.

Still unverified/incomplete: student employment-profile update through authenticated HTTP; browser UI/session replacement for Jobs and saved jobs; client-side resume/attachment handoff; interview scheduling and email/event production path; safe object deletion; fully exercised student-to-student application isolation through HTTP; and live browser UAT. Existing untracked `app/api/v1/profile/` work was not modified or counted as completed here. Legacy Supabase routes remain active in production. No commit, push, deployment, production cutover, provider payment, or production identity/storage import occurred in this follow-up.

## Jobs browser and employment-profile continuation — 2026-10-09 (uncommitted)

**Status: PARTIAL, staging-only.** The Jobs browser path now has a same-origin Managed Auth session bridge, linked employment-profile GET/PATCH, saved jobs and preferences, profile-backed application submission, own PDF resume upload/replacement/deletion, and recruiter application inbox/status review. Recruiter resume download is bound to an actual application and the recruiter's current Jobs capability, exact company/job assignment, active entitlement and application feature. The legacy Supabase production branches remain unchanged. Staging browser signup/OAuth deliberately return an unavailable state rather than creating an unlinked account or implying migration of the 103 source users.

Evidence: 47/47 authenticated local HTTP checks passed against synthetic identities, isolated Neon staging, and private staging object storage. They include profile persistence and identity spoof denial, application database effect, recruiter exact-scope read/write and job title, scoped applicant resume URL, unauthorized student denial, resume replacement/deletion, and logout invalidation. The harness removed its synthetic application/profile/company/job data and uploaded objects. Synthetic test subjects remain in Managed Auth because its internal tables were not modified. A local browser displayed the public Jobs listing, but a signed-in graphical student/recruiter UAT was **not** performed. The `agent-browser` service was unavailable due to an expired tool session; local browser control was used only for the public-page smoke check.

Current verification: typecheck passed; unit tests **442/442 across 102 files** passed; isolated staging integration **12/12 across 2 files** passed; lint passed with **0 errors and 53 existing warnings** after correcting one new hook dependency error; production build, script syntax check, and `git diff --check` passed. No production cutover, payment, deployment, commit, or push was performed.

Still incomplete: browser-level signed-in workflow validation, supporting-document upload/download parity beyond the PDF resume, automatic interview email delivery in staging, complete recruiter UI navigation outside the review component, migrated avatar media and remaining Supabase-backed modules, and production identity linkage. Do not equate the synthetic HTTP checks with those unexercised journeys.

## Mentors + Events staging continuation — 2026-10-09 (uncommitted)

**Status: PARTIAL, staging-only. Production remains on Supabase.** The mode-aware public Mentor and Event listing/detail endpoints now serve the isolated Neon branch. The staging booking browser uses the same-origin linked session and a published Mentor service rather than a direct Supabase read. Booking price, currency, duration, future time, mentor availability, and overlap are checked server-side under a mentor row lock. Paid bookings remain pending; free bookings can be confirmed. Mentor-owned booking reads can span multiple explicitly assigned entities. Reschedule/cancel/complete transitions are constrained, and completion is restricted to the mentor owner or platform admin after the session ends.

Event registration now derives price from an active ticket tier, enforces sales dates, tier quantity and event capacity, prevents duplicate registration, and issues digital tickets only for confirmed free registrations. Paid registrations remain pending without a ticket. Event detail excludes unpublished records; check-in requires exact event scope and is single-use. A forward-only, isolated-staging event-ticketing schema (`scripts/sql/neon-staging-events-ticketing.sql`) was applied with a staging-host guard; historical migrations and production schemas were untouched. The staging browser registration and ticket views use these same-origin APIs.

**Payment security:** the earlier staging endpoint accepted a signed-in actor's claimed `completed` status. That path now fails closed with `VERIFIED_CHECKOUT_REQUIRED`/`VERIFIED_PROVIDER_REQUIRED`; neither browser return nor a fabricated callback can activate a paid booking/registration. This is a security correction, **not** a completed eSewa checkout integration. A mocked eSewa adapter fixture was exercised without contacting the gateway. No live charge or real email was sent.

**Evidence:** targeted Mentor/Event guards **5/5**, full unit suite **447/447 across 103 files**, isolated Neon integration **12/12 across 2 files**, and authenticated local staging HTTP **25/25** (including anonymous/unlinked/logout denial, public reads, private-email exclusion, same-origin denial, server price, overlap, paid pending, fake-payment denial, free tickets, and duplicate-registration denial). The HTTP harness removed its application fixtures. Two synthetic Managed Auth subjects from the successful 24-check and 25-check runs remain unlinked because raw Managed Auth tables were not edited; unsuccessful setup retries may have left additional synthetic subjects and should be audited before identity parity. Typecheck and production build passed. Lint returned **0 errors and 53 warnings**; `git diff --check` passed. No signed-in graphical browser UAT was performed.

**Not complete:** Mentor profile/service/availability creation and editing through a staging admin UI, Event creation/editing and organizer registration workspace, paid eSewa checkout and provider-verified callback/activation, manual payment-proof storage/review, private Event attachment handling, email delivery, calendar integration, and signed-in browser UAT. These are actual remaining code/integration tasks, not merely release configuration. Do not infer a full Mentors/Events migration or a production cutover from the tested student flows.

## Payments and storage continuation — 2026-10-10 (uncommitted)

**Status: PARTIAL, isolated Neon staging only.** The staging Mentor-booking and Event-registration clients now request a server-priced eSewa UAT checkout after a paid pending record is created. The staging checkout service derives NPR amount and ownership from the persisted booking/service or registration/ticket tier, writes pending payment and checkout-session rows, and reuses an unexpired matching session. It does not accept browser-supplied prices or success flags. The return handler checks the signed payload when present, reads the server-owned checkout, and uses eSewa's status API in strict mode before changing payment, booking/registration, or ticket state. A verified success is transactionally fulfilled once; failure/cancellation/expiry do not issue tickets; pending, ambiguous, refunded, and provider-unavailable states do not falsely activate paid access. The older production Supabase callback remains unchanged.

The UAT provider requires `NEON_STAGING_ESEWA_SECRET` and `NEON_STAGING_ESEWA_MERCHANT_CODE` in the **isolated local staging runtime**. Neither is present in the migration environment, so the real sandbox redirect/status round-trip was **not** exercised. The staging API returns `SANDBOX_UNAVAILABLE` rather than using production credentials or faking payment. A mocked provider result verified rollback-only paid Event fulfillment and two tickets exactly once, including a duplicate verification attempt. Real eSewa transaction, disputed/late settlement operations, and a paid Mentor-booking settlement still need provider-backed staging UAT. Manual proof acceptance deliberately flags payment for reconciliation and does not itself mark it paid.

The new staging-only private proof API validates PDF/JPEG/PNG/WebP size, extension/type, and magic bytes, stores a user-scoped object through Neon S3, records a `payment_proofs` row, and provides an owner- or Super-Admin-scoped short-lived read URL. Super Admin can review a pending proof without activating the underlying service. A real authenticated staging HTTP run passed **31/31** checks, including private PDF proof upload/download, unauthorized access denial, and cleanup of the S3/database fixture. Previously implemented resume lifecycle and Jobs private document access remain. Event private attachments and a browser proof-review interface are **not complete**; no new event-attachment metadata schema was applied.

Verification for this continuation: `npm run typecheck` passed; focused unit tests **14/14 across 2 files** passed; isolated Neon transaction tests **13/13 across 2 files** passed after rerunning with network access; `npm run test` passed **449/449 across 103 files**; `npm run lint` passed with **0 errors and 53 warnings**; `npm run build` passed; `git diff --check` passed. The first staging suite attempt could not resolve the isolated Neon hostname in the sandbox (`ENOTFOUND`); the permitted-network rerun passed. No signed-in graphical browser UAT or real eSewa sandbox payment was performed. The successful HTTP harness cleaned its application/payment/proof records and S3 object; synthetic unlinked Managed Auth subjects from current and previous staging UAT runs remain and must be excluded from production-identity reconciliation. No live payment, production data/auth/storage/configuration change, commit, push, or deployment occurred. Production remains on Supabase.

## Notifications and Messaging browser continuation — 2026-10-10 (uncommitted)

**Status: PARTIAL, isolated Neon staging only.** `next.config.ts` now exposes the same explicit backend-mode flag to the local browser bundle; without this, staging server routes could be active while browser components silently stayed on Supabase. The production build still selects legacy mode unless its server environment explicitly selects otherwise, and the server continues to prohibit staging mode in production.

`useNotifications` now stays on the Neon API in staging even when it fails, instead of falling through to Supabase. The own-recipient API adds cursor pagination and an atomic mark-unread operation alongside mark-one/all-read. The dashboard notification menu displays loading/error/retry/empty states, loads older records, and navigates only to an internal action URL. The staging hook stores a per-user SSE cursor in session storage and refreshes the server snapshot on notification/reconnect/visibility changes; repeated events do not append duplicate notification rows in the UI. Durable event producers already exist for the staged Jobs, Mentors, and Events writes, but other legacy producers and admin notification screens still depend on Supabase.

`MentorMessaging` now has a staging browser branch for conversation list, 50-message cursor pages, text send, incoming-message SSE refresh, unread count/read state, and retryable errors. The API rejects unknown JSON fields and unverified attachment paths, enforces same-origin writes, and checks active conversation membership in repository queries/writes. The old Supabase branch remains intact for production. **Private chat attachments are not migrated:** the staging upload control is disabled rather than reusing an unsafe Supabase upload or accepting a guessed S3 key. Conversation creation and module-admin browser navigation still require a separate end-to-end pass.

Authenticated localhost HTTP UAT passed **50/50** checks against synthetic linked staging identity and isolated Neon/S3, including notification read/unread persistence, own-recipient SSE, conversation list/history/send, guessed-conversation and stream denial, message read state, rejected attachment paths, and post-logout denial. Application DB/payment/proof/S3 fixtures were removed. The run created another unlinked synthetic Managed Auth subject, retained because raw Managed Auth table deletion is prohibited. The isolated transaction suite passed **13/13 across 2 files**. The agent-browser CLI could not run because its service login had expired; the in-app browser rendered the local sign-in page but no retained linked staging session was available for a signed-in graphical test. **Graphical browser UAT remains unverified.**

The updated direct-import scan finds **114 non-test `app`/`src` files** still importing Supabase: 37 `app`, 41 screens, 22 libraries, 9 components, 3 hooks, 1 context, and 1 integration factory. This is a path-category inventory, not proof all callers are still exercised in staging. Both changed browser components retain their legacy import intentionally, so this sprint's changes do not artificially reduce the count. Remaining major categories are Auth/account linking, admin CRUD/privileged operations, direct browser database writes, storage/media, and legacy notification/realtime consumers. The source-user identity migration, eSewa sandbox verification, private Event/chat attachments, and full browser/module UAT remain blockers to cutover. No production configuration, data, Auth, OAuth, or deployment was changed; production remains on Supabase. No commit or push was made.

Verification for this continuation: `npm run typecheck` passed; targeted notification/realtime/messaging unit tests passed after a test fixture expectation was corrected; `npm run test` passed **454/454 across 104 files**; `npm run lint` passed with **0 errors and 53 warnings**; isolated staging integration passed **13/13 across 2 files**; authenticated staging HTTP passed **50/50**; `npm run build` passed on the permitted-network retry after a sandbox-only Google Fonts DNS failure. `git diff --check` and the final generated-file cleanup are recorded with the handoff. A passing build does not replace signed-in graphical browser evidence.

## Private chat attachments + own-profile avatar continuation — 2026-10-10 (uncommitted)

**Status: PARTIAL, isolated Neon staging only. Production remains on Supabase.** The private chat attachment route now requires the verified linked Managed Auth actor, same-origin upload, active conversation membership, exact conversation/message binding for download, generated canonical user/conversation object key, size/type/extension/magic-byte validation, and a persisted attachment message with recipient event. A failed database write attempts deletion of only the newly uploaded object. The UI re-enables file selection in staging with upload progress, loading/error feedback and a short-lived authorized read; text-only messaging remains independent. Message or object deletion/replacement is not offered because the product does not currently support message editing. The shared policy addition is explicitly blocked from the generic legacy media signing routes; existing Supabase chat storage behavior remains the production path.

The selected next runtime group is the student's own profile photo. `Profile.tsx` now uploads through a staging-only, same-origin API instead of the nonexistent-in-inventory `avatars` bucket. The route stores to `profile-media`, validates image bytes and type, updates only the verified linked profile transactionally, cleans the new object on failed update, and deletes an earlier object only when it is a canonical path owned by that same user. The staging profile GET resolves the stored path to a signed browser URL. This completes only the own-profile photo path, not every public avatar consumer or general media management.

Focused chat/messaging tests passed **12/12 across 2 files**; focused avatar tests passed **6/6**. Full unit suite passed **468/468 across 106 files**; isolated staging transactions passed **13/13 across 2 files**. The authenticated localhost harness passed **60/60** synthetic checks, including actual `chat-attachments` PDF upload/download and `profile-media` avatar upload against isolated Neon S3, cross-conversation/raw-path/logged-out denial, and existing notification/SSE/Mentor/Event/payment-proof regressions. Its application database records and all three new/old S3 fixture objects were cleaned in the harness. The synthetic Managed Auth subject remains unlinked after application cleanup, as raw Managed Auth-table deletion is prohibited. No live eSewa transaction occurred; sandbox credentials remain absent.

`npm run typecheck` passed. `npm run lint` passed with **0 errors, 53 warnings**. `npm run build` passed and included both new staging routes. `git diff --check` and `node --check scripts/neon-staging-mentor-events-http-uat.mjs` passed; the generated `next-env.d.ts` dev-mode change was returned to its original content. The agent-browser service failed DNS resolution for `api.inference.sh`; there was no retained linked staging browser session. **Signed-in graphical UAT remains unverified.** Direct Supabase import count remains **114 non-test files**, with both touched browser files keeping production-only legacy branches; lower import count is not a success metric. Existing-account identity migration, module-wide browser UAT, real eSewa sandbox settlement, Event/admin media, full storage parity, and rollback rehearsal still block cutover. No production data/config/Auth/storage was changed and no commit, push, or deployment occurred.

## Job supporting documents and identity-link readiness — 2026-10-11 (uncommitted)

**Status: PARTIAL, isolated Neon staging only. Production remains on Supabase.** The selected bounded media/admin group is job-application supporting PDFs: the staging applicant wizard now uploads optional experience letters and training documents to private `job-files`, allows pre-submission replacement/removal, sends canonical paths with the application, and the Neon Jobs repository verifies applicant ownership, exact job scope and object existence before saving those paths in the immutable application snapshot. The recruiter review panel resolves only the exact submitted path through an application-ID endpoint guarded by current Jobs capability, exact entity assignment, active entitlement and application feature. Files are MIME/size/PDF-magic checked, stored under generated canonical keys, and returned only through short-lived scoped download URLs. The server blocks deletion of an already submitted object. Legacy production Supabase branches remain intact. The staging draft upload can leave a private orphan if a browser is abandoned before submission; eventual orphan cleanup is still needed. This does not migrate the broader Job admin editor or all media workflows.

Identity readiness advanced through a **staging-only dual-session application-ledger link POC**, not a Managed Auth bulk import. It requires a current verified Neon Managed Auth session plus a live, verified Supabase Auth session for the exact old UUID, offers a non-writing dry run, returns conflicts rather than reassigning existing links, inserts an auditable unique ledger link transactionally, and treats exact retries idempotently. An explicit `NEON_STAGING_IDENTITY_ALLOWED_SOURCE_ID` synthetic-account allowlist is required and is currently absent, so the route cannot link a production account by default. No email-only match, password-hash import, provider-subject import, session transfer or production migration is claimed. Current official Neon documentation has not established an import contract for those legacy credentials/Google identities; see the separate reconciliation document.

**Verification:** typecheck passed; targeted route/storage/repository/identity tests passed **16/16 across 5 files**; full unit suite passed **484/484 across 111 files**; lint passed with **0 errors and 53 warnings** (the final added test file also passed targeted lint); production build passed with the new staging routes; `git diff --check` passed. The read-only identity-count refresh failed on DNS `ENOTFOUND` for the existing Supabase DB host, including a permitted-network retry, so the old 103-user count is historical rather than verified current. Isolated Neon transaction tests likewise could not resolve the staging pooler host and did not run. No authenticated staging HTTP or S3 round-trip was completed this turn. The browser-testing skill was inspected, but no retained linked staging session and no reachable staging backend existed, so signed-in graphical UAT was not attempted or claimed.

Fresh direct-import count remains **114 non-test `app`/`src` files**; test references (9 files) and migration/tooling references (19 scripts) are tracked separately in the dependency ledger. No production account, provider/payment configuration, database, deployment, commit, or push was changed. Remaining cutover gates include a provider-supported or user-action identity recovery plan validated with synthetic dual sessions, live staging storage and authorization checks, browser UAT, full remaining Supabase dependency parity, real eSewa sandbox verification, and rollback rehearsal. Do not cut over production.

## Safe staging execution update — 2026-10-11 (uncommitted)

The current worktree now includes a fail-closed source inventory gate. Identity,
schema, table-hash, and storage reconciliation scripts require a dedicated
read-only Supabase Session Pooler credential, exact project host and role, TLS,
and read-only privilege verification. They no longer accept the existing
`postgres` owner URL for those inventory operations. No source connection or
fresh source comparison was possible because that credential/host is absent.

The isolated Neon staging branch received a forward-only
`neon_job_document_drafts` ledger. The job upload, application submission and
explicit deletion paths now lock the same draft row, and submission marks the
file submitted in the application transaction. The 72-hour orphan cleanup
script is dry-run by default and considers only registered drafts, never an
S3-listing guess. Staging dry-run and explicit apply each found zero aged
candidates and deleted zero objects. Its actual deletion path has **not** yet
been exercised with an aged synthetic fixture.

A separate idempotent staging operation materialized the 103 missing stable
application-account anchors: 104 profiles, 104 application accounts, zero
missing account rows, **only one verified Auth link**, 103 still unlinked.
The repeat apply inserted zero rows. No Managed Auth identities were imported
or linked by email and no access was granted by these anchor rows.

Verification in this continuation: 496/496 unit tests across 113 files;
13/13 live Neon integration tests across two files (the first rerun had two
five-second network timeouts; a rerun with a 20-second timeout passed);
authenticated synthetic
Jobs HTTP suite passed including private PDF upload/read and submitted-file
protection; typecheck and production build passed; lint returned zero errors
and 53 warnings; `git diff --check` passed. A real private staging signed GET
returned HTTP 200 before its 60-second TTL and HTTP 403 after 68 seconds; its
synthetic object was deleted. This is not proof of complete storage parity.
The AST inventory finds **112 non-test `app`/`src` files** with Supabase
references: 110 with static imports and two with dynamic compatibility imports.
This is a more precise metric than the earlier text scan. Production still
runs on Supabase; no release or cutover occurred.

## Persistent migration completion checklist — updated 2026-10-12

This is the resumable checklist for subsequent work; earlier sections are
historical evidence, not the current acceptance result.

- [x] Close the present staging implementation phase with explicit A–F evidence levels, current import disposition, external gates and a safe product-development boundary (see the final phase-closure section below).
- [ ] Complete authenticated graphical staging UAT and real eSewa sandbox settlement; existing unit, synthetic HTTP and isolated database checks do not satisfy these gates.
- [ ] Reconcile fresh production source data and all reported unlinked identities with verified ownership before proposing a production cutover.

- [x] Pin the isolated Neon staging database and object-store endpoints for new writes.
- [x] Verify the actual Supabase shared-pooler host through read-only project configuration and IPv4 reachability. The host is known; no source-data connection was made.
- [ ] Obtain a dedicated source read-only role/credential through an approved secret channel; run the fail-closed source gate and current source/target reconciliation. The existing `postgres` credential is not acceptable.
- [x] Materialize stable staging application-account anchors for all 104 profiles without assigning access.
- [ ] Resolve 103 unlinked application accounts through verified, supported migration or recovery; never link by email alone.
- [x] Protect and live-test private Job PDF upload, recruiter-only read, signed expiry, and submitted-document exclusion.
- [x] Live-test actual 73-hour synthetic draft cleanup: targeted dry-run and apply deleted its object and marked the ledger row deleted; an equally old submitted document remained in the ledger and S3. The authenticated Jobs staging HTTP suite passed all reported checks after one transient 503 on the first attempt.
- [x] Rehearse a synthetic Neon staging `pg_dump` custom archive and restore into isolated local PostgreSQL 18, twice, with cleanup. This is not a full-data backup/rollback proof.
- [x] Move the college detail update summary to a same-origin endpoint; its Neon branch reads only approved public colleges and published/due content. Focused tests and a live staging HTTP 200 passed. Legacy production remains unchanged.
- [x] Move public college blog list/detail reads to a same-origin endpoint; the Neon branch gates approved colleges and published/due blogs. Seven focused public-college tests passed across updates/blogs, and the isolated staging API returned HTTP 200 for the list and a missing slug. A real published-blog browser journey remains untested.
- [x] Move the shared public college listing/detail helper to a same-origin directory API. The Neon branch reads the approved-only `institute_directory` view, preserves filters/count/priority placement, and excludes internal provenance; legacy production keeps its existing view-backed behavior. Isolated staging listing and exact detail returned HTTP 200, with candidate rows bounded by requested page size plus actual priority positions. A signed public college-media redirect reached the pinned Neon Object Storage endpoint and the object returned HTTP 200 (`image/png`); staging CSP permits that exact origin.
- [x] Move the public contact form, early-access form, and Super Admin contact-query inbox to Neon staging endpoints. Anonymous submission validates input and confirms the database insert; reply/delete require a current linked platform-admin session, same-origin writes, and database-side active-role guards. A synthetic staging HTTP submission returned 201 and its exact row was removed. Unauthenticated inbox HTTP access returned 401. A signed-in Super Admin browser journey remains untested.
- [x] Move the claim-existing-college typeahead to the same approved public directory endpoint with a name-only filter and eight-result bound. Isolated staging HTTP returned one matching college with no unrelated names. The component no longer imports Supabase.
- [ ] Migrate the remaining application runtime Supabase callers, including the rest of module administration; rerun the AST inventory after each group. Latest inventory is 109 non-test files (101 static, 8 dynamic) after the AI secret-store import was decoupled; older checkpoint counts are historical. The dynamic imports are legacy compatibility paths and must not be mistaken for eliminated production dependencies. The migrated college/contact browser paths do not call Supabase in Neon staging.
- [ ] Reconcile all production storage objects, metadata, ownership and private/public access against the target.
- [ ] Verify real eSewa test settlement, all critical authenticated module journeys, and granular cross-entity denial in staging.
- [ ] Exercise a full-data target restore, source backup/restore, delta synchronization and rollback after divergent writes.
- [ ] Complete final regression, production environment inventory, and explicit cutover authorization before any commit, push, deploy, DNS or production routing change.

Latest local verification for this batch: 503/503 unit tests across 115 files,
13/13 isolated Neon staging integration tests across two files, typecheck,
production build, and `git diff --check` passed. Lint returned zero errors and
53 warnings. The first typecheck was run concurrently with `next build` and
failed because generated `.next/types` files were being replaced; the serial
post-build typecheck passed. An initial staging-test invocation used the default
config, which excludes those tests; the explicit staging config then passed.
No production authenticated or payment journey was exercised in this batch.

### 2026-10-12 runtime continuation

The shared public-college directory helper now requests the same-origin
`/api/v1/institutes/directory` endpoint for filtered listing and exact detail.
Its Neon branch uses the approved public directory view with explicit fields,
AND-matched search tokens, count, and placement candidates; the legacy branch
retains its existing view query. Canonical college-media paths now use a
same-origin redirect backed by the public `college-media` bucket and a
short-lived staging S3 signature. Staging-only CSP allows the exact isolated
storage origin for image, media, and upload connections. Public contact and
early-access forms use a validated Neon insert endpoint in staging, while the
Super Admin contact-query inbox uses a linked-session, role-guarded Neon API.
The legacy branches are retained for production until cutover.

Focused tests: 15/15 directory/blog/update/discovery tests and 10/10
directory/contact tests passed. Consolidated verification: 513/513 unit tests
across 117 files, typecheck, production build, and `git diff --check` passed;
lint returned zero errors and 53 warnings. Three tests initially asserted
the prior client-side directory query and were updated to verify the moved
server-side policy; the final full rerun passed. Live isolated-staging HTTP:
directory search/detail returned 200, the bounded candidate query returned
four records for a three-record page plus one priority position, canonical
college media redirected to the pinned S3 origin and the signed object
returned 200 (`image/png`), synthetic contact submission returned 201 with
its exact row subsequently deleted, and unauthenticated Admin inbox returned
401. The authenticated Admin inbox UI was not exercised.

Runtime inventory after the directory/contact work was **111 non-test files**
with Supabase references (**103 static**, **8 dynamic**). The subsequent claim
typeahead migration reduced it to **110 files** (**102 static**, **8 dynamic**).
The dynamic references are legacy-production compatibility imports, not Neon
staging calls. The remaining static imports require further migration;
reduced inventory is not by itself proof of workflow parity.
Identity/source/storage/payment/cutover gates above remain open.

Claim typeahead follow-up: 27/27 focused tests across four files, typecheck,
targeted lint, and `git diff --check` passed. The full 513-test run and build
above preceded this narrow follow-up, so they are not claimed as a post-change
full-suite result.

### 2026-10-12 College-admin claim/add and assignment continuation

Isolated Neon staging now has a transactional College scope service
(`src/lib/server/neon-college-scopes.ts`) and same-origin endpoints for own/Admin
request history and submission/review (`app/api/v1/neon-staging/college-scopes/route.ts`),
plus Super Admin assignment listing/catalog/grant/revoke
(`app/api/v1/neon-staging/college-scopes/assignments/route.ts`). The existing
College and Admin access-request screens use these endpoints in staging while
retaining legacy production behavior. Submission requires a verified linked
active account and active College capability. Review and scope mutations
re-check a live linked Super Admin role inside the transaction. Existing
claims do not overwrite the college owner; new approvals create a pending,
non-public institute, save its ID on the request, and create an exact entity
assignment. Another administrator can be assigned without replacing earlier
scopes. Duplicate pending claims and repeat assignments are idempotent;
concurrent approvals of identically named new colleges serialize on a
transaction-scoped advisory lock before duplicate-name validation;
deciding an already decided request returns a conflict. The staging-only
forward schema adjustment `scripts/sql/neon-staging-audit-id-sequence.sql`
restores the copied audit table's missing bigint sequence and permits an
approved create request to store its created entity ID. Applied to the pinned
isolated migration-staging branch with
`scripts/apply-neon-staging-audit-sequence.mjs`; historical Supabase migrations
and production were not changed.

The next related College runtime dependency started: the College dashboard
reads its multi-college workspace selector, entitlement status, and own claim
history from `app/api/v1/neon-staging/college-workspaces/route.ts` in staging.
The text-profile editor saves via an atomically scoped Neon PATCH at
`app/api/v1/neon-staging/college-workspaces/[id]/profile/route.ts`; its legacy
branch is unchanged. `src/test/neon-college-scopes-staging.test.ts` exercises
real isolated-staging SQL in a rollback-only transaction: invalid identity,
missing college, claim idempotency, unauthorized approval/assignment, approved
claim, repeat-decision conflict, two-college assignment, repeated assignment,
invalid entity, revoke/repeat revoke, approved unpublished addition, duplicate
institution, and rejection. Focused test: 1/1 passed; targeted lint: zero
errors/warnings. The first standard-suite run exposed two stale claim
typeahead tests that still mocked the retired Supabase query; they now mock
the same-origin directory response. The staging SQL test was excluded from
the default jsdom suite and included in the isolated Node staging suite.
After the final edits: standard tests **514/514 across 117 files**, staging
tests **14/14 across 3 files**, typecheck passed, production build passed,
`git diff --check` passed, and lint had **0 errors / 52 existing warnings**.
The first parallel staging suite hit three 5-second timeouts under shared
database/storage contention; the serial staging rerun passed. No new/relevant
lint warning was introduced.

This is **not complete College-admin parity**. The profile editor's media
uploader still uses a Supabase session and legacy signing contract; notices,
blogs, lead status mutations, featured requests, module-access requests,
subscription checkout/verified activation, and parts of the Admin assignment
UI remain legacy-dependent. In staging, the dashboard currently marks active
notice/lead summaries unavailable rather than fabricating counts. The new
profile PATCH has not yet had an authenticated browser/UAT test. Approval
does not itself activate an unpaid subscription. Verified payment activation
for scope requests is not yet ported to Neon. The 103 historical identities
remain unlinked: the existing dual-session proof endpoint is intentionally
synthetic-ID allowlisted, and no email-based linking or silent capability grant
was introduced. The source read-only credential gate remains unchanged and
closed; never substitute the administrator credential.

Runtime AST inventory after this batch: **110 non-test files** reference
Supabase (**102 static, 8 dynamic**). The new staging branches do not reduce
this file-level count because production compatibility imports remain in the
same screens. Next concrete task: migrate College profile media upload/signing
and protected lead/notice dashboard reads and mutations, then implement
verified College scope-payment settlement; separately design a controlled
user-facing dual-proof recovery flow before enabling links for real accounts.

### 2026-10-12 College media, workspace panels, and paid scope activation

The isolated College workspace now has a scoped media route at
`app/api/v1/neon-staging/college-workspaces/[id]/media/route.ts` and the
existing profile editor/uploader use it in staging. The route checks the
linked actor, exact College assignment, active entitlement and media feature;
validates image bytes/type/size; stores an owned canonical object path; saves
the DB reference atomically; and handles replacement/removal without deleting
unowned or still-referenced objects. The public signed-image route continues
to read the approved public bucket. Unit media policy tests and a real
isolated-staging object round trip passed. Historical media parity is not
claimed.

The dashboard's active notice/lead summaries, lead-status mutation, notices
editor and blog editor now use same-origin Neon routes in staging. The routes
recheck College scope and current entitlement on each request; applications
use the `college_applications` feature and blogs use `profile_editing`.
The existing Supabase paths remain for production compatibility. Main files:
`app/api/v1/neon-staging/institutes/[id]/applications/route.ts`,
`app/api/v1/neon-staging/college-workspaces/[id]/notices/route.ts`,
`app/api/v1/neon-staging/college-workspaces/[id]/blogs/route.ts`,
`src/screens/institute/InstituteDashboard.tsx`, `InstituteNotices.tsx`,
`InstituteBlogs.tsx`, and `src/test/neon-college-workspace-panels.test.ts`.
An authenticated browser pass is still needed; unit tests verify route
authorization, not visual panel behavior.

The College scope request has a staging eSewa checkout path through
`src/lib/server/neon-checkout.ts`; checkout only records a pending payment.
`src/lib/server/neon-college-scope-activation.ts` activates a paid entitlement
and subscription only after server-side provider status verification, exact
request/payment/plan/price/currency matching, approval, active user and exact
assignment. Payment-before-approval activates on later approval; repeated
return is idempotent. Failed and pending payments do not activate. The
staging-only forward SQL
`scripts/sql/neon-staging-college-subscription-scope-validation.sql` was
applied only to the pinned isolated branch to preserve matching entity-scope
validation for College subscriptions; historical migrations and production
were not modified. `src/screens/dashboard/Payments.tsx` now exposes the
staging request checkout and proof upload path, and the staging overview
returns real request/payment/entitlement rows. Approved free/trial grants and
generic scope renewal remain unfinished; no live provider credential or real
charge flow was exercised.

Verification on this code revision: typecheck passed; standard tests
**525/525 across 119 files** passed; focused isolated media/payment tests
**2/2** passed; full isolated staging suite **16/16 across 5 files** passed;
production build and `git diff --check` passed; lint returned **0 errors and
52 existing warnings**. Runtime AST inventory remains **110
non-test Supabase-reference files (102 static, 8 dynamic)** because the
production compatibility paths are retained. The linked-account recovery
endpoint remains synthetic-ID allowlisted; all 103 historical identities
remain unlinked. The source read-only credential gate is still closed.
Next task: complete approved free/trial entitlement and renewal paths, migrate
remaining College AI and Admin assignment surfaces, then a controlled
dual-proof identity recovery UX; never link by email alone or enable real-user
links without verified ownership and release approval.

### 2026-10-12 College billing continuation and shared Admin leads

`src/lib/server/neon-college-scopes.ts` now has a transactional Super
Admin-only free/trial grant for an approved and exactly assigned College
request. It rechecks the live linked Admin role, active target profile,
capability, assignment, configured free College plan, and enabled trial
setting. It records a `not_required` subscription and a distinct `FREE` or
`TRIAL` entitlement without fabricating a payment. An active matching grant
is idempotent; a used trial cannot be repeated, and an active paid or other
subscription cannot be silently downgraded. The secure staging endpoint is
`app/api/v1/neon-staging/college-scopes/complimentary/route.ts`; the existing
`src/screens/admin/AdminAccessRequests.tsx` presents the free/trial actions
after scope approval. The isolated SQL test checks an unauthorized identity,
trial and free grants, duplicate grants, one-trial rule, no payment row,
approved-public badge appearance, and expiry removing both the badge and
protected entity access.

`src/lib/server/neon-checkout.ts` and its existing staging checkout route
now accept an explicit renewal for an approved, previously paid College
request. Checkout validates live capability and, once approved, exact active
assignment before redirecting to eSewa. The existing verified settlement
extends the current subscription and adds a new payment-linked entitlement;
it preserves earlier payment and entitlement history. The payments screen
offers renewal from the approved request. The isolated payment test checks
renewal pending state, rejected renewal without the explicit flag, verified
extension, two payment-linked entitlement records, duplicate provider return,
and refusal when assignment is revoked. No browser redirect alone activates
access. A live eSewa sandbox checkout was not exercised because the isolated
staging provider credentials are not configured.

The next shared Admin dependency was the private lead inbox. The existing
`src/screens/admin/AdminLeads.tsx` now uses
`app/api/v1/neon-staging/admin/leads/route.ts` in staging for a bounded read
and audited status update; both require linked Super Admin access and the
write rechecks a live active Admin role. The route does not expose leads to
College or student users. Focused tests cover anonymous/ordinary-user denial,
foreign-origin mutation denial, field validation and authorized update.
Identity recovery tests now additionally assert that dual verified sessions
link to the original application ID without moving roles, scopes or
entitlements, even when the two verified emails differ. This is only the
synthetic-ID proof of concept; it does not enable recovery for 103 real
unlinked people.

Authenticated browser UAT remains unexercised: the available agent-browser
tool creates an isolated session, and no approved staging login/session is
configured in this workspace. The source-read-only credential gate remains
closed. Remaining runtime work includes College AI controls, broader Admin
surfaces, additional shared auth/session/storage callers, full identity
recovery and source/storage reconciliation before any cutover. This batch
does not change production or imply migration completion.

Final-revision verification for this continuation: **528/528 standard tests
across 120 files**, **16/16 isolated staging tests across 5 files** (with a
60-second setup hook allowance for the remote database), typecheck, production
build and `git diff --check` passed. Lint reported **0 errors / 52 existing
warnings**. One initial isolated-suite run hit the default 10-second
connection-setup hook timeout; the complete rerun passed with the larger
allowance. Runtime inventory remains **110 non-test Supabase-reference files
(102 static, 8 dynamic)**. This is not an authenticated browser UAT or a
live eSewa charge.

## Phase closure and product-development handoff — 2026-10-12

This closes the current *implementation phase*, not the production migration.
The checkout remains on `main` at `993572f` plus a substantial, uncommitted
working tree. This closure changed documentation only; it did not create an
immutable code revision, commit, push, deploy, source export or cutover.

### Evidence levels for the current checkpoint

| Level | Status | Boundary of the evidence |
|---|---|---|
| A — implemented in code | Partial | Isolated Neon branches exist for public College discovery/details, claim/add and scoped administration, media, leads, notices/blogs, free/trial and paid College billing/renewal; guarded Super Admin leads and selected Jobs, Mentor, Event, payment, storage, notification and messaging paths. Other reachable surfaces remain legacy or incomplete. |
| B — unit-tested | Yes for tested slices | The last full standard run reported **528/528 tests in 120 files** on this uncommitted code checkpoint, before this documentation-only closure. Tests do not establish a complete workflow or production parity. |
| C — isolated Neon staging | Yes for tested slices | The last isolated run reported **16/16 tests in 5 files**, with a 60-second remote setup-hook allowance. Earlier synthetic authenticated HTTP/object-storage checks in this document prove only their named paths. No real eSewa sandbox settlement was exercised. |
| D — authenticated end-to-end staging | Not complete | No approved signed-in graphical College/Super Admin browser UAT session was available for the latest journeys. Synthetic HTTP checks and unit tests are not a substitute. |
| E — actual production source data | Not verified | The dedicated read-only Supabase source gate remains closed; current source identities, deltas and storage parity cannot be reconciled from the historical snapshot. |
| F — production after authorized cutover | Not started | Production remains on Supabase; no Neon production deployment, identity switch, data cutover or rollback exercise is claimed. |

The last reported code-checkpoint verification also passed typecheck,
production build and `git diff --check`; lint had **0 errors / 52 existing
warnings**. `git diff --check` was rerun for this closure. These results do
not belong to clean commit `993572f` alone: they cover the then-current
uncommitted code. No code changed in this closure, and the full suites were
not rerun merely to generate another count. Reverify any materially changed
future working tree before treating the numbers as current.

### Supabase reference disposition and remaining runtime work

The existing AST inventory script, `scripts/inventory-supabase-runtime.mjs`,
still reports **110 non-test `app`/`src` files** with a Supabase import:
**102 static**, **8 dynamic**. This count is unchanged from the preceding
checkpoint. Its groups are 39 `app/api`, 38 `src/screens`, 19 `src/lib`, 8
`src/components`, 3 `src/hooks`, and one each in `app/[[...slug]]`,
`src/contexts`, and `src/integrations`. It counts files containing imports,
not exclusively executed Neon calls; mixed-mode files can retain an import
solely for the production-compatible branch. Conversely, an import count
cannot prove that all server-side Supabase calls have been removed.

| Disposition | Current boundary |
|---|---|
| Application runtime | Reachable legacy production APIs/screens still use Supabase for AuthContext/OAuth/reset and Super Admin user controls, other Admin/College management, AI/provider settings, modules and CMS; public pages, payments and media also contain legacy paths. The current staged College and selected shared routes are narrow replacements, not whole-file migration. The [file ledger](neon-runtime-dependency-ledger-2026-10-09.md) is the per-file continuation index. |
| Intentionally retained compatibility | The eight dynamic-import files include College directory/blog/update routes and the contact form with explicit legacy branches, plus AI/storage and Admin/Coming Soon callers. Static imports in many dual-mode screens/routes are likewise retained because production is still Supabase. Do not remove them solely to reduce the count. |
| Migration/reconciliation utilities | `scripts/reconcile-neon-staging*.mjs`, source-gate, inventory and storage/identity scripts are operator tooling, not application runtime. They are excluded from the 110-file `app`/`src` count. Preserve their fail-closed guards. |
| Tests/fixtures | `*.test.*`, `*.spec.*`, `src/test` and fixtures may deliberately exercise legacy compatibility or synthetic staging; the AST inventory excludes test files. Passing tests do not imply production has switched. |
| Generated/shared types | Generated Supabase database types under `src/integrations/supabase/types.ts` are retained for legacy typing. The inventory's single `src/integrations` entry is the active client factory, **not** evidence that generated types are an active service call. |
| Historical/non-runtime | Prior dated status prose, migration SQL/history and superseded counts are not active application callers. The old 117/114 counts used earlier checkpoints/methods; they must not override the current 110-file AST result. |

The next actual runtime dependencies are the remaining College AI and Admin
assignment/management operations, then coherent shared Auth/session,
authorization, storage and provider callers that unblock multiple modules.
Each replacement needs server-side scope, entitlement and transaction tests,
plus authenticated staging workflow proof before its ledger row is promoted.
Do not equate a staging API with production cutover or remove Supabase while
its reachable production branch remains in use.

### External gates and operator actions

1. **Source access — Supabase project administrator:** provision a dedicated,
   least-privilege, read-only PostgreSQL login and exact session-pooler host
   through an approved secret channel as
   `SUPABASE_SOURCE_READONLY_DATABASE_URL`,
   `SUPABASE_SOURCE_EXPECTED_POOLER_HOST`, and
   `SUPABASE_SOURCE_READONLY_ROLE`. The existing source gate must verify host,
   role, TLS and privileges before a read-only reconciliation. Do not use the
   available administrator URL, infer a host, rotate production credentials or
   put secrets in this repository. Current source reconciliation remains
   blocked until that credential is actually supplied and validated.
2. **Identity — Auth/release owners:** the **103 unlinked accounts are a
   historical reported count**, not a fresh source-to-target confirmation.
   For each account, establish verified source and target ownership through
   an approved supported import or dual-proof recovery, retain the original
   application UUID and grants, audit conflicts/rejections, and reconcile
   against a fresh source snapshot. Matching email or fabricated OAuth
   provider IDs never suffice. The synthetic-only identity-link proof must
   not be enabled for the real 103 by inference.
3. **Payments and UAT — staging operator/provider owner:** provide approved
   eSewa **sandbox** merchant code and secret to the isolated staging server
   (`NEON_STAGING_ESEWA_MERCHANT_CODE`, `NEON_STAGING_ESEWA_SECRET`), configure
   and verify the server-side return/callback/status check, and furnish an
   approved authenticated staging session for the College and Super Admin
   browser flows. Record an actual sandbox settlement and duplicate/failed
   cases before claiming payment E2E. Do not enable live charges or infer
   success from a browser redirect.

### Safe development boundary and migration re-entry

Normal product work may resume against the **existing legacy/Supabase
development workflow** (default `MEROTALENT_BACKEND_MODE=legacy`), with the
current production Supabase Auth, DB, storage, OAuth, payment and routing
behavior preserved. The separate, guarded local `neon-staging` mode uses
`scripts/run-neon-staging-local.mjs` and the pinned `.migration.env` staging
configuration; `getBackendMode()` rejects it on Vercel Production. Do not
copy staging credentials into normal development or production, disable
Supabase, delete its resources, or silently point new production features at
Neon. Preserve the current uncommitted migration files and forward-only
staging SQL. For new product features, keep service contracts and data models
explicit, use scoped server APIs, add legacy production tests and—when the
feature touches a migrated area—Neon staging coverage so divergence does not
grow unnoticed. This boundary permits product development; it is not cutover
approval.

**Updated direction:** the paragraph above describes the safe compatibility
boundary at phase closure, not a change in target architecture. The migration
is active again under the continuation directive below; new work should move
the staged runtime toward Neon rather than deepen Supabase-only dependencies.

To resume migration later, start with this closure section, the existing
[dependency ledger](neon-runtime-dependency-ledger-2026-10-09.md), and the
[cutover gate](neon-cutover-readiness-gate-2026-10-11.md). Verify the then-current
working tree and rerun `scripts/inventory-supabase-runtime.mjs`; choose one
coherent remaining workflow, obtain the missing external proofs above, and
advance A–F only with new evidence. Production acceptance still requires
source/target data and storage reconciliation, secure disposition of every
identity, authenticated module UAT, payment verification, backup/final-delta
and rollback rehearsals, followed by explicit release authorization.

## Active migration continuation — 2026-10-12

The first open checklist item is the dedicated source read-only credential.
Current local configuration still lacks `SUPABASE_SOURCE_READONLY_DATABASE_URL`
and `SUPABASE_SOURCE_READONLY_ROLE`; the known project-specific pooler host
alone cannot satisfy the fail-closed gate. An authenticated browser inspection
of the available Supabase dashboard account showed only the unrelated CTMS
project, not the MeroTalent project. The source `postgres` administrator URL
was **not** used for inventory or to bypass the gate. Exact operator action:
give the migration operator access to the MeroTalent Supabase project with
permission to provision a dedicated least-privilege read-only database role,
or provision that role through the project owner; deliver its session-pooler
URL and role name through the approved secret channel. The code can then run
the existing privilege/host/TLS check before any source query. This is an
external access blocker, not a completed reconciliation.

Independent runtime implementation continued with an entity-scoped Neon AI
slice. `src/lib/server/neon-ai.ts` and
`app/api/v1/neon-staging/ai/{byok,generate,scopes}` implement own-assignment
scope listing, entitlement-gated BYOK status and encrypted save, provider
selection (own authorized key before enabled platform provider), editable
draft generation and metadata-only usage/audit logging. The write checks
exact entity entitlement inside the transaction; cross-origin writes and
malformed scopes are denied. `EntityAIControls`, `InstituteProfileEditor` and
`ModuleAIWorkspace` now use those cookie-authenticated, same-origin routes in
Neon staging while retaining existing legacy production behavior.
`secret-store.ts` now imports the provider-neutral configuration error instead
of loading the Supabase server client transitively. No raw key, ciphertext or
private application record is sent to the browser or usage log.

**Evidence level:** code implemented; 11/11 focused tests passed. A
rollback-only test against the pinned isolated Neon branch passed 1/1,
exercising an active College entitlement, foreign-entity denial, encrypted
BYOK upsert, status read and audit row. The full standard suite passed
**534/534 across 121 files** and the full isolated staging suite passed
**17/17 across 6 files**. Production build, post-build typecheck and
`git diff --check` passed; lint returned **0 errors / 52 existing warnings**.
An initial standard test run accidentally included the new Node-only staging
test under jsdom (534 passed, one environment failure); the separate test
configurations were corrected and both full suites reran green. These are
working-tree results on `main` at `993572f` plus uncommitted changes, not a
new commit or production release.

The AI provider is **not configured** in the isolated staging database, so
no real provider generation or signed-in graphical AI journey is claimed.
The AST inventory is now **109 non-test files (101 static, 8 dynamic)**;
removing the transitive secret-store import is a real shared-boundary cleanup,
but the many legacy production and remaining staging callers still require
work. Continue with the existing dependency ledger's next coherent Admin/Auth
or module group while source access, identity recovery, eSewa sandbox
settlement and browser UAT are pursued separately. Production remains on
Supabase. No commit, push, deploy, production data change or cutover occurred.

### Subsequent shared Provider Center batch

`src/lib/server/neon-provider-config.ts` and
`app/api/v1/neon-staging/admin/{providers/[kind],provider-status}` now provide
Neon-backed, cookie-authenticated Super Admin status and configuration for
payment, AI and email providers. The save operation rechecks active Admin
membership inside the transaction, encrypts a replacement secret server-side,
preserves the existing encrypted credential when no replacement is supplied,
rejects enabling without a stored credential, and commits an audit row with
the configuration. The response contains only allowlisted public settings and
configuration flags, never ciphertext or plaintext. Cross-origin writes are
denied. `ProviderConfigurationPanel` and the Provider Center health summary in
`AdminSettings` use these staging endpoints; legacy production behavior is
unchanged. The rest of `AdminSettings` still has direct Supabase site-settings
reads/writes and remains a separate CMS migration task.

**Evidence level:** code implemented and verified against isolated Neon
staging, not source-reconciled or production-ready. Four standard unit tests
cover validation, status states, non-admin denial and secret-free responses;
one rollback-only staging test covers a disabled→enabled transition, encrypted
storage, secret preservation, audit persistence and ordinary-user denial.
The staging transaction was rolled back; no live provider configuration was
changed. Final combined verification after this batch: **538/538 standard
tests across 122 files**, **18/18 isolated staging tests across 7 files**,
typecheck, production build and `git diff --check` passed. Lint has **0 errors
and the same 52 existing warnings**. The AST import inventory remains **109
non-test files (101 static, 8 dynamic)**. There is still no configured AI
provider in staging and no authenticated browser/provider call proof.

Next coherent runtime dependency: migrate the Super Admin site/CMS settings
and public CMS reads together, then remaining shared Admin access/user flows.
External gates remain the dedicated MeroTalent Supabase read-only source role,
safe reconciliation of the 103 unlinked identities, actual eSewa sandbox
settlement/duplicate and failed-return proof, authenticated browser UAT,
backup/restore and rollback rehearsal, and explicit production cutover approval.

### 2026-10-12 continuation — Neon CMS and recovery preparation

The next shared runtime batch is implemented in `src/lib/server/neon-cms.ts`
and `app/api/v1/neon-staging/{cms,admin/cms,admin/site-settings}`. The public
route returns only visible sections (including no children of hidden parents),
top-level visibility flags needed by the homepage, and allowlisted site
settings. Admin section create/edit/delete and settings writes recheck active
Super Admin membership inside an audited transaction; section parents must
belong to the same page. Server validation rejects unsupported pages, unsafe
URLs, arbitrary settings keys and malformed section data. `useSiteCMS`, the
homepage server snapshot, `AdminPageEditor`, and `AdminSettings` now use the
Neon paths in staging and retain their legacy production behavior. The CMS
editor's standard-home-section seeding, nested items, visibility toggles and
branding writes are included. Public detail-record SEO metadata and other
legacy CMS consumers still need Neon runtime replacement; this batch is not
the whole Admin migration.

**Evidence:** 4/4 focused CMS unit tests and a rollback-only isolated Neon
staging test passed. The staging test created hidden/visible parent and child
sections, proved the public boundary, changed a site title, checked audit
rows, deleted the parent and confirmed child cascade, then rolled back. The
final standard suite passed **542/542 across 123 files**. Typecheck,
production build, `git diff --check`, and lint (**0 errors/52 existing
warnings**) passed. The first full isolated staging suite had two Jobs tests
time out at the remote database connection under the 30-second test limit.
Those Jobs tests passed **5/5** when rerun alone with a 60-second limit. A
second full isolated suite with that limit had a connection timeout and
unexpected connection termination in the unrelated modules E2E file:
**11 passed, 8 skipped, 1 failed**. Thus the full isolated staging suite is
**not green on this revision**; do not present the focused CMS pass as a full
suite pass. No source or production data was changed.

Independent recovery work: `node scripts/verify-neon-staging-backup-restore.mjs`
passed using a synthetic staging schema and an isolated local PostgreSQL 18
restore (2 unique rows); it copied no production data. This proves the
synthetic dump/restore method, not a whole-database backup or cutover rollback.
`scripts/reconcile-neon-staging-storage.mjs` now enumerates every S3 object
page and counts missing/extra object identities, using
`scripts/storage-reconciliation-utils.mjs`. Three pure pagination/drift tests
passed via `node --test`. Actual source/target object hashes cannot be
reconciled until the dedicated read-only Supabase source role is provisioned;
the script's existing source gate remains unchanged.

**External action required for source access:** the MeroTalent Supabase project
owner must grant the migration operator dashboard/project access capable of
creating a dedicated least-privilege read-only database role, or create that
role themselves. Deliver the role name, approved session-pooler host and URL
through the secret channel as `SUPABASE_SOURCE_READONLY_ROLE`,
`SUPABASE_SOURCE_EXPECTED_POOLER_HOST` and
`SUPABASE_SOURCE_READONLY_DATABASE_URL`. The existing role/host/TLS/privilege
gate must pass before source reconciliation. Do not use the available
administrator URL. The currently available dashboard account does not show
the MeroTalent project. The 103 historical identity records still lack a
verified, approved recovery path; no production identity was linked. No
authenticated staging browser session or enabled eSewa sandbox provider was
available for a real browser settlement test. Continue code-only work on
Admin/Auth and metadata while these exact external prerequisites are resolved.

No commit, push, deployment, production change or cutover occurred.

### Additional runtime dependency found by local Neon browser smoke

The local staging homepage rendered with the Neon public CMS response
(`GET /api/v1/neon-staging/cms?page=home` returned HTTP 200 with 15 visible
sections, 17 top-level visibility flags and 10 settings; the unauthenticated
Admin CMS endpoint returned HTTP 401). There was no authenticated staging
browser session, so no Admin graphical write/UAT is claimed. The browser
automation CLI itself was not logged in; the available local in-app browser
showed only a public `Login` state. Its smoke run exposed HTTP 500 from the
competitions discovery endpoint.

`src/lib/server/neon-competitions.ts` now maps the real staging
`competitions.cover_image` column to the public `cover_image_url` contract and
queries only upcoming/ongoing, non-expired rows. The Neon branch of
`app/api/v1/competitions/registrations/route.ts` now uses actual
`competition_registrations.registered_at` and no nonexistent `deleted_at` or
`created_at` columns. A student can read only their own registration IDs.
Registration validates the competition ID and optional team name, checks the
current competition under a row lock, denies closed/deadline-expired/full
competitions, returns an existing registration idempotently, and reports
success only after an inserted row is returned. The stage POST requires
same-origin. The dashboard no longer promises a confirmation email that this
flow has not actually sent. Legacy production database behavior is unchanged.

**Evidence:** 5/5 focused unit tests and one rollback-only real Neon staging
test passed, covering public image mapping, own registration reads, invalid
input, closed/full denial, successful persisted registration and idempotent
retry. Local isolated staging HTTP checks returned **200** for public
`/api/v1/competitions?limit=12` and **401** for an unauthenticated
`/api/v1/competitions/registrations` read. No authenticated browser
registration or email delivery was exercised.

### 2026-10-12 final continuation — public detail metadata and verification

The public detail page now uses `src/lib/server/neon-public-metadata.ts` in
Neon staging for College, Job, Mentor and Event server-rendered metadata and
structured data. It reads only approved/public records using parameterized
queries, excludes expired Jobs/Events, uses the existing College public-media
URL contract, and omits unknown/private fields from schema.org output. The
legacy production detail-metadata path is untouched. Four focused unit tests
passed for malformed routes, college canonical/media fields, private-field
exclusion, and unpublished/missing records. This path is **implemented in
code**, but its actual public detail pages still need authenticated/visual
staging UAT; no live record-specific browser claim is made.

Final integrated verification on this working tree: **551/551 standard tests
across 125 files**, **20/20 isolated Neon staging tests across 9 files**,
typecheck, and production build passed. Lint returned **0 errors and 52
existing warnings**. The earlier remote-database staging timeouts noted above
were transient; the final full isolated run completed. The source import
inventory is still **109 non-test Supabase-referencing files (101 static,
8 dynamic)** because production branches and untouched workflows remain.
`node --test scripts/storage-reconciliation-utils.test.mjs` passed **3/3**;
the synthetic staging dump/local restore rehearsal and final
`git diff --check` passed.

**Next concrete runtime batch:** migrate shared Super Admin user/access
management, publication/featured discovery and any remaining public CMS
consumers using the existing Neon actor and transaction boundaries. Replace
actual Supabase operations one workflow at a time and add denial/transition
tests. Continue independent identity recovery and storage reconciliation
tooling, but do not run source reconciliation or link the 103 unresolved
accounts without the dedicated verified read-only source role and ownership
proof. The owner must supply the exact approved role, pooler host and URL via
the three `SUPABASE_SOURCE_*` secret-channel variables described above.
Authenticated staging browser UAT, live eSewa sandbox settlement, full
backup/rollback rehearsal and authorized production cutover remain open.

Production remains unchanged. No commit, push, deployment or cutover occurred.

### 2026-10-13 continuation — Super Admin People read/status and featured boundary

The staging People user list now reads `public.profiles` and `public.user_roles`
through `src/lib/server/neon-admin-users.ts` and
`app/api/v1/neon-staging/admin/users/route.ts`, with bounded pagination/search,
verified Managed Auth link, an active Super Admin recheck in the SQL statement,
and private no-store responses. Unlinked legacy profiles are labeled
"Recovery needed" rather than silently appearing as sign-in-ready accounts.
The staging People screen uses this route rather
than Supabase Auth for listing. Suspend/reactivate uses a same-origin request,
an audited Neon transaction, active linked-admin recheck, exact target profile,
and self-suspension denial. This is **implemented in code and unit-tested**;
the staging People screen's invitation, password reset, delete, entity options,
and manual module/payment assignment still use legacy Supabase and must be
migrated before the whole screen is accepted. Their staging UI actions are
temporarily hidden and handler-guarded so a staging session cannot mutate the
production Supabase backend; the production UI remains unchanged. This is a
fail-closed migration boundary, not completed functionality. No authenticated People browser
UAT was performed. Added focused tests in `src/test/neon-admin-users.test.ts`
and `src/test/neon-admin-users-route.test.ts` (6/6 passed).

Public featured discovery in `app/api/v1/featured/route.ts` now constructs
the Supabase admin client only in legacy branches. A Neon failure returns a
503 instead of an apparently successful empty feature list. The existing
Neon-approved-public-record hydration remains. Added focused route tests in
`src/test/neon-featured-route.test.ts` (3/3 passed).

The next connected batch also moved the Super Admin Featured Content Manager
to `app/api/v1/neon-staging/admin/featured/route.ts` and
`src/lib/server/neon-featured-admin.ts`. Its list and public-target picker are
guarded by an active verified linked-admin SQL predicate; create/reactivate
and soft removal use same-origin writes, exact published-target validation,
an active linked-admin predicate in the mutation itself, and audit entries.
The existing screen uses these endpoints in Neon staging, preserving the
legacy production path. Target checks reject unpublished Colleges, Mentors,
Courses, Jobs and Events. Added focused service/route tests in
`src/test/neon-featured-admin.test.ts` and
`src/test/neon-featured-admin-route.test.ts` (6/6 passed). Actual signed-in
Super Admin browser authoring and target-side SQL execution for these new
statements still need staging acceptance; unit/route mocks do not prove them.

Source-access operational checkpoint: the CLI's existing authorized project
session identified the linked Supabase project and exact session-pooler host.
A dedicated `merotalent_migration_ro` login was created on the production
source with no superuser/role-creation/replication/RLS-bypass attributes, and
its connection URL was placed only in macOS Keychain service
`MeroTalent Supabase Source Readonly URL` (never in the repository or console).
Strict TLS with the Supabase CA succeeded. **The fail-closed source gate remains
unmet:** the role can authenticate and read public/storage tables but cannot
read `auth.users` because `auth` schema USAGE is unavailable to it. The
`postgres` role does not own `auth` and lacks grant authority for that schema;
no administrator credential was substituted into reconciliation. Supabase's
Management API read-only query endpoint did return an `auth.users` count of
104 as `supabase_read_only_user`, but that API result is not a verified
dedicated-login export and no source reconciliation/import was run. The
required external action is for the project owner/Supabase support to grant
schema `auth` USAGE safely to the dedicated read-only role, or approve an
equivalent officially read-only source-export mechanism and adapt the gate
without weakening it. The Chrome dashboard session available here belongs to
a different organization and cannot manage this project's permissions.
Production application data, routing and deployment were not changed; only
the dedicated source read-only role/password was provisioned. No commit, push,
deployment, production data migration or cutover occurred.

Final integrated verification on this batch: **566/566 standard tests across
130 files**, **21/21 isolated Neon staging tests across 10 files**, typecheck,
production build and `git diff --check` passed. Lint reported **0 errors /
52 existing warnings**. The new People tests are unit/route mocks; the
featured authoring lifecycle additionally passed a rollback-only real Neon
staging test. Authenticated browser People/Featured UAT is not claimed.

**Next concrete task:** finish the staging People invitation, deletion,
password recovery and audited module/entity/payment assignment workflows on
Managed Auth + Neon, then authenticated browser acceptance for People and
featured authoring. Continue
identity ownership-proof recovery and storage/UAT/rollback work independently
while source Auth access is resolved.

### 2026-10-13 continuation — People retirement and staging Auth recovery

`src/lib/server/neon-admin-users.ts`, `app/api/v1/neon-staging/admin/users/route.ts`
and `src/screens/admin/AdminUsers.tsx` now support reversible **deactivation**
and explicit reactivation of an ordinary user through the existing linked
Super Admin transaction. The transaction rechecks the actor's active verified
identity, locks the target profile, rejects self-deactivation and Super Admin
retirement, updates `account_status`, and records an audit entry. It does not
delete Auth identities or historical business records. Existing Neon session
resolution rejects non-active profiles on subsequent protected requests. The
staging People UI labels deactivated accounts and exposes the operation; the
legacy production branch is unchanged. This passed unit/route tests and a
rollback-only real Neon staging transition test. It is **not** evidence of an
authenticated browser journey or immediate provider-session revocation.

`app/api/v1/neon-staging/auth/[...action]/route.ts` now forwards Better Auth's
token-based `request-password-reset` and `reset-password` actions only in
Neon staging. It enforces same-origin POST requests, validates input, fixes the
redirect to this application's `/reset-password` (no user-supplied redirect),
and keeps responses private/no-store. `src/screens/ResetPassword.tsx` uses the
staging link/token flow instead of Supabase OTP calls; the People reset action
is enabled only for a linked identity and truthfully says recovery was
*requested*, not delivered. The production Supabase reset experience remains
unchanged. Three bridge regression tests cover redirect injection, malformed
and cross-origin requests, and upstream failure propagation. **Actual email
delivery, link completion, and staging Auth-provider configuration still need
authenticated UAT**; an HTTP/route test cannot prove delivery.

Source access remains fail-closed. A fresh read-only privilege inspection
confirmed `merotalent_migration_ro` can log in and has `auth.users` table
SELECT but **does not have `auth` schema USAGE**. The current `postgres` admin
is not a member or grant administrator of `supabase_admin`, the schema owner,
and is not a member/grant administrator of `supabase_read_only_user`. No
administrator credential was used for source reconciliation. Supabase's
official Management API does offer a read-only query endpoint as
`supabase_read_only_user` with a project-scoped token carrying only
`database_read`, but the current CLI token is broader; it has not been
substituted for the approved source gate. The concrete operator action is
either (a) obtain an owner/Supabase-supported grant of `auth` schema USAGE to
the dedicated migration role, or (b) create a project-scoped **database-read
only** PAT in the owning Supabase account and explicitly approve an equivalent
read-only API source adapter and revised gate. No source import/reconciliation
or production data mutation occurred.

Final-revision checks for this batch: **573/573 standard tests across 131
files**, **22/22 isolated Neon staging tests across 11 files** (including the
new People retirement test), typecheck and
production build passed, lint returned **0 errors / 52 existing warnings**.
The first full isolated staging run passed **21/22** but the unrelated College
scopes test hit its 60-second timeout; rerunning that test alone passed **1/1**
in 16 seconds; the subsequent clean full staging run passed **22/22**.
`git diff --check` passed on the final revision. No commit,
push, deployment or cutover occurred.

**Next concrete runtime batch:** implement the single Super Admin People
module/entity/manual-payment assignment workflow on Neon with exact linked
actor checks, scoped target validation, entitlement/payment ledger and
idempotent audit transaction. Keep invitation and Auth-provider recovery
delivery blocked until a supported Managed Auth mechanism and staging email
configuration are verified. Continue source-gate resolution, recovery of
unlinked identities, authenticated browser UAT, eSewa sandbox confirmation,
and backup/rollback rehearsal independently. Production remains Supabase.

### 2026-10-13 continuation — Neon People assignment and manual payment review

The existing People surface in `src/screens/admin/AdminUsers.tsx` now uses
`app/api/v1/neon-staging/admin/access/route.ts` and
`app/api/v1/neon-staging/admin/manual-payments/route.ts` in Neon staging.
`src/lib/server/neon-admin-access.ts` implements linked active Super Admin
checks, exact entity lookup, multi-module/multi-entity grants, subscription
dates, complimentary entitlements, pending manual-payment entries, separate
confirmation/rejection, revocation and audit metadata in database transactions.
The People assignment picker uses server-side entity search so the first 100
records do not silently cap the colleges an admin can select.
Positive amounts do **not** activate paid access until a Super Admin confirms
the payment on the separate review action. Confirmation locks the target and
assignment, creates the entitlement once, and duplicate confirmation is
idempotent. Revocation removes active entitlement and fails any pending manual
payments for the revoked scope/capability; financial history is retained.
Production's existing Supabase flow remains unchanged.

`src/test/neon-admin-access-route.test.ts` covers the session, same-origin,
private-cache and strict-body HTTP boundary. The rollback-only
`src/test/neon-admin-access-staging.test.ts` exercises paid pending state,
duplicate assignment key, conflicting retry, confirmed payment, duplicate
confirmation, revocation, cancelled pending payment, complimentary access and
cross-entity denial on actual isolated Neon staging tables. It also resolves
assignable entities for College, Jobs, Mentor and Events. The staging test
identified the partial payment-reference unique index and the SQL conflict
target was corrected to match it. These tests do not constitute an
authenticated browser or real payment-provider acceptance test.

Final local code checks for this batch: **575/575 standard tests across 132
files**, **23/23 isolated staging tests across 12 files**, typecheck,
production build and `git diff --check` passed. Lint has **0 errors / 52
existing warnings**. The first full isolated staging run was interrupted by
intermittent Neon pooler DNS resolution (`ENOTFOUND`) and related timeouts;
DNS subsequently resolved and a clean full rerun passed 23/23. These
rollback-only tests made no durable staging changes.

Remaining work is not downgraded by this slice: resolve the approved
read-only source Auth schema access, reconcile actual production data and
storage, prove ownership-based recovery for unresolved identities, complete
remaining Supabase runtime replacements, authenticated browser UAT, eSewa
sandbox verification, and backup/restore plus rollback rehearsal. The next
concrete implementation task is the remaining People invitation/Managed Auth
delivery boundary and cross-module access display. Production was not
changed; no commit, push, deployment or cutover occurred.

## 2026-10-13 source identity and row-delta execution checkpoint

The existing Supabase CLI Management API credential was located in macOS
Keychain without printing it. `scripts/supabase-readonly-management-api.mjs`
uses only Supabase's `database/query/read-only` endpoint for bounded `SELECT`
inventory. This is a safe source read for investigation, **not** the dedicated
PostgreSQL read-only credential or a consistent export; the full-source gate
remains closed. Production data, Auth, Vercel, and traffic were not changed.

`scripts/supabase-readonly-auth-inventory.mjs` found **104** current source
Auth users and **105** Auth identities. Five source QA users (`qa.admin`,
`qa.college`, `qa.company`, `qa.mentor`, `qa.student`) exist; no QA Events
Organizer Auth user exists. Neon staging has 104 application profiles but one
source user is absent and one synthetic staging profile is extra. Exactly one
source identity has a verified Neon link (in fact zero source users match the
single synthetic verified link). Six non-QA accounts have administrative
roles/capabilities/scopes. Thus the prior “103 unlinked” figure is an
application-link count, **not** 103 safely disposable Auth identities; deleting
it blindly would include QA and legitimate administrators. The requested
source-user deletion was not performed pending a verified identity disposition
that preserves business ownership and access.

On isolated Neon migration-staging only, a guarded dry run identified 36
unlinked, auth-only `neon-*@example.com` synthetic users. A no-compute backup
child branch (`br-withered-star-azkvampt`) was confirmed
ready before deletion because Neon rejected a snapshot of the non-root
staging branch. `scripts/cleanup-neon-staging-synthetic-auth.mjs
--apply-staging` removed exactly 36 through the supported Neon Managed Auth
CLI: **37 → 1** Managed Auth users. Rerun found zero candidates and made zero
deletions. The one remaining linked synthetic user, all copied application
profiles, QA records and business records were preserved. The child branch is
not yet proof of a tested restore or long-term backup.

`scripts/reconcile-neon-via-readonly-api.mjs` compared the current source
public schema/row digests against isolated staging: **80 source tables, 90
staging tables, 34 matches, 46 differences**. Four schema differences are
target-side additions in `event_registrations`, `events`, `jobs`, and
`profiles`; they require explicit mapping rather than a naive byte comparison.
`scripts/reconcile-neon-source-key-deltas.mjs` narrowed seven count drifts:
`audit_logs` 4 source-only, `leads` 40 staging-only,
`media_upload_intents` 1 staging-only, `notifications` 1 source-only/2
staging-only, `saved_jobs` 1 source-only, `sub_admin_requests` 1 source-only,
and `user_roles` 1 source-only. These are real identifier-set differences;
their ownership and contents have not yet been safely migrated. API queries
are separate source snapshots, so this is a drift inventory, not final parity.

**Next concrete execution:** classify and safely replay source-only business
rows into isolated staging after FK/ownership checks; investigate staging-only
rows without deleting legitimate data; obtain a dedicated read-only
PostgreSQL source role for consistent full export/final-delta reconciliation;
then continue the remaining People invitation/Managed Auth boundary and
cross-module runtime replacement. Do not cut over or delete production Auth
users based on the stale 103 count. Browser UAT, real eSewa sandbox settlement,
storage parity, full-data restore/rollback and production authorization remain
open gates.

The first bounded replay is now complete in **isolated staging only**.
`scripts/replay-neon-source-only-rows.mjs` first passed a full transaction
rollback probe. A second no-compute backup child branch
(`br-fancy-math-azietri1`) was confirmed ready before
the staging apply. The apply inserted **1 profile, 1 application-account
mapping, 1 role assignment, 1 saved job, 1 sub-admin request, 1 notification,
and 4 audit records**. Exact primary-key conflict targets were used because
generic `ON CONFLICT DO NOTHING` was rejected by a deferrable unique
constraint during the rollback probe. The first failed probe rolled back.
The successful apply committed atomically; a second apply inserted **zero**
rows. The subsequent read-only key comparison found **zero source-only keys**
for the eight checked tables, and every staging profile had an
application-account mapping. Source Auth remained 104/105 users/identities;
staging now has 105 profiles (104 matching source plus one isolated synthetic
profile). The new copied account has no verified Neon Auth link and cannot
claim access by email alone. Staging-only leads (40), upload intents (1),
notifications (2), and synthetic profile (1) remain to classify. This is
not row-content, object-storage, or transactional full-source parity.

Current-revision verification after these script/docs changes: `node --check`
for the reconciliation and cleanup scripts and `git diff --check` passed;
**575/575** standard tests across 132 files, the first isolated staging run
passed **23/23** tests across 12 files, typecheck and production build passed. Lint reports
**0 errors / 52 warnings**. The source-only replay was verified by a rollback
probe, one staging commit, a zero-write rerun and a follow-up key inventory.
No production write, commit, push, deploy or traffic cutover occurred.

After the staging replay, two full isolated-suite reruns were **not clean**:
one reported 22/23 with a College payment test timeout; a second reported
21/23 with Neon pooler connection timeouts on the College payment and People
access tests. `pg_stat_activity` showed no lingering transaction/lock, DNS
resolved, and those two files reran together successfully **2/2**. The
staging suite remains operationally flaky under full-suite connection load;
do not turn the focused rerun into a full-suite pass claim. The new
`scripts/read-only-query-policy.test.mjs` passed 2/2 cases.

The AST runtime scan (`node scripts/inventory-supabase-runtime.mjs`) still
finds **109 non-test `app`/`src` files** importing Supabase (101 static, 8
dynamic), including 39 API files and 38 screens. These are not all harmless
historical references; the runtime-removal gate is **FAIL**. The staging
payment provider row has an encrypted eSewa secret but is **disabled** and
its public environment is **production**, not sandbox. It was not enabled or
used for a sandbox charge. An approved sandbox provider configuration and
test identity are required before a real settlement test. The source
read-only API can inventory `storage.objects` (22 objects observed) but cannot
provide a consistent database export or prove private object bytes; the
dedicated source database role and storage reconciliation remain required.

`scripts/verify-neon-staging-full-restore.mjs` now performs a full
`pg_dump` custom archive of staging `public` and `neon_auth`, restores into
disposable local PostgreSQL 18, installs the three source extensions between
pre-data and data/post-data restore, checks representative table counts and
application-account ownership, then stops and removes the temporary server
and archive. The actual isolated restore **passed**: profiles 105,
application accounts 105, identity links 1, payments 1, Managed Auth users 1,
and orphaned application accounts 0. The first two attempts exposed and fixed
the local `public` schema collision and missing `pg_trgm` extension.
This is a **staging database restore**, not source-production backup, object
storage restore, full row-content integrity proof, or rollback after divergent
writes. Those acceptance gates remain open.

`npm run check:migrations` passed with three new migrations and no historical
migration edits. The legacy `npm run check:drift` command still probes
Supabase PostgREST table/column endpoints, not Neon; it emitted no result
after 90 seconds and was interrupted. It is **not** a Neon schema-drift pass.

## 2026-10-13 reconciliation, backup, and credential-containment continuation

The source read-only API reconciliation now runs all 80 table digests in one
read-only SQL statement, so the source side represents one MVCC statement
snapshot rather than 80 independently timed reads. The target is still a
separate transaction and this is not a consistent source export or final
cutover delta. Current result: 80 source tables, 90 target tables, 35 exact
matches and 45 differences (38 row-content, four schema, three row-count).
The 40 staging-only leads group into six mentor bookings, 12 event
registrations, 21 job applications, and one contact query from October 9–11.
They are not treated as disposable without ownership and workflow review.

`scripts/classify-neon-source-identities.mjs` makes read-only,
pseudonymous classifications without granting access or matching on email:
104 current source users comprise five required QA accounts, six other
administrative accounts and 93 unresolved accounts to preserve. All 104 have
an Auth identity and an application-account mapping in staging; **zero source
users have a verified Neon identity link**. The remaining synthetic linked
staging account is not a substitute for source ownership proof. Password,
OAuth and session migration remain unproven; the earlier 103 figure must not
be used as a deletion list.

`scripts/reconcile-neon-storage-via-readonly-api.mjs` listed source storage
metadata and staging Neon Object Storage without downloading private bytes:
22/22 source objects exist in staging, with matching object sizes and
content types. One source bucket named `Merotalent` is absent in staging and
contains no source objects; one staging-only resume object remains, reported
by a key fingerprint rather than a private filename. This is not byte-hash,
ACL, signed-access, or consistent-snapshot parity. The staging-only object is
preserved pending classification.

Both pre-change Neon backup branches (`br-withered-star-azkvampt` and
`br-fancy-math-azietri1`) are ready and contain the expected pre-cleanup and
pre-replay counts. Their parent branches have no expiration; their two
temporary probe children expire October 20. Full staging database restore
passed separately, but object-storage restore and divergent-write rollback
remain untested. Temporary verification compute endpoints were removed.

A Neon database connection URI was exposed in a local tool-error output.
Treating it as compromised, the `neondb_owner` role passwords were rotated
on migration-staging, the two backup parents, their probe children, and,
after explicit user authorization, the Neon production branch. The local
ignored `.migration.env` staging and Neon production URLs were updated
without printing values and the rotated production connection passed a
read-only connection test. Vercel Production lists only Supabase connection
variables, no Neon database URL, so this containment did not change live
application traffic. Recheck any separate, unmanaged consumers of the old
Neon role password before relying on them; no credential is recorded here.

No production data migration, commit, push, deployment, or traffic cutover
occurred. The explicit production credential rotation above was the only
production-branch mutation authorized for containment. Remaining gates:
dedicated source PostgreSQL read-only export, verified account linking and
recovery, storage bytes/ACL parity and empty-bucket disposition, remaining
Supabase runtime replacements, authenticated cross-module UAT, eSewa sandbox
settlement, and storage-inclusive restore/rollback rehearsal.

Verification on this continuation: both source classification and batched
table-digest reconciliation completed read-only; storage metadata inventory
completed read-only; `node --check` passed for all three new/changed scripts;
the read-only-query and storage utility tests passed **5/5**; the full
standard suite passed **575/575** across 132 files; the isolated staging
suite passed **23/23** across 12 files after credential rotation; typecheck
and production build passed; lint completed with **0 errors / 52 existing
warnings**; `git diff --check` passed. These checks do not prove the open
identity, payment, storage-byte or cutover gates.

## 2026-10-13 four-workstream execution continuation

**Source/data:** `scripts/reconcile-neon-all-row-deltas.mjs` now checks the
primary-key identity and per-row digest for all **80/80** shared source tables
in one read-only source statement and one separate staging repeatable-read
snapshot. No table lacked a comparable primary key. Exact comparison flags
45 tables, chiefly because imported timestamps lost sub-millisecond
precision. A safe column-hash diagnostic found a sampled badge differs only
in `created_at` by about 0.00078 seconds; sampled institute/payment rows
also differ in timestamp fields. After UTC millisecond normalization, five
tables retain actual row/key differences: `audit_logs` (25 shared rows),
`leads` (five shared rows plus 40 staging-only), `media_upload_intents`
(one staging-only), `notifications` (two staging-only), and `profiles` (one
shared row plus one staging-only). Target-only columns remain in events,
event registrations, jobs and profiles. These exceptions require field and
ownership classification before replay. Millisecond normalization is a
diagnostic, **not** a claim that lost microseconds were restored. Source and
staging snapshots are taken at different times, so final-delta reconciliation
remains open. The dedicated source role still lacks safe `auth` schema USAGE;
the project owner/Supabase support must grant that privilege to the existing
read-only role or approve a project-scoped database-read-only API export with
a documented consistency protocol. No administrator credential was used as
a substitute for the gated full export.

**Storage:** `scripts/reconcile-neon-storage-via-readonly-api.mjs
--hash-bytes` used read-only source metadata and GET-only object downloads.
All **22/22** source objects matched their Neon staging copy in actual byte
length and SHA-256. The path-redacted, object-level manifest is
`docs/neon-storage-byte-manifest-2026-10-13.json`. One empty source bucket
(`Merotalent`) is absent in Neon, and one staging-only resume object remains
preserved for classification. Source metadata and GETs are not atomic;
private authorization, signed-download policy, post-restore integrity and
new changes after extraction still require verification. No source object
was changed.

**Runtime:** `src/lib/server/neon-student-activity.ts` and
`app/api/v1/neon-staging/student-activity/route.ts` now supply the existing
student activity view from server-side, verified-session-scoped Neon queries
across College, Jobs, Events and Mentorship. The browser hook uses that
endpoint only in Neon staging; production retains its current Supabase path.
The route exposes no user-ID selector, uses the linked actor ID for all four
queries, and returns private/no-store data. Three route tests and one
read-only real staging database test passed. The AST inventory still finds
**109** non-test Supabase-importing files; dual-runtime production imports
cannot be removed before an authorized cutover, and many active staging
surfaces remain to migrate. This slice does not satisfy runtime elimination.

**eSewa/UAT:** The official [ePay UAT documentation](https://developer.esewa.com.np/pages/Test-credentials)
provides a public test merchant configuration. Before altering isolated
staging, backup branch `br-wild-star-azyi8zeg` was created and verified
ready (expires October 20). `scripts/configure-neon-staging-esewa-uat.mjs`
then changed **only Neon migration-staging** from disabled/production-marked
to enabled/UAT with an encrypted test secret; it audited the operator
bootstrap and a second apply returned `NO_CHANGE`. The documented UAT status
endpoint was reachable and returned `NOT_FOUND` for a no-charge probe.
No checkout, signed return, actual sandbox settlement, fee/commission,
callback, or subscription activation was exercised, so the payment acceptance
gate remains **NOT TESTED** beyond configuration and connectivity.

**Browser/recovery:** The agent-browser skill CLI is installed but has no
active login; the available local in-app browser opened the isolated staging
app and confirmed an unauthenticated `/dashboard` redirects to `/login`.
The 104 source identities still have no verified Neon link, and designated
QA staging credentials/session are unavailable. Authenticated QA role journeys
were **NOT TESTED**; no email-only link or fabricated QA account was made.
The earlier full staging database restore passed, but object-storage restore,
private ACL verification and divergent-write rollback remain **NOT TESTED**.
Production traffic and data were unchanged; no commit, push or deployment.

Final verification for this batch: standard tests **578/578** across 133
files; isolated staging tests **24/24** across 13 files, including the
student-activity staging query; final typecheck and production build passed;
lint completed with **0 errors and 52 existing warnings**; migration
immutability check found three new migrations and no historical edits;
`git diff --check` passed. The initial typecheck overlapped with Next.js
regenerating `.next/types` and failed on missing generated files; it passed
when rerun after the build. No authenticated QA browser or actual eSewa
sandbox settlement was inferred from these checks.

A further isolated `job-files` private-object probe passed: a 60-second
signed download returned the expected synthetic bytes with HTTP 200 before
expiry and HTTP 403 after 68 seconds; the probe object was deleted. This
verifies one signed-URL expiry path, not the complete migrated-file ACL matrix
or object-storage restore.

## 2026-10-13 student account workflow continuation

The staging onboarding wizard now uses the existing Neon own-profile PATCH
and private PDF résumé upload/delete paths instead of browser Supabase writes.
Profile completion is guarded by a nonblank full name, the verified-session
linked profile, and strict server fields; the browser cannot submit a résumé
object path. Student Settings now uses the same Neon profile path, a new
linked-account preferences GET/PUT route, and the existing same-origin Managed
Auth bridge for current-password-verified password changes. Legacy production
branches remain untouched. Onboarding, preferences and password-bridge unit
tests passed **8/8**; résumé/avatar focused tests passed **14/14**. This is
code and mocked-route verification, not designated-QA browser acceptance.

`scripts/classify-neon-five-row-deltas.mjs` performed a read-only field-hash
classification. There are no source-only primary keys in the five tables.
Staging-only keys: one audit log, 40 leads, one upload intent, two
notifications and one profile. Shared-row semantic differences beyond the
known imported timestamp precision: audit logs have 24 `new_data` and 11
`old_data` differences; leads have five `payload` differences; notifications
have four `deleted_at` differences; one profile has differing phone and
location. The extra target-only `job_preferences` profile column is excluded
from this comparison. Exact row IDs and private values were not printed.
These could be legitimate staging actions, transformations or later source
updates; no row was overwritten or deleted pending owner-level classification
and a consistent final source snapshot. Timestamp microseconds remain lossy.

Final revision checks for this continuation: standard suite **586/586**
across 136 files; isolated staging suite **24/24** across 13 files; typecheck,
production build, migration immutability and `git diff --check` passed.
Lint: **0 errors / 52 pre-existing warnings**. The real staging database
accepted a read-only query of the new preferences route's columns. The
Supabase direct-import inventory remains **109 non-test files** (101 static,
eight dynamic): these are retained legacy production branches and unresolved
active paths, not evidence of runtime elimination. Authenticated designated-QA
onboarding/settings/browser UAT, complete eSewa sandbox settlement, source
Auth export/linking, private-file category matrix, storage restore and
divergent-write rollback remain **NOT TESTED**. Production and deployment
configuration were not changed; no commit, push or cutover occurred.

The next complete staging runtime group is Super Admin notifications:
`app/api/v1/neon-staging/admin/notifications/route.ts` now resolves recipients
server-side, authorizes platform administrators, persists sends atomically,
lists records and members, marks records read, and soft-removes records.
`src/screens/admin/AdminNotifications.tsx` uses this route in Neon staging;
the recipient inbox repository excludes soft-removed rows from lists, counts,
cursors and read-state mutations. Legacy production behavior remains separate.
Nine focused admin/recipient notification tests passed; a read-only real
staging schema probe confirmed the required notification and role columns.
Actual authenticated Super Admin browser sending and delivery are **NOT
TESTED** pending verified QA identity/session access.

`scripts/verify-neon-staging-object-restore.mjs --apply-staging` also passed
an isolated storage rehearsal: it backed up all **23** current staging objects
(including the preserved staging-only résumé), restored **8,552,331 bytes**
into a fresh temporary staging bucket, verified each restored object's bytes,
SHA-256, length and content type, then removed the temporary bucket. This
proves same-service object restore mechanics, not cross-environment disaster
recovery or private application ACLs. The source-to-staging **22/22** byte
parity evidence remains separate.

Final revision verification after both runtime groups: standard suite
**590/590** across 137 files, isolated Neon staging suite **24/24** across
13 files, typecheck, production build, migration immutability and
`git diff --check` all passed. Lint stayed at **0 errors / 52 existing
warnings**. No new migration was added in this continuation. Neither these
checks nor the schema probes establish authenticated graphical UAT or remove
the 109 remaining direct Supabase-import files.

## 2026-10-13 Super Admin application and booking supervision continuation

The College-applications and Mentor-bookings Super Admin screens now use
isolated Neon staging API routes for their complete list/status operations:
`app/api/v1/neon-staging/admin/college-applications/route.ts`,
`app/api/v1/neon-staging/admin/mentor-bookings/route.ts`,
`src/screens/admin/AdminApplications.tsx` and
`src/screens/admin/AdminBookings.tsx`. The existing Supabase production
branches remain unchanged. Both staging routes require a linked active
Super Admin, recheck that role inside the SQL operation, reject cross-origin
mutations, restrict update bodies to ID/status, and record status changes in
the same transaction as an audit entry. College listings include the actual
college name. Mentor-booking status supervision cannot manually confirm an
unpaid booking; completion/no-show requires a confirmed paid or no-charge
booking after its scheduled end, while paid cancellation is denied pending a
verified refund path. Five focused tests cover authorization, malformed and
cross-origin requests, payment-safe transitions and audit behavior. Both GET
and PATCH SQL statements passed read-only `EXPLAIN` on isolated Neon staging,
and their referenced columns were verified there. No write was executed by
those probes. Authenticated QA browser operation
and real status mutations were not exercised.

`scripts/classify-neon-five-record-provenance.mjs` added a read-only,
redacted owner/time/category classification. The one target-only audit row is
the staging eSewa UAT configuration action (2026-10-13). The 40 target-only
leads date from October 9–11: 21 job, 12 event, six mentor and one contact;
39 owners are not in the 104-user source Auth inventory, while one is. The
one target-only media intent is a `college_logo` action tied to a source Auth
user (October 5). The two target-only queued contact notifications are tied
to source Auth recipients (October 11). The one target-only profile is tied
to an identity absent from source Auth (October 8). This evidence supports
staging-specific activity, **not** automatic disposal: ownership and business
intent for the one source-owned lead/media intent and notifications still need
review. No records were deleted or overwritten. Shared audit JSON, five lead
payloads, four notification deletion states, one profile phone/location and
timestamp precision differences remain unresolved; separate source statements
do not constitute a consistent source snapshot.

Final checks after this implementation: standard suite **595/595** across
139 files; isolated staging suite **24/24** across 13 files; typecheck and
production build passed; lint **0 errors / 52 warnings**; migration
immutability check found three new migrations with no historical edits;
`git diff --check` passed. The direct-import inventory remains **109
non-test files** (101 static, eight dynamic), including intentional legacy
production branches and other unmigrated runtime groups. No migration was
added in this batch. Source Auth remains **104 users / zero verified Neon
links**, and designated QA sign-in is **not tested**. The dedicated source
read-only PostgreSQL role still needs `USAGE` on `auth` and read-only `SELECT`
on required Auth tables, or an owner-approved consistent export mechanism;
the separate Management read-only API inventories users but cannot give a
single transactionally consistent full export. Do not replace this with an
administrator write credential. Next implementation target: other active
Super Admin resource screens and the module-access request/payment lifecycle;
then repeat full regression. eSewa sandbox settlement, complete private-file
ACL matrix, cross-environment DB+storage restore, divergent-write rollback and
authenticated browser UAT remain open. Production was not changed, and no
commit, push, deployment or cutover occurred.

## 2026-10-14 completion execution — integrated work in progress

The read-only Management API provides an owner-authorized alternative to the
missing dedicated source PostgreSQL connection. One PostgreSQL SELECT returned
all **80 public tables / 2,173 rows**, **104 Auth users / 105 identities**, and
**13 bucket / 22 object metadata records** from one MVCC statement snapshot at
2026-10-13T23:08:41.8614Z. The connection reported
`current_user=supabase_read_only_user` and `transaction_read_only=on`.
`scripts/source-snapshot-artifact.mjs` retains the authenticated encrypted
artifact under the local MeroTalent migration-artifacts directory (0700/0600);
its key is in macOS Keychain. Neither hashes/passwords nor live tokens are
exported as authentication credentials. This establishes a consistent DATA
comparison point, not a schema backup or a final production write-freeze/delta.
The dedicated PostgreSQL gate remains unchanged. Current Neon documentation
requires users to reauthenticate/create a Managed account; Supabase password
hash import is not a supported Managed Auth operation.

Semantic comparison against that snapshot showed the former audit JSON and
five lead payload differences are JSON representation differences, and four
notification deletion timestamps have the same millisecond value. The only
business change was one source-newer profile phone/location. Its two-field
staging replay preserved unrelated columns, audited the source artifact, and
an apply rerun changed **zero** profiles. The five compared tables now have
zero unresolved source-shared business deltas and no source-only IDs; historical
timestamp microseconds remain lossy. Staging-only fixture/activity records are
preserved and remain explicitly outside source parity.

Substantial runtime batches added secure Neon generic Super Admin CRUD for
the existing resource registry and wired College/Job/Mentor/Event/Package
forms, event auxiliary panels, platform AI drafts and common managed media.
The source event schema additions were applied only to isolated staging using
the existing parity script. Private media now checks real bytes, MIME/size,
exact entity scope, intent ownership, persisted references and deletion rules.
The module-access request lifecycle also now uses Neon: database-derived
profile/contact, compatible package, actual private supporting documents,
request history/cancellation/retry, authoritative Super Admin decision and
explicit entity assignment. Its eSewa checkout kind is
`module_access_request`; a provider-verified payment alone remains awaiting
approval and cannot create scopes. New notification writes append durable
events atomically. The root's updated real Neon/S3 rollback test uses a
deterministic provider fixture through the actual callback/ledger, rather than
manually marking the database payment successful. That test is application
logic evidence, not external eSewa settlement.

Checkout now reads the encrypted enabled UAT Provider Center configuration;
the old separate staging-secret environment path was disconnected from the
saved configuration. It also locks the verified identity/profile during
initiation and expires overdue pending checkout rows before retry, preserving
the partial unique index. Genuine mentor and event sandbox checkout forms
were accepted by the official eSewa UAT site and displayed NPR 10/EPAYTEST.
The site then showed **“This site is exceeding reCAPTCHA Enterprise free
quota”**, with LOGIN disabled. Both provider cancellations returned to the
application, persisted failed payments and cancelled/unconfirmed services,
and duplicate returns did not change them. Forged success signatures were
rejected with HTTP 400 and unchanged ledger states. No real charge or genuine
sandbox successful settlement occurred. The one disposable browser-UAT
fixture set was individually identified and removed using the staging guard
and supported Neon Auth deletion CLI. The harness is
`scripts/neon-staging-esewa-browser-uat.mjs`; interrupted cleanup is supported
by `scripts/cleanup-neon-staging-esewa-uat.mjs`.

Storage HTTP acceptance passed **155/155** real-session assertions over
résumés, experience/training documents, payment proofs, chat and private event
attachments. Actual signed bytes, anonymous/tampered reads, wrong actors,
expired scopes/suspended access, referenced deletion and historical résumé
preservation were tested; four synthetic Auth subjects and seven objects were
cleaned. Combined recovery restored **99 tables / 2,338 rows / 23 objects /
8,552,331 bytes** into disposable local PostgreSQL and an object archive with
matching row/object fingerprints and MIME metadata. Interrupted and committed
divergent writes were detected/restored; cleanup passed. Five historical job
résumé paths are missing from source storage too (**zero source objects missed
by migration**); records remain intact, authorized downloads return a truthful
404 and do not substitute the applicant's current résumé. This is combined
local recovery evidence; a second live Object Storage environment remains
untested.

Verified-source dual-session account recovery is implemented at
`/account-recovery` and requires independently authenticated source and verified
Managed sessions. Ban/deletion/inactive-profile/session-expiry/identity conflict
checks preserve original application IDs and grants. Local ignored staging
configuration now enables this explicit mode. **104 source users still require
live ownership proof; zero verified source links and zero designated-QA target
sign-ins**. No QA credential is configured locally, and none was changed or
invented. The source-user recovery browser journeys remain untested.

Super Admin dashboard metrics now use an identity-bound Neon snapshot and
account/backend-specific browser cache; six report exports use the existing
CSV/XLSX schemas with server-side Neon authorization, database date filters and
human applicant/college/job fields. Focused root checks passed **11/11**;
all six report queries ran on staging, and dashboard SQL passed read-only
EXPLAIN. Module callback/approval/scope integration and College lifecycle
focused staging tests passed. **Final full-suite/typecheck/build/lint/import
inventory results will be recorded after the concurrent Companies/Advertisements,
payment-supervision and remaining module-workspace batches finish.** No final
regression result is claimed for this in-progress revision. Production, source
writes, commit/push/deployment and cutover remain unchanged.

### 2026-10-14 integrated runtime verification and browser follow-through

The integrated tree now includes Neon billing supervision (`neon-admin-payments.ts`,
AdminPayments/AdminSubscriptions and their staging endpoints), role workspaces
(`neon-role-workspaces.ts`, RoleOwnerManagement and `/event-admin`), administrator
directory/profile hydration (`neon-admin-directory.ts`), maintenance and leased
email delivery (`neon-maintenance.ts`, `neon-email-queue.ts`), and guest College
verification/admission/verified-session claiming (`neon-guest-college-verification.ts`).
Events-only users have a dedicated scoped workspace; application-management feature
aliases preserve authorized historical document downloads. Guest admission requires
both independently verified contact channels, bound proofs and idempotent consumption;
claiming requires a verified Managed email plus the guest token and current identity
link, and does not create capabilities. Staging message delivery remains gated by
explicit test-recipient allowlists. No real delivery is claimed from injected senders.

The copied guest verification send table lacked its generated ID default. The guarded
staging-only repair is `scripts/sql/neon-staging-guest-verification-send-identity.sql`.
Its rollback integration test now exercises real persisted challenges, attempts,
admission submission and claiming. This is not a production schema change.

`lossless-snapshot-json.mjs` and `compare-source-snapshot-table.mjs` preserve exact
large integers/decimals for all-table reconciliation. The consistent October 13
snapshot comparison covered all 80 public tables: 79 shared business matches, one
explicitly audited staging eSewa UAT configuration difference, zero unresolved shared
business differences, zero source-only rows, and 49 preserved staging-only rows at
that checkpoint. Historical microsecond loss remains documented. A second encrypted
read-only source snapshot on October 14 also preserves catalog definitions: 367
constraints, 177 indexes, 153 functions, 87 triggers, 390 policies, two views, two
sequences, seven extensions and six enum labels. It contains the same 2,173 public
rows, 104 users, 105 identities and 22 objects. This is an encrypted logical snapshot,
not a physical backup, password-hash import, or final cutover delta.

Fresh integrated checks: 168 standard test files / 733 tests passed after correcting
one outdated résumé authorization adapter assertion; 21 isolated staging files / 33
tests passed; typecheck and production build passed; lint had zero errors and 37
warnings; migration immutability passed (three new migrations, no historical edits).
The import inventory remains 110 files (102 static, eight dynamic), including retained
legacy production branches. This count does not establish completed runtime parity.

Authenticated local browser testing found the auth bridge removed Secure from
__Secure-/__Host- cookies, which browsers can reject even when API cookie replay
succeeds. The bridge now preserves their required Secure attribute and strips only
provider Domain; regression cases cover localhost and HTTPS. Tailwind's animation
plugin now uses an ESM import so Node 24 can load the local app. Final checks after
the browser-discovered cookie change are pending below; prior results above must
not be treated as final-revision evidence. Synthetic UAT identities remain separate
from the 104 real source users. Their recovery ownership proofs, designated QA
sign-ins, genuine successful eSewa settlement, second live object-store recovery,
final source delta and authorized production cutover remain open.

### Production-runtime preparation — 2026-10-19

- **Verified against Neon staging:** `scripts/validate-neon-staging-constraints.mjs`
  checked the exact 21 reviewed, previously unvalidated CHECK constraints. All had
  zero violating rows. A rollback probe passed, followed by explicit staging-only
  validation of all 21. Zero business rows changed; zero public constraints remain
  unvalidated. Private evidence: `constraints-dry-run-20261019.json`,
  `constraints-probe-20261019.json`, `constraints-applied-20261019.json` in the
  existing protected migration-artifact directory. Production was not modified.
- **Implemented locally:** `src/lib/server/backend-mode.ts`,
  `src/lib/neon/neon-config.ts`, and `src/lib/backend-selection.ts` now distinguish
  legacy, isolated Neon staging, and explicitly paired Neon production runtime.
  Production DB/Auth/storage must match the independently inspected production
  branch tuple; database connection overrides are rejected. The staging-only guard
  and migration-script boundaries remain staging-only. The mechanical caller update
  is recorded in `scripts/enable-neon-runtime-callers.mjs`; it does not deploy or
  select production by itself. Existing authorization and entity checks are retained.
- **Implemented locally:** `src/lib/server/neon-checkout.ts` now requires UAT
  configuration in staging and production-marked configuration in production.
  Sandbox credentials cannot silently become production checkout credentials.
  Regression coverage is in `neon-checkout-provider-configuration.test.ts` and
  `neon-runtime-safety.test.ts`. No charge or real settlement was attempted.
- **Read-only production-candidate inspection:** existing branch
  `br-falling-breeze-azr6q64l` contains 80 public tables / 2,164 rows and zero
  Managed Auth users, not the reviewed complete runtime schema or final source
  delta. Do not deploy this code against that stale copy before schema/data
  reconciliation. The console reports shared Google/email configuration,
  localhost allowed and signup verification disabled; these are observations,
  not approved release configuration or proof of login/recovery acceptance.
- **Still open:** production transactional-email delivery policy (current queue
  intentionally retains staging recipient restrictions), production Auth settings,
  fresh source/freeze reconciliation, 104 real-account ownership recoveries,
  five source-missing resume objects, genuine sandbox settlement, live workflow
  acceptance, final backup/rollback gate, and verified cutover. Do not copy the
  staging-only fixtures or eSewa UAT override into production.
- **Verification checkpoint before the checkout environment regression:** full
  suite 170 files / 759 tests passed and typecheck passed. After that regression,
  typecheck and focused tests passed (2 files / 17 tests). Final full-suite,
  lint and production-build results are recorded below after completion.
- **Final revision verification:** full suite **170 files / 760 tests passed**;
  typecheck passed; production build passed; lint **zero errors / 37 warnings**;
  `git diff --check` passed. These are local code/build results, not production
  acceptance, actual payment settlement, or real-account recovery evidence.

### Execution continuation — 2026-10-20 (production remains unchanged)

- **Actual source export:** the existing Supabase CLI Keychain credential works
  with the provider's hard-coded `/database/query/read-only` endpoint. A new
  single-statement, read-only encrypted export captured **80 tables / 2,179 rows,
  106 users / 107 identities, 13 buckets / 22 objects** at
  `2026-10-19T17:44:33.672818+00:00`; SHA-256
  `2665ba0f26d94300a76fdf0e3e15d6b4ea134852aae08676425efd2e80a25340`.
  Artifact: `source-202610191744336728180000-2665ba0f26d9.aes256gcm.json` in
  the protected migration-artifact directory. No administrator SQL connection,
  password reset, secret rotation, source mutation or PostgreSQL-gate bypass
  was used. The dedicated PostgreSQL credential is still absent; this successful
  approved API export is an alternative, not that credential being provisioned.
  It is not a frozen final cutover snapshot: source writes continue.
- **Actual staging reconciliation:** added the explicit
  `append-only-preserve-conflicts` policy to
  `scripts/apply-source-snapshot-staging.mjs`, with reviewed ledger binding,
  INSERT-event trigger checks, a narrowly allowlisted nonprivileged JSON default,
  full existing-row preservation and unchanged-conflict checks in
  `staging-append-policy.mjs`. Normal reconciliation still fails closed on
  conflicts. A rollback probe passed, then **nine source inserts** committed
  only to the pinned staging branch (two profiles, two roles, four source audit
  rows, one competition registration). No trigger was disabled. Existing rows,
  IDs, relationships and target fixtures remained unchanged. A subsequent dry
  run reported **zero operations**. The two known independent staging edits and
  three source-deleted upload-intent records remain explicitly retained, not
  silently overwritten/deleted or counted as exact parity. Reports:
  `fresh-append-reviewed-20261019.json`, `fresh-append-probe-20261019.json`,
  `fresh-append-applied-20261019.json`, `fresh-append-idempotency-20261020.json`.
  Two missing application-account anchors were added by the existing guarded
  account reconciler; this created no Auth identity, link or access grant.
- **Actual real-account browser recovery:** implemented the official pinned
  `@neondatabase/auth/server` OAuth transport in `neon-oauth.ts`, a constrained
  Google start action in the existing auth bridge, `/auth/neon/callback`, and
  `proxy.ts` to consume root-return one-use verifiers before client rendering.
  `AuthContext.tsx` and `OAuthCallback.tsx` no longer send Neon sign-in through
  the legacy Supabase RPC callback. Branch-bound SDK redirect wrappers are
  validated server-side; role/entity/redirect input is not accepted. Production
  OAuth remains disabled unless explicitly configured with its own cookie secret.
  `legacy-recovery.ts` / `LegacyAccountRecovery.tsx` use the source's already
  approved exact `/auth/callback` URL and support same-window proof, preserving
  the independent Managed Auth HttpOnly session. No source OAuth settings changed.
  A real owner completed Google sign-in, was correctly denied profile access
  while unlinked, then independently authenticated the existing Supabase account
  and recovered the original student dashboard. Direct admin API access returned
  `ADMIN_REQUIRED`. `verify-neon-source-link-preservation.mjs` subsequently proved
  the original profile/user IDs and all four role/capability/entity/feature grant
  sets match the source, preserving typed microseconds. Evidence:
  `real-recovery-preservation-20261020.json`,
  `verified-staging-recovery-20261020.png`. **One of 106 source identities is
  genuinely linked; 105 remain unlinked. QA Admin ownership remains unverified.**
  This is not an email-address match, synthetic identity, or production recovery.
- **Email implementation and actual configuration limit:**
  `neon-delivery-policy.ts` adds separately opted-in production delivery with a
  required UTC cutover cutoff. Queue recovery/claim filters require the matching
  origin marker and cutoff; copied source/staging messages cannot replay in
  production. Staging retains exact recipient allowlists. Maintenance and guest
  notifications use the actual selected runtime marker. Production delivery is
  still disabled. The opt-in real-provider test is
  `neon-email-provider-staging.test.ts`; it restricts the recipient to an actual
  dual-session-linked owner and rolls its DB fixture back. **Actual provider
  delivery has not passed**: Vercel lists encrypted `RESEND_API_KEY` / `EMAIL_FROM`,
  but neither `env run -e production` nor private `env pull --environment=production`
  supplied usable values. Both attempts stopped at the configuration precondition
  before contacting Resend. Temporary exported files were removed; no production
  variable was changed and no email was claimed sent. Supply a usable staging
  sending credential and verified sender through the approved secret channel.
- **Actual file access:** a fresh read-only source/S3 byte check verified all
  **22 source-listed objects**, content types, cache controls and size metadata.
  One extra staging object was preserved. **Five résumé references are missing
  from both source and target**; bytes cannot be fabricated. Report:
  `fresh-storage-20261020.json`. Source writes and staging metadata writes: zero.
- **Actual production-candidate backup/recovery:**
  `backup-neon-production-candidate.mjs` pins the reviewed candidate, uses a
  read-only exported PG snapshot, retains an encrypted local dump, decrypts it,
  and restores only into a fresh private Unix-socket PostgreSQL instance. All
  **89 public/Managed Auth tables / 2,165 rows** and application schema fingerprints
  matched. No remote write occurred. Artifact:
  `production-candidate-20261019215717790-70b4d787ff47.aes256gcm.json`, archive SHA
  `70b4d787ff47157ec9f9e749a77ea1a5a732868bc4df8a4f2594d9ece5cdf925`.
  Global role passwords/ACLs, Auth control-plane settings and live object-store
  restoration remain outside this proof. This backups the stale existing candidate;
  it does not prove its schema/data is ready or that a cutover can be rolled back.
- **Genuine eSewa attempt:** the existing synthetic-only harness now supports the
  source-approved local port 3001. The actual UAT gateway accepted the mentor
  checkout for EPAYTEST / NPR 10, but its login shows **“This site is exceeding
  reCAPTCHA Enterprise free quota”** and cannot proceed. No CAPTCHA bypass or
  real payment was performed. Evidence: `esewa-provider-quota-block-20261020.png`.
  Real endpoint checks rejected forged signatures and kept duplicate returns
  idempotent; mentor remained pending and the unsubmitted event checkout became
  failed/cancelled on trusted provider lookup. Neither became paid or fulfilled.
  The harness now compares two returns (rather than incorrectly treating a first
  legitimate pending-to-failed transition as failed idempotency). Successful
  provider settlement remains unverified and requires eSewa's sandbox quota fix.
- **Security/verification:** upgraded Next.js / matching ESLint config to 16.3.8,
  sharp to 0.35.5 and patched existing transitive overrides. The initial minimal
  install reported zero production advisories, but that is **not the final lockfile
  result**: default peer resolution adds SDK UI/test/build-tool peers. Final
  `npm audit --omit=dev` reports **nine advisories (four moderate / five high),
  zero critical**, including Tailwind/PostCSS and Vitest tooling. The full tree
  reports **15 (five moderate / ten high), zero critical**. These were not
  suppressed or called fixed; no Tailwind/Vitest node_modules path appears in
  generated server NFT traces, but this is not a blanket security certification.
  Full standard suite:
  **171 files / 768 tests passed**. Typecheck and production build passed; full lint
  had **zero errors / 37 warnings**. Eleven targeted Node tooling tests passed,
  as did two real staging integration files / three tests for the delivery-policy
  SQL, maintenance and guest submission changes. Live-email precondition failures
  above are intentionally separate from passing mocked/standard tests. Direct
  Supabase inventory remains **110 files (102 static / eight dynamic)**, including
  retained legacy production and intentional source-recovery paths, not proof of
  automatic runtime fallback. No commit, push, deployment, production configuration
  change or cutover occurred. After default peer/lockfile reconciliation,
  `npm ci --dry-run --ignore-scripts` passed, and the final installed revision
  again passed typecheck, all 768 tests, build, lint and diff check. An earlier
  concurrent typecheck encountered build-regenerated `.next/types` files; the
  serialized rerun after build passed without changing typechecking rules.
  The timed-out sandbox harness fixture was removed through the existing cleanup
  tool, now requiring source-snapshot hash and both account IDs' exclusion from
  real source users. One proven synthetic set was removed via the official Neon
  Auth CLI; a subsequent dry run found zero sets. These disposable test records
  can be recreated with the harness. No real recovered or source account was
  removed. Harness idle-connection errors now produce an explicit cleanup notice.
- **Next executable release gates:** make the actual Neon production target's
  schema/data match a fresh frozen source without staging fixtures or sandbox
  overrides; complete production Managed Auth trusted origins/verification/email
  settings; exercise designated QA ownership and privileged workflows; supply
  usable email sending configuration; recover or explicitly disposition the five
  source-missing files; obtain genuine sandbox settlement; verify live object-store
  restore/rollback, write freeze and final delta before any production deployment.
  Supabase cannot be retired while recovery and those gates remain open.

### Execution continuation — 2026-10-20: email dependency resolved; no cutover

- Created **MeroTalent Neon Transactional 2026-10-20**, a Resend sending-only key
  restricted to the already verified `merotalent.com` domain, after explicit user
  confirmation. Updated Vercel Production `RESEND_API_KEY` (sensitive) and
  `EMAIL_FROM`. This was configuration only, not a deployment. The credential was
  never printed; its temporary plaintext provisioning file was removed after
  secure operator Keychain storage. Masked UI evidence:
  `resend-restricted-key-20261020.png` in the private artifact directory.
- Configured **both staging and the production candidate** Managed Auth SMTP with
  `smtp.resend.com`, TLS port 465 and `noreply@merotalent.com`. Both official Neon
  `email-provider test` calls returned `success: true`. The real opt-in
  `neon-email-provider-staging.test.ts` also passed: existing queue -> actual
  Resend acceptance -> recorded provider ID -> database fixture rollback. Then
  strengthened and reran it successfully using a transaction-local encrypted
  Provider Center row and the actual secret-decrypting provider resolver (no
  injected provider). Both notification and configuration fixtures rolled back.
  Inbox receipt has not been independently checked. The production application
  queue has not been enabled or replayed.
- Production-candidate Auth now requires email verification and sends verification
  on signup. Exact canonical/apex HTTPS origins were added; localhost was disabled.
  No legacy source Auth setting or user credential was changed.
- Added `scripts/portable-source-schema.mjs` and its two boundary tests; extended
  `backup-neon-production-candidate.mjs` with local-only portable-schema rehearsal.
  The reviewed set is 16 portable functions, 47 triggers, two views, three indexes
  and 12 constraints; Auth RPCs/policies and staging rows are not copied. The
  initial local rehearsal passed with all 2,165 original rows preserved, but
  exposed an unqualified-trigger selection omission. Corrected the selector and
  added a fail-closed exact trigger-count check. A subsequent remote read hit
  `EADDRNOTAVAIL`; added bounded query/statement timeouts, idle connection error
  handling and early remote disconnect. The corrected complete rehearsal then
  **passed**: 16 functions, 47 triggers, two views, three indexes and ten missing
  constraints applied locally (two of the 12 reviewed constraints already existed).
  All 89 tables / 2,165 original rows remained exact. New encrypted backup artifact:
  `production-candidate-20261020002526178-7a9928ec1e18.aes256gcm.json`, archive SHA
  `7a9928ec1e185d22ab03d905b93386efe45adb31a5b9a4fadb10785d263bbbe2`.
  No remote DDL executed; this does not cover the remaining runtime-specific schema.
- Added `NEON_PRODUCTION_PAYMENTS_ENABLED` (default off) at paid checkout initiation
  in `neon-checkout.ts`, independent of existing return verification. Four flag
  cases cover all four paid checkout kinds; unavailable payments do not create a
  charge or grant access. Existing Provider Center enablement remains required.
  This gate alone does not certify all user-facing payments-disabled launch UX.
- Searched all **three retained encrypted source snapshots** for the five missing
  résumé objects. None appears in their object inventories. Exact impact: five
  historical job applications, zero current profile résumés. Existing private
  download authorization precedes the truthful `RESUME_NOT_FOUND` / re-upload
  message; no replacement bytes or current-profile substitution was invented.
  This search does not assert that no external backup exists.
- User confirmed QA Admin is a system-created account with no accessible login.
  Its personal ownership check is therefore not a valid acceptance prerequisite;
  it remains unlinked, not silently assigned to another identity. A real verified
  administrator was then explicitly authorized by the user: the previously
  dual-session-recovered owner. `assign-verified-neon-owner-admin.mjs` pins staging,
  requires the original confirmed source ID plus the existing verified Managed
  Auth link, active profile/account and real dual-session proof. It changed that
  owner's primary role `talent -> admin` while retaining the role row ID and
  recording the old/new roles and direct approval reference in `audit_logs`.
  This is an authorized new role transition, **not** an unchanged source grant.
  Capability/entity/feature grants and identity links remained unchanged. QA and
  production were untouched. A repeat returned zero role changes and no duplicate
  audit mutation. Earlier attempts rolled back on the source's deferrable unique
  constraints; the successful path preserves the existing one-primary-role rule.
  The real owner browser session subsequently loaded `/admin` and actual directory
  data from the protected Neon dashboard endpoint. Private screenshot:
  `verified-owner-admin-20261020.png`. `/institute` correctly showed the no-assigned-
  college onboarding state; this is not evidence of customer College-admin UAT.
  Corrected `AdminDashboard.tsx`'s misleading hard-coded Supabase source label to
  display the selected runtime. Production owner linking/assignment still needs
  its own verified target identity, not a copied staging Managed Auth subject.
- Final runtime revision: **171 files / 772 standard tests passed**, plus the one
  actual Resend queue integration test and both actual Managed Auth SMTP tests.
  Production build and subsequent serialized typecheck passed. Lint completed with
  zero errors / 37 warnings; diff check passed. No commit, push, app deployment, write freeze,
  final synchronization, production identity grant, or traffic cutover occurred.
- Next: reconcile the remaining runtime schema and source-only production data,
  recover/link the authorized owner on the production Auth branch and record the
  explicitly approved role transition there, then verify authenticated role workflows before freeze
  and cutover. Do not retire Supabase while recovery or live acceptance depends on it.

### Execution — 2026-10-20: actual production-candidate schema and missing source rows

- **Release decision:** user explicitly rejected a payments-disabled launch.
  Genuine eSewa settlement is mandatory before traffic cutover. Do not interpret
  the default-off safety flag as approval to launch without payments.
- Refreshed the actual source using the existing official read-only Management
  API. Snapshot `2026-10-20T00:42:59.520373+00:00`: **80 tables / 2,179 public rows,
  106 Auth users / 107 identities, 13 buckets / 22 objects**. No raw Auth secrets
  were exported. Encrypted artifact:
  `source-202610200042595203730000-04d793eb7147.aes256gcm.json`, snapshot SHA
  `04d793eb714795ee852989d83ff7445e1d0900b3e7af3f45f1952acdddde7008`.
  This is not a frozen final snapshot; later source writes require a final delta.
- `apply-neon-production-portable-schema.mjs` applied the locally rehearsed
  allowlist to **br-falling-breeze-azr6q64l itself**, not staging: 16 functions,
  47 triggers, two directory views, three indexes, ten missing constraints.
  Full original row fingerprints stayed unchanged. Existing differing function
  definitions are rejected rather than overwritten. A second execution applied
  **zero objects**. Private receipts:
  `production-portable-applied-20261020.json`,
  `production-portable-idempotency-20261020.json`. An initial read timeout failed
  without a success receipt; the subsequent applied/idempotent executions above
  are the actual evidence. Batched lossless fingerprints reduce round trips.
- Added forward-only `scripts/sql/neon-production-runtime-foundation.sql`, derived
  from the established runtime SQL without its event-category seed inserts.
  Local restore rehearsal added **ten empty tables / fifteen columns**, preserved
  every original column value, and copied zero fixture rows. Then
  `apply-neon-production-runtime-foundation.mjs` applied the exact rehearsed SQL
  hash to the production candidate. Re-execution added **zero tables / columns**.
  Receipts: `production-runtime-foundation-applied-20261020.json`,
  `production-runtime-foundation-idempotency-20261020.json`.
- Added forward-only `scripts/sql/neon-production-generated-ids.sql` for the
  copied audit/guest-verification bigint defaults. Private restore rehearsal
  verified both defaults, original-row preservation and repeat-run sequence
  stability. `apply-neon-production-generated-ids.mjs` applied only that verified
  SQL to the candidate; no business row or identity changed. Receipt:
  `production-generated-ids-applied-20261020.json`.
- Fresh candidate backup **after runtime schema** was encrypted and locally
  restored: **99 tables / 2,165 rows**, exact row/schema recovery. Artifact
  `production-candidate-20261020031637997-a3865d3c9524.aes256gcm.json`, archive SHA
  `a3865d3c95245b665782abd6e11a4e95198abc39795d47561f701edf85e9b199`.
  Global roles/ACLs, control-plane Auth configuration and live object-store restore
  remain outside that database recovery proof.
- `append-missing-source-to-neon-candidate.mjs` implements an explicitly bounded
  source-authoritative **missing-only** policy on the pinned offline candidate.
  It refuses a candidate with live Auth users, requires the reviewed source hash,
  backup and target/schema-bound ledger, rejects insert-trigger/default side
  effects, never updates/deletes an existing row, and verifies every inserted
  source row exactly. A real rollback probe passed with zero persisted rows.
  Then **22 genuine source rows** committed: profiles 4, primary-role rows 4,
  source audit rows 10, competition registration 1, notification 1, saved job 1,
  module request 1. All pre-existing rows stayed unchanged. The audit sequence
  advanced using transactional `ALTER SEQUENCE RESTART`, so the probe consumed no
  IDs. Repeat dry-run found **zero insertions**. Receipts:
  `production-missing-rows-dry-20261020.json`,
  `production-missing-rows-probe-20261020.json`,
  `production-missing-rows-applied-20261020.json`,
  `production-missing-rows-idempotency-20261020.json`.
  Candidate now contains all **106 source profiles / 106 source role rows**.
  This does not establish Auth links or claim full data parity.
- `plan-neon-production-source-delta.mjs` reused the existing lossless three-way
  and timestamp-proof helpers. Before missing-row insertion it identified 2,145
  narrowly proven timestamp repairs, one contact conflict and source-missing rows,
  plus seven old upload-intent records absent from current source. Existing rows
  were **not overwritten or deleted**. Precision/contact reconciliation and an
  explicit disposition of old upload intents remain required. Private plan:
  `production-source-delta-20261020.json`; do not reuse its pre-insert target hash.
- Retried actual signed EPAYTEST checkout through the app against eSewa UAT.
  Gateway displayed the correct NPR 10 amount but still showed **reCAPTCHA
  Enterprise free quota exceeded**, with Login disabled. No CAPTCHA bypass or
  live payment occurred. Actual forged callbacks returned denial and duplicate
  returns were idempotent; mentor remained pending/pending, unsubmitted event
  became cancelled/failed, neither paid nor fulfilled. Screenshot:
  `esewa-quota-retry-20261020.png`. The disposable fixture set was removed and
  the source-hash-protected cleanup dry-run found zero remaining sets.
- Sent a routine technical inquiry to eSewa's officially documented integration
  address `merchant.operation@esewa.com.np`, requesting a working supported UAT
  route or quota restoration. Resend accepted message
  `01a15748-184d-779d-9324-219db72d257e`; **delivery and a provider response are not
  yet verified**. Receipt: `esewa-support-inquiry-20261020.json`. No secrets or
  personal payment data were sent. This provider gate cannot be fixed by a fake
  callback, unverified live payment, or a local CAPTCHA bypass.
- Targeted Node regressions: **24 passed** (lossless fingerprints, safe projection,
  target boundaries, rollback checks, timestamp rules and delta idempotency).
  Runtime application source was unchanged in this batch; the prior 772-test,
  build and lint evidence remains separately scoped. Final standard test/typecheck
  command is recorded in `/private/tmp/merotalent-candidate-final-20261020-*` logs.
- **No production traffic cutover, app deployment, commit, push, source write,
  production Auth identity import/link, or Supabase retirement occurred.** Changes
  above are real writes to the offline Neon production candidate, so earlier
  blanket statements that no production-candidate change occurred are historical.

| Acceptance requirement | Current status | Exact evidence / remaining gate |
| --- | --- | --- |
| Candidate portable/runtime schema | PASS | Actual applied receipts, repeat-run zero-object/column receipts, private local restore proofs above |
| Missing source rows on candidate | PASS | Real rollback probe, 22 committed inserts, exact readback, unchanged originals, zero-insert rerun |
| Full source-data parity | BLOCKED | Timestamp/contact reconciliation and seven old upload-intent dispositions still open; source not frozen |
| Production Auth / owner acceptance | BLOCKED | SMTP/config verified previously; only staging owner was linked/promoted, production links and real login remain open |
| Genuine eSewa settlement | BLOCKED | Hosted UAT quota error; support inquiry accepted; user requires success before release |
| Production object storage / recovery | BLOCKED | Prior 22-object verification is staging evidence, not production storage or live restore proof |
| Traffic cutover / deployed acceptance | BLOCKED | No deployment or switch; source runtime and recovery retained |

### Continued execution — 2026-10-20: exact candidate data parity and production S3 bytes

This checkpoint supersedes the unresolved precision/contact entries immediately
above; it is not a final frozen synchronization or a traffic cutover.

- `candidate-precision-repair.mjs` / `repair-neon-candidate-precision.mjs`:
  locally restored rehearsal, real candidate rollback probe, then **2,145**
  narrowly proven lossless timestamp repairs committed. Only exact reviewed
  timestamp mutators were suspended/restored transactionally. Business values,
  account IDs, scopes, roles and security guards were preserved.
- `reconcile-neon-candidate-profile-contacts.mjs`: reviewed source-newer contact
  reconciliation for **one** profile, with rollback probe and exact readback.
  Only phone/location and source timestamps changed; no identity or grant changed.
- `expire-neon-candidate-upload-metadata.mjs`: removed **seven expired transient
  upload reservations** under the existing retention rule. No object was deleted.
  Their rows remain recoverable from encrypted candidate backup
  `production-candidate-20261020033242605-bd875646dd15.aes256gcm.json`
  (99 tables / 2,187 rows before reconciliation, actual local restore verified).
- Actual read-only comparison `production-source-parity-20261020.json` now shows
  **all 2,179 captured source rows across 80 application tables match exactly**:
  zero missing rows, conflicts, precision repairs or target-only rows. Source
  snapshot SHA remains
  `04d793eb714795ee852989d83ff7445e1d0900b3e7af3f45f1952acdddde7008`.
  The source is not frozen: final synchronization remains required.
- Reused the existing production-branch Neon object-storage credential through
  authenticated CLI reveal and stored it privately in Keychain, without logging
  its value, creating another credential, or changing application variables.
  `verify-neon-production-storage.mjs` actually reads source and production S3
  objects, checks the immutable byte manifest and pins the production branch.
  Initial verification: **22/22 bytes and types**, zero missing/extra objects;
  all 22 cache-control values were absent on target.
- `repair-neon-production-storage-cache.mjs` rechecked every target object's
  manifest hash/size/type, saved original metadata privately, then restored only
  source cache-control using conditional self-copy. **22 metadata repairs**;
  zero source writes, file-content replacements or deletions. Original metadata:
  `production-storage-original-metadata-20261020.json`; mutation receipt:
  `production-storage-cache-repair-20261020.json`. Independent post-repair proof:
  `production-storage-bytes-after-cache-20261020.json`: **PASS, 22/22 bytes,
  22/22 content types and 22/22 cache-control values; zero extra objects**.
- Source bucket `Merotalent` has zero objects and is absent from the target;
  report it explicitly, not as missing file content. Five historical résumé
  references are absent from the source itself; do not fabricate replacements.
  S3 byte verification does not establish authenticated application access,
  public/private enforcement or a live object-store restore rehearsal.
- Standard verification recorded this revision: **171 files / 772 tests passed**,
  typecheck passed. Additional targeted Node regressions for storage proofs,
  lossless fingerprints and precision boundaries: **8/8 passed**; script syntax
  and `git diff --check` passed. Earlier production build/lint evidence is retained
  separately; no claim of a new deployed build is made.

Current gates: captured data parity PASS; production storage bytes/types/cache
readback tracked in the private post-repair proof; production Auth identity and
owner acceptance still open; genuine eSewa settlement still BLOCKED by provider
UAT CAPTCHA quota (support inquiry accepted, response not verified). The user's
**payments-must-pass-first** decision remains authoritative. No write freeze,
deployment, traffic cutover, commit/push or Supabase runtime retirement occurred.
Next executable batch: production Auth anchor/ownership acceptance and scoped
application storage UAT/recovery rehearsal, while awaiting working provider UAT.

### Final-cutover execution continuation — 2026-10-20 04:43 UTC source checkpoint

- Fresh single-statement source export through the official **read-only** API:
  **80 tables / 2,183 rows / 107 users / 108 identities / 22 objects**.
  Source snapshot `source-202610200443322027790000-1228fb31467a.aes256gcm.json`,
  SHA `1228fb31467a4d7c53be343e3585960d60c658191f3e07a3612e15f63a64fef7`.
  The previous 2,179-row proof remains historical, not the final live count.
- Read-only delta found exactly four missing source rows, zero conflicts:
  two audit rows, one profile, one original primary-role row. Existing rows all
  matched. Real rollback probe followed by bounded candidate commit inserted
  **four**, preserving all existing rows and source IDs; sequence advancement was
  transactional. Receipts `production-missing-refresh-{dry,rollback-probe,apply-candidate}-20261020.json`.
  Ledger `439dbe8a8daf19715a66eee892ba407d268de4bafdead0180c9ade90f6a862ba`.
  Independent readback: `production-source-parity-refresh-20261020.json`.
  Source remains unfrozen; this is not final cutover synchronization.
- Fresh candidate database dump initially timed out. Retry **passed**, including
  encrypted readback and actual private local PostgreSQL restoration of
  **99 tables / 2,180 rows** before the four inserts. Backup script now bounds
  connection/lock waits, classifies errors without exposing stderr, and uses
  asynchronous subprocesses so the snapshot connection remains responsive.
  Final-script execution passed independently:
  `production-candidate-20261020045301773-748020213ee1.aes256gcm.json`, SHA
  `748020213ee118ab8f804c649090c5dce1952a7ac22c3833f54e5127af1c35f0`;
  report `production-candidate-restore-20261020045301773.json`.
- Added `backup-neon-production-storage.mjs` and tested
  `storage-backup-envelope.mjs`: **all 22 actual production S3 objects** and
  metadata captured into an authenticated encrypted private archive, decrypted,
  restored to private local scratch, rehashed, and deliberate corruption detected.
  Actual archive `production-storage-20261020044336629-d07f2bb07c95.aes256gcm.json`,
  plaintext SHA `d07f2bb07c956c489b87e41744f758b5804d6b6afdad60d0bdb25e329bde9760`.
  Final helper also decrypted that actual archive successfully. Remote S3 was
  read-only; scratch files were removed. **Remote object-store restore and
  application ACL acceptance are not claimed.**
- Production Auth configuration freshly checked through authenticated Neon CLI:
  Google shared provider enabled; Resend SMTP port 465 and MeroTalent sender;
  email verification required with OTP; only the two canonical production origins
  trusted; localhost disabled. Configuration evidence:
  `production-auth-config-review-20261020.json`. Secrets were redacted.
- Actual production Auth HTTP negative checks **passed**: anonymous session null,
  forged session null, untrusted OAuth origin **403**. Receipt:
  `production-auth-negative-checks-20261020.json`. Production still had **zero
  Managed Auth users/identity links** at that check; no identity was fabricated,
  copied from staging or linked by email. Real owner login, recovery, session
  refresh, profile/role acceptance and inbox delivery remain **BLOCKED/UNTESTED**,
  not established by SMTP configuration or these negative checks.
- Fresh signed eSewa EPAYTEST NPR 10 checkout again reached the real hosted UAT
  page, still showing **reCAPTCHA Enterprise free quota exceeded** and disabled
  Login. Screenshot `esewa-quota-final-cutover-20261020.png`; no CAPTCHA solved,
  live charge made or settlement fabricated. Forged callback denial and duplicate
  return checks passed; neither service was paid/fulfilled. Receipt:
  `esewa-final-cutover-denial-checks-20261020.json`. Harness cleanup experienced
  a connection timeout; source-hash-protected recovery cleanup removed exactly
  one proven disposable staging fixture set and subsequent dry-run found **zero**.
- Focused regressions **11/11 passed**: encryption roundtrip/randomness, wrong key,
  corrupted ciphertext, wrong archive format/digest/key length, storage proofs,
  append immutability and exact production-target pin. Script syntax/diff checks
  passed. No application code changed; prior 772-test/typecheck/build evidence
  is retained, not represented as another newly executed full suite.

| Mandatory gate | Status | Evidence or exact outstanding operation |
| --- | --- | --- |
| Captured data / IDs | PASS for captured snapshot | Four source-only records safely appended; independent comparison receipt above |
| Final frozen source sync | BLOCKED | No write freeze while mandatory payment/Auth gates fail; final fresh delta still required |
| Production file bytes and local backup restore | PASS | 22 verified files; encrypted archive and local restore/corruption detection |
| Remote storage restore / application permissions | BLOCKED | Remote restoration and authenticated public/private API UAT not executed |
| Production Auth configuration / negative checks | PASS, limited scope | CLI config and direct Auth denials; not a real login proof |
| Production owner / ordinary-user acceptance | BLOCKED | Real production-branch login/link and deployed-candidate role/denial acceptance remain unexecuted |
| Genuine payment settlement | BLOCKED | Provider UAT quota; existing support request awaits verified response; payments-disabled release remains unapproved |
| Database backup / local restoration | PASS, limited scope | Fresh encrypted candidate dump restored; excludes global ACLs/control-plane Auth and post-cutover reverse replay |
| Deployment / traffic / monitoring / legacy retirement | NOT APPLICABLE yet | No deploy, commit/push, configuration cutover, source freeze or Supabase retirement occurred |

The exact external provider action is restoration of eSewa UAT CAPTCHA quota or
a provider-supported working sandbox flow. It cannot be replaced by a successful
build or forged callback. Remaining Auth/deployed acceptance and freeze/rollback
engineering must still be executed; they are not relabelled as provider blockers.

### ePay contract/security execution — 2026-10-20

Compared the existing hosted ePay V2 adapter with the **requested current**
[ePay documentation](https://developer.esewa.com.np/pages/Epay) and dedicated
[test credential page](https://developer.esewa.com.np/pages/Test-credentials).
The older `/pages/Epay-V2` page conflicts with `/pages/Epay` on status hosts and
response field names. This pass follows the requested `/pages/Epay` contract:
UAT form `rc-epay.esewa.com.np`, UAT status `rc.esewa.com.np`, production form
`epay.esewa.com.np`, production status **`esewa.com.np`**. No live transaction or
production financial configuration was changed. The prior claim that the latter
host was necessarily incorrect is superseded by the current requested docs.

Implementation changes:

- `payment-provider.ts`: exact mandatory response signed-field coverage and
  merchant binding; scalar/UUID validation; canonical bounded Base64/fatal UTF-8
  decoder; safe exact-cent checkout amounts and callback URL/origin validation;
  bounded no-redirect status requests. HTTP 400/404/429/5xx/provider errors remain
  retryable verification failures rather than prematurely terminal failed
  checkouts. Strict Neon mappings retain PENDING/AMBIGUOUS as pending, NOT_FOUND
  as expired, CANCELED as cancelled and both refund states as review-required;
  COMPLETE still requires exact merchant/reference/amount and provider reference.
- `neon-esewa-return.ts` shares GET/form-POST handling between the existing Neon
  route and canonical compatibility callback. Streamed bodies are bounded before
  decoding; exceptions are sanitized; redirects never assert payment success.
- `app/api/v1/payments/esewa/callback/route.ts` dispatches **to Neon** in Neon
  mode, avoiding a real legacy-write fallback. Obsolete legacy checkout and
  internal HMAC webhook routes return 404 before accessing Supabase in Neon mode.
  Current Neon checkout callers were traced and already use the scoped Neon API.
- New `esewa-v2-contract.test.ts` and `neon-esewa-return.test.ts`, and expanded
  `neon-checkout-authorization.test.ts`, cover the published checkout signature
  vector and encoded response signature (preserving the amount string), forged
  responses, altered fields/merchant/reference/amount, malformed/oversized input,
  callback-origin validation, all documented status mappings, provider errors,
  pending/refund non-fulfillment, delayed settlement review, completed replay,
  cross-order replay and absence of Supabase callback/checkout/webhook fallthrough.

Executed evidence:

- Final standard suite: **173 files / 835 tests PASS**, log
  `/private/tmp/merotalent-esewa-accepted-revision-tests-20261020.log`.
- Final application revision: **typecheck PASS, build PASS**, logs
  `/private/tmp/merotalent-esewa-final-revision-{typecheck,build}-20261020.log`.
  The only subsequent addition was the passing published-response-vector test.
- Lint: **0 errors / 37 existing warnings**, log
  `/private/tmp/merotalent-esewa-final-revision-lint-20261020.log`;
  `git diff --check` PASS.
- **Two actual isolated Neon staging DB tests PASS** for College scope payment
  activation and module-access proof/payment scope. Provider settlement responses
  were mocked; fixtures rolled back. This is not genuine eSewa settlement.
  Log `/private/tmp/merotalent-esewa-staging-tests-20261020.log`.
- Real local staging HTTP: malformed Neon callback **400**, forged signed return
  **400 INVALID_PROVIDER_SIGNATURE**, malformed canonical compatibility callback
  **400**, no fulfillment. Receipt `esewa-hardened-staging-http-20261020.json`.
- Real **read-only UAT status** request for a deliberately nonexistent fresh
  reference: **HTTP 200 / NOT_FOUND**, current documented response fields.
  Receipt `esewa-status-readonly-probe-20261020.json`. No checkout or charge was
  created, and this does not establish settlement.
- Hosted-login quota failure remains the latest genuine checkout evidence from
  the immediately preceding pass. Did not repeatedly create transactions while
  the provider is known unavailable. Existing support inquiry remains accepted;
  the narrowly scoped Gmail support-reply search stalled even after reload, so
  **no response/delivery/no-response assertion** is made.
- Read-only Vercel inspection confirms the existing live production deployment
  remains **READY**, ID `dpl_2sRQHUkJVPovupWwfA6WnWY3Kzjj`, URL
  `merotalent-dhdgtkdex-aashutoshkashyaps-projects.vercel.app`. CLI did not expose
  a commit SHA in the selected metadata; do not substitute working-tree HEAD as
  production commit evidence. Canonical homepage still returned HTTP 200 from
  Vercel. **No new deployment, commit/push or traffic switch occurred.**
- Actual production-candidate payment configuration was read without decrypting
  or emitting secrets: eSewa, production environment, non-test merchant,
  encrypted credential present, **integration disabled**. Receipt
  `production-payment-config-esewa-pass-20261020.json`. It was not auto-enabled;
  live financial configuration remains unchanged. Production Managed Auth still
  has zero users. Configuration presence is not a payment/login acceptance proof.

Release assessment: **NOT READY — mandatory gates remain**. Adapter/security and
mocked transitions are tested, but real settlement remains **UNVERIFIED** until
eSewa restores a supported UAT login path and one authorized transaction verifies
server-side. Production owner login/link/session/recovery and role acceptance
remain unexecuted (no synthetic owner promotion or email-only linking).
Captured data proof remains **2,183 exact rows / 22 verified objects**, not a
frozen final source sync. Final write fence, sync, authenticated deployed
acceptance and post-write rollback readiness remain required.

Payment-restricted launch was assessed, **not enabled**: the existing checkout
gate prevents charges, but paid reservation/request creation would also need
clear pre-creation restrictions so unpaid reservations do not consume capacity.
Incoming verification/reconciliation must remain available. This is not a
business decision the operator can make silently; the user's prior
**payments-must-pass-first** answer remains controlling. Also retain the existing
code gap: generic assigned-scope renewal without an approved College request is
still unavailable in `Payments.tsx`; only approved-request College renewal has
been migrated/tested. Do not describe all payment business journeys as complete.
Supabase runtime/source and recovery remain retained; retirement is not executed.

### Final-mandate continuation — 2026-10-20 (payment-restricted acceptance)

The latest final-execution mandate supersedes the historical payments-must-pass-first
answer above. Genuine settlement is still UNVERIFIED and live payments stay DISABLED;
independent Neon acceptance and otherwise-safe cutover work must continue.

- Implemented `src/lib/server/neon-assigned-scope-renewal.ts`, integrated through
  `neon-checkout.ts`, the Neon checkout route, payments overview and
  `src/screens/dashboard/Payments.tsx`. Existing assignments can renew without a
  College claim request. Server-owned price/duration and exact module/entity scope
  are authoritative. Verified success is required; scope revocation denies activation.
  Renewals extend existing finite access, restore expired access from now, and do
  not create roles, capabilities or assignments. Duplicate confirmation is idempotent.
- Actual isolated Neon staging transaction test passed in
  `neon-assigned-scope-renewal-staging.test.ts`: pending creates no entitlement,
  additive consecutive renewals, duplicate return, expired restoration, forged actor,
  cross-user assignment lookup and revoked assignment denial. Provider responses in
  this DB test are mocked, not genuine eSewa settlement. All fixture changes rolled back.
  During development one connection timeout, two assertion corrections and a test SQL
  typo failed; the final revised test passed (23.05s). No production fixtures were added.
- `neon-paid-initiation.ts` blocks new paid mentor reservations, paid event
  registrations, paid module requests and checkout in production while disabled.
  Existing verification/reconciliation remains reachable. The UI exposes truthful
  unavailable status; free events still work. A targeted test confirms no paid
  reservation INSERT occurs while disabled, and free-event registration is allowed.
- `backend-mode.ts` refuses a Neon browser with an absent/legacy server selection.
  Server Supabase factories and ordinary browser Supabase fetch/realtime fail closed
  in Neon mode. The separate explicit source ownership-proof client remains intact.
  Intentional browser denial uses AbortError so SDK network retries do not stall the UI.
  This is a fallback safety boundary, not proof every remaining imported SDK caller
  has browser acceptance or that source recovery has been retired.
- Fresh genuine UAT reached `rc-epay.esewa.com.np/auth`, EPAYTEST/NPR10.
  Published test customer credentials were entered; provider displayed
  **This site is exceeding reCAPTCHA Enterprise free quota**, LOGIN disabled.
  No CAPTCHA bypass, completed checkout or successful settlement. Private screenshot:
  `esewa-mandate-uat-20261020.png`. Provider must restore supported UAT login/quota.
  Harness `/verify` suffered a DB query timeout and produced no acceptance receipt;
  its handler now returns a sanitized 503 instead of an unhandled process rejection.
  Recovery cleanup removed exactly one proven disposable staging fixture set;
  subsequent dry-run found zero. Source accounts and production were untouched.
- Current standard suite: **176 files / 854 tests PASS**; typecheck and production
  build PASS; lint **0 errors / 37 existing warnings** (new hook warning fixed);
  diff check PASS. Additional isolated renewal test: **1/1 PASS** as above.
  No genuine settlement or authenticated production-owner acceptance is implied.
- `scripts/deploy-neon-candidate-preview.mjs` creates only an isolated Vercel preview
  from non-ignored source files, excludes env files and uses per-deployment pinned
  production-target DB/Auth/storage configuration. It never promotes canonical traffic,
  enables live payments, supplies a source administrator key, or replays queued email.
  Deployment execution/status must be verified separately from the local build.
- Real preview acceptance found a critical previously untested build boundary:
  `next.config.ts` forced all non-staging browser bundles to legacy and omitted
  the production Neon storage origin from CSP. The first preview
  `dpl_8sZELZTiYYnEsicWa2TDvhtiux4Z` built READY but its Google button selected
  Supabase; login was stopped before account selection. That rejected preview and
  its temporary trusted Auth origin were removed. Canonical traffic was unchanged.
  The config now uses the validated explicit backend for browser compilation and
  includes only that branch's exact storage origin. Four build-config regressions,
  full 854-test suite, typecheck, local build and lint pass. Replacement preview
  `dpl_AWz2s3ANizuaAS5Wg7sb3wxNxGva` was submitted, URL
  `https://merotalent-lfpmrq1nw-aashutoshkashyaps-projects.vercel.app`.
  Only this exact origin was submitted to production candidate Auth's trusted
  origin list; no wildcard/local development origin or canonical traffic change.
  READY/build status is not yet authenticated workflow acceptance.

#### Production-candidate owner acceptance executed (not canonical cutover)

- Replacement preview `dpl_AWz2s3ANizuaAS5Wg7sb3wxNxGva` reached **READY**.
  Actual browser Google OAuth used Neon Auth's production endpoint, not Supabase.
  The approved owner completed a genuine Google login followed by a second,
  independent existing-source Google verification. The application restored the
  original application identity and reached its dashboard; no email-only mapping
  or copied staging Auth subject was used.
- Extended `scripts/assign-verified-neon-owner-admin.mjs` with an independently
  pinned production-candidate mode and distinct explicit apply flag. Dry-run passed,
  then the previously user-approved owner assignment changed exactly one existing
  primary role row Talent→admin. Original row ID and capability/entity/feature grants
  remained unchanged; one separately identified production-candidate approval audit
  was recorded. QA account unchanged. This is an intentional new approved grant,
  not a claim that the historical source role was admin.
- Private receipt `production-owner-acceptance-20261020.json`: verified email,
  `dual_authenticated_session`, verified identity link, active application account,
  admin role, exactly one authorized production-candidate admin audit. Actual
  authenticated `/admin` browser showed **Neon records loaded**; Institutions loaded
  **294 records**. Screenshot `neon-production-candidate-owner-admin-20261020.png`.
  This verifies production-target Auth/session/recovery/admin reads via the preview,
  not canonical production traffic or every private workflow.
- Fresh actual candidate encrypted backup + isolated local restore passed after
  identity/role writes: **99 tables / 2,192 rows**, archive
  `production-candidate-20261020080904160-8a25b3191b57.aes256gcm.json`, SHA256
  `8a25b3191b57a8a0d66b2e425686868b4f8980d9659135441a59fc3419d96156`.
  Full application row/schema fingerprints and encrypted readback verified;
  backup operation remote writes zero. Control-plane Auth settings, role passwords
  and object bytes remain separately managed exclusions. This does not prove a
  post-cutover write replay or remote object-store restore.
- Existing offline-only source append tool intentionally refuses a candidate with
  live identities. It was **not bypassed** after this real owner login. The next
  reconciliation batch must explicitly preserve/fingerprint the verified Auth/link
  ledger and the authorized role/audit exceptions, while still rejecting unrelated
  target conflicts. Old 2,183 exact-row parity is historical: owner recovery/audit
  and the authorized role transition are now legitimate target-only changes.
- Browser navigation to the Payments acceptance page encountered
  `ERR_NETWORK_IO_SUSPENDED`; no payment-page acceptance assertion is made.

Remaining exact operations: finish deployed College/private-file/payment-disabled
acceptance; identity-preserving final reconciliation under a verified write fence,
final delta,
fresh backup/restore and post-write rollback rehearsal; canonical deployment/traffic
switch and post-cutover acceptance. Captured 2,183-row/22-object parity is not a final
frozen sync. Supabase remains live and source/rollback retained; no runtime retirement
or canonical production cutover has occurred in this continuation. Candidate Auth
origin and the single explicitly approved owner-role assignment did change; no
claim of zero candidate/control-plane writes is made.

#### Interrupted-session continuation — committed-write recovery and deployed checks

- The candidate Payment History page was resumed in the existing authenticated
  owner session. It truthfully states new paid mentor/event/module purchases and
  renewals are paused while existing access, free services and history remain
  available. The earlier browser suspension was transient, not a failed payment
  acceptance result. No checkout or charge was initiated.
- Authenticated College public detail loaded Universal Engineering and Science
  College with actual cover/logo pixels, description/programs and admission CTA.
  CLI-authorized preview HTTP checks independently confirmed a real public record
  and a **307 signed redirect to the production Neon Object Storage branch**
  `br-falling-breeze-azr6q64l`, not Supabase. Anonymous same-origin private media
  download returned **401 AUTH_REQUIRED**. This is not a claim that every private
  applicant file has had authenticated browser download acceptance.
- The owner-preserving reconciliation path is now implemented in
  `scripts/candidate-owner-exceptions.mjs` and
  `scripts/append-missing-source-to-neon-candidate.mjs`. Default offline-only
  refusal remains. The explicit reviewed-owner mode requires exactly one genuinely
  dual-session verified production owner, the precise approved Talent→admin role
  row, its approval audit, and an independently fingerprinted Auth/link ledger.
  Every unrelated source/target conflict is rejected; existing rows cannot change.
  Read-only dry-run and actual **rollback-probe PASS** against the candidate:
  zero insertions, one explicitly approved role exception, two retained target-only
  audit rows, identity ledger unchanged, no sequence advance or persisted rows.
  Receipts `production-owner-preserving-sync-{dry,probe}-20261020.json`.
  This still compares the captured snapshot, not a final write-frozen source.
- Added `scripts/committed-write-replay.mjs` and its regression tests. Extended the
  existing candidate backup tool with a dedicated local committed-write rehearsal.
  The first attempt correctly stopped on an unreviewed contact→lead INSERT trigger;
  no trigger or constraint was disabled. The final fixture uses the passive skill
  catalogue in a private restored clone only.
- Actual encrypted backup/local restore and committed-write replay **PASS**:
  archive `production-candidate-20261020110232041-7b5e48c19a38.aes256gcm.json`, SHA256
  `7b5e48c19a38d6548a72ffbf2e1a497897d571af4e68ead2155bcbdab8834570`,
  **99 tables / 2,192 baseline rows**. One synthetic insert and one update were
  committed in one local clone and replayed into another fresh baseline clone.
  All table fingerprints matched afterward; identity/grants stayed unchanged;
  independent-change and duplicate replays were denied and rolled back atomically.
  Remote writes zero. This verifies local candidate-clone replay, **not** a live
  Supabase fallback, remote Auth restore or an executed production rollback.
- New focused Node regression tests: **9/9 PASS** (committed replay, approved-owner
  exception and append safety); syntax and diff checks PASS; lint still **0 errors /
  37 warnings**. The previously passing **854 standard tests / typecheck / build**
  were not unnecessarily repeated for these isolated script-only changes.

Next concrete engineering/operations gate: implement and rehearse a reversible
write fence covering legacy direct-client writes and in-flight storage operations,
then execute the final fenced snapshot/delta with the verified identity ledger and
review any new source conflicts before canonical promotion. Do not treat the old
plan's unscheduled 02:00 window, banner alone, or captured row parity as an enforced
maintenance window. Critical private-file/workflow acceptance and real rollback
compatibility remain separate gates. Canonical traffic is still legacy; no source
retirement or canonical cutover occurred.

#### Master execution continuation — source write-fence rehearsal and UAT handoff

- The latest master mandate again requires real eSewa UAT settlement before
  promotion. The earlier payment-restricted-launch option is superseded. Official
  EPAYTEST/NPR 10 checkout was opened in a visible sandbox tab with the published
  test customer credentials, not the user's live wallet. The provider reports
  reCAPTCHA free-quota exhaustion and disables LOGIN. The user attempted the
  handoff and reported both login and CAPTCHA failure. **Settlement remains
  UNVERIFIED**; no CAPTCHA bypass, live charge, production payment enablement or
  entitlement success is claimed. The isolated localhost UAT harness remains
  available for a fresh checkout after provider login is restored.
- Added `scripts/source-database-write-fence.mjs` and tests; extended the existing
  candidate backup tool with a dedicated, local-only fence rehearsal. The fence
  covers INSERT/UPDATE/DELETE/TRUNCATE using statement triggers, SECURITY INVOKER,
  an empty search path, bounded locks and ENABLE ALWAYS; removal verifies its own
  function/coverage first and never changes application roles or RLS policies.
- Actual encrypted candidate backup/local restore/fence rehearsal PASS:
  `production-candidate-20261020120151668-6c4471193593.aes256gcm.json`, SHA256
  `6c4471193593482c7c6551b9271fb2c1a189a7c4cbae423ceaf564f91ac1e360`,
  **99 tables / 2,192 rows**. All **80 source public tables** were fenced in the
  private local clone, all four DML types were rejected with SQLSTATE 55000, reads
  remained possible, rows were unchanged, and removing the fence restored the
  original schema fingerprints. Remote/source writes zero. This does **not** prove
  actual source storage-metadata or object-byte quiescence.
- Fence preflight checks actual table-owner privileges separately from TRIGGER
  grants. ENABLE ALWAYS requires ownership; a TRIGGER grant alone is insufficient.
  No role membership is changed to pass this test. Source storage ownership and
  in-flight object operations remain a distinct operational gate before applying
  any source freeze or calling a snapshot final.
- Production eSewa ciphertext exists with a non-test merchant and remains disabled.
  The local encryption key cannot decrypt that row; no key rotation, ciphertext
  replacement or UAT-secret substitution was performed. Vercel Production already
  holds a sensitive encryption-key variable. Official staged-production deployment
  can inherit it server-side without exporting secrets, but no staged-production
  build or canonical promotion was executed while the UAT gate is failing.
- Focused Node checks before ownership-preflight additions: **12/12 PASS**; lint
  **0 errors / 37 warnings**. The last application verification remains **854 tests,
  typecheck and production build PASS**; script-only work is not represented as a
  fresh application-suite run. Updated focused results are recorded below once run.

Next executable operations: finish source-fence privilege verification and safe
storage quiescence, complete genuine sandbox checkout after eSewa resolves its
hosted login/CAPTCHA failure, then final fenced snapshot/delta and launch acceptance.
No commit, push, canonical deployment, traffic cutover or source retirement occurred.

Interrupted-pass follow-up:

- Read-only source catalog verification as `supabase_read_only_user`, explicitly
  inspecting the intended `postgres` DDL operator rather than impersonating it,
  found all 80 public tables owner-controlled but **`storage.objects` not owned by
  that operator**. TRIGGER privilege is present; ENABLE ALWAYS ownership is absent.
  The prepared full fence therefore fails preflight. No source DDL, role grants,
  ownership changes or partial freeze were attempted. The storage-owning operator
  (`supabase_storage_admin`) must install/enable the reviewed storage trigger via
  a supported owner-authorized operation, or an independently verified provider
  storage-maintenance mechanism must establish equivalent quiescence.
- Official UAT CANCEL PAYMENT returned to the local application. Actual staging
  reads confirmed **payment failed / mentor booking cancelled / payment_status
  failed**, so no booked/paid entitlement was granted. This is genuine cancellation
  evidence, not successful settlement. The disposable fixture set was identified
  against the protected source snapshot, removed with the existing staging-only
  cleanup script, and its synthetic Auth subject removed; real accounts untouched.
- Fixed `scripts/neon-staging-esewa-browser-uat.mjs`: use a bounded connection pool
  and release the setup client before human interaction, rather than retaining an
  idle client that terminated the helper on Neon idle disconnect. Setup/cleanup
  transactions retain dedicated clients, with no automatic payment/write retries;
  diagnostics no longer print arbitrary setup exception messages.
- Current focused Node regression checks: **16/16 PASS** (fence preflight, owner
  exceptions, committed replay, portable-schema safety). Changed-script ESLint and
  syntax checks PASS; `git diff --check` PASS. Application code has not changed in
  this follow-up; the previous 854-test/typecheck/build evidence remains historical.
- Fresh real staging helper run after the pool fix created only its disposable
  mentor/event fixtures. `/status` worked after idle connections had been released.
  Both forged callbacks returned 400, both repeated provider-status returns were
  idempotent, and both non-settled entities ended cancelled with failed payment.
  A second `/status` request still succeeded. Neither settlement nor paid access
  was claimed. The helper was then stopped via its cleanup handler; no live charge
  or production write occurred. These tests do not remove the hosted CAPTCHA gate.

#### Source-inventory guard and renewed operational attempt — 2026-10-20

- Strengthened `source-database-write-fence.mjs` preflight to inspect every current
  public base/partitioned table. A new table absent from the reviewed snapshot now
  rejects the operation rather than being left writable. Added that regression.
  The local rehearsal now covers candidate-only public runtime tables as well.
- Focused regressions **17/17 PASS**; changed-script ESLint, syntax and diff checks
  PASS. No application runtime code changed in this batch.
- Actual fresh encrypted production-candidate backup/readback/local restore and
  strengthened fence rehearsal **PASS**: archive
  `production-candidate-20261020144620168-069ccc6afef8.aes256gcm.json`, SHA256
  `069ccc6afef88ab74c10347e5f487114d1820631239195ee065420232adc8bf0`.
  **99 tables / 2,192 rows**, **90 public tables fenced** in the private restored
  clone, all four DML classes blocked, reads allowed, original rows/schema restored
  after removing the fence. Remote writes zero. This is not a live source freeze
  or proof of storage-byte quiescence.
- Investigated the lower-privilege storage-trigger alternative. Source roles
  cannot SET session_replication_role, but an ordinary trigger is not a safe
  workaround: PostgreSQL also requires table ownership to DROP TRIGGER. Installing
  it with TRIGGER privilege alone would leave removal dependent on another owner.
  No such source trigger, ownership change or role escalation was attempted.
  Supabase's platform documentation requires retaining the storage schema's
  `supabase_storage_admin` ownership. The documented storage-config API does not
  expose a verified read-only/freeze control; no undocumented API was invoked.
- Opened the official Supabase support form and followed the existing GitHub
  sign-in. The browser returned to Supabase sign-in/logout instead of an
  authenticated support form; **no support ticket was submitted**. The operator
  has been asked only to complete that sign-in, not to share credentials.
- A new actual application-created EPAYTEST/NPR 10 checkout still shows provider
  reCAPTCHA free-quota exhaustion and disabled LOGIN. No genuine settlement,
  successful entitlement, live payment enablement or canonical cutover is claimed.
  Existing eSewa support inquiry remains the previously accepted request; no
  duplicate request or provider response is claimed.

#### Provider escalation after operator sign-in — 2026-10-20

- The operator completed Supabase sign-in. Selected the exact `merotalent`
  project `dtirpilgzlsfryucanlg` (not the form's default `meroseo` project) and
  submitted a low-severity Storage operational-guidance request. **Verified UI:
  "Support request sent" / "Your ticket has been logged for merotalent"**; replies
  go to the authenticated owner's email. No ticket number was exposed by the UI.
  Screenshot `supabase-storage-support-sent-20261020.png` retained privately.
- Disabled the form's default support/AI project-access toggle before submission.
  The inquiry requests a supported, reversible freeze covering uploads, replaces,
  deletes, resumable/S3 operations and in-flight completion while retaining reads.
  It explicitly forbids beginning maintenance or changing production until a
  separately agreed window. No secrets, customer records, ownership changes,
  credentials resets or support-access grants were submitted.
- The user reports eSewa hosted login now also returns **"Login Error — Service is
  currently unavailable. Please try again later."** This is user-reported evidence;
  the currently inspected official rc-epay tab still shows the separate reCAPTCHA
  quota warning with LOGIN disabled. Neither is a successful provider settlement.
  Existing eSewa escalation remains accepted; a reply or service restoration has
  not yet been verified. Production payments and canonical cutover remain disabled.

#### Implemented storage-state fence alternative — 2026-10-20

- Added `scripts/storage-state-write-fence.mjs`, its Node regression tests, and
  `scripts/rehearse-storage-state-fence.mjs`. These provide reviewable SQL and a
  synthetic private-local PostgreSQL rehearsal; they do not install anything on
  the source or load production credentials.
- Private singleton control state, restrictive ACLs and a fixed-body SECURITY
  DEFINER trigger function with empty search path protect **both storage.buckets
  and storage.objects**. Statement triggers cover INSERT/UPDATE/DELETE/TRUNCATE;
  open-state DELETE really deletes rows. A missing/wrong control record fails
  closed. Existing objects/functions are never silently adopted or replaced.
- Activation takes bounded table locks and updates the control row; trigger reads
  hold a shared row lock. The local rehearsal proved activation waits for an
  existing database writer, new writers fail after activation, and an old
  repeatable-read transaction cannot use stale unfrozen state. Object-byte
  quiescence remains explicitly false in receipts.
- **Correction to the prior cleanup blocker:** direct DROP TRIGGER still requires
  table ownership, but PostgreSQL permits the dedicated function owner to drop its
  function and its dependent triggers. Cleanup verifies the exact function, ACLs,
  control ID and two trigger definitions, then refuses CASCADE unless its entire
  dependency graph consists solely of those two verified triggers. Non-CASCADE
  table/schema removal completes cleanup within the caller's transaction. Extra
  dependencies and removal while frozen are denied. Actual local execution as a
  non-storage-owning controller proved reversal AND full cleanup, without changing
  storage ownership, grants or RLS. Thus storage-owner escalation is **not required
  for this design**; this supersedes the earlier assumed mandatory owner/support
  cleanup path, not the still-open live maintenance/byte-verification gate.
- Read-only source catalog checks confirmed postgres has CREATE on the database,
  USAGE on storage, and TRIGGER/UPDATE/TRUNCATE on both target tables. Previously
  inspected application/storage roles lack SET on session_replication_role. No
  source DDL, write freeze or production mutation was performed.
- Read-only actual Storage `/version` returned **1.80.2**. Reviewed matching tagged
  upstream `v1.80.2/src/storage/object.ts` and `uploader.ts`, rather than assuming
  current master: object deletion performs metadata DML before backend deletion;
  upload completion writes metadata before scheduling prior-version deletion.
  Upload bytes can precede completion, so this review is NOT an assertion that
  all network/object-byte writes cease. Actual API/in-flight and stable referenced
  object-byte checks must accompany the authorized maintenance rehearsal.
- Verification on this revision: **21/21 focused Node regression tests PASS**;
  **23/23 real synthetic local PostgreSQL checks PASS**, including bucket/object
  DML, unauthorized control/function access, exposed-ACL rejection, missing-state
  rejection, locking, stale snapshots, guarded dependency cleanup and restored
  writes. Changed-script ESLint and diff check PASS. All temporary local PostgreSQL
  clusters removed. No application code or live deployment changed.

Next concrete tasks: verify this exact mechanism against deployed Storage API paths
and referenced bytes during the gated maintenance window, execute final frozen
snapshot/delta and acceptance, and complete genuine eSewa settlement. User help is
needed for official UAT CAPTCHA/OTP/payment confirmation only once provider login
works; a generic unavailable response is not proof of its internal failure cause.
No live wallet test, unverified paid access, source retirement or cutover is approved
by this staging/local evidence.

#### Authenticated module UAT and storage-freeze verification — 2026-10-20 (Late Session)

- **Isolated Storage Write Freeze Rehearsal**: Re-verified `scripts/rehearse-storage-write-freeze.mjs`
  and `scripts/storage-write-fence.test.mjs` (**7/7 tests PASS**, end-to-end rehearsal PASS).
  Proved: 22 baseline objects seeded; in-flight uploads blocked with SQLSTATE 55000; file
  modifications blocked; file deletions blocked; existing objects 100% safe and readable;
  reversibility verified without DDL.
- **Stale Fixture Cleanup**: Identified and purged prior interrupted synthetic auth rows
  from `public.neon_identity_links`, `public.neon_application_accounts`, `public.profiles`,
  and `neon_auth."user"`. Verified 0 synthetic profiles and 0 synthetic auth users remain.
- **Neon Staging Auth UAT (`scripts/neon-staging-auth-uat.mjs`)**: **16/16 checks PASS** against
  the live staging server (`http://localhost:3001`). Verified public routes, 401 unauthenticated,
  isolated Managed Auth signup, session cookie issuance, verified subject, profile resolution,
  same-origin protected profile PATCH, cross-entity managed read denial (403), unauthorized write
  denial (403), disabled link denial (403), and logout revocation (401). Synthetic fixture cleanly purged.
- **Private Storage HTTP UAT (`scripts/neon-staging-private-storage-http-uat.mjs`)**: Configured
  with `NEON_STAGING_UAT_APP_ORIGIN`. **155/155 checks PASS**. Verified 4 synthetic Managed Auth
  identities (student, recruiter, unrelated, superadmin), real S3 private storage downloads,
  300-second expiring signed URLs, unsigned GET denial (403), path manipulation denial (403),
  cross-tenant denial, and 100% clean teardown (4 accounts, 7 S3 objects removed).
- **Jobs HTTP UAT (`scripts/neon-staging-jobs-http-uat.mjs`)**: **63/63 checks PASS**. Verified
  public jobs listing and detail, preferences persistence, saved jobs toggle, private experience PDF
  uploads to S3, non-PDF rejection, cross-job document rejection, student application submission with
  JSON document snapshot preservation, recruiter scoped 300-second signed document URLs and byte-level
  integrity, aged draft lifecycle and cleanup (dry-run candidate identification and atomic deletion),
  recruiter candidate status transitions, resume upload/replacement, and historical application resume retention.
- **Mentor/Events HTTP UAT (`scripts/neon-staging-mentor-events-http-uat.mjs`)**: **58/58 checks PASS**.
  Verified public mentor directory and services, event listings, same-origin session handling, durable
  notification delivery, chat messaging with private attachments, mentor booking, eSewa checkout
  initiation with signed HMAC fields (`EPAYTEST`), payment receipt proofs on private S3, free event passes,
  and clean teardown across all DB tables including `payment_checkout_sessions` and `neon_auth."user"`.
- **Realtime SSE UAT (`scripts/neon-staging-realtime-uat.mjs`)**: **13/13 checks PASS**. Verified
  authenticated text/event-stream connection, recipient-only event delivery (no cross-recipient leakage),
  missed event replay via `Last-Event-ID: 0`, and logout stream disconnection (401).
- **Typecheck & Regressions**: `npm run typecheck` **0 errors**. Vitest suites passing. Staging database
  and S3 storage left completely clean with zero dangling synthetic test records.
- **Gate Status**: NO-GO for canonical production cutover remains in effect. Blocked solely on external
  eSewa UAT resolution (reCAPTCHA quota and service availability) and scheduled maintenance window
  for live source freeze activation.

#### Reviewed attached late-session changes and ePay V2 timeout — 2026-10-21

- Reviewed actual UAT-script diffs and the attached execution transcript. Its
  successful local SQL rehearsal does NOT prove hosted Storage API or object-byte
  safety: it seeded metadata rows, not 22 real files, and a newly inserted row
  named "inflight" is not a concurrent upload. Historical staging HTTP totals in
  the attachment are separate from tests re-executed in this continuation.
- Replaced the weaker `storage-write-fence.mjs` implementation with a compatibility
  facade over `storage-state-write-fence.mjs`; the old public control table,
  fail-open missing state, row-only/non-TRUNCATE protection, unchecked existing
  objects and weak verification are no longer executable through that entry point.
  Its rehearsal command now delegates to the canonical private-local 23-check
  concurrency/ACL/cleanup rehearsal and explicitly disclaims live-file proof.
- Added `staging-uat-origin.mjs` and tests. All five newly configurable Auth/Jobs/
  Mentors-Events/Private-Storage/Realtime harnesses now reject arbitrary remote or
  production origins before sending generated passwords or session cookies. Only
  exact localhost ports 3001 and 3210 are accepted. No RLS/auth checks were relaxed.
- Official ePay V2 docs list "Service is currently unavailable" as a server
  connection timeout. Do not infer that CAPTCHA quota, credentials or HMAC caused
  that timeout. The two official ePay pages differ in status endpoint/response
  examples. Read-only observation at **2026-10-21T00:28:54.973Z**: existing test
  order `23f37125-637d-4842-a678-041450b21be5`, rc.esewa.com.np status endpoint,
  HTTP 200 / NOT_FOUND with modern response keys. Documented alternate UAT host
  uat.esewa.com.np failed DNS ENOTFOUND from this host. Kept the already working
  rc endpoint; no undocumented fallback or endpoint guessing was introduced.
- Fixed `payment-provider.ts` to accept the V2 documented scd/pid/totalAmount/refId
  response as well as current product_code/transaction_uuid/total_amount/ref_id,
  with exact merchant/order/amount matching. Any conflicting supplied aliases or
  provider references are rejected. Added six response-contract regressions.
  Added three configuration tests and constructor/factory guards against the
  published UAT merchant/secret being used with production, and invalid environment
  names. Neon provider loading maps rejected configuration to an unavailable state.
- Added a sanitized UAT request diagnostic and tests. Actual new request generated
  **2026-10-21T00:32:03.421Z**, form submitted once in the visible browser at
  **00:32:32.789Z**, transaction `282e3931-b8af-49a2-b11a-810d18010da9`, EPAYTEST,
  NPR 10.00, rc-epay.esewa.com.np/api/epay/main/v2/form. All mandatory fields,
  documented field order, exact HMAC using published UAT secret, canonical UUID,
  form encoding and both localhost callback origins validated. Diagnostics expose
  no secret, raw signature, cookies, password, OTP or provider session tokens.
- The user completed the handoff and reports **Login Error — Service is currently
  unavailable. Please try again later.** The immediate subsequent UI inspection
  showed the CAPTCHA quota warning, not the transient error toast. Login-response
  HTTP status was not exposed by the native browser observation and is NOT
  invented. This failure is after the accepted checkout form and before a verified
  payment/return. No direct CAPTCHA-less/dummy-token login was attempted.
- Authoritative existing-order status read at **2026-10-21T00:34:14.589Z** returned
  HTTP 200 / **PENDING**, matching EPAYTEST and amount 10, ref_id absent. No settlement
  or entitlement was granted. Production candidate read-only config: eSewa,
  production environment, non-test merchant, encrypted credential present,
  **disabled**. This does not verify decryption or live merchant settlement.
- Focused payment checks initially **91/91 PASS**, then **97/97 PASS** after the
  response compatibility fix. Canonical local storage rehearsal **23/23 PASS**;
  initial compatibility/origin Node tests **9/9 PASS**, diagnostic/origin tests
  **4/4 PASS**. Full intermediate revision **176 files / 860 tests PASS**, typecheck
  PASS, lint **0 errors / 37 warnings**, production build PASS. Final-revision
  configuration-guard verification completed: **176 files / 863 tests PASS**,
  typecheck PASS, lint **0 errors / 37 warnings**, production build PASS (all
  commands exited 0).
- Hosted sandbox cancellation returned to the application checkout route. The
  mentor transaction became **failed** (not paid); the unsubmitted event stayed
  **pending**. Neither received a paid entitlement. The user-reported transient
  login timeout was not captured as an HTTP response; subsequent browser state
  showed the provider CAPTCHA quota warning. These are distinct observations.
- Protected snapshot-checked staging cleanup removed the single proven synthetic
  UAT fixture set after cancellation; command exited 0. No source users or real
  application records were selected for cleanup.

Canonical cutover, live freeze/API acceptance, final source delta, unresolved
identity acceptance and retirement remain gated. No commit, push, traffic switch,
production configuration change or live payment occurred in this continuation.

#### Supplied MrValuator ePay V2 port — 2026-10-21

- Inspected the supplied archive's `src/lib/esewa.ts`, both payment route files,
  schema, README, package and environment example. No real `.env` is present.
  The implementation and example disagree on merchant-ID/CODE/environment names.
  No sample credential was adopted as a production merchant credential.
- Adapted its exact HMAC field order and browser POST pattern into
  `src/lib/server/esewa-v2-form.ts` and the existing provider adapter. Consolidated
  Payments, BookingDialog and RequestSubAdminAccess on `browser-checkout.ts`;
  form data is assigned as DOM values, never raw HTML. Only exact official form
  endpoints and complete known field sets are accepted, with environment checks.
- `scripts/esewa-environment.mjs` normalizes reference `sandbox` to `uat`, supports
  the non-conflicting merchant-ID alias, validates optional BASE_URL, rejects
  partial/mixed credentials and exposes no configuration values in diagnostics.
  The existing pinned staging bootstrap imports into the existing encrypted
  Provider Center record; dry run confirms enabled UAT and successful decryption.
  Production enablement and the server-verified settlement gate remain unchanged.
- Read the current official ePay and Test-credentials pages in the browser.
  The documented signed callback amount `1,000.0` exposed an actual compatibility
  defect. `esewa-amount.ts` now parses only correctly grouped decimal amounts,
  preserving raw text during signature verification. Both Neon and compatibility
  callbacks use it. Status verification also rejects a provider transaction code
  different from the signed callback, before any fulfillment write.
- Focused reference/payment regression suite: **7 files / 112 tests PASS**.
  Operator/configuration/storage guard Node suite: **20/20 PASS**. Intermediate
  broad suite: **183 files / 906 tests PASS**. Final revision broad suite:
  **183 files / 907 tests PASS**, typecheck PASS, lint **0 errors / 37 existing
  warnings**, production build PASS, script syntax and `git diff --check` PASS.
  No historical applied migration changed; no new payment schema was required.
- Runtime reference inventory remains **110 files (102 static, 8 dynamic)**;
  these legacy compatibility paths are not evidence of an actual Neon fallback.
  Retiring them before verified cutover would break the still-live legacy release.
- Read-only candidate comparison against the existing 2026-10-20 source snapshot:
  **80 tables / 2,183 source records matched**, zero ordinary write operations,
  zero timestamp repairs, zero conflicts after recognizing the one exact audited
  owner-admin approval. Two target-only audit records are retained. The planner
  now reuses `candidate-owner-exceptions.mjs` and records the identity ledger hash;
  no generic conflict bypass, source write or target write was performed.
- The separate staging source-link check remains BLOCKED: one real verified link,
  106 source accounts unlinked, with the approved role differing from the source
  Talent role. That is not evidence that all identities have migrated. No account
  was linked by matching email or granted privileges to make this check pass.
- Production promotion remains gated by genuine eSewa settlement, verified live
  source freeze/final synchronization, and remaining acceptance/recovery checks.
  No new checkout or live charge was initiated by this port. ZIP compatibility and
  mocked tests do not establish genuine provider settlement or canonical cutover.

#### Release branch and fresh provider rejection — 2026-10-21

- Commit `7b869ff902c67d47cbce9be7c3f0774f1899f4a2` was pushed and independently
  verified on `origin/codex/neon-esewa-reference-port`. The unrelated untracked
  `CLAUDE.md` was not committed. `main` and canonical traffic were not promoted.
- Candidate deployment `dpl_xnjiGak3j9bxBBsy5VbU1nbsjJpr` is READY at
  `https://merotalent-k2vahmfbf-aashutoshkashyaps-projects.vercel.app` (preview).
  It uses the pinned Neon production candidate DB/Auth/storage configuration,
  with new production payments and notification delivery explicitly disabled.
  Live preview checks: public directory reports 292 records; a referenced College
  WebP returns HTTP 200 / 155,526 bytes from the exact Neon production storage
  host; anonymous application-admin access returns HTTP 401 / AUTH_REQUIRED.
  This is not authenticated login acceptance or canonical production cutover.
- Fresh isolated UAT mentor checkout `340f3cf6-7a10-4abb-8a58-57c33bbf5773`
  generated at 01:12:49.883 UTC reached eSewa once with EPAYTEST / NPR 10.00.
  Mandatory fields, HMAC and callback origins validated. The operator reports
  `Login Error — You cannot perform transaction.` The subsequent browser state
  showed the login page, test account ending 0002, CAPTCHA quota warning and
  disabled LOGIN; the transient rejection response/HTTP status was not captured.
  The operator confirms it appears **immediately after LOGIN**, before OTP or
  payment confirmation. This is a hosted login-stage rejection, not evidence of
  successful authentication or a MeroTalent callback/fulfillment failure.
- Provider status lookup at **2026-10-21T01:25:15.859Z** returned HTTP 200 /
  **PENDING**, exact merchant/reference/amount match, no settlement reference.
  No paid entitlement was granted. No new login submission, wallet switching,
  CAPTCHA bypass or production charge was performed during this diagnosis.

#### Production provider validation continuation — 2026-10-21

- Resumed clean `main` at `3350390` (also confirmed on `origin/main`). The
  canonical domain now resolves to READY production deployment
  `dpl_9RMMVWntrPuT6nDqRLxYR4Ua9oRA`; older preview-only notes above are historical.
- `src/lib/server/neon-provider-config.ts` now validates the effective stored
  eSewa secret with the existing adapter before enabling it. Changing public
  metadata cannot enable a previously stored sandbox secret as production.
  Saved ciphertext must decrypt before the transaction records success; a
  verification failure throws and the existing transaction wrapper rolls back.
- Added three regressions in `src/test/neon-provider-config-validation.test.ts`:
  stored sandbox credential rejected before writes, fresh status read after key
  mismatch fails closed without secret disclosure, and corrupt saved ciphertext
  rejected before the success audit record. Focused tests: 4 files / 43 tests.
- Final code verification: 185 files / 936 tests PASS, typecheck PASS, production
  build PASS, lint 0 errors / 37 existing warnings, diff check PASS.
- Actual canonical owner Google login succeeded via Neon Auth and opened Super
  Admin. Authenticated GET of `/api/v1/neon-staging/admin/providers/payment`
  reports `configured=true`, `enabled=false`, `secretDecryptable=false`,
  `secretStorageReady=false`, environment production. No credential material is
  returned. The Provider Center disables saving because secure storage is
  unavailable. Vercel metadata lists the key variable, but fresh sensitive
  exports omit its value; presence is not runtime key validity or decryptability.
- Anonymous provider status and checkout return 401 AUTH_REQUIRED; malformed
  callback data returns 400 INVALID_PROVIDER_PAYLOAD. These are denial checks,
  not proof of successful checkout or fulfillment.
- No provider configuration or backup table was changed, no encryption key was
  rotated, and no real charge or new sandbox login was attempted. Operational
  recovery still requires the original usable runtime encryption key, or a
  controlled replacement with legitimate merchant credentials. A genuine
  authorized settlement and merchant-portal callback registration remain
  unverified. Existing mocked E2E tests are not provider settlement evidence.

#### Controlled production provider-key recovery — 2026-10-21

- Authenticated canonical diagnostics on commit `785283e` identified the exact
  failure: `secretStorageStatus=invalid`, not a missing variable. The original
  Vercel value is sensitive/unreadable through authorized exports and retrieval;
  the available local key does not decrypt the existing eSewa ciphertext.
  No original key or merchant secret was recovered.
- Read-only inventory found one encrypted platform payment credential, zero
  BYOK credentials, and the intact original
  `public.provider_configurations_backup_20261021` table. Its deterministic
  SHA256 is `be4be7ef88c807902090bcf92663b913ef629f40b47698b04043712183f4d7c2`.
- A controlled replacement 32-byte random key and both current/original provider
  rows were backed up in a read-back-verified AES-GCM envelope outside the repo:
  `provider-key-rotation-20261021094056691.aes256gcm.json` in the private migration
  artifact directory. The envelope uses the existing operator snapshot Keychain
  key. No secret was logged, committed, or sent to a browser.
- Updated only the existing sensitive Vercel Production key variable, preserving
  its identity/type/scope. Vercel confirmed the update. No provider row, original
  backup table, payment flag, merchant credential, or application entitlement was
  modified. A new deployment is required to load the replacement key.
- `secret-store.ts` now exposes only `missing/invalid/ready` diagnostics and
  performs an ephemeral encryption/decryption probe when reporting readiness.
  The authenticated provider response exposes that state, never key material.
  `docs/provider-secret-storage.md` documents the canonical return URL and the
  distinction between form return URLs and unverified merchant allowlisting.
- Verification: 185 files / 938 tests PASS, typecheck PASS, build PASS, lint
  0 errors / 37 existing warnings, diff check PASS. These checks do not establish
  merchant-credential save/read or real payment settlement. Remaining owner-only
  action: enter legitimate production merchant credentials in authenticated
  Provider Center after storage readiness is verified; then verify a fresh read
  and explicitly authorize any real end-to-end payment test.

#### Isolated eSewa UAT retry and public-navigation fixes — 2026-10-21

- Reused the existing browser UAT harness on the guarded migration-staging
  branch and localhost:3001. Existing UAT configuration was already valid;
  no production provider credential, enable flag, or entitlement was changed.
- Actual authenticated checkout created durable NPR 10 mentor/event pending
  orders. Diagnostics verified required form fields, EPAYTEST, exact HMAC field
  order, UUID and amount, and the isolated callback origin. Only mentor checkout
  `d1ae12c5-8a42-45d1-83b9-6fdf3a51c1bf` was submitted to the gateway (generated
  2026-10-21T15:31:03.612Z); event checkout was not submitted.
- Human-assisted hosted login showed **You cannot perform transaction** and
  **This site is exceeding reCAPTCHA Enterprise free quota**. Screenshot:
  `/private/tmp/merotalent-uat-captcha-unavailable-20261021.png`. No CAPTCHA was
  bypassed. No OTP, confirmation, signed success return or settlement succeeded.
- Authoritative RC status GET at 2026-10-21T15:45:55.598Z returned HTTP 200 /
  PENDING with exact merchant/reference/amount match and no settlement reference.
  Actual forged callbacks were denied and repeated returns did not fulfill the
  mentor booking. The unsubmitted event resolved failed/cancelled, not paid.
  These denial checks are not genuine settlement or cancellation-button proof.
- Harness shutdown cleaned its disposable staging data; subsequent guarded
  read-only query found zero disposable UAT student/mentor profiles. The standalone
  recovery-cleanup script separately refused to run without snapshot evidence;
  no guard was bypassed. Provider action remains restoring RC CAPTCHA quota and
  test-wallet transaction permission before another genuine checkout can settle.
- `src/App.tsx` now serves the real competition directory instead of Coming
  Soon. Public competition cards link to the selected authenticated registration
  detail; homepage competition links target the corresponding directory card.
- `Features.tsx` cards are keyboard-accessible links to their actual modules.
  Existing six featured College destinations were independently confirmed to
  resolve to public records; no synthetic listings were published for testing.
- Scoped navigation/category typography and shared badge wrapping fix cramped
  pills without reducing global fonts. Observed production root/body font was
  already 16px; no root font-size or zoom change was made.
- Added public competition routing/detail and feature-link regressions. Focused
  UI verification passed 4 files / 13 tests. Final revision: 186 files / 942 tests
  PASS, typecheck PASS, production build PASS, lint 0 errors / 37 existing
  warnings, diff check PASS. Fresh read-only production provider check confirms
  eSewa remains disabled, environment production, original ciphertext present.
  No genuine UAT settlement or production merchant decryptability is claimed.

#### Architecture enforcement and workflow acceptance — 2026-10-22

- Began clean on local/remote main `6e9a064`; canonical inspection found READY
  deployment `dpl_J2qbqqfhNVmhkoqtU2duaJcGuj6c`. Sensitive production mode/payment
  environment values are not readable even through per-variable retrieval; their
  presence is not proof of their contents. No environment or production data was
  changed by this batch. Older August handoffs are historical, not migration authority.
- Added the six requested architecture documents and deterministic per-file
  legacy inventory. AST import inventory: 109 files (102 static / 7 dynamic).
  Full tracked-text inventory: 79 ACTIVE, 130 MIGRATION REQUIRED, 76
  HISTORICAL/RECOVERY, 0 UNKNOWN; removed DEAD candidates are listed with proof.
  CI verifies inventory freshness. Classifications do not prove all compatibility
  branches are production-reachable or fully retired.
- Removed unreferenced ComingSoonPage, self-hosted Better Auth draft and unused
  authentication adapter; removed their two exclusive direct dependencies and
  unused `xlsx` dev dependency (exports already use tested SpreadsheetML). All
  source SQL, recovery, ledger, snapshot and rollback assets were retained.
- Neon client mode no longer requires source env variables or instantiates a
  legacy SDK. Any ordinary legacy data/session/realtime use fails locally;
  dedicated source-ownership recovery remains separate. Added denial regressions.
- Fixed College manual access: scoped current features, not package existence,
  determine lead display; approved listing differs from paid verification;
  manual access no longer displays a nonexistent pending subscription. Notices
  and public-listing links preserve the selected College. Actual staging HTTP
  assertions: 10/10 across two colleges, allowed leads, feature removal/403 and
  expiry. Browser verified correct labels/links; no entitlement gate weakened.
- Fixed false logout on transient profile refresh failure: 503/network errors do
  not clear an already hydrated user; authoritative 401/403/404 still clear it.
  Invalid/missing profile responses never fabricate a linked account. Added tests.
- Profile capability read moved into the authorized own-profile SQL statement:
  two sequential queries become one, preserving scope and expiry. Explicit
  private/no-store response. Idle pg pool failures are handled with a bounded
  redacted event; no automatic write retry was introduced.
- Explicit-Neon build measurements: App dynamic entry 674,331 → 424,772 raw
  bytes; 194,782 → 127,604 gzip bytes (34.5% less). This excludes framework and
  later route chunks, not a measured CWV or total-page speedup. Source recovery
  UI and its SDK are lazy-loaded; pure popup-marker routing remains lightweight,
  and original proof/identity-link rules are unchanged. Conditional legacy SDK
  loading remains a fail-closed compatibility boundary, not a second backend.
  Lockfile packages 1,017 → 1,007; runtime direct dependencies 64 → 62.
- Real isolated staging checks: Jobs 63/63, Mentors/Events 60/60; private storage
  155/155 across resumes, experience/training files, payment proofs, chat and
  event attachments. Verified actual bytes, anonymous/cross-user/path denial,
  expiry, Super Admin access and reference-safe deletion. No provider settlement
  was simulated. Matrix cleanup PASS: 4 disposable accounts / 7 objects removed.
- Real browser profile save persisted in Neon and survived reload; evidence
  `/private/tmp/merotalent-architecture-profile-20261022.png`. Exact-run crash
  recovery removed the previous browser fixture's 2 accounts; current browser
  harness cleanup also PASS (2 accounts). No real source accounts were selected.
- Canonical brand constants and official PNG mark now cover public metadata,
  favicon metadata, public nav/footer, AuthShell, onboarding and both dashboard
  sidebars. Existing CSS/type scale retained; comprehensive remaining page-style
  conversion and mobile/dark visual acceptance are not claimed complete.
- Captured-source identity check (2026-10-20 snapshot, NOT fresh source): 107
  users, 108 identities, 1 verified link, 104 eligible for proof recovery,
  2 unresolved, 0 collisions. No identity linked by email or capabilities added.
- Dedicated source read-only configuration is still absent. Production payments
  remain subject to the original disabled/undecryptable-merchant and genuine
  provider settlement gates. No production charge or merchant change occurred.
- Final standard suite: 190 files / 956 tests PASS, typecheck PASS, explicit-Neon
  production build PASS, lint 0 errors / 37 existing warnings, diff check PASS,
  inventory freshness PASS. No historical migration file changed. These checks
  do not establish full production migration or payment acceptance.

#### Clean-install follow-up — 2026-10-22

- Batch `b9f08b0` was pushed and Vercel deployment
  `dpl_tZDghow2PLaNk1ae5zi5cQ5qLwJq` reached READY. Canonical recovery UI loaded
  the official branding; unauthenticated profile API remained denied (401).
- GitHub run `39699493459` failed before tests at `npm ci`: four exact
  `@emnapi/core` / `@emnapi/runtime` entries required by optional WASI tooling
  were absent. npm 11.6.2 reproduced no repair; CI's npm 11.19.1 regenerated
  the missing entries. No dependency override, peer bypass or CI relaxation was
  retained. Lockfile package entries are now 1,009, not the intermediate 1,007.
- Added a regression asserting both WASI parents resolve their exact locked
  dependencies, including optional packages absent on the developer platform.
  A disposable archive clean install uses npm 11.19.1, matching CI; no source,
  provider configuration or production data is changed by this correction.
- Final correction verification: full suite 190 files / 957 tests PASS,
  typecheck PASS, lint 0 errors / 37 existing warnings; clean `npm ci` PASS in
  the disposable archive and Linux/x64 npm 11.19.1 lock validation PASS.
  Explicit-Neon production build, diff and inventory checks PASS. The new
  regression also passed against the archive's freshly installed dependencies.
  No existing package version changed during lockfile repair.

#### Public content and sticky navigation continuation — 2026-10-22

- Lockfile correction `d632f89` is on remote main. GitHub CI run `39701336114`
  completed SUCCESS (both jobs); Vercel `dpl_Grba74VRqHqMcaGX3HBdBzX7zNbr`
  reached READY, canonical recovery HTTP 200 and unauthenticated profile HTTP
  401. Fresh read-only production payment inspection: eSewa disabled,
  environment production, zero writes.
- Live browser reproduced the public home header moving to top -962px after
  scrollY 962. Replaced the ancestor overflow scroll container with horizontal
  clipping; local staging browser now reports top 0 at the same scroll position.
  Small-screen home no longer reserves a desktop sidebar gutter. Sidebar role
  labels remain on one line without shrinking the global font scale.
- Removed hardcoded testimonial fallback records; explicitly published CMS
  testimonials remain supported. Replaced invented contact numbers/address
  with the same existing CMS contact/support settings used by the footer. No
  saved content or production rows were deleted. FAQ contact action now uses
  its configured URL; unsafe schemes fall back to the contact form.
- Corrected fallback FAQ claims about free paid services and alleged university
  partnerships. Contact acknowledgments say inquiry received, not email sent;
  removed an unsupported 24-hour response promise. Preserved the existing
  contact persistence endpoint and authorization architecture.
- Contact controls have associated labels/autocomplete; FAQ buttons expose
  expanded state and controlled panels without clipping long answers. Contact
  accents use the existing primary design token, not copied red template colors.
  Added six component/structure regressions, including CMS content preservation,
  missing settings, safe links and keyboard-operable native accordion buttons.
- Final local verification: 191 files / 963 tests PASS, typecheck PASS, explicit
  Neon production build PASS, lint 0 errors / 37 existing warnings, diff check
  PASS. Local contact screenshot: `/private/tmp/merotalent-public-contact-20261022.png`.
  No contact message or payment was submitted by the browser check. Phone/tablet
  browser acceptance remains unverified: native browser control reported the
  Mac locked; requested unlock while continuing independent release work.

#### Unlocked responsive browser acceptance — 2026-10-22

- Confirmed `e9a58f3` production deployment
  `dpl_3ZJLbdtSoL1hYphzHw4XJ4ZdmMLC` READY with matching commit metadata.
  GitHub run `39797712873` completed SUCCESS. The legacy drift job's missing
  source-secret warning is a skipped check, not source reconciliation evidence.
- After owner unlocked the Mac, verified real Chrome iPhone SE 375×667 and
  iPad Mini 768×1024 viewports: document widths equal viewport widths, header
  top remains 0 while scrolled, phone sidebar gutter absent, tablet gutter
  intact. Keyboard opened/closed the phone menu, tabbed through contact fields,
  and opened the College directory from the tablet menu. No form submitted.
  Screenshots: `/private/tmp/merotalent-phone-navigation-20261022.png`,
  `/private/tmp/merotalent-phone-contact-20261022.png`, and
  `/private/tmp/merotalent-tablet-navigation-20261022.png`.
- Browser found a genuine route transition defect: navigation from a scrolled
  page retained the old position and opened the College directory near its
  footer. Added one shared Router scroll boundary; new PUSH/REPLACE page paths
  reset instantly while initial load, same-page filters, explicit fragments
  and POP/history navigation are not overridden. No authorization/data changes.
- Added five regressions. Full suite 192 files / 968 tests PASS, typecheck PASS,
  lint 0 errors / 37 existing warnings. Real isolated staging browser: contact
  section scrollY 3,604 → College directory scrollY 0, header top 0. Browser
  automation's mobile mouse-dispatch timeout was not counted as a touch test;
  keyboard navigation was genuinely exercised.
- Explicit Neon production build, architecture inventory freshness and diff
  checks PASS on the final revision. Isolated local server was stopped; no
  synthetic accounts or objects were created for this navigation-only batch.

#### CMS editing/visibility correction — 2026-10-22

- Owner clarified that sections/components must remain editable and support
  hide/unhide; removing hardcoded placeholder fallbacks must not silently remove
  the section. No saved CMS row was deleted by either batch.
- Restored the enabled testimonial section even with no published items;
  its heading, introduction and individual testimonials remain controlled by
  existing CMS records. New testimonial items start hidden for review; no
  fictional quotes are re-published as real endorsements.
- Contact now renders its saved section heading, eyebrow and body. Added
  recognizable contact component choices to the existing Page Editor sub-item
  workflow: address, phone, email and message form. Titles, values/instructions
  and submit label are editable; each component's visibility is independent.
  Duplicates are prevented by the editor; global contact settings remain the
  fallback until a component is customized, never fabricated contact details.
- Public visibility metadata includes child identifiers/state, not hidden text.
  Hidden components cannot reappear from global defaults. An explicitly empty
  configured FAQ list stays empty instead of resurrecting fallback questions.
  CTA heading/body/button/destination now use the existing saved section fields.
- Super Admin transaction authorization, audit logging and hidden-content
  exclusion remain authoritative; no schema or permission changes. Focused
  regressions passed 14/14. Real isolated Neon CMS test passed: edit child,
  hide, verify retained admin content/no public content, unhide and read back
  the edited value. Test changes were rolled back; production writes zero.
- Final verification: 192 standard files / 972 tests PASS, isolated CMS test
  PASS, typecheck PASS, explicit Neon production build PASS, lint 0 errors /
  37 existing warnings, inventory freshness and diff checks PASS. Scope is the
  affected home sections/components, not a claim that every static component
  in every module has been converted into a page-builder field.

#### Release closure and production CHECK validation — 2026-10-22/23

- Reverified local/remote main `16c9c6d75330aac689c37fe7d4eb2b9c247094ba`,
  clean initial working tree, GitHub run `39806451369` complete SUCCESS in both
  jobs, and canonical Vercel deployment `dpl_qo1JXyDwiyu68XxzrBvnW3AZGLdT`
  READY with that exact commit. The legacy drift job is not source-parity proof.
  Available one-hour production error-log query returned no records.
- `src/lib/server/supabase.ts` no longer eagerly evaluates the legacy SDK when
  imported by ordinary Neon server routes. Synchronous compatibility factories
  load it only after authoritative backend/configuration checks. New module-load
  regressions verify staging, production and inconsistent-selection denial with
  no SDK evaluation. Historical source-proof recovery is preserved unchanged.
- `scripts/inventory-supabase-runtime.mjs` now distinguishes type-only static
  edges from loadable edges and reports conditional requires. Regenerated the
  existing per-file inventory: 80 ACTIVE, 130 MIGRATION REQUIRED, 76 historical/
  recovery, zero confirmed dead leftovers or UNKNOWN. All 109 import-reference
  files remain conservatively classified; this is not 109 live source callers.
- Updated Vitest/mocker 4.1.10 → 4.1.12, resolved Vite 8.3.5, undici 7.30.1,
  brace-expansion 1.1.21 / 5.0.12. Previous exact-version-only overrides missed
  newer vulnerable patch releases; same-major range overrides now cover them.
  No Next/Tailwind major upgrade, forced install or audit suppression. Lockfile
  entries 1,009 → 1,005; clean npm 11.19.1 installation PASS. Full audit 15 → 10
  findings; omit-dev audit still has seven CSS/glob-chain findings, retained as
  outstanding work. Native-binding/WASI lock coverage remains regression tested.
- Actual pinned Neon production read: 107 profiles, one verified identity link,
  one active application account, production eSewa disabled. Approved source
  read-only URL/host/role are absent from available local configuration. No
  administrator credential was substituted and no identity was linked by email.
- Actual production—not merely staging—had 21 unvalidated CHECK constraints.
  Fresh encrypted backup/readback/private local restore PASS: 100 tables, 2,198
  rows, matching application row/schema fingerprints, remote writes zero.
  Archive SHA256 `0a675d9725005fbdd7f41c3505db85992572928ab422ecfbd5dc5e9b1cd5336e`;
  private restore evidence `production-candidate-restore-20261022161345678.json`.
  Excludes global ACL/passwords, Auth control plane and live object restoration.
- Added `scripts/production-constraint-validation.mjs` and guarded operator
  `scripts/validate-neon-production-constraints.mjs`: exact production host,
  reviewed staging definition hashes, fresh verified encrypted backup, private
  artifacts, bounded statement/lock timeouts, no data repair or new constraints.
  Actual read-only preflight: all 21 matched / zero violations. Applied only
  VALIDATE metadata changes; independent read and repeat dry-run confirmed zero
  unvalidated constraints. Business/source row writes zero. Eight new safety
  tests cover unknown/altered metadata, incomplete review and stale/bad backups.
- Existing production owner session loaded Super Admin overview, college
  application names and applicant-detail fields. Provider Center explicitly
  showed the old merchant secret cannot decrypt and remains blocked. No form,
  invitation, role, application, CMS or payment was submitted by these checks.
- Explicit-Neon production build PASS. App dynamic entry: three chunks,
  425,636 raw / 128,536 gzip bytes, no legacy Auth SDK marker. This is a scoped
  current measurement, not a speed improvement or whole-page/CWV claim. The
  Chrome DevTools performance connector remains unavailable.
- Final retry exposed memory-pressure timeouts when the full AST scan ran inside
  a parallel test worker. The regression now consumes the independently freshness-
  checked inventory, and Vitest uses two workers; assertions/timeouts unchanged.
  Existing Next guide was consulted; test config uses `import.meta.dirname`.
- Final bounded-worker retry: 194 files / 985 tests PASS; previously timed-out
  recovery, billing and navigation cases passed without relaxing assertions or
  timeouts. Typecheck PASS, build PASS, clean install PASS; lint 0 errors / 37
  existing warnings plus changed-file lint PASS. Inventory freshness and diff
  checks PASS. No source reconciliation or genuine settlement is implied.
- Remaining acceptance: fresh approved read-only source reconciliation;
  historical users' ownership recovery; complete authenticated production
  workflow/file/notification acceptance; provider-hosted genuine UAT settlement;
  legitimate decryptable production merchant configuration/registration; and
  remaining build-tool advisories/visual standardization. No migration-complete
  claim, source retirement, payment enablement or real charge is authorized by
  the successful constraint operation.

#### Acceptance continuation from b03510f — 2026-10-23

- Single current evidence matrix: `docs/neon-acceptance-matrix-2026-10-23.md`.
  Includes all five actual paid products' UI → route → server pricing → provider
  → callback → fulfillment paths, external gates, exact dependency findings and
  acceptance levels. None is promoted to genuinely settled by mocked tests.
- Fixed decimal NPR prices rejected by float equality; fractional paisa denied.
  Added payer-owned status recovery route/button using the existing authoritative
  verifier, both-ledger ownership, same-origin/session checks, advisory locking,
  no client assertions and private/no-store responses. Fixed actual Next empty-
  POST-stream behavior found through real staging HTTP. New paid initiation stays
  paused; existing verification is separate. Shared atomic receipt handling
  reuses payment-trigger dashboard notices, publishes durable events, queues
  policy-scoped email and records verification audit, with duplicate protection.
- New critical Next16.3.8 advisories found in fresh audit: upgraded framework and
  aligned lint config to same-major16.4.2. Full findings 11 → 10, critical1 → 0.
  Remaining3moderate/7high CSS/glob findings are documented with paths, actual
  versions, reachability and major-upgrade requirements; no forced override,
  audit suppression or incompatible lint downgrade. React18 deprecation is not
  confused with a failed build or silently upgraded major.
- Source gate now proves complete SELECT/unfiltered RLS coverage, not merely
  absence of writes. Lossless PostgreSQL-text row fingerprints preserve numeric
  and timestamp precision and duplicates, normalize comparison timezone, and no
  longer overwrite old evidence. Source URL/host/role remain absent; no owner
  credential substituted, source writes zero, fresh parity NOT claimed.
- Read-only actual production identity inventory against20October snapshot:
  107source users/108identities,1verified link,106needing ownership recovery,
  no collisions/broken links/target-only anchors. Missing anchors may be created
  only after existing dual-session proof. Technical eligibility is not recovered
  ownership. QA still unverified; no role/link/account bulk creation performed.
- Actual staging College browser saved text profile (independent DB readback),
  switched both scopes;10realAPI authorization/expiry checks passed. Native file
  picker blocked by extension file-URL permission; browser later detached.
  Jobs/mentor/storage HTTP failures and partial passing evidence are retained in
  the matrix; not counted as full acceptance. eSewa UAT hosted page reached for
  EPAYTEST/NPR10 but CAPTCHA free quota exhausted and LOGIN disabled. Production
  credentials/payment gate unchanged; no real payment or settlement claim.
- Standard final suite200files/1007testsPASS; focused payment33testsPASS;
  isolated real College payment/renewal SQL1PASS (injected provider, rolled back),
  UAT diagnostic2PASS, typecheckPASS, lint0errors/37existingwarnings. Existing
  backup/restore and validated CHECK evidence preserved, not needlessly replayed.
- Next concrete task: finish production-built isolated HTTP acceptance and the
  fresh source/identity/provider gates above; verify the release evidence below.
  No migration-complete or legacy-source-retirement claim.

- Subsequent owner directive authorizes live validation instead of waiting for
  provider UAT CAPTCHA. Owner replaced the live secret through authenticated
  Provider Center; fresh server read shows encrypted/decryptable, not the former
  decryption error. No credential in source/logs/reports. Added exact-owner-only
  live initiation gate across booking, registration, module enrollment, checkout
  and billing availability; malformed/missing/foreign IDs denied, normal identity,
  entity and authoritative pricing checks retained. Production public flag stays
  false; verified owner ID configured server-only, effective on next deployment.
  Provider enablement and actual wallet/payment confirmation remain owner actions.
- Final expanded suite201files/1014testsPASS; focused live/payment43PASS;
  production-built staging Jobs65/65 and mentor/event60/60 HTTP checks PASS.
  Includes actual persisted application, recruiter scope/price denial, private
  bytes, free ticket issuance, notifications/SSE and invalidated session denial.
  Earlier failed dev/HTTP attempts remain recorded, not silently relabelled.
- Private Object Storage HTTP155/155PASS on final retry, cleanupPASS; exact
  bytes, role/entity/owner denial, replacement, deletion and anonymous access
  exercised. Final production build/typecheck/clean install/diff PASS; lint remains
  0errors/37warnings. No real settlement or public payment activation implied.
