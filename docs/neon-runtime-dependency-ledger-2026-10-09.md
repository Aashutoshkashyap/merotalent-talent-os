# Neon runtime dependency ledger — 2026-10-09

Read-only source inventory for the accelerated migration. This is an inventory, **not** a claim that the paths have been migrated or tested on Neon. No production settings were changed. The working tree contained unrelated edits while this was prepared, so classifications describe the source as inspected, not a clean commit.

## Jobs staging update — 2026-10-09

The Jobs API rows below now have incremental Neon-staging branches for public discovery, student preferences, saved jobs, application submission, recruiter application review, and status updates. Their legacy branches still use Supabase. A real isolated-staging transaction suite passed 5/5, and authenticated localhost HTTP checks passed 29/29, including scoped recruiter review and private resume access. This does **not** migrate the active browser AuthContext, `src/lib/jobs/saved-jobs.ts`, student employment-profile UI, Jobs page data access, interview notification producer, or all application attachment workflows. The original direct-import inventory/count is retained as a baseline, not rewritten as a current count.

## Counting method and disposition

`rg -l 'from ["\x27].*(supabase|@supabase)|import\(["\x27].*(supabase|@supabase)' app src --glob '!**/*.test.*' --glob '!**/*.spec.*' | sort` finds **117 non-test files with direct imports**. This is a direct-import count, not a transitive-dependency or all-runtime-call count. The earlier 116-file scan used a different expression and is not comparable. Separate scans found **10 test files** with explicit Supabase references and **15 scripts** with Supabase references; these are excluded from 117. A call-pattern scan (`.channel`, `.rpc`, `.storage`) found 41 non-test files, overlapping the direct-import set. No direct-import file can be declared fully migrated merely because one adjacent API has a Neon staging branch.

Legend for the per-file rows below: **A** = Supabase Auth/session/token; **D** = Supabase PostgREST table/view/RPC; **S** = Supabase Storage; **R** = Supabase Realtime; **T** = Supabase type or shared error class only. Replacement targets: **NA** = verified Neon Managed Auth session plus explicit legacy-ID link (not email inference); **ND** = server-side parameterized Neon SQL and authorization/transaction boundary; **NS** = server-issued Neon Object Storage presigned URL + authorization; **NR** = a separately designed realtime/polling path; **NT** = provider-independent local types/errors. **Active** means reachable route or imported UI on current app; **partial** means a Neon staging branch or supporting implementation exists but Supabase remains on another path; **unresolved** means reachability or replacement must be proved; **experimental** means not a production replacement. The target column is an architectural destination, not an implemented substitute.

| File | Existing dependency | Target | Status / verification needed |
|---|---|---|---|
| `app/[[...slug]]/page.tsx` | D, server SEO/home CMS | ND | Active; Neon metadata/CMS visibility and public filters untested. |
| `app/api/cron/maintenance/route.ts` | D, maintenance RPCs | ND | Active; preserve cron authorization and SQL transactional behavior. |
| `app/api/v1/admin/access-matrix/route.ts` | D, privileged admin client | ND | Active; capability/entity security tests required. |
| `app/api/v1/admin/auth-users/[id]/route.ts` | A,D, Supabase Auth admin | NA,ND | Active; account mutation/invitation workflow unresolved. |
| `app/api/v1/admin/auth-users/route.ts` | A,D, Supabase Auth admin | NA,ND | Active; user listing/invitation workflow unresolved. |
| `app/api/v1/admin/providers/[kind]/route.ts` | T, shared configuration error | NT | Active; error class can move without changing provider encryption. |
| `app/api/v1/ai/byok/route.ts` | D, privileged admin client | ND | Active; secret and entity-scope tests required. |
| `app/api/v1/ai/generate/route.ts` | D, privileged admin client | ND | Active; entitlement tests required. |
| `app/api/v1/events/[id]/lifecycle/route.ts` | D, privileged admin client | ND | Active; event transition transaction tests required. |
| `app/api/v1/events/[id]/route.ts` | D, privileged admin client | ND | Active; ownership and publication tests required. |
| `app/api/v1/events/categories/route.ts` | D, privileged admin client | ND | Active; public/category response parity required. |
| `app/api/v1/events/my-tickets/route.ts` | D, privileged admin client | ND | Active; attendee isolation required. |
| `app/api/v1/events/route.ts` | D, privileged admin client | ND | Active; public/admin query parity required. |
| `app/api/v1/institutes/[id]/route.ts` | D, privileged admin client | ND | Active; entity, subscription, and RLS-equivalent checks required. |
| `app/api/v1/jobs/applications/route.ts` | D, privileged admin client | ND | Active; application privacy and state transition checks required. |
| `app/api/v1/jobs/matching/route.ts` | D, privileged admin client | ND | Active; user/job scope tests required. |
| `app/api/v1/jobs/preferences/route.ts` | D, privileged admin client | ND | Active; own-profile tests required. |
| `app/api/v1/jobs/saved/route.ts` | D, privileged admin client | ND | Active; own-list tests required. |
| `app/api/v1/media/download-url/route.ts` | D,S,T, privileged client and signed URL | ND,NS,NT | Partial storage library exists; route authorization and legacy branch remain. |
| `app/api/v1/media/upload-url/route.ts` | T plus storage backend switch | NS,NT | Partial/dirty file; inspect staged-vs-uncommitted switch before use. |
| `app/api/v1/mentors/bookings/route.ts` | D, privileged admin client | ND | Active; booking/payment atomicity and scope tests required. |
| `app/api/v1/payments/checkout/route.ts` | D, privileged admin client | ND | Active; never activate on checkout alone. |
| `app/api/v1/payments/overview/route.ts` | D, privileged admin client | ND | Active; payer/owner scope tests required. |
| `app/api/v1/payments/webhook/route.ts` | D, privileged admin client | ND | Active; signature, replay, exact amount, transaction tests required. |
| `app/api/v1/submissions/[module]/route.ts` | D,T, privileged admin client | ND,NT | Active; module/entity entitlement tests required. |
| `src/components/landing/ActiveAdvertisements.tsx` | D | ND | Active; public advertisement filters/order parity. |
| `src/components/landing/ContactForm.tsx` | D | ND | Active; form should call validated server endpoint. |
| `src/components/landing/CourseCatalogue.tsx` | D | ND | Active; preserve direct partner redirect. |
| `src/components/landing/FeaturedSection.tsx` | D | ND | Active; featured ordering/visibility parity. |
| `src/components/media/SignedMediaUploader.tsx` | A,S | NA,NS | Active; browser upload remains Supabase storage/token based. |
| `src/components/mentors/BookingDialog.tsx` | D/A via client | ND,NA | Active; inspect direct calls and payment handoff. |
| `src/components/messaging/MentorMessaging.tsx` | D,S,R | ND,NS,NR | Active; messages, private attachments, subscriptions all remain. |
| `src/components/owner/CollegeClaimSearch.tsx` | D | ND | Active; claim search/duplicate ownership tests. |
| `src/components/owner/EntityAIControls.tsx` | A | NA | Active; token acquisition must use new session path. |
| `src/components/owner/InstituteProfileEditor.tsx` | A,D/S | NA,ND,NS | Active; profile/media path and entity scope. |
| `src/components/owner/OwnerStatusActions.tsx` | D | ND | Active; ownership status actions. |
| `src/components/owner/RoleOwnerManagement.tsx` | D | ND | Active; role-owner assignment scope. |
| `src/contexts/AuthContext.tsx` | A,D | NA,ND | Active central blocker: signup/login/OAuth/logout/session/profile hydration. |
| `src/hooks/useNotifications.ts` | D,R | ND,NR | Active; notification subscription/mark-read path. |
| `src/hooks/useSiteCMS.ts` | D | ND | Active; CMS read and visibility parity. |
| `src/hooks/useStudentActivity.ts` | D | ND | Active; own activity aggregation. |
| `src/integrations/supabase/client.ts` | A,D,S,R client factory | NA,ND,NS,NR | Active root SDK factory; remove only after consumers migrated. |
| `src/lib/admin/admin-auth-user-route-utils.ts` | T | NT | Active helper; shared error type only. |
| `src/lib/admin/admin-auth-user-service.ts` | A,D,T | NA,ND,NT | Active; typed Supabase admin service. |
| `src/lib/admin/admin-auth-users.ts` | T | NT | Active; Supabase User type. |
| `src/lib/admin/admin-client.ts` | A | NA | Active common API token transport. |
| `src/lib/admin/profile-hydration.ts` | D | ND | Active profile hydration. |
| `src/lib/ai/ai-generator.ts` | A | NA | Active AI API token transport. |
| `src/lib/institutes/public-institutes.ts` | D,S,T | ND,NS,NT | Active directory and public media URL. |
| `src/lib/jobs/saved-jobs.ts` | D | ND | Active saved-job client path. |
| `src/lib/server/application-storage.ts` | S,D | NS,ND | Active application attachment authorization/download. |
| `src/lib/server/auth.ts` | A,D,T | NA,ND,NT | Active central API Auth boundary; do not equate experimental shim with migration. |
| `src/lib/server/email-queue.ts` | D | ND | Active queue persistence; file is untracked/dirty. |
| `src/lib/server/esewa-settlement.ts` | D | ND | Active payment settlement; file is dirty. |
| `src/lib/server/events-service.ts` | D | ND | Active service; untracked. |
| `src/lib/server/guest-college-verification.ts` | D,T | ND,NT | Active guest verification persistence. |
| `src/lib/server/jobs-service.ts` | D | ND | Active service; untracked. |
| `src/lib/server/media-authorization.ts` | D,T | ND,NT | Active RPC-based media authorization. |
| `src/lib/server/mentorship-service.ts` | D | ND | Active service; untracked. |
| `src/lib/server/neon-auth-experiment.ts` | T, old compatibility design | NA,NT | Experimental/untracked; not proof of integrated Managed Auth. |
| `src/lib/server/provider-config-service.ts` | D | ND | Active encrypted provider configuration persistence. |
| `src/lib/server/secret-store.ts` | T | NT | Active Neon-neutral crypto/storage helper; import is error class only. |
| `src/lib/server/storage.ts` | T | NS,NT | Partial: Neon S3 implementation exists; Supabase import is error class only. |
| `src/lib/server/supabase.ts` | A,D,S root server SDK factory | NA,ND,NS | Active legacy root; retain until every caller moved. |
| `src/screens/ComingSoonPage.tsx` | D | ND or remove | Active at `/competitions`; other module keys appear unused here. |
| `src/screens/Index.tsx` | D | ND | Active homepage. |
| `src/screens/Onboarding.tsx` | A,D,S | NA,ND,NS | Active onboarding/profile image path. |
| `src/screens/RequestSubAdminAccess.tsx` | A,D,S | NA,ND,NS | Active access request/proof upload/payment flow. |
| `src/screens/ResetPassword.tsx` | A | NA | Active reset/OTP/update/signout flow; migration-specific user action likely. |
| `src/screens/admin/AdminAccessMatrix.tsx` | D | ND | Active direct role writes; needs server authorization boundary. |
| `src/screens/admin/AdminAccessRequests.tsx` | D | ND | Active request/claim workflow. |
| `src/screens/admin/AdminApplications.tsx` | D | ND | Active private college applications. |
| `src/screens/admin/AdminBookings.tsx` | D | ND | Active bookings. |
| `src/screens/admin/AdminCompanies.tsx` | D | ND | Active direct company CRUD; server scope required. |
| `src/screens/admin/AdminCompetitions.tsx` | D | ND | Active direct competition CRUD. |
| `src/screens/admin/AdminDashboard.tsx` | D | ND | Active dashboard aggregation. |
| `src/screens/admin/AdminEvents.tsx` | D import, API helper use | ND or remove import | Active screen; verify whether imported SDK value is still referenced. |
| `src/screens/admin/AdminFeaturedItems.tsx` | D | ND | Active direct featured records. |
| `src/screens/admin/AdminInstitutions.tsx` | D,T | ND,NT | Active direct institution CRUD/priority. |
| `src/screens/admin/AdminJobs.tsx` | D | ND | Active jobs admin. |
| `src/screens/admin/AdminLeads.tsx` | D | ND | Active private leads. |
| `src/screens/admin/AdminManagement.tsx` | D | ND | Active admin management. |
| `src/screens/admin/AdminMentors.tsx` | D | ND | Active mentors admin. |
| `src/screens/admin/AdminNotifications.tsx` | D,T | ND,NT | Active notification management. |
| `src/screens/admin/AdminPackages.tsx` | D | ND | Active package management. |
| `src/screens/admin/AdminPageEditor.tsx` | D | ND | Active CMS editor. |
| `src/screens/admin/AdminPayments.tsx` | D,S | ND,NS | Active payments/manual proof media. |
| `src/screens/admin/AdminQueries.tsx` | D,T | ND,NT | Active contact query management. |
| `src/screens/admin/AdminReports.tsx` | A,D | NA,ND | Active reporting token/API. |
| `src/screens/admin/AdminRoleManagement.tsx` | D | ND | Active direct trial settings and roles. |
| `src/screens/admin/AdminSettings.tsx` | A,D | NA,ND | Active provider/status and settings path. |
| `src/screens/admin/AdminSubscriptions.tsx` | D | ND | Active subscription management. |
| `src/screens/admin/AdminUsers.tsx` | A,D | NA,ND | Active auth-user actions/reset/invite. |
| `src/screens/admin/ProviderConfigurationPanel.tsx` | A | NA | Active provider API token transport. |
| `src/screens/auth/OAuthCallback.tsx` | A | NA | Active OAuth callback and session handoff. |
| `src/screens/competitions/CompetitionsPage.tsx` | D | ND | Active public competitions. |
| `src/screens/courses/CourseDetailPage.tsx` | D | ND | Active route; check whether it intercepts direct redirect. |
| `src/screens/courses/CoursesPage.tsx` | D | ND | Active course directory. |
| `src/screens/dashboard/Colleges.tsx` | D | ND | Active student college application status. |
| `src/screens/dashboard/Competitions.tsx` | D | ND | Active event/competition registrations. |
| `src/screens/dashboard/Jobs.tsx` | D | ND | Active student job pipeline; file is dirty. |
| `src/screens/dashboard/Mentors.tsx` | D | ND | Active student mentor data. |
| `src/screens/dashboard/Payments.tsx` | A,D,S | NA,ND,NS | Active student transactions and proof upload. |
| `src/screens/dashboard/Profile.tsx` | D,S | ND,NS | Active own profile and avatar. |
| `src/screens/dashboard/Settings.tsx` | A,D | NA,ND | Active password/account settings. |
| `src/screens/institute/InstituteBlogs.tsx` | D | ND | Active institute-admin blogs. |
| `src/screens/institute/InstituteDashboard.tsx` | D | ND | Active institute workspace. |
| `src/screens/institute/InstituteNotices.tsx` | D | ND | Active direct notice CRUD. |
| `src/screens/institutes/InstituteBlogDetailPage.tsx` | D | ND | Active public blog detail. |
| `src/screens/institutes/InstituteBlogsPage.tsx` | D | ND | Active public blog list. |
| `src/screens/institutes/InstituteDetailPage.tsx` | D | ND | Active public college detail/application. |
| `src/screens/jobs/JobDetailPage.tsx` | D | ND | Active job detail/application. |
| `src/screens/jobs/JobsPage.tsx` | D | ND | Active public jobs. |
| `src/screens/mentorship/MentorDetailPage.tsx` | D | ND | Active mentor detail/booking. |
| `src/screens/mentorship/MentorshipPage.tsx` | D | ND | Active mentor directory. |
| `src/screens/role/ModuleAIWorkspace.tsx` | D | ND | Active module-admin AI. |
| `src/screens/role/RoleWorkspace.tsx` | D | ND | Active role/module workspace; file is dirty. |

## Already-migrated, migration-only, and test-only boundaries

- **Already migrated, narrowly:** `app/api/v1/neon-staging/profile/route.ts`, `src/lib/server/neon-session.ts`, `src/lib/server/neon-authorization.ts`, and `src/lib/server/db.ts` form the verified *staging-only* own-profile identity/authorization slice. `src/lib/server/storage.ts` provides Neon S3 functions but its consumers have not all switched. This is not end-to-end module migration.
- **Migration-only:** `scripts/audit-neon-staging-objects.mjs`, `scripts/check-schema-drift.mjs`, `scripts/execute-real-migration.mjs`, `scripts/ingest-edusanjal-bulk.mjs`, `scripts/migrate-storage-to-neon.mjs`, `scripts/migrate-supabase-to-neon-staging.mjs`, `scripts/migration-preflight.mjs`, `scripts/neon-identity-reconciliation-dry-run.mjs`, `scripts/neon-staging-preflight.mjs`, `scripts/reconcile-neon-staging-storage.mjs`, `scripts/reconcile-neon-staging-views.mjs`, `scripts/reconcile-neon-staging.mjs`, `scripts/resume-neon-staging-schema.mjs`, `scripts/seed-esewa-test-credentials.mjs`, `scripts/seed-test-users.mjs`. Some are import/seed tooling rather than app runtime and must not be counted as production runtime dependencies. Several are untracked/dirty; do not run destructive migration scripts to validate this ledger.
- **Test-only:** 10 explicit-reference test files were counted but not catalogued as runtime. They may intentionally retain Supabase mocks to verify legacy behavior; revisit after endpoint migration, not as evidence that production still invokes Supabase.
- **Dead code:** none proven by this import scan. `ComingSoonPage` is still routed for competitions, so it must not be dismissed as dead. `src/lib/server/neon-auth-experiment.ts` is an experiment, not production-reachable proof. Reachability of an unused import in `AdminEvents` remains unresolved.

## Cross-cutting blockers and next verification order

The 2026-10-09 Jobs continuation adds staging-only same-origin browser auth, own employment-profile edits, Jobs reads/writes, private PDF resume lifecycle, and exact-scope recruiter review/document access. These are **partial slices**, not a reduction of the entire Supabase runtime dependency inventory: legacy production mode and many other clients still use Supabase. The authenticated 47-check HTTP run and remaining gaps are recorded in [the runtime sprint status](neon-runtime-sprint-status-2026-10-09.md).

1. Auth context, callback/reset, admin user management, and browser API token acquisition must be replaced as one coherent Managed Auth migration. A valid staging session does not link the 103 source users automatically.
2. Move direct browser table mutations behind server endpoints. Recreating `supabase.from()` as a generic privileged Neon query would remove RLS protections.
3. Preserve server-side entity/capability/subscription checks and atomic transactions on claims, applications, bookings, payments, and module assignments.
4. Move upload/download consumers to scoped Neon Object Storage URLs, including browser transfer and cleanup. The S3 helper existing is not consumer parity.
5. Replace Realtime independently for `MentorMessaging` and notifications. No claim of realtime parity is supported yet.
6. For each migrated path, record a focused staging test and authenticated HTTP UAT evidence in this ledger before changing its status to verified.

## Mentors and Events staging boundary — 2026-10-09

The staging mode now routes public Mentor/Event directories and details, student Mentor booking, student Event registration, free digital-ticket reads, and scoped Event ticket check-in through Neon repositories and same-origin APIs. `src/components/mentors/BookingDialog.tsx`, `src/components/events/EventRegistrationModal.tsx`, `src/screens/events/EventsPage.tsx`, and `src/screens/events/EventDetailPage.tsx` have staging branches; their legacy Supabase branches remain for production. Authenticated local HTTP evidence is 25/25 and isolated Neon integration evidence is 12/12; these do not verify the entire admin/browser journey.

`src/lib/server/neon-mentors.ts` enforces published-service pricing and availability; `src/lib/server/neon-events.ts` enforces ticket-tier price/capacity and pending paid state. `app/api/v1/neon-staging/payments/route.ts` now rejects browser-asserted success. `src/lib/server/neon-payments.ts` cannot activate a callback without a trusted provider result. This is a fail-closed payment boundary, not eSewa completion. `scripts/sql/neon-staging-events-ticketing.sql` adds ticketing parity to the guarded migration-staging branch only.

Remaining direct Supabase dependencies include Mentor/Event administration screens, creation/editing, private media/proof uploads, notification/message browser consumers, and production Auth. The files listed in the main inventory are therefore **not** reclassified as migrated wholesale. Provider-verified paid activation, organizer workflows, signed-in graphical UAT, and identity migration remain next dependencies before cutover consideration.

## Payments and private proof staging boundary — 2026-10-10

`src/lib/server/neon-checkout.ts` and `app/api/v1/neon-staging/payments/checkout/route.ts` own the isolated staging payment intent. They derive the payable amount from persisted Mentor service or Event tier, require the same linked owner, and write pending `payments`/`payment_checkout_sessions` rows before returning eSewa UAT checkout fields. `app/api/v1/neon-staging/payments/esewa/return/route.ts` never treats the browser return as success: it verifies signed data when present, calls the provider status endpoint, and performs guarded, transactional fulfillment. `src/lib/server/payment-provider.ts` has opt-in strict status interpretation for this staging path; legacy production interpretation/callback remains unchanged. No staging sandbox merchant credentials are currently available, so live provider verification is **blocked**, not complete.

`app/api/v1/neon-staging/payments/proofs/route.ts`, `src/lib/server/application-storage.ts`, and `src/lib/server/media-policy.ts` now cover private payment-proof upload, metadata persistence, scoped download, and Super Admin review. Authenticated staging HTTP checked an actual Neon S3 PDF upload/read and removed the fixture. Acceptance of a proof is not payment confirmation. Private Event attachment metadata/route, browser admin proof review, and full public-media parity remain unimplemented. Existing Jobs resume and application-document paths are not replaced by this proof route. Direct Supabase imports elsewhere in the inventory remain active in production; this is a narrow staging slice, not a completed payment/storage migration.

## Notifications and Messaging staging browser boundary — 2026-10-10

The current direct-import count is **114 non-test files**, down from this ledger's 117-file historical baseline due to earlier incremental sprints, not because legacy imports were removed in the present changes. Path categories: 37 app routes/page, 41 screens, 22 libraries, 9 components, 3 hooks, 1 context, 1 Supabase integration factory. These mutually exclusive path counts total 114; the functional dependency categories below overlap.

| Functional category | Remaining examples and disposition |
|---|---|
| Auth/account mapping | `src/contexts/AuthContext.tsx`, `src/screens/auth/OAuthCallback.tsx`, `src/screens/ResetPassword.tsx`, Super Admin Auth-user routes; current Managed Auth linking of existing production identities remains unresolved. |
| Privileged and ordinary database operations | `src/screens/admin/*`, institute/role screens, CMS and public records, `app/api/v1/admin/*`; each mutation still needs exact server scope and transaction parity. |
| Storage/media | `src/components/media/SignedMediaUploader.tsx`, `src/lib/server/media-authorization.ts`, profile/avatar and Event/chat attachments; private proof and resume are only narrow staging slices. |
| Realtime/browser clients | `src/hooks/useNotifications.ts` and `src/components/messaging/MentorMessaging.tsx` now have Neon/SSE staging branches but retain Supabase imports for production; other notification producers/admin screens remain legacy. |
| Provider/payment | Production eSewa configuration and settlement remain legacy; the isolated staging checkout boundary has no sandbox credentials yet. |

The staging own-notifications endpoint now supports an owned cursor, mark-one/all-read and mark-one-unread. `useNotifications` has no fallback from a failed staging API to Supabase, and consumes durable recipient SSE events with snapshot refresh. The staging Messaging route/repository provides participant-scoped conversation/history/send/read APIs, 50-message cursor pages and durable message SSE consumption in `MentorMessaging`. Staging rejects arbitrary attachment paths and disables the old Supabase chat upload control until a private Neon attachment route exists. `next.config.ts` synchronizes the public browser mode with the explicit server mode; it does not remove production's legacy path. Authenticated staging HTTP evidence: 50/50 synthetic checks, including notification and message SSE; transaction integration: 13/13. No signed-in graphical browser UAT was completed. Continue migration in coherent admin/Auth/storage groups rather than deleting Supabase dependencies by import count alone.

## Private chat attachments and own-profile avatar — 2026-10-10

| Dependency | Staging disposition | Production disposition | Evidence |
|---|---|---|---|
| `src/components/messaging/MentorMessaging.tsx` Supabase chat upload and signed read | Replaced in staging by `/api/v1/neon-staging/messaging/attachments` upload and message-ID download, participant-scoped Neon message metadata, generated `chat-attachments` key, real private object storage, 60-second signed URL, upload progress/error state | Existing Supabase branch retained | Synthetic authenticated HTTP and actual S3 object download passed; unit access/failure tests passed; graphical UAT remains unverified |
| `src/screens/dashboard/Profile.tsx` direct Supabase avatar upload | Replaced in staging by `/api/v1/neon-staging/profile/avatar`, linked-profile transaction, canonical `profile-media` path, signed read through staging profile GET | Existing Supabase branch retained; its historical `avatars` bucket mismatch was not changed in production | Synthetic authenticated HTTP and actual S3 upload passed; unit normal/denied/error tests passed; graphical UAT remains unverified |
| `src/lib/server/application-storage.ts` chat authorization | Conversation membership and persisted-message path binding added before signed private read; generated key and size/type checks before write | Generic legacy media signing routes explicitly reject chat attachments; legacy chat storage behavior otherwise unchanged | Cross-conversation and raw-key HTTP denial; unit cleanup test |

The own-profile avatar is the selected next coherent user-facing storage dependency group: profile data GET/PATCH was already staged, but the photo control still wrote to Supabase. This sprint completes that *own-profile photo* browser-to-storage path only; it does not migrate public avatars for every listing, admin media controls, or the remaining profile-dependent Supabase consumers. The scan remains **114 non-test direct-import files** (37 app, 41 screens, 22 lib, 9 components, 3 hooks, 1 context, 1 integration factory), because both browser components intentionally keep legacy imports. Test/tooling imports are excluded. The old private chat gap is now closed for the staging participant UI, but conversation creation, admin navigation, browser-visual proof, and production identity migration are still open. Next actionable groups are private Event attachments and scoped admin/media workflows; do not infer broad storage parity from these slices.

## Job-application supporting media + identity bridge — 2026-10-11

The next bounded media/admin group is the **job applicant supporting-document handoff to recruiter review**. The staging wizard can upload optional experience/training PDFs through `/api/v1/neon-staging/jobs/documents`; the existing application submission transaction checks exact applicant/job canonical object paths and object existence before persisting the paths in the application snapshot. The reviewer sees the exact submitted documents and obtains a short-lived `job-files` URL only through `/api/v1/jobs/applications/[id]/documents`, after current Jobs capability, exact entity assignment, active entitlement, and application feature checks. A normal user may upload/delete only their own generated key; already-submitted objects cannot be deleted via the draft cleanup endpoint. The private bucket remains private. Legacy production upload/download branches were retained. This does **not** migrate the Job admin listing editor or all applicant media, nor does it establish browser UAT.

The staging-only dual-session identity-link endpoint is an application-level bridge, not a Managed Auth import or a new production authentication architecture. It adds no Supabase direct import to the browser and never maps by email. See the identity reconciliation document for proof, dry-run, conflict, retry, and recovery boundaries.

Fresh direct-import scan: **114 non-test `app`/`src` files** still import Supabase; this work does not reduce the count because legacy branches are intentionally preserved. Separately, **9 `src/test` files** and **19 `scripts` files** contain a Supabase reference, and **62 non-test `app`/`src` files** match the broader `getAdminClient|supabase.from|supabase.storage|supabase.rpc` call scan (overlapping categories, not additive counts). The 117-file figure above is a historical inventory. Neither a lower import count nor a local build proves staging runtime parity.
