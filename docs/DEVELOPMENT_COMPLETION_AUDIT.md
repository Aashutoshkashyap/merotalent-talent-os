# MeroTalent development completion audit

Audit date: 2026-08-12  
Baseline: the repository and local configuration in this checkout  
Legend: **Implemented**, **Partial**, **Not implemented**, **External decision**, **Unverified production**

This is an evidence ledger, not a claim that the full proposal is complete. A phase is marked implemented only when the repository contains the workflow and its relevant automated or local verification. Production-only facts remain unverified until the target Supabase migrations, secrets, seed, cron, and deployed role flows are checked against the live project.

| Phase | Status | Repository evidence | Remaining acceptance work |
| --- | --- | --- | --- |
| 0. Scope freeze | **External decision** | Product modules and roles are represented in routes, RBAC migrations, and the README. | MeroTalent must approve the final requirements, package rules, pricing limits, ranking formula, commission, payment gateway, SMTP provider, brand assets, domains, focal person, and UAT process. |
| 1. Architecture | **Partial** | Responsive public app and role workspaces; versioned APIs; Supabase relational schema, RLS, Storage authorization, notification records, audit logs, and Vercel maintenance route. | No documented/tested off-site backup or restore plan; payment and outbound-email providers are not integrated. |
| 2. Authentication and RBAC | **Implemented locally** | Supabase registration/login/logout/reset flows; protected routes; primary roles; delegated permission RPCs; active-account and entitlement checks in RLS. | Email-verification policy remains a business choice. Repeat the full role matrix on the deployed app after migration. |
| 3. Database architecture | **Implemented locally** | Core modular migration plus indexes, timestamps, ownership relations, lead relations, soft-delete fields, package features, generated forms, and the free-tier migration. | Apply the newest migration to the target project and run database-native validation there. |
| 4. Super Admin | **Partial** | Live-count dashboard; CRUD screens for core modules; approval, packages, subscriptions, leads, ads, featured items, reports, users, roles, delegated access, and audit-backed free-tier grant/revoke. | Some platform-setting controls are presentation-only; ranking automation and end-to-end report export acceptance need production checks. |
| 5. College | **Partial** | Public directory/detail, owner dashboard, profile/media schema, applications, dynamic form, leads, subscriptions, expiry enforcement, and notifications. | No payment gateway; owner response and student tracking need complete UI/E2E verification. Apply Now correctly remains server-gated rather than being trusted to UI state. |
| 6. Mentor | **Partial** | Profiles, services, availability fields, bookings, collision protection, pricing/commission columns, leads, owner workspace, free-trial rules, and notifications. | Public mentor discovery still has mock/fallback behavior; payout/gateway flow and exclusive-agreement workflow are incomplete. |
| 7. Partnered courses | **Partial / architecture mismatch** | Partner metadata, allowlisted `learn.merotalent.com` redirect validation, referral records, and Admin course listing fields exist. | Legacy LMS enrollment, lessons, quizzes, checkout, and learning routes are still present and must be retired/reworked before this phase meets the explicit redirect-only rule. |
| 8. Jobs | **Partial** | Owner schema/workspace, Admin approval state machine, expiry maintenance, applications, dynamic form, leads, and dashboard/email-queue notifications. | Public/student job surfaces still contain mock/static behavior; outbound email delivery and full status tracking are not accepted end to end. |
| 9. Events | **Partial** | Multi-role organizer schema, Admin approval, free/paid states, registration storage, capacity checks, leads, owner workspace, and maintenance. | Gateway/manual-payment operations and complete public registration UX require finishing and E2E tests. |
| 10. Payments | **Partial** | Central payment records, states, gateway/reference fields, uniqueness protections, server-owned amounts, and Admin audit view. | No selected gateway, signed callback/webhook, refund/cancel workflow, or verified duplicate-callback E2E test. |
| 11. Subscription and lead control | **Implemented locally** | Central package/subscription functions, RLS feature checks, ownership isolation, expiry maintenance, free-tier packages by module, Super Admin package controls, and audited grant/revoke RPCs. | Apply and verify the free-tier migration in the target database. Confirm the business policy for read-only versus hidden expired leads. |
| 12. Notifications | **Partial** | Central dashboard/email notification rows, read fields, event triggers, and Admin notification screen. | No SMTP/transactional-email sender consumes queued email rows. |
| 13. Featured and advertisements | **Implemented locally** | Generic featured and advertisement entities, Admin CRUD, priority/date/status fields, and maintenance expiry. | Verify all approved public placements with live seeded records. |
| 14. Student dashboard | **Partial** | Profile, applications/bookings/registrations/payment schema and protected dashboard shell exist. | Several student pages remain static and are not yet complete live tracking surfaces. |
| 15. Public website | **Partial** | Homepage and public college/course/job/event/mentor routes, directory search/filter, college detail and responsive layouts. | Courses, jobs, and mentor surfaces still rely partly or wholly on mock content; route-complete live-data acceptance is outstanding. |
| 16. Backend/API | **Partial** | Versioned forms, submissions, media, Admin CRUD/auth/report APIs; consistent envelopes; auth, validation, pagination/filter/sort and error helpers. | No payment callback API, outbound email worker, or proven distributed rate limiter. Some modules use Supabase directly rather than a complete versioned API facade. |
| 17. Security | **Implemented locally, production unverified** | RLS/RBAC, server auth, upload authorization/type/size/path checks, guarded approval/payment fields, audit logging, cron auth, secret-only server clients, and tests. Browser-stored AI keys were removed. | Rotate all secrets previously disclosed in chat; apply migrations; run deployed unauthorized/cross-tenant tests and an independent security review. CSRF is not applicable to bearer-token APIs but must be revisited if cookie-authenticated mutations are added. |
| 18. Media | **Implemented locally** | Signed upload/download APIs, canonical object paths, module bucket mapping, ownership authorization, size/type validation, replacement UI, and malformed signed-destination rejection tests. | Verify every bucket and role against live Storage policies; backup is separate and unimplemented. |
| 19. Audit logs | **Implemented locally** | Generic row-change auditing plus explicit Auth, approval, delegated-access, and free-tier audit records. | Verify retention, export, and live records after migration/UAT. |
| 20. Backup and deployment | **Partial / unverified production** | Local/dev configuration, migration files, Vercel project metadata, SSL-capable hosting, and authenticated daily cron route. | Database/file backup, off-site copy, retention and restore drills are not implemented. Target project access, production secrets, cron registration, and final deployment still require live verification. |
| 21. Integration testing | **Partial** | Unit/contract tests cover auth, Admin APIs, media, generated-form validation, RLS SQL contracts, cron auth, RBAC, and free tiers. | No complete browser E2E suite for college, mentor, course redirect, jobs, events, payments, and email delivery. |
| 22. Role/permission testing | **Partial** | Guard components, SQL policies, contract tests, and secure five-role seed script exist. | Re-seed with a rotated server key and verify each role through the deployed UI, including cross-organization, suspended, deleted, and expired-account cases. |

## Changes included in this pass

- Added centrally configured free packages for Student, College, Mentor, Jobs, Events, and Partnered Courses. Default free packages are internal, role/entity validated, time-bounded, and auditable.
- Added Super Admin package controls for package kind, module scope, default status, duration, public visibility, lead mode, and feature flags.
- Added explicit Super Admin free-tier grant and revoke operations backed by security-definer RPCs; no privileged primary role is created.
- Replaced direct delegated-access table/role mutations with identity-derived request and Admin-decision RPCs.
- Prevented self-verification changes and corrected public package/settings policy exposure in the migration.
- Removed duplicated Admin navigation responsibilities, shortened labels, and separated primary roles from delegated access.
- Removed fake Admin dashboard padding and connected Company, Mentor, and College workspaces to owned live records.
- Hardened signed media upload destination validation.
- Disabled browser storage and direct browser transmission of third-party AI secrets.
- Extended the secure seed workflow to populate private, idempotent College Application, Job Application, Mentor Booking, and Event Registration activity for owner and Super Admin dashboards.

## Release gates

The product must not be labelled development-complete or UAT-ready until all of these are true:

1. Rotate the previously disclosed Supabase privileged/JWT keys and store the replacements only in local/Vercel secret managers.
2. Grant this environment access to the target Supabase project, apply all pending migrations, and run the guarded seed without printing passwords.
3. Configure and verify a payment gateway callback and transactional-email worker, or formally remove those promises from the frozen scope.
4. Retire the legacy LMS delivery/quiz/checkout routes and make Partnered Courses a live redirect-only directory.
5. Replace remaining public/student mock surfaces with live data and finish tracking/status UX.
6. Implement and restore-test database and file backups, including an off-site copy and retention policy.
7. Run browser E2E tests for all four primary roles and each cross-tenant/expired/suspended denial case on staging.
8. Verify Vercel production environment variables, cron registration/execution, Git commit, deployed route behavior, and role-visible seed records.

Until those gates pass, the honest release state is **feature-hardening complete for this pass; full checklist and UAT readiness remain partial**.
