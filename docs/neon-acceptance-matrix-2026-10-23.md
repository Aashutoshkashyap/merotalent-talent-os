# Neon migration acceptance — 23 October 2026

Starting production revision: `b03510fbd7f03c13ab8568c2e69215a8d7e90aa2`.
This is the single acceptance matrix for this execution, not a new architecture plan.
The owner subsequently authorized **controlled live validation instead of waiting
for the broken sandbox**, supplied merchant credentials, and saved the replacement
secret through authenticated production Provider Center. No secret is recorded here.
An automated success fixture is never provider settlement or production acceptance.

## Acceptance matrix

| Workstream | Evidence and level actually reached | Open acceptance gate / exact action |
|---|---|---|
| Source reconciliation | Read-only tooling strengthened: complete SELECT coverage and unrestricted reader policy required, no write/BYPASS/privileged-function execution; PostgreSQL JSON text fingerprints preserve microseconds, large decimals and duplicate rows. Historical reports are no longer overwritten. | **BLOCKED, not fresh parity.** None of the three dedicated source variables is configured. Source project owner must provision `SUPABASE_SOURCE_READONLY_DATABASE_URL`, `SUPABASE_SOURCE_EXPECTED_POOLER_HOST`, `SUPABASE_SOURCE_READONLY_ROLE` through the approved secret channel. Use the actual session-pooler host, dedicated non-owner role, TLS, SELECT on public/auth/storage tables, reader-only policies allowing complete reads, and no write-capable function grants. Do not reset credentials or substitute the administrator key. |
| Identity inventory/recovery | Pinned production read-only inventory versus encrypted **20 October** source snapshot: 107 source users, 108 provider identities; one verified link, one managed target user, no conflicting/broken mappings or target-only accounts. 106 source users still need ownership proof. Existing dual authenticated-session linker preserves original IDs, roles/scopes and creates a missing anchor only after both proofs pass. | **106 unlinked, not recovered.** Technical eligibility is not ownership or successful recovery. `unresolvedSourceUsers=0` means no structural classification conflict, NOT zero outstanding recoveries. QA ownership remains unverified. Original-source authentication plus verified target authentication is needed per person; do not link by email. Fresh source access is needed to refresh the population. |
| College workspace | Actual authenticated staging browser: text profile save, independent DB persisted-value check, multi-college selector. Ten real API checks pass: both scopes, lead access, missing-feature denial, expired entitlement denial. Synthetic fixtures only. | Complete production claim/review/assignment and populated admission-lead journeys remain unaccepted in this run. No real applicant or role was changed. |
| Profiles/files | Staging profile save persists. Browser file selection blocked by Chrome extension permission. Existing storage/API harness retained, with results recorded below when executed. | Enable **Allow access to file URLs** for the local browser extension to exercise native file selection. Historical five source-missing résumés remain exceptions, not fabricated files. Earlier 22 source-listed object checks are historical evidence, not a new snapshot. |
| Sessions/logout | Real staging Managed Auth sessions and same-origin sign-in are exercised by the harness. Browser sign-out returned HTTP 200 and the public root was requested. | Do not equate HTTP sign-out with a freshly observed full production login/logout/refresh journey. No owner production session was deliberately logged out. |
| Jobs, mentors, events, notifications, audit | Focused regressions and isolated HTTP harnesses; actual results appended below. Verified payment receipt now appends durable notification events, queues email under existing delivery policy, and records system verification audit in the settlement transaction. Existing dashboard trigger is reused, not duplicated. | All enabled production workflows, actual email delivery and real paid ticket/booking acceptance still require execution evidence. Queued email is not delivered email. |
| Backups/rollback | Preserved existing encrypted production backup and local restore evidence: `production-candidate-restore-20261022161345678.json`, SHA256 `0a675d9725005fbdd7f41c3505db85992572928ab422ecfbd5dc5e9b1cd5336e`, 100 tables / 2,198 rows. No schema migration or production data mutation in this batch. | This is previous verified evidence, not a newly rehearsed live Auth/storage/control-plane rollback. Never destroy the source or rollback assets based on this matrix. |
| Release | Safe application fixes and same-major Next security patch; final verification/deployment evidence appended below. | No migration-complete or source-retirement claim while the above critical gates remain. Production payments stay disabled. |

## Payment integration matrix

Status covers the **complete paid journey**, not merely the existence of code.
All five supported paid products are currently **IMPLEMENTED BUT UNVERIFIED** end to end: production disabled, hosted UAT cannot complete. Application-only assertions below are separately verified.

Common checkout route **C**: `POST /api/v1/neon-staging/payments/checkout`,
`app/api/v1/neon-staging/payments/checkout/route.ts` → `NeonCheckoutService.initiate`
in `src/lib/server/neon-checkout.ts`. Despite the historical path name it is also
the guarded Neon-production route. UAT cannot be selected in production.

Common return **R**: `GET/POST /api/v1/neon-staging/payments/esewa/return`,
`src/lib/server/neon-esewa-return.ts` → `NeonCheckoutService.verifyReturn`.
Compatibility `/api/v1/payments/esewa/callback` dispatches to the same Neon handler.
Canonical production success URL:
`https://www.merotalent.com/api/v1/neon-staging/payments/esewa/return`;
failure URL is the same route with server-generated `reference` and `state=failed`.
The state parameter alone cannot mark a payment failed or successful.
Merchant owner must confirm canonical domain/return requirements in the eSewa
merchant onboarding/portal; no registration is claimed without portal evidence.

| Product / status | Exact UI entry and frontend call | Authoritative pricing / backend source | Gateway, return and verification | Fulfillment / tests / missing dependency |
|---|---|---|---|---|
| Mentor session — IMPLEMENTED BUT UNVERIFIED | `src/components/mentors/BookingDialog.tsx`, **Continue to Pay** → `POST /api/v1/mentors/book` then C `{kind:'mentor_booking',targetId}` → `src/lib/payments/browser-checkout.ts` form POST | Owned pending booking + current `mentor_services.price/currency`; server compares booked price, validates active verified actor | UAT `https://rc-epay.esewa.com.np/api/epay/main/v2/form`; production `https://epay.esewa.com.np/api/epay/main/v2/form`; R, authoritative lookup described below | Locked booking → confirmed/success exactly once, payment updated after entity. Actual UAT pending booking/order, redirect and status API exercised. `neon-checkout-authorization`, `neon-esewa-e2e-verification`, return/provider contracts. Missing genuine provider COMPLETE and production merchant credentials. |
| Paid event/ticket — IMPLEMENTED BUT UNVERIFIED | `src/components/events/EventRegistrationModal.tsx`, **Continue to Pay** → `registerForEventApi` / `POST /api/v1/neon-staging/events/registrations`, then C `{kind:'event_registration',targetId}` → shared form submit | Owned pending registration; server current event/ticket-tier price × validated quantity, NPR | Same endpoints and R | Atomic registration confirmation plus one `event_tickets` row per attendee with unique ticket/QR identifiers. Actual pending registration/order and authoritative pending/expiry read; mock COMPLETE unit tests are not settlement. Missing genuine COMPLETE, actual paid ticket acceptance and production merchant configuration. |
| College claim/add paid access — IMPLEMENTED BUT UNVERIFIED | College claim/list creates `entity_scope_requests`; `src/screens/dashboard/Payments.tsx` **Continue to payment** uses C `{kind:'college_scope_request',targetId,packageId}` | Current active/public paid College package, exact requester/scope and review state; existing request/College UI preserved | Same endpoints and R | `src/lib/server/neon-college-scope-activation.ts`, verified payment plus approved scope; payment before approval cannot activate. Actual staging SQL with injected provider status tests activation, renewal, failure, cross-scope denial and duplicate receipts; transaction rolled back. No genuine provider settlement. |
| Module access enrollment — IMPLEMENTED BUT UNVERIFIED | `src/screens/RequestSubAdminAccess.tsx`, **Submit & Continue to Pay** / resume payment → proofs + `/api/v1/neon-staging/module-access`, then C `{kind:'module_access_request',targetId,packageId}` | Server package module coverage, proof/request ownership and reviewed exact entity scopes; no client price | Same endpoints and R | `src/lib/server/neon-module-access.ts` `activateVerifiedNeonModuleAccess`; only verified payment and approval activate. Existing scoped integration/regression tests, no real paid enrollment verified. |
| Assigned module renewal — IMPLEMENTED BUT UNVERIFIED | `src/screens/dashboard/Payments.tsx`, scope renewal → C `{kind:'assigned_scope',targetId,packageId,renewal:true}`; College request renewal uses preceding row with renewal flag | `src/lib/server/neon-assigned-scope-renewal.ts`, current paid plan and active assignment, permission/scope validation | Same endpoints and R | `activateVerifiedAssignedScope` / College renewal; server duration and expiry rules, one-time activation. Staging/authorization tests verify injected states, not genuine renewal payment. |
| Internal paid courses / jobs application fee — NOT IMPLEMENTED (not current supported paid products) | Courses navigate to external partner `learn.merotalent.com`; job applications have no fee checkout UI | Do not infer support from an old generic payment type union | Legacy generic checkout/webhook do not authorize Neon payments; browser-supplied generic payment creation/verification is rejected | No local eSewa course/job-fee fulfillment claimed. This row documents the boundary, not a newly removed feature. |

### Common security and recovery evidence

- Merchant provider configuration is read server-side, AES-256-GCM decrypted;
  UAT requires EPAYTEST and isolated staging database/Auth tuple. Production
  requires production configuration and the separate payment initiation gate.
- HMAC-SHA256/Base64 signs `total_amount,transaction_uuid,product_code` in that
  order. All eleven required fields, zero fees, unique UUID and exact gateway
  allowlist are checked. Browser redirect is an escaped DOM form, not a fake success.
- Current adapter uses the official **Epay** documentation's status endpoints:
  UAT `https://rc.esewa.com.np/api/epay/transaction/status/`, production
  `https://esewa.com.np/api/epay/transaction/status/`, with server-owned
  `product_code,total_amount,transaction_uuid`. The separately published
  **Epay-V2** page shows different status hosts; this inconsistency needs provider
  confirmation, not an unverified endpoint switch. Sources:
  [Epay](https://developer.esewa.com.np/pages/Epay),
  [Epay-V2](https://developer.esewa.com.np/pages/Epay-V2),
  [test credentials](https://developer.esewa.com.np/pages/Test-credentials).
- Strict response signature/field list, merchant, UUID, amount, currency and
  authoritative transaction reference checks; redirect code must match lookup.
  Callback does not require a browser login but can only settle a durable order.
  Original ownership is enforced when creating and recovering that order.
- Row lock plus one transaction guards state, fulfillment, receipts and audit.
  Already-terminal callbacks do not fulfill twice. Pending, provider timeouts,
  invalid signatures, replay/mismatched amount and forged assertions never grant.
  Late successful settlements after expiry are disputed/manual review, not access.
- New payer-owned `POST /api/v1/neon-staging/payments/[reference]/verify` reuses
  the same verifier with advisory lock, ownership of both ledgers, same-origin
  and session checks; no client body/status/amount accepted. **Check eSewa status**
  in payment history recovers a lost return without starting a new charge.
  Existing payment verification remains possible while new payments are paused.
  Recovery is explicit, not a claim of automatic provider reconciliation polling.
- Fixed valid decimal prices (e.g. NPR 1.10) rejected by binary-float equality.
  Fractional paisa remain denied. Fixed transport-provided empty POST streams.
- Actual 23 October UAT: EPAYTEST/NPR 10 form reaches official hosted login;
  page displays **“This site is exceeding reCAPTCHA Enterprise free quota”**,
  LOGIN disabled. No login, OTP, genuine COMPLETE, live charge or paid entitlement.
  The CAPTCHA belongs to eSewa's hosted page; no merchant reCAPTCHA integration
  can repair its quota. Provider must restore sandbox CAPTCHA/login (or provide
  an authorized functioning UAT environment), then repeat genuine settlement.

## Dependency security review

Fresh audit first found **11** findings, including newly disclosed critical Next
16.3.8 findings. Upgraded Next and eslint-config-next together to **16.4.2**,
same major, not a forced downgrade/upgrade. Critical count is now zero. Advisory
references: [SVG image RCE](https://github.com/advisories/GHSA-2464-fhr4-w9xw),
[cache RCE](https://github.com/advisories/GHSA-673q-mjm6-r5xr),
[Server Actions DoS](https://github.com/advisories/GHSA-p3m5-59mp-jv5r).
Next image handling exists; no claim that absence of one route made the old
runtime safe. Added a version-lock regression.

The remaining **10 audit package findings** below derive from two advisories;
they are not ten independently proven exploitable endpoints. No suppression.

| Package/version and path | Severity / reachability | Compatible fix assessment |
|---|---|---|
| `@next/eslint-plugin-next@16.4.2` ← eslint-config-next | High, lint glob path → fast-glob/micromatch/braces | No fixed braces 3 release; npm suggests incompatible config downgrade 14.2.35, not applied. |
| `eslint-config-next@16.4.2` direct dev dependency | High propagated, lint tooling | Keep aligned with Next16; incompatible downgrade not accepted. |
| `braces@3.0.3` ← micromatch/chokidar | High [nested-pattern stack exhaustion](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), CSS/lint pattern parsing | Latest 3.0.3 still affected; no compatible upstream patch available at review. |
| `chokidar@3.6.0` ← tailwindcss3 | High propagated, development file-watching | Tailwind4 dependency-chain replacement is major, requires stylesheet/build/visual acceptance. |
| `fast-glob@3.3.1` (Next lint) and `3.3.3` (Tailwind) | High propagated pattern parsing | Updating 3.x alone does not remove affected braces. |
| `micromatch@4.0.8` ← fast-glob/Tailwind | High propagated braces | No compatible released chain fix verified. |
| `@tailwindcss/typography@0.5.20` → parser6.0.10 | Moderate stylesheet selector processing | Latest typography still pins affected parser; forced downgrade not verified safe. |
| `postcss-nested@6.2.0` → parser6.1.4 | Moderate CSS build path | Latest 6.x still affected; major migration required for supported new dependency graph. |
| `postcss-selector-parser@6.0.10/6.1.4` (three installations) | Moderate [quadratic selector parsing](https://github.com/advisories/GHSA-rj75-hqrm-r3gf) | Patched 7.1.6 is outside consumers' 6.x constraints; unverified cross-major override not applied. |
| `tailwindcss@3.4.19` | High propagated CSS/glob chain | Latest3 still affected; npm suggests4.3.3, a real major stylesheet migration rather than a routine patch. |

Do not call all findings dev-only: `@neondatabase/auth@0.6.0-beta` installs
`@neondatabase/auth-ui` → better-auth-ui, whose peer dependency retains root
Tailwind3 in the production dependency graph. Application code imports the Auth
**server** entry, not Auth UI. Request-time CSS/glob execution has not been
demonstrated; install presence and runtime reachability are separate claims.
Final output trace measurements and verification results are appended below.

### Verification evidence for this revision

- Standard suite: **200 files / 1,007 tests passed**. Focused payment regressions
  include forged/mismatched signatures, replay/duplicate returns, provider
  failure/pending/timeout, own-payment recovery, fractional-paisa denial and valid
  decimal pricing. Diagnostic script tests: 2/2 passed.
- Isolated real College billing SQL test: 1/1 passed, all changes rolled back.
  Provider completion is deliberately injected; one audit and one queued receipt
  after duplicate callback are verified. This is not actual eSewa settlement.
- Full lint: **0 errors / 37 existing warnings**; changed-file lint passed.
  Typecheck passed. Remaining warnings are retained, not suppressed.
- Preliminary production output trace measurement: 128 route trace manifests;
  no file-path entries for Tailwind, braces, selector-parser, micromatch, Auth UI
  or legacy Auth SDK. This supports a build/install exposure classification, not
  a claim that audit findings vanish or arbitrary dynamic execution is impossible.
- HTTP acceptance failures are retained as failures: first Jobs run timed out
  after 15 passing checks; warm retry timed out after 45 passing checks, including
  actual job submission, private PDF bytes, recruiter scope denial and persisted
  screening transition. Mentor/event run reached 5 passing checks then a transient
  mentor-directory 500; independent query and subsequent request succeeded, but
  the whole run is not accepted. Private storage attempt stopped after 3 checks;
  its exact disposable identity cleanup passed. No production rows were changed.
- Browser native upload remains unexercised because file-URL extension permission
  is disabled. Browser control subsequently detached; no privileged production
  browser acceptance is inferred from staging/API results.
- Both owned browser-harness processes were stopped. College harness cleanup:
  PASS, two synthetic accounts, zero uploaded objects. eSewa harness removed its
  application fixtures but its supported Auth CLI cleanup timed out: its remaining
  disposable managed subject needs provenance-checked cleanup. Earlier Jobs runs'
  Auth subjects were not automatically removed by the old harness; the script now
  records exact created subjects and cleans only those via the supported API.
  Do not delete unmatched users to make staging counts match.

## Controlled live validation update (owner authorized)

- Fresh production browser reload after the owner's save: correct live merchant,
  Production selected, secret masked/decryptable; the prior decryption error is
  gone. Configuration/decryption is proved, merchant settlement is not.
- Added server-only `NEON_PRODUCTION_PAYMENT_VALIDATION_USER_ID`: one exact
  verified application actor can initiate a genuine live payment while public
  initiation stays paused. Invalid IDs deny everyone, including when the public
  flag is accidentally true. No wildcard, role exemption, price override or UAT
  in production. Each endpoint passes the authenticated actor, not a client ID.
  Normal active identity, ownership, product pricing and provider checks remain.
- Configured that variable for the existing dual-proof-linked owner (read-only
  identity/role lookup; no new grant), explicitly kept
  `NEON_PRODUCTION_PAYMENTS_ENABLED=false`. Requires the new deployment.
- Owner must enable/save the configured provider, choose an actual intended paid
  product and complete their own live wallet login/OTP/payment confirmation. No
  synthetic production product, invented settlement or unattended charge.
- New final suite: **201 files / 1,014 tests passed**, including seven controlled-
  live gate cases. Production-built isolated HTTP: **Jobs65/65**, **mentors/events
  60/60** passed, replacing the earlier incomplete runs as current acceptance
  evidence (failures above preserved). Real private byte downloads, registration,
  payment-pending state, notifications/SSE, mutation denial and logout exercised.
  A first private-storage retry was blocked during Managed Auth synthetic signup;
  cleanup passed, no assertion relaxed. Full private matrix retry recorded below.
- Final private-storage HTTP retry: **155/155 checks PASS**, cleanup PASS
  (five disposable accounts and six objects). Authorized uploads, exact signed
  bytes, anonymous/foreign scope denial, replacement and deletion verified
  against real isolated Managed Auth, Neon SQL and Object Storage.
- Final production build, typecheck, clean npm11.19.1 installation, full lint
  (0errors/37warnings), changed-file lint and diff checks PASS. Public payment
  flag remains false; no real charge has been initiated by the agent.

The earlier matrix's missing production credential is now **resolved for secure
storage/decryption**, not for provider acceptance. Its stored value is never
printed or returned. All five genuine paid fulfillment journeys remain unverified
until actual provider evidence exists. Release/CI identifiers are reported with
the deployed commit rather than embedding a self-referential Git hash here.

## Production activation requirements

For **every supported paid product, users cannot currently complete a production
eSewa checkout** while the public gate is disabled. The configured owner-only live
validation exception above is not public activation. A test-only fixture never
changes that answer. The owner must enter legitimate merchant credentials through
authenticated Provider Center (not chat), verify fresh decrypt/save/read status,
confirm merchant return-domain requirements and complete genuine server-verified
settlement/one-time fulfillment through the owner-authorized controlled live flow
(sandbox remains independently blocked), then authorize public activation. Production and
sandbox credentials/configurations must remain separate.

## 24 October — live navigation and recovery corrections

- Started from deployed/remote `e3b7d64`, canonical deployment
  `dpl_7RJVmBYqmC1DxzWefM5FvND1J9xd` READY; GitHub CI success independently read.
  Preserved the in-progress mentor profile-readiness fix and its regression tests.
- Browser-confirmed broken controls: public Post and navigation toggle had no
  handlers, Logout only navigated to login, global search had no default action;
  the event-pass route stayed loading without a legacy session. College dashboard
  submission also required a legacy session despite an authenticated Neon user.
- Fixed `SidebarNav.tsx` Post/access navigation, pinned keyboard toggle, hidden
  collapsed controls, actual sign-out/error recovery; `HeaderNav.tsx` global search
  now opens the Jobs directory and `JobsPage.tsx` applies its URL query.
- `dashboard/Colleges.tsx` uses the existing authenticated Neon admissions route,
  server-owned applicant/profile, saved-profile gate and activity invalidation.
  `MyTickets.tsx`/`events-client.ts` use same-origin session cookies in Neon, retain
  legacy bearer support, finish loading when signed out and expose a real retry.
  Event passes are linked from the dashboard sidebar.
- Jobs, Mentors, Competitions and Events directories now distinguish failed reads
  from legitimate empty results and offer a working Try again action through
  `DirectoryLoadError.tsx`. No automatic write/payment retries were added.
- Shared `role-workspaces-client.ts` bounds requests at 30 seconds, handles nested
  API errors and malformed responses, and warns that a timed-out write may have
  persisted: refresh/check saved state before retrying. No authorization weakening.
- `BookingDialog.tsx` shows saved-profile requirements for Neon users without a
  legacy session, rechecks readiness before advancement/submission and keeps saved
  contact fields read-only. Checkout unavailability no longer calls live eSewa a
  sandbox. Server payment, pricing and entitlement guards are unchanged.
- Browser read/navigation evidence: public Jobs/application review, Events,
  Competitions, Mentors, Colleges; student dashboard, College list, Jobs details
  and application entry, Competitions, Mentors, sessions and profile; Super Admin
  People, Jobs, Competitions, Mentors, Institutions, Applications, Bookings,
  Packages, Payments, Advertisements, Featured, Reports, Notifications, Support,
  Access requests, CMS and Settings. Route entry is not proof of every mutation.
  No production applications, new bookings or grants were created for this sweep.
- Six added regression files cover 21 cases: literal internal targets against the
  actual route tree, navigation/search/sign-out, four directory failure/retry paths,
  mentor saved-profile checks, College cookie-auth submit/denial, event-pass cookie
  auth/retry/logout, shared workspace error/timeout behavior.
- Final local evidence: **207 files / 1,035 tests PASS**, focused **21/21 PASS**,
  production-mode build PASS, typecheck PASS, lint **0 errors / 36 warnings**,
  diff check PASS. Initial concurrent typecheck/build encountered generated-type
  churn; the independent post-build typecheck passed. Inventory regenerated.
- Owner reports live payment works; authoritative evidence read for the two
  controlled NPR 10 attempts is still **failed payment / expired checkout / no
  paid timestamp**, not genuine COMPLETE settlement. No additional charge or
  payment activation was performed. The approved temporary service price was
  restored through authenticated UI to **NPR 0**, confirmed independently in SQL
  and the refreshed mentor workspace. Existing payment records were preserved.
- Source reconciliation, unresolved identity ownership and the prior full
  migration acceptance exceptions remain open; this is not migration completion.
