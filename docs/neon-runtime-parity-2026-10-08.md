# Neon staging runtime parity and RPC disposition

This is an incremental implementation record, not production cutover approval. Legacy Supabase remains the default. No production identities were imported. `VerifiedApplicationIdentity` in policy tests is a **test fixture**, not a verified Managed Auth session; no private Neon HTTP route is enabled yet.

## Implemented operation/RLS matrix

| Operation | Supabase source policy/contract | Neon staging target and server check | Evidence/status |
| --- | --- | --- | --- |
| Public institute read | Approved, non-deleted directory record | `NeonRepositories.getPublicInstitute`: selected public fields, `status='approved'`, `deleted_at IS NULL`; `/api/v1/institutes/[id]` branches on backend mode | Real staging SQL and HTTP 200/404/400; implemented |
| Own profile read | Owner or platform admin profile policy | `getProfile`: `requireOwnUserOrAdmin`, UUID parameter | Real staging own/other denial; staging service only |
| Own profile update | Owner active account profile update | `updateProfile`: actor UUID, active/non-deleted row, whitelisted fields, bounded text | Transaction rollback test; no authenticated HTTP route |
| Managed institute read/update | `Entitled college admins manage assigned profiles` and `authorize_module_access` | `getManagedInstitute`: scoped read; `updateInstituteDescription`: one conditional UPDATE checks active actor, exact capability/assignment/entitlement/feature or Super Admin role in the same statement | Own/cross-entity, denied unchanged, and rollback tests; protected route wired but real Auth/mapping unavailable |
| Published job read | Public approved, active, unexpired job | `getPublicJob`: published/approved/active/unexpired/non-deleted fields only | Real staging read test; staging service only |
| Job mutation | `Entitled jobs admins update assigned jobs` | `updateJobDescription`: exact company/job assignment, active entitlement, `job_management`; no status mutation | Unauthorized test; no entitled jobs fixture in copied data, so authorized mutation unverified and not routed |
| Poster application read | `Entitled jobs admins manage applications` | `getJobApplications`: exact job/company assignment, `job_applications` entitlement, bounded result | Student denied; no entitled jobs fixture; staging service only |
| Own application read | Applicant may read their own application | `getOwnJobApplications`: actor UUID filter | Real staging query; staging service only |
| Own notifications | Recipient private policy | `getNotifications`: actor UUID filter, bounded result | Real staging query; staging service only |
| Role/permission read | `user_roles`, role permissions, user permissions and active-account helpers | `requireAuthenticatedUser`: active profile, role+permission resolution from application tables | Real staging policy tests with test-only identity; Managed Auth trust boundary blocked |
| Super Admin operation | `is_platform_admin`/admin-only RLS | `requireSuperAdmin`, then narrow repository methods when implemented | Policy unit tests; no privileged Neon mutation or authenticated HTTP route |

The copied Neon tables currently have no active `pg_policies`. This is **not database RLS parity**. Only the listed service methods enforce application-level checks. Direct SQL, unchecked new repositories, and generic admin mutations remain prohibited. The institute description update now uses a conditional single statement; other protected mutations still need their own atomic authorization review.

## RPC migration matrix

Classification: **A** authorization-critical, **B** transactional business logic, **C** query/CRUD, **E** retain reviewed PostgreSQL function semantics. “Pending” means the live caller still uses Supabase. No RPC below has been globally replaced.

| RPC | Current caller(s) | Purpose/class | Neon disposition, tests, status |
| --- | --- | --- | --- |
| `get_my_access_context` | `AuthContext`, server `auth`, OAuth callback | roles/capabilities A | Map verified Managed Auth identity to legacy UUID, then `requireAuthenticatedUser`; real session test pending |
| `has_active_module_capability` | checkout, institute dashboard/blogs/notices, AI | capability A | `requireModuleCapability`; policy tests pass, callers pending |
| `has_active_entity_assignment` | checkout, AI | exact entity A | `requireEntityAccess` assignment half; checkout parity pending |
| `has_entity_feature_access` | AI | feature entitlement A | `requireEntityAccess` feature condition; AI parity pending |
| `can_review_job_applications` | media download route | private applicant media A | Job scope + feature; pending |
| `authorize_media_access`, `claim_media_upload_intent` | media authorization | private path/intents A/E | Preserve atomic path ownership and single-use upload intent; staging storage scope partial; pending route |
| `get_my_college_workspaces` | institute dashboard/blogs/notices | scoped workspace A/C | Entitled college selector query; partial repository, pending caller |
| `get_my_module_entitlements` | payments overview, dashboard Payments, access request, RoleWorkspace | own payment access A/C | Own entitlement query; pending |
| `get_my_module_access_requests`, `cancel_module_access_request` | access request, institute dashboard | own access request A/B | Own request repository and conditional cancellation transaction; pending |
| `request_sub_admin_access`, `request_initial_module_access` | access request, institute dashboard, OAuth callback | module request B/E | Preserve validation, proof, unique pending request, audit; pending |
| `request_entity_scope` | institute dashboard | claim/create college B/E | Preserve conflict, duplicate, approval semantics; pending |
| `admin_decide_sub_admin_request`, `admin_decide_entity_scope_request`, `admin_assign_entity_scope` | admin access requests | approval/assignment A/B/E | Admin-only transactional service, audit, conflict locks; pending |
| `admin_update_user_access`, `admin_grant_role`, `admin_revoke_role`, `admin_assign_module_access_with_payment` | admin users/roles, server auth-user service | privileged grants A/B/E | Admin-only transaction + audit + payment record; pending |
| `admin_provision_default_free_tier`, `admin_revoke_default_free_tier` | admin subscriptions | subscription changes A/B | Admin-only entitlement transaction; pending |
| `admin_review_payment_proof`, `admin_verify_and_reconcile_payment`, `admin_record_mentor_payout` | admin payments | verified money state A/B/E | Preserve idempotent function/locking and audit, never client success; pending |
| `activate_verified_college_scope_request` | eSewa settlement | verified payment → scope B/E | Retain atomic PostgreSQL function after review; pending |
| `submit_payment_proof` | dashboard Payments | manual proof B | Authenticated payment ownership + evidence; pending |
| `submit_module_form`, `submit_college_application`, `submit_guest_college_application` | submissions route | form/admission B/E | Transactional validation, ownership and guest verification; pending |
| `claim_guest_college_applications` | AuthContext | guest claim B/E | Verified email/WhatsApp identity and atomic claim; pending |
| `reserve_guest_college_verification`, `check_guest_college_verification`, `prune_guest_college_verifications` | guest verification service, cron | OTP lifecycle B/E | Retain TTL/attempt/idempotency semantics; pending |
| `list_job_applications_for_review`, `review_job_application` | jobs applications route | poster review A/B | Job-scoped list + status transition + audit; partial read repository, pending caller |
| `complete_mentor_booking`, `cancel_mentor_booking`, `reschedule_mentor_booking` | mentor bookings route/service | payment/slot atomicity B/E | Retain locking and payment verification; pending |
| `claim_email_notifications` | email queue | concurrent claim B/E | Retain `SKIP LOCKED`/idempotency transaction; pending |
| `admin_save_provider_configuration` | provider config service | encrypted secret write A/B | Super Admin only, no browser secret, audit; pending |
| `get_public_page_section_visibility` | SSR page, CMS hook | public content C | Simple read repository/API; pending |
| `run_platform_maintenance` | cron route | maintenance B/E | Retain scheduled transaction and secret-gated cron; pending |

The RPC list was derived from all `.rpc(` callers in `app/` and `src/` including dynamic names. The entry `request_sub_admin_access` covers the dynamic call in `RequestSubAdminAccess`; `has_entity_feature_access` covers dynamic AI access; `admin_provision_default_free_tier`/`admin_revoke_default_free_tier` and `admin_save_provider_configuration` are dynamic names. No RPC is declared obsolete merely from lack of a static string match.

## Runtime switch and blockers

`MEROTALENT_BACKEND_MODE=legacy` is default, including production. `neon-staging` requires a pooled staging DB URL and branch ID and is refused on Vercel production. The public institute API switches actual query backend; legacy keeps the current Supabase client. Other live routes still use Supabase, so the switch is intentionally incomplete and must not be enabled as a full-app deployment. Staging services also require a trusted Auth-session-to-legacy-UUID mapping before protected HTTP routes can be mounted.

Storage: public migrated S3 objects returned anonymous **403**; signed GET works. This is a material distinction from object migration parity. Private resume signed reads enforce owner path, and profile upload/download was tested against the real staging S3 target with exact test-object cleanup. Remaining module-specific media authorization and legacy-equivalent operations are pending. Realtime remains Supabase in legacy; no durable Neon transport is ready.

## Staging configuration and validation evidence

The isolated runtime requires `MEROTALENT_BACKEND_MODE=neon-staging`, `NEON_STAGING_DATABASE_URL` (pooled URL), and `NEON_STAGING_BRANCH_ID`. Storage additionally requires `AWS_ENDPOINT_URL_S3`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_REGION`. Managed Auth, when implemented, will also require `NEON_AUTH_BASE_URL` and approved staging OAuth/email configuration. None of these should be copied to Vercel Production; `VERCEL_ENV=production` refuses staging mode. Secrets are not printed or included in this record.

- Unit: `npm run test` passed 94 files / 403 tests. `npm run typecheck` passed. `npm run lint` passed with 0 errors / 53 warnings. `npm run build` passed. `git diff --check` passed.
- Real staging integration: isolated `vitest.staging.config.ts` passed 1 file / 9 tests against real migrated Neon rows and objects. An initial rerun under restricted DNS failed `ENOTFOUND`; an authorized network rerun passed all 9. Staging policy tests construct a test-only actor from real legacy rows; they do **not** authenticate through Managed Auth.
- Staging HTTP: an isolated local Next server in `neon-staging` mode served `GET /api/v1/institutes/01e38067-3919-4cee-8a7d-46025626e928` with HTTP 200 and matching ID. A nonexistent UUID returned 404; malformed UUID returned 400. The isolated server was stopped. This proves the public route backend switch, not an authenticated user journey or a deployed staging release.
- Browser/UAT: not performed. Production was not changed, deployed, or cut over.
