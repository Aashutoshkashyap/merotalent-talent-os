# Neon runtime dependency ledger — 2026-10-09

Read-only source inventory for the accelerated migration. This is an inventory, **not** a claim that the paths have been migrated or tested on Neon. No production settings were changed. The working tree contained unrelated edits while this was prepared, so classifications describe the source as inspected, not a clean commit.

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

1. Auth context, callback/reset, admin user management, and browser API token acquisition must be replaced as one coherent Managed Auth migration. A valid staging session does not link the 103 source users automatically.
2. Move direct browser table mutations behind server endpoints. Recreating `supabase.from()` as a generic privileged Neon query would remove RLS protections.
3. Preserve server-side entity/capability/subscription checks and atomic transactions on claims, applications, bookings, payments, and module assignments.
4. Move upload/download consumers to scoped Neon Object Storage URLs, including browser transfer and cleanup. The S3 helper existing is not consumer parity.
5. Replace Realtime independently for `MentorMessaging` and notifications. No claim of realtime parity is supported yet.
6. For each migrated path, record a focused staging test and authenticated HTTP UAT evidence in this ledger before changing its status to verified.
