# Actual Neon migration-staging schema parity — 2026-10-08

Inventory host: `ep-wispy-credit-azt6tgwj-pooler.c-3.ap-southeast-1.aws.neon.tech`; source was read-only. Source has 87 triggers, 2 views, 153 public functions (including extensions), 367 non-null constraints, and 177 indexes. Staging currently has 47 triggers, 2 views, 94 public functions (including extensions), 309 non-null constraints, and 177 indexes. Counts do not imply functional/security parity.

## Triggers — every source trigger

47 reviewed portable triggers were retained; 40 remain excluded. Auth-context triggers cannot be copied while staging has no trusted Neon actor propagation.

| Table | Trigger | Function | Class | Target decision |
| --- | --- | --- | --- | --- |
| `advertisements` | `advertisements_sync_active_state` | `sync_advertisement_active_state` | A — integrity/derived behavior | Retained on staging |
| `advertisements` | `audit_advertisements_changes` | `audit_row_change` | B — audit/history | Excluded pending trusted actor / redesign |
| `advertisements` | `update_advertisements_updated_at` | `update_updated_at_column` | C — timestamp/derived | Retained on staging |
| `appointments` | `secure_legacy_appointment_trigger` | `secure_legacy_appointment` | D — Supabase Auth context / redesign | Excluded pending trusted actor / redesign |
| `appointments` | `update_appointments_updated_at` | `update_updated_at_column` | C — timestamp/derived | Retained on staging |
| `college_applications` | `create_college_application_lead` | `create_lead_from_submission` | A — application behavior | Retained on staging |
| `college_applications` | `protect_college_application_owner_update_trigger` | `protect_college_application_owner_update` | D — Supabase Auth context / redesign | Excluded pending trusted actor / redesign |
| `college_applications` | `update_college_applications_updated_at` | `update_updated_at_column` | C — timestamp/derived | Retained on staging |
| `college_blogs` | `set_college_blogs_updated_at` | `update_updated_at_column` | C — timestamp/derived | Retained on staging |
| `companies` | `audit_companies_changes` | `audit_row_change` | B — audit/history | Excluded pending trusted actor / redesign |
| `companies` | `protect_company_admin_fields_trigger` | `protect_company_admin_fields` | D — Supabase Auth context / redesign | Excluded pending trusted actor / redesign |
| `companies` | `update_companies_updated_at` | `update_updated_at_column` | C — timestamp/derived | Retained on staging |
| `competition_participants` | `update_competition_participants_updated_at` | `update_updated_at_column` | C — timestamp/derived | Retained on staging |
| `competitions` | `update_competitions_updated_at` | `update_updated_at_column` | C — timestamp/derived | Retained on staging |
| `contact_queries` | `create_contact_query_lead` | `create_lead_from_submission` | A — application behavior | Retained on staging |
| `conversations` | `update_conversations_updated_at` | `update_updated_at_column` | C — timestamp/derived | Retained on staging |
| `course_modules` | `update_course_modules_updated_at` | `update_updated_at_column` | C — timestamp/derived | Retained on staging |
| `courses` | `audit_courses_changes` | `audit_row_change` | B — audit/history | Excluded pending trusted actor / redesign |
| `courses` | `soft_delete_courses` | `convert_admin_delete_to_soft_delete` | D — Supabase Auth context / redesign | Excluded pending trusted actor / redesign |
| `courses` | `update_courses_updated_at` | `update_updated_at_column` | C — timestamp/derived | Retained on staging |
| `entity_admin_assignments` | `sync_legacy_college_admin_assignment_trigger` | `sync_legacy_college_admin_assignment` | A — application behavior | Retained on staging |
| `entity_admin_assignments` | `validate_entity_admin_assignment_trigger` | `validate_entity_admin_assignment` | A — integrity/derived behavior | Retained on staging |
| `event_registrations` | `create_event_registration_lead` | `create_lead_from_submission` | A — application behavior | Retained on staging |
| `event_registrations` | `protect_event_registration_owner_update_trigger` | `protect_event_registration_owner_update` | D — Supabase Auth context / redesign | Excluded pending trusted actor / redesign |
| `event_registrations` | `update_event_registrations_updated_at` | `update_updated_at_column` | C — timestamp/derived | Retained on staging |
| `events` | `audit_events_changes` | `audit_row_change` | B — audit/history | Excluded pending trusted actor / redesign |
| `events` | `notify_event_approval_change` | `notify_approval_change` | D — Supabase Auth context / redesign | Excluded pending trusted actor / redesign |
| `events` | `protect_event_approval_fields_trigger` | `protect_event_approval_fields` | D — Supabase Auth context / redesign | Excluded pending trusted actor / redesign |
| `events` | `update_events_updated_at` | `update_updated_at_column` | C — timestamp/derived | Retained on staging |
| `featured_items` | `audit_featured_items_changes` | `audit_row_change` | B — audit/history | Excluded pending trusted actor / redesign |
| `featured_items` | `update_featured_items_updated_at` | `update_updated_at_column` | C — timestamp/derived | Retained on staging |
| `institutes` | `audit_institutes_changes` | `audit_row_change` | B — audit/history | Excluded pending trusted actor / redesign |
| `institutes` | `notify_college_approval_change` | `notify_approval_change` | D — Supabase Auth context / redesign | Excluded pending trusted actor / redesign |
| `institutes` | `protect_college_admin_fields_trigger` | `protect_college_admin_fields` | D — Supabase Auth context / redesign | Excluded pending trusted actor / redesign |
| `institutes` | `soft_delete_institutes` | `convert_admin_delete_to_soft_delete` | D — Supabase Auth context / redesign | Excluded pending trusted actor / redesign |
| `institutes` | `track_institute_content_ownership` | `track_institute_content_ownership` | D — Supabase Auth context / redesign | Excluded pending trusted actor / redesign |
| `institutes` | `update_institutes_updated_at` | `update_updated_at_column` | C — timestamp/derived | Retained on staging |
| `institutions` | `update_institutions_updated_at` | `update_updated_at_column` | C — timestamp/derived | Retained on staging |
| `job_applications` | `create_job_application_lead` | `create_lead_from_submission` | A — application behavior | Retained on staging |
| `job_applications` | `protect_job_application_update_trigger` | `protect_job_application_update` | D — Supabase Auth context / redesign | Excluded pending trusted actor / redesign |
| `job_applications` | `secure_job_application_insert_trigger` | `secure_job_application_insert` | D — Supabase Auth context / redesign | Excluded pending trusted actor / redesign |
| `job_applications` | `update_job_applications_updated_at` | `update_updated_at_column` | C — timestamp/derived | Retained on staging |
| `job_applications` | `validate_job_application_media_trigger` | `validate_job_application_media` | D — Supabase Auth context / redesign | Excluded pending trusted actor / redesign |
| `jobs` | `audit_jobs_changes` | `audit_row_change` | B — audit/history | Excluded pending trusted actor / redesign |
| `jobs` | `notify_job_approval_change` | `notify_approval_change` | D — Supabase Auth context / redesign | Excluded pending trusted actor / redesign |
| `jobs` | `protect_job_approval_fields_trigger` | `protect_job_approval_fields` | D — Supabase Auth context / redesign | Excluded pending trusted actor / redesign |
| `jobs` | `soft_delete_jobs` | `convert_admin_delete_to_soft_delete` | D — Supabase Auth context / redesign | Excluded pending trusted actor / redesign |
| `jobs` | `update_jobs_updated_at` | `update_updated_at_column` | C — timestamp/derived | Retained on staging |
| `leads` | `update_leads_updated_at` | `update_updated_at_column` | C — timestamp/derived | Retained on staging |
| `lessons` | `update_lessons_updated_at` | `update_updated_at_column` | C — timestamp/derived | Retained on staging |
| `mentor_bookings` | `create_mentor_booking_lead` | `create_lead_from_submission` | A — application behavior | Retained on staging |
| `mentor_bookings` | `enforce_mentor_published_availability_trigger` | `enforce_mentor_published_availability` | A — integrity/derived behavior | Retained on staging |
| `mentor_bookings` | `protect_mentor_booking_owner_update_trigger` | `protect_mentor_booking_owner_update` | D — Supabase Auth context / redesign | Excluded pending trusted actor / redesign |
| `mentor_bookings` | `update_mentor_bookings_updated_at` | `update_updated_at_column` | C — timestamp/derived | Retained on staging |
| `mentor_services` | `update_mentor_services_updated_at` | `update_updated_at_column` | C — timestamp/derived | Retained on staging |
| `mentors` | `audit_mentors_changes` | `audit_row_change` | B — audit/history | Excluded pending trusted actor / redesign |
| `mentors` | `notify_mentor_approval_change` | `notify_approval_change` | D — Supabase Auth context / redesign | Excluded pending trusted actor / redesign |
| `mentors` | `protect_mentor_admin_fields_trigger` | `protect_mentor_admin_fields` | D — Supabase Auth context / redesign | Excluded pending trusted actor / redesign |
| `mentors` | `update_mentors_updated_at` | `update_updated_at_column` | C — timestamp/derived | Retained on staging |
| `mentorship_sessions` | `update_mentorship_sessions_updated_at` | `update_updated_at_column` | C — timestamp/derived | Retained on staging |
| `messages` | `protect_message_update_trigger` | `protect_message_update` | D — Supabase Auth context / redesign | Excluded pending trusted actor / redesign |
| `module_form_definitions` | `update_module_form_definitions_updated_at` | `update_updated_at_column` | C — timestamp/derived | Retained on staging |
| `notifications` | `protect_notification_update_trigger` | `protect_notification_update` | D — Supabase Auth context / redesign | Excluded pending trusted actor / redesign |
| `notifications` | `soft_delete_notifications` | `convert_admin_delete_to_soft_delete` | D — Supabase Auth context / redesign | Excluded pending trusted actor / redesign |
| `packages` | `audit_packages_changes` | `audit_row_change` | B — audit/history | Excluded pending trusted actor / redesign |
| `packages` | `protect_default_free_package_scope_trigger` | `protect_default_free_package_scope` | A — integrity/derived behavior | Retained on staging |
| `packages` | `update_packages_updated_at` | `update_updated_at_column` | C — timestamp/derived | Retained on staging |
| `page_sections` | `set_page_sections_updated_at` | `update_page_sections_timestamp` | C — timestamp/derived | Retained on staging |
| `payment_checkout_sessions` | `release_expired_checkout_reservation_trigger` | `release_expired_checkout_reservation` | A — application behavior | Retained on staging |
| `payments` | `audit_payments_changes` | `audit_row_change` | B — audit/history | Excluded pending trusted actor / redesign |
| `payments` | `release_failed_paid_reservations_trigger` | `release_failed_paid_reservations` | A — application behavior | Retained on staging |
| `payments` | `sync_payment_result_trigger` | `sync_payment_result` | A — application behavior | Retained on staging |
| `payments` | `update_payments_updated_at` | `update_updated_at_column` | C — timestamp/derived | Retained on staging |
| `permissions` | `audit_permissions_changes` | `audit_row_change` | B — audit/history | Excluded pending trusted actor / redesign |
| `profiles` | `audit_profiles_changes` | `audit_row_change` | B — audit/history | Excluded pending trusted actor / redesign |
| `profiles` | `protect_profile_admin_fields_trigger` | `protect_profile_admin_fields` | D — Supabase Auth context / redesign | Excluded pending trusted actor / redesign |
| `profiles` | `update_profiles_updated_at` | `update_updated_at_column` | C — timestamp/derived | Retained on staging |
| `quizzes` | `update_quizzes_updated_at` | `update_updated_at_column` | C — timestamp/derived | Retained on staging |
| `role_permissions` | `audit_role_permissions_changes` | `audit_row_change` | B — audit/history | Excluded pending trusted actor / redesign |
| `saved_jobs` | `set_saved_jobs_updated_at` | `update_updated_at_column` | C — timestamp/derived | Retained on staging |
| `subscriptions` | `audit_subscriptions_changes` | `audit_row_change` | B — audit/history | Excluded pending trusted actor / redesign |
| `subscriptions` | `update_subscriptions_updated_at` | `update_updated_at_column` | C — timestamp/derived | Retained on staging |
| `subscriptions` | `validate_subscription_entity_trigger` | `validate_subscription_entity` | A — integrity/derived behavior | Retained on staging |
| `user_permissions` | `audit_user_permissions_changes` | `audit_row_change` | B — audit/history | Excluded pending trusted actor / redesign |
| `user_preferences` | `update_user_preferences_updated_at` | `update_updated_at_column` | C — timestamp/derived | Retained on staging |
| `user_roles` | `audit_user_roles_changes` | `audit_row_change` | B — audit/history | Excluded pending trusted actor / redesign |
| `user_roles` | `protect_last_admin_role_trigger` | `protect_last_admin_role` | A — integrity/derived behavior | Retained on staging |
## Views

| View | Purpose | Target | Dependency |
| --- | --- | --- | --- |
| `institute_directory` | Approved public institute search + effective verification | Recreated with security_barrier | is_college_effectively_verified ported |
| `public_profile_directory` | Active public profile projection | Recreated with security_barrier | profiles only |
Read-only row comparison: public_profile_directory is exact (103/103 rows and SHA-256). institute_directory returns 292/292 rows with every non-derived value matching; 116 rows differ only in ordering of derived program/tag arrays and the resulting search_document text under PostgreSQL 17 vs 18 collation. Normalized semantic comparison passes; raw view SHA-256 does not match.

## Functions and RPCs — every source public function

This caller scan is static and may miss dynamically named RPCs. A function labeled “not found” is **not** approved for removal. Supabase-dependent functions stay excluded pending trusted Auth context or explicit server-service replacement.

| Function/signature | Security definer | Caller | Classification | Replacement | Target |
| --- | --- | --- | --- | --- | --- |
| `_provision_default_free_tier(p_user_id uuid, p_entity_type text, p_entity_id uuid, p_module text, p_actor_user_id uuid, p_actor_type text)` | Yes | Not found in runtime scan | No current caller proven — manual review | None verified | Excluded/deferred |
| `_revoke_default_free_tier(p_user_id uuid, p_entity_type text, p_entity_id uuid, p_module text, p_reason text, p_actor_user_id uuid, p_actor_type text)` | Yes | Not found in runtime scan | No current caller proven — manual review | None verified | Excluded/deferred |
| `_upsert_free_module_entitlement(p_target_user_id uuid, p_module_key text, p_entity_type text, p_entity_id uuid, p_package_id uuid, p_granted_by uuid, p_reason text)` | Yes | Not found in runtime scan | No current caller proven — manual review | None verified | Excluded/deferred |
| `activate_verified_college_scope_request(p_request_id uuid)` | Yes | `src/lib/server/esewa-settlement.ts` | Unmigrated Supabase RPC caller — redesign required | No complete Neon replacement verified | Excluded/deferred |
| `admin_assign_entity_scope(p_user_id uuid, p_module_key text, p_entity_type text, p_entity_id uuid, p_source_request_id uuid, p_scopes jsonb)` | Yes | `src/screens/admin/AdminAccessRequests.tsx` | Unmigrated Supabase RPC caller — redesign required | No complete Neon replacement verified | Excluded/deferred |
| `admin_assign_module_access_with_payment(p_target_user_id uuid, p_module_key text, p_entity_type text, p_entity_id uuid, p_start_at timestamp with time zone, p_expires_at timestamp with time zone, p_amount numeric, p_transaction_id text, p_note text)` | Yes | `src/screens/admin/AdminUsers.tsx` | Unmigrated Supabase RPC caller — redesign required | No complete Neon replacement verified | Excluded/deferred |
| `admin_decide_entity_scope_request(p_request_id uuid, p_approve boolean, p_note text)` | Yes | `src/screens/admin/AdminAccessRequests.tsx` | Unmigrated Supabase RPC caller — redesign required | No complete Neon replacement verified | Excluded/deferred |
| `admin_decide_sub_admin_request(p_request_id uuid, p_approve boolean, p_note text)` | Yes | `src/screens/admin/AdminAccessRequests.tsx` | Unmigrated Supabase RPC caller — redesign required | No complete Neon replacement verified | Excluded/deferred |
| `admin_extend_subscription(p_subscription_id uuid, p_additional_days integer, p_note text)` | Yes | Not found in runtime scan | No current caller proven — manual review | None verified | Excluded/deferred |
| `admin_grant_role(p_user_id uuid, p_role app_role)` | Yes | `src/screens/admin/AdminRoleManagement.tsx` | Unmigrated Supabase RPC caller — redesign required | No complete Neon replacement verified | Excluded/deferred |
| `admin_manage_module_entitlement(p_target_user_id uuid, p_module_key text, p_entity_type text, p_entity_id uuid, p_source text, p_start_at timestamp with time zone, p_expires_at timestamp with time zone, p_package_id uuid, p_features jsonb, p_reason text)` | Yes | Not found in runtime scan | No current caller proven — manual review | None verified | Excluded/deferred |
| `admin_provision_default_free_tier(p_user_id uuid, p_entity_type text, p_entity_id uuid, p_module text)` | Yes | Not found in runtime scan | No current caller proven — manual review | None verified | Excluded/deferred |
| `admin_provision_module_free_entitlement(p_target_user_id uuid, p_module_key text, p_entity_type text, p_entity_id uuid, p_package_id uuid, p_reason text)` | Yes | Not found in runtime scan | No current caller proven — manual review | None verified | Excluded/deferred |
| `admin_record_mentor_payout(p_payment_id uuid, p_payout_amount numeric, p_commission_amount numeric, p_payout_reference text, p_note text)` | Yes | `src/screens/admin/AdminPayments.tsx` | Unmigrated Supabase RPC caller — redesign required | No complete Neon replacement verified | Excluded/deferred |
| `admin_review_payment_proof(p_proof_id uuid, p_decision text, p_review_note text)` | Yes | `src/screens/admin/AdminPayments.tsx` | Unmigrated Supabase RPC caller — redesign required | No complete Neon replacement verified | Excluded/deferred |
| `admin_revoke_default_free_tier(p_user_id uuid, p_entity_type text, p_entity_id uuid, p_module text, p_reason text)` | Yes | Not found in runtime scan | No current caller proven — manual review | None verified | Excluded/deferred |
| `admin_revoke_entity_scope(p_assignment_id uuid, p_note text)` | Yes | Not found in runtime scan | No current caller proven — manual review | None verified | Excluded/deferred |
| `admin_revoke_module_entitlement(p_entitlement_id uuid, p_reason text)` | Yes | Not found in runtime scan | No current caller proven — manual review | None verified | Excluded/deferred |
| `admin_revoke_role(p_user_id uuid, p_role app_role)` | Yes | `src/screens/admin/AdminRoleManagement.tsx` | Unmigrated Supabase RPC caller — redesign required | No complete Neon replacement verified | Excluded/deferred |
| `admin_save_provider_configuration(p_actor_user_id uuid, p_provider_kind text, p_provider_name text, p_is_enabled boolean, p_public_config jsonb, p_secret_ciphertext text, p_secret_iv text, p_secret_tag text)` | Yes | `src/lib/server/provider-config-service.ts` | Unmigrated Supabase RPC caller — redesign required | No complete Neon replacement verified | Excluded/deferred |
| `admin_set_entity_feature_grant(p_user_id uuid, p_module_key text, p_entity_type text, p_entity_id uuid, p_feature_key text, p_active boolean, p_note text)` | Yes | Not found in runtime scan | No current caller proven — manual review | None verified | Excluded/deferred |
| `admin_start_module_trial(p_target_user_id uuid, p_module_key text, p_entity_type text, p_entity_id uuid, p_reason text)` | Yes | Not found in runtime scan | No current caller proven — manual review | None verified | Excluded/deferred |
| `admin_update_user_access(p_user_id uuid, p_role app_role, p_account_status text)` | Yes | `src/lib/admin/admin-auth-user-service.ts`, `src/screens/admin/AdminRoleManagement.tsx` | Unmigrated Supabase RPC caller — redesign required | No complete Neon replacement verified | Excluded/deferred |
| `admin_verify_and_reconcile_payment(p_payment_id uuid, p_status text, p_note text, p_reconciliation_status text)` | Yes | `src/screens/admin/AdminPayments.tsx` | Unmigrated Supabase RPC caller — redesign required | No complete Neon replacement verified | Excluded/deferred |
| `assert_module_form_payload(p_module text, p_payload jsonb)` | No | Not found in runtime scan | No current caller proven — manual review | None verified | Excluded/deferred |
| `assert_module_form_payload_before_job_details(p_module text, p_payload jsonb)` | No | Not found in runtime scan | Obsolete historical implementation | None verified | Excluded/deferred |
| `assert_student_profile_ready(p_module text)` | Yes | Not found in runtime scan | No current caller proven — manual review | None verified | Excluded/deferred |
| `audit_row_change()` | Yes | Source trigger | Trigger dependency — pending redesign | None verified | Excluded/deferred |
| `authorize_media_access(p_action text, p_module text, p_resource_id uuid, p_owner_user_id uuid)` | Yes | `src/lib/server/media-authorization.ts` | Unmigrated Supabase RPC caller — redesign required | No complete Neon replacement verified | Excluded/deferred |
| `authorize_media_access_before_job_review(p_action text, p_module text, p_resource_id uuid, p_owner_user_id uuid)` | Yes | Not found in runtime scan | Obsolete historical implementation | None verified | Excluded/deferred |
| `authorize_media_access_legacy_phase3(p_action text, p_module text, p_resource_id uuid, p_owner_user_id uuid)` | Yes | Not found in runtime scan | Obsolete historical implementation | None verified | Excluded/deferred |
| `authorize_module_access(p_user_id uuid, p_module_key text, p_entity_type text, p_entity_id uuid, p_feature_key text)` | Yes | Not found in runtime scan | No current caller proven — manual review | None verified | Excluded/deferred |
| `bootstrap_first_admin(p_user_id uuid)` | Yes | Not found in runtime scan | No current caller proven — manual review | None verified | Excluded/deferred |
| `can_review_job_applications(p_job_id uuid)` | Yes | `app/api/v1/media/download-url/route.ts` | Unmigrated Supabase RPC caller — redesign required | No complete Neon replacement verified | Excluded/deferred |
| `cancel_entity_scope_request(p_request_id uuid)` | Yes | Not found in runtime scan | No current caller proven — manual review | None verified | Excluded/deferred |
| `cancel_module_access_request(p_request_id uuid)` | Yes | `src/screens/RequestSubAdminAccess.tsx` | Unmigrated Supabase RPC caller — redesign required | No complete Neon replacement verified | Excluded/deferred |
| `check_guest_college_verification(p_verification_id uuid, p_guest_token text, p_channel text, p_code_hash text)` | Yes | `src/lib/server/guest-college-verification.ts` | Unmigrated Supabase RPC caller — redesign required | No complete Neon replacement verified | Excluded/deferred |
| `claim_email_notifications(p_limit integer)` | Yes | `src/lib/server/email-queue.ts` | Unmigrated Supabase RPC caller — redesign required | No complete Neon replacement verified | Excluded/deferred |
| `claim_guest_college_applications(p_guest_token text)` | Yes | `src/contexts/AuthContext.tsx` | Unmigrated Supabase RPC caller — redesign required | No complete Neon replacement verified | Excluded/deferred |
| `claim_initial_oauth_role(p_role text)` | Yes | Not found in runtime scan | No current caller proven — manual review | None verified | Excluded/deferred |
| `claim_media_upload_intent(p_module text, p_resource_id uuid, p_object_path text, p_declared_size bigint)` | Yes | `src/lib/server/media-authorization.ts` | Unmigrated Supabase RPC caller — redesign required | No complete Neon replacement verified | Excluded/deferred |
| `claim_mentor_trial(_mentor_id uuid, _user_id uuid, _requested_duration integer)` | Yes | Not found in runtime scan | No current caller proven — manual review | None verified | Excluded/deferred |
| `convert_admin_delete_to_soft_delete()` | Yes | Source trigger | Trigger dependency — pending redesign | None verified | Excluded/deferred |
| `create_lead_from_submission()` | Yes | Source trigger | Retained SQL function | Neon SQL | Present |
| `enforce_mentor_published_availability()` | Yes | Source trigger | Retained SQL function | Neon SQL | Present |
| `get_my_access_context()` | Yes | `src/contexts/AuthContext.tsx`, `src/lib/server/auth.ts`, `src/lib/server/neon-auth-experiment.ts` | Unmigrated Supabase RPC caller — redesign required | No complete Neon replacement verified | Excluded/deferred |
| `get_my_college_workspaces()` | Yes | `src/screens/institute/InstituteBlogs.tsx`, `src/screens/institute/InstituteDashboard.tsx`, `src/screens/institute/InstituteNotices.tsx` | Unmigrated Supabase RPC caller — redesign required | No complete Neon replacement verified | Excluded/deferred |
| `get_my_module_access_requests()` | No | `src/screens/RequestSubAdminAccess.tsx`, `src/screens/institute/InstituteDashboard.tsx` | Unmigrated Supabase RPC caller — redesign required | No complete Neon replacement verified | Excluded/deferred |
| `get_my_module_entitlements()` | Yes | `src/screens/RequestSubAdminAccess.tsx`, `src/screens/role/RoleWorkspace.tsx`, `app/api/v1/payments/overview/route.ts` | Unmigrated Supabase RPC caller — redesign required | No complete Neon replacement verified | Excluded/deferred |
| `get_public_page_section_visibility(requested_page text)` | Yes | `src/hooks/useSiteCMS.ts`, `app/[[...slug]]/page.tsx` | Unmigrated Supabase RPC caller — redesign required | No complete Neon replacement verified | Excluded/deferred |
| `gin_extract_query_trgm(text, internal, smallint, internal, internal, internal, internal)` | No | Not found in runtime scan | Extension-provided | Neon SQL | Present |
| `gin_extract_value_trgm(text, internal)` | No | Not found in runtime scan | Extension-provided | Neon SQL | Present |
| `gin_trgm_consistent(internal, smallint, text, integer, internal, internal, internal, internal)` | No | Not found in runtime scan | Extension-provided | Neon SQL | Present |
| `gin_trgm_triconsistent(internal, smallint, text, integer, internal, internal, internal)` | No | Not found in runtime scan | Extension-provided | Neon SQL | Present |
| `gtrgm_compress(internal)` | No | Not found in runtime scan | Extension-provided | Neon SQL | Present |
| `gtrgm_consistent(internal, text, smallint, oid, internal)` | No | Not found in runtime scan | Extension-provided | Neon SQL | Present |
| `gtrgm_decompress(internal)` | No | Not found in runtime scan | Extension-provided | Neon SQL | Present |
| `gtrgm_distance(internal, text, smallint, oid, internal)` | No | Not found in runtime scan | Extension-provided | Neon SQL | Present |
| `gtrgm_in(cstring)` | No | Not found in runtime scan | Extension-provided | Neon SQL | Present |
| `gtrgm_options(internal)` | No | Not found in runtime scan | Extension-provided | Neon SQL | Present |
| `gtrgm_out(gtrgm)` | No | Not found in runtime scan | Extension-provided | Neon SQL | Present |
| `gtrgm_penalty(internal, internal, internal)` | No | Not found in runtime scan | Extension-provided | Neon SQL | Present |
| `gtrgm_picksplit(internal, internal)` | No | Not found in runtime scan | Extension-provided | Neon SQL | Present |
| `gtrgm_same(gtrgm, gtrgm, internal)` | No | Not found in runtime scan | Extension-provided | Neon SQL | Present |
| `gtrgm_union(internal, internal)` | No | Not found in runtime scan | Extension-provided | Neon SQL | Present |
| `handle_new_user()` | Yes | Not found in runtime scan | No current caller proven — manual review | None verified | Excluded/deferred |
| `has_active_entity_assignment(p_user_id uuid, p_module_key text, p_entity_type text, p_entity_id uuid)` | Yes | `app/api/v1/payments/checkout/route.ts` | Unmigrated Supabase RPC caller — redesign required | No complete Neon replacement verified | Excluded/deferred |
| `has_active_entity_subscription(p_entity_type text, p_entity_id uuid, p_feature text, p_required_mode text)` | Yes | Not found in runtime scan | No current caller proven — manual review | None verified | Excluded/deferred |
| `has_active_module_capability(p_user_id uuid, p_module_key text)` | Yes | `src/screens/institute/InstituteBlogs.tsx`, `src/screens/institute/InstituteDashboard.tsx`, `src/screens/institute/InstituteNotices.tsx` | Unmigrated Supabase RPC caller — redesign required | No complete Neon replacement verified | Excluded/deferred |
| `has_active_module_entitlement(p_user_id uuid, p_module_key text, p_entity_type text, p_entity_id uuid, p_feature_key text)` | Yes | Not found in runtime scan | No current caller proven — manual review | None verified | Excluded/deferred |
| `has_active_subscription(_user_id uuid, _entity_type text, _entity_id uuid, _feature text)` | Yes | Not found in runtime scan | No current caller proven — manual review | None verified | Excluded/deferred |
| `has_entity_entitlement(_user_id uuid, _entity_type text, _entity_id uuid, _feature text, _required_mode text)` | Yes | Not found in runtime scan | No current caller proven — manual review | None verified | Excluded/deferred |
| `has_entity_feature_access(p_user_id uuid, p_module_key text, p_entity_type text, p_entity_id uuid, p_feature_key text)` | Yes | Not found in runtime scan | No current caller proven — manual review | None verified | Excluded/deferred |
| `has_permission(_user_id uuid, _permission_code text)` | Yes | Not found in runtime scan | No current caller proven — manual review | None verified | Excluded/deferred |
| `has_role(_user_id uuid, _role app_role)` | Yes | Not found in runtime scan | No current caller proven — manual review | None verified | Excluded/deferred |
| `ingest_institute_source_record(p_record jsonb)` | Yes | Not found in runtime scan | No current caller proven — manual review | None verified | Excluded/deferred |
| `is_account_active(_user_id uuid)` | Yes | Not found in runtime scan | No current caller proven — manual review | None verified | Excluded/deferred |
| `is_canonical_media_path(_path text, _owner_user_id uuid, _module text, _resource_segment text)` | No | Not found in runtime scan | No current caller proven — manual review | None verified | Excluded/deferred |
| `is_college_effectively_verified(p_institute_id uuid)` | Yes | Not found in runtime scan | Retained SQL function | Neon SQL | Present |
| `is_college_payment_verified(_institute_id uuid)` | Yes | Not found in runtime scan | No current caller proven — manual review | None verified | Excluded/deferred |
| `is_owned_legacy_resume_path(_path text, _owner_user_id uuid)` | No | Not found in runtime scan | Obsolete historical implementation | None verified | Excluded/deferred |
| `is_platform_admin(_user_id uuid)` | Yes | Not found in runtime scan | No current caller proven — manual review | None verified | Excluded/deferred |
| `is_valid_module_form_date(_value text)` | No | Not found in runtime scan | No current caller proven — manual review | None verified | Excluded/deferred |
| `is_valid_partner_course_url(_url text)` | No | Not found in runtime scan | Retained SQL function | Neon SQL | Present |
| `list_job_applications_for_review(p_offset integer)` | Yes | `app/api/v1/jobs/applications/route.ts` | Unmigrated Supabase RPC caller — redesign required | No complete Neon replacement verified | Excluded/deferred |
| `module_capability_permissions(p_module_key text)` | No | Not found in runtime scan | No current caller proven — manual review | None verified | Excluded/deferred |
| `normalize_module_capability_key(p_value text)` | No | Not found in runtime scan | Retained SQL function | Neon SQL | Present |
| `notify_approval_change()` | Yes | Source trigger | Trigger dependency — pending redesign | None verified | Excluded/deferred |
| `notify_platform_admins_of_module_access_request(p_request_id uuid, p_provider_flow text)` | Yes | Not found in runtime scan | No current caller proven — manual review | None verified | Excluded/deferred |
| `protect_college_admin_fields()` | Yes | Source trigger | Trigger dependency — pending redesign | None verified | Excluded/deferred |
| `protect_college_application_owner_update()` | Yes | Source trigger | Trigger dependency — pending redesign | None verified | Excluded/deferred |
| `protect_company_admin_fields()` | Yes | Source trigger | Trigger dependency — pending redesign | None verified | Excluded/deferred |
| `protect_default_free_package_scope()` | Yes | Source trigger | Retained SQL function | Neon SQL | Present |
| `protect_event_approval_fields()` | Yes | Source trigger | Trigger dependency — pending redesign | None verified | Excluded/deferred |
| `protect_event_registration_owner_update()` | Yes | Source trigger | Trigger dependency — pending redesign | None verified | Excluded/deferred |
| `protect_job_application_update()` | Yes | Source trigger | Trigger dependency — pending redesign | None verified | Excluded/deferred |
| `protect_job_approval_fields()` | Yes | Source trigger | Trigger dependency — pending redesign | None verified | Excluded/deferred |
| `protect_last_admin_role()` | Yes | Source trigger | Retained SQL function | Neon SQL | Present |
| `protect_mentor_admin_fields()` | Yes | Source trigger | Trigger dependency — pending redesign | None verified | Excluded/deferred |
| `protect_mentor_booking_owner_update()` | Yes | Source trigger | Trigger dependency — pending redesign | None verified | Excluded/deferred |
| `protect_message_update()` | Yes | Source trigger | Trigger dependency — pending redesign | None verified | Excluded/deferred |
| `protect_notification_update()` | Yes | Source trigger | Trigger dependency — pending redesign | None verified | Excluded/deferred |
| `protect_profile_admin_fields()` | Yes | Source trigger | Trigger dependency — pending redesign | None verified | Excluded/deferred |
| `provision_default_free_tier(p_user_id uuid, p_entity_type text, p_entity_id uuid, p_module text)` | Yes | Not found in runtime scan | No current caller proven — manual review | None verified | Excluded/deferred |
| `prune_guest_college_verifications()` | Yes | `app/api/cron/maintenance/route.ts` | Unmigrated Supabase RPC caller — redesign required | No complete Neon replacement verified | Excluded/deferred |
| `release_expired_checkout_reservation()` | Yes | Source trigger | Retained SQL function | Neon SQL | Present |
| `release_failed_paid_reservations()` | Yes | Source trigger | Retained SQL function | Neon SQL | Present |
| `request_entity_scope(p_module_key text, p_entity_type text, p_entity_id uuid, p_request_kind text, p_request_data jsonb, p_reason text)` | Yes | `src/screens/institute/InstituteDashboard.tsx` | Unmigrated Supabase RPC caller — redesign required | No complete Neon replacement verified | Excluded/deferred |
| `request_initial_module_access(p_role text)` | Yes | `src/screens/auth/OAuthCallback.tsx` | Unmigrated Supabase RPC caller — redesign required | No complete Neon replacement verified | Excluded/deferred |
| `request_sub_admin_access(p_requested_modules text[], p_reason text, p_organization text)` | Yes | `src/screens/RequestSubAdminAccess.tsx`, `src/screens/institute/InstituteDashboard.tsx` | Unmigrated Supabase RPC caller — redesign required | No complete Neon replacement verified | Excluded/deferred |
| `reserve_guest_college_verification(p_guest_token text, p_college_id uuid, p_email text, p_whatsapp_number text, p_channel text, p_code_hash text)` | Yes | `src/lib/server/guest-college-verification.ts` | Unmigrated Supabase RPC caller — redesign required | No complete Neon replacement verified | Excluded/deferred |
| `resolve_institute_source_match(p_record jsonb)` | Yes | Not found in runtime scan | No current caller proven — manual review | None verified | Excluded/deferred |
| `review_job_application(p_id uuid, p_status text, p_notes text, p_interview_at timestamp with time zone, p_interview_location text, p_duration integer)` | Yes | `app/api/v1/jobs/applications/route.ts` | Unmigrated Supabase RPC caller — redesign required | No complete Neon replacement verified | Excluded/deferred |
| `revoke_default_free_tier(p_user_id uuid, p_entity_type text, p_entity_id uuid, p_module text, p_reason text)` | Yes | Not found in runtime scan | No current caller proven — manual review | None verified | Excluded/deferred |
| `run_platform_maintenance()` | Yes | `app/api/cron/maintenance/route.ts` | Unmigrated Supabase RPC caller — redesign required | No complete Neon replacement verified | Excluded/deferred |
| `secure_job_application_insert()` | Yes | Source trigger | Trigger dependency — pending redesign | None verified | Excluded/deferred |
| `secure_legacy_appointment()` | Yes | Source trigger | Obsolete historical implementation | None verified | Excluded/deferred |
| `set_limit(real)` | No | Not found in runtime scan | Extension-provided | Neon SQL | Present |
| `show_limit()` | No | Not found in runtime scan | Extension-provided | Neon SQL | Present |
| `show_trgm(text)` | No | Not found in runtime scan | Extension-provided | Neon SQL | Present |
| `similarity(text, text)` | No | Not found in runtime scan | Extension-provided | Neon SQL | Present |
| `similarity_dist(text, text)` | No | Not found in runtime scan | Extension-provided | Neon SQL | Present |
| `similarity_op(text, text)` | No | Not found in runtime scan | Extension-provided | Neon SQL | Present |
| `strict_word_similarity(text, text)` | No | Not found in runtime scan | Extension-provided | Neon SQL | Present |
| `strict_word_similarity_commutator_op(text, text)` | No | Not found in runtime scan | Extension-provided | Neon SQL | Present |
| `strict_word_similarity_dist_commutator_op(text, text)` | No | Not found in runtime scan | Extension-provided | Neon SQL | Present |
| `strict_word_similarity_dist_op(text, text)` | No | Not found in runtime scan | Extension-provided | Neon SQL | Present |
| `strict_word_similarity_op(text, text)` | No | Not found in runtime scan | Extension-provided | Neon SQL | Present |
| `submit_college_application(p_payload jsonb)` | Yes | `app/api/v1/submissions/[module]/route.ts` | Unmigrated Supabase RPC caller — redesign required | No complete Neon replacement verified | Excluded/deferred |
| `submit_college_application_before_profile_gate(p_payload jsonb)` | Yes | Not found in runtime scan | Obsolete historical implementation | None verified | Excluded/deferred |
| `submit_guest_college_application(p_payload jsonb, p_guest_token text, p_idempotency_key text, p_verification_id uuid)` | Yes | `app/api/v1/submissions/[module]/route.ts` | Unmigrated Supabase RPC caller — redesign required | No complete Neon replacement verified | Excluded/deferred |
| `submit_guest_college_application_before_verification(p_payload jsonb, p_guest_token text, p_idempotency_key text)` | Yes | Not found in runtime scan | Obsolete historical implementation | None verified | Excluded/deferred |
| `submit_module_form(p_module text, p_payload jsonb)` | Yes | `app/api/v1/submissions/[module]/route.ts` | Unmigrated Supabase RPC caller — redesign required | No complete Neon replacement verified | Excluded/deferred |
| `submit_module_form_before_profile_gate(p_module text, p_payload jsonb)` | Yes | Not found in runtime scan | Obsolete historical implementation | None verified | Excluded/deferred |
| `submit_module_form_internal(p_module text, p_payload jsonb)` | Yes | Not found in runtime scan | No current caller proven — manual review | None verified | Excluded/deferred |
| `submit_payment_proof(p_payment_id uuid, p_file_name text, p_storage_path text, p_mime_type text, p_file_size integer, p_proof_type text, p_user_note text)` | Yes | `src/screens/dashboard/Payments.tsx` | Unmigrated Supabase RPC caller — redesign required | No complete Neon replacement verified | Excluded/deferred |
| `sync_advertisement_active_state()` | No | Source trigger | Retained SQL function | Neon SQL | Present |
| `sync_legacy_college_admin_assignment()` | Yes | Source trigger | Retained SQL function | Neon SQL | Present |
| `sync_payment_result()` | Yes | Source trigger | Retained SQL function | Neon SQL | Present |
| `track_institute_content_ownership()` | Yes | Source trigger | Trigger dependency — pending redesign | None verified | Excluded/deferred |
| `update_my_college_media(p_institute_id uuid, p_logo_path text, p_cover_path text)` | Yes | `src/components/owner/InstituteProfileEditor.tsx` | Unmigrated Supabase RPC caller — redesign required | No complete Neon replacement verified | Excluded/deferred |
| `update_my_college_profile(p_institute_id uuid, p_profile jsonb)` | Yes | `src/components/owner/InstituteProfileEditor.tsx` | Unmigrated Supabase RPC caller — redesign required | No complete Neon replacement verified | Excluded/deferred |
| `update_page_sections_timestamp()` | No | Source trigger | Retained SQL function | Neon SQL | Present |
| `update_updated_at_column()` | No | Source trigger | Retained SQL function | Neon SQL | Present |
| `validate_entity_admin_assignment()` | Yes | Source trigger | Retained SQL function | Neon SQL | Present |
| `validate_free_tier_target(p_user_id uuid, p_entity_type text, p_entity_id uuid, p_module text)` | Yes | Not found in runtime scan | No current caller proven — manual review | None verified | Excluded/deferred |
| `validate_job_application_media()` | Yes | Source trigger | Trigger dependency — pending redesign | None verified | Excluded/deferred |
| `validate_subscription_entity()` | Yes | Source trigger | Retained SQL function | Neon SQL | Present |
| `word_similarity(text, text)` | No | Not found in runtime scan | Extension-provided | Neon SQL | Present |
| `word_similarity_commutator_op(text, text)` | No | Not found in runtime scan | Extension-provided | Neon SQL | Present |
| `word_similarity_dist_commutator_op(text, text)` | No | Not found in runtime scan | Extension-provided | Neon SQL | Present |
| `word_similarity_dist_op(text, text)` | No | Not found in runtime scan | Extension-provided | Neon SQL | Present |
| `word_similarity_op(text, text)` | No | Not found in runtime scan | Extension-provided | Neon SQL | Present |
## Constraints missing from target (58)

| Table | Constraint | Type | Source definition | Decision |
| --- | --- | --- | --- | --- |
| `advertisements` | `advertisements_created_by_fkey` | `f` | `FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL` | Blocked by absent imported Auth identities/table |
| `audit_logs` | `audit_logs_actor_user_id_fkey` | `f` | `FOREIGN KEY (actor_user_id) REFERENCES auth.users(id) ON DELETE SET NULL` | Blocked by absent imported Auth identities/table |
| `college_applications` | `college_applications_applicant_id_fkey` | `f` | `FOREIGN KEY (applicant_id) REFERENCES auth.users(id) ON DELETE CASCADE` | Blocked by absent imported Auth identities/table |
| `college_blogs` | `college_blogs_author_user_id_fkey` | `f` | `FOREIGN KEY (author_user_id) REFERENCES auth.users(id) ON DELETE RESTRICT` | Blocked by absent imported Auth identities/table |
| `companies` | `companies_user_id_fkey` | `f` | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | Blocked by absent imported Auth identities/table |
| `competition_participants` | `competition_participants_user_id_fkey` | `f` | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | Blocked by absent imported Auth identities/table |
| `competitions` | `competitions_organizer_id_fkey` | `f` | `FOREIGN KEY (organizer_id) REFERENCES auth.users(id) ON DELETE SET NULL` | Blocked by absent imported Auth identities/table |
| `contact_queries` | `contact_queries_assigned_to_fkey` | `f` | `FOREIGN KEY (assigned_to) REFERENCES auth.users(id)` | Blocked by absent imported Auth identities/table |
| `conversations` | `conversations_mentee_id_fkey` | `f` | `FOREIGN KEY (mentee_id) REFERENCES auth.users(id) ON DELETE CASCADE` | Blocked by absent imported Auth identities/table |
| `course_enrollments` | `course_enrollments_user_id_fkey` | `f` | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | Blocked by absent imported Auth identities/table |
| `course_referrals` | `course_referrals_user_id_fkey` | `f` | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL` | Blocked by absent imported Auth identities/table |
| `course_videos` | `course_videos_uploaded_by_fkey` | `f` | `FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE CASCADE` | Blocked by absent imported Auth identities/table |
| `courses` | `courses_created_by_fkey` | `f` | `FOREIGN KEY (created_by) REFERENCES auth.users(id)` | Blocked by absent imported Auth identities/table |
| `courses` | `courses_partner_id_fkey` | `f` | `FOREIGN KEY (partner_id) REFERENCES auth.users(id) ON DELETE SET NULL` | Blocked by absent imported Auth identities/table |
| `entity_admin_assignments` | `entity_admin_assignments_assigned_by_fkey` | `f` | `FOREIGN KEY (assigned_by) REFERENCES auth.users(id) ON DELETE SET NULL` | Blocked by absent imported Auth identities/table |
| `entity_admin_assignments` | `entity_admin_assignments_revoked_by_fkey` | `f` | `FOREIGN KEY (revoked_by) REFERENCES auth.users(id) ON DELETE SET NULL` | Blocked by absent imported Auth identities/table |
| `entity_admin_assignments` | `entity_admin_assignments_user_id_fkey` | `f` | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | Blocked by absent imported Auth identities/table |
| `entity_scope_requests` | `entity_scope_requests_decided_by_fkey` | `f` | `FOREIGN KEY (decided_by) REFERENCES auth.users(id) ON DELETE SET NULL` | Blocked by absent imported Auth identities/table |
| `entity_scope_requests` | `entity_scope_requests_user_id_fkey` | `f` | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | Blocked by absent imported Auth identities/table |
| `event_registrations` | `event_registrations_user_id_fkey` | `f` | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | Blocked by absent imported Auth identities/table |
| `events` | `events_approved_by_fkey` | `f` | `FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL` | Blocked by absent imported Auth identities/table |
| `events` | `events_organizer_user_id_fkey` | `f` | `FOREIGN KEY (organizer_user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | Blocked by absent imported Auth identities/table |
| `featured_items` | `featured_items_created_by_fkey` | `f` | `FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL` | Blocked by absent imported Auth identities/table |
| `institute_admins` | `institute_admins_user_id_fkey` | `f` | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | Blocked by absent imported Auth identities/table |
| `institutes` | `institutes_owner_user_id_fkey` | `f` | `FOREIGN KEY (owner_user_id) REFERENCES auth.users(id) ON DELETE SET NULL` | Blocked by absent imported Auth identities/table |
| `institutions` | `institutions_user_id_fkey` | `f` | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | Blocked by absent imported Auth identities/table |
| `job_applications` | `job_applications_user_id_fkey` | `f` | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | Blocked by absent imported Auth identities/table |
| `jobs` | `jobs_approved_by_fkey` | `f` | `FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL` | Blocked by absent imported Auth identities/table |
| `jobs` | `jobs_owner_user_id_fkey` | `f` | `FOREIGN KEY (owner_user_id) REFERENCES auth.users(id) ON DELETE SET NULL` | Blocked by absent imported Auth identities/table |
| `leads` | `leads_applicant_user_id_fkey` | `f` | `FOREIGN KEY (applicant_user_id) REFERENCES auth.users(id) ON DELETE SET NULL` | Blocked by absent imported Auth identities/table |
| `leads` | `leads_owner_user_id_fkey` | `f` | `FOREIGN KEY (owner_user_id) REFERENCES auth.users(id) ON DELETE SET NULL` | Blocked by absent imported Auth identities/table |
| `lesson_progress` | `lesson_progress_user_id_fkey` | `f` | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | Blocked by absent imported Auth identities/table |
| `media_upload_intents` | `media_upload_intents_user_id_fkey` | `f` | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | Blocked by absent imported Auth identities/table |
| `mentor_bookings` | `mentor_bookings_student_id_fkey` | `f` | `FOREIGN KEY (student_id) REFERENCES auth.users(id) ON DELETE CASCADE` | Blocked by absent imported Auth identities/table |
| `mentor_trial_usage` | `mentor_trial_usage_user_id_fkey` | `f` | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | Blocked by absent imported Auth identities/table |
| `mentors` | `mentors_user_id_fkey` | `f` | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | Blocked by absent imported Auth identities/table |
| `mentorship_sessions` | `mentorship_sessions_mentee_id_fkey` | `f` | `FOREIGN KEY (mentee_id) REFERENCES auth.users(id) ON DELETE CASCADE` | Blocked by absent imported Auth identities/table |
| `messages` | `messages_receiver_id_fkey` | `f` | `FOREIGN KEY (receiver_id) REFERENCES auth.users(id) ON DELETE CASCADE` | Blocked by absent imported Auth identities/table |
| `messages` | `messages_sender_id_fkey` | `f` | `FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE` | Blocked by absent imported Auth identities/table |
| `module_form_submissions` | `module_form_submissions_user_id_fkey` | `f` | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | Blocked by absent imported Auth identities/table |
| `notifications` | `notifications_recipient_id_fkey` | `f` | `FOREIGN KEY (recipient_id) REFERENCES auth.users(id)` | Blocked by absent imported Auth identities/table |
| `notifications` | `notifications_sender_id_fkey` | `f` | `FOREIGN KEY (sender_id) REFERENCES auth.users(id)` | Blocked by absent imported Auth identities/table |
| `payment_proofs` | `payment_proofs_reviewed_by_user_id_fkey` | `f` | `FOREIGN KEY (reviewed_by_user_id) REFERENCES auth.users(id) ON DELETE SET NULL` | Blocked by absent imported Auth identities/table |
| `payment_proofs` | `payment_proofs_uploaded_by_user_id_fkey` | `f` | `FOREIGN KEY (uploaded_by_user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | Blocked by absent imported Auth identities/table |
| `payments` | `payments_verified_by_user_id_fkey` | `f` | `FOREIGN KEY (verified_by_user_id) REFERENCES auth.users(id) ON DELETE SET NULL` | Blocked by absent imported Auth identities/table |
| `profiles` | `profiles_user_id_fkey` | `f` | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | Blocked by absent imported Auth identities/table |
| `saved_jobs` | `saved_jobs_user_id_fkey` | `f` | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | Blocked by absent imported Auth identities/table |
| `sub_admin_requests` | `sub_admin_requests_decided_by_fkey` | `f` | `FOREIGN KEY (decided_by) REFERENCES auth.users(id) ON DELETE SET NULL` | Blocked by absent imported Auth identities/table |
| `subscriptions` | `subscriptions_user_id_fkey` | `f` | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | Blocked by absent imported Auth identities/table |
| `user_badges` | `user_badges_user_id_fkey` | `f` | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | Blocked by absent imported Auth identities/table |
| `user_module_capabilities` | `user_module_capabilities_granted_by_fkey` | `f` | `FOREIGN KEY (granted_by) REFERENCES auth.users(id) ON DELETE SET NULL` | Blocked by absent imported Auth identities/table |
| `user_module_capabilities` | `user_module_capabilities_revoked_by_fkey` | `f` | `FOREIGN KEY (revoked_by) REFERENCES auth.users(id) ON DELETE SET NULL` | Blocked by absent imported Auth identities/table |
| `user_module_capabilities` | `user_module_capabilities_user_id_fkey` | `f` | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | Blocked by absent imported Auth identities/table |
| `user_permissions` | `user_permissions_granted_by_fkey` | `f` | `FOREIGN KEY (granted_by) REFERENCES auth.users(id) ON DELETE SET NULL` | Blocked by absent imported Auth identities/table |
| `user_permissions` | `user_permissions_user_id_fkey` | `f` | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | Blocked by absent imported Auth identities/table |
| `user_preferences` | `user_preferences_user_id_fkey` | `f` | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | Blocked by absent imported Auth identities/table |
| `user_roles` | `user_roles_user_id_fkey` | `f` | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | Blocked by absent imported Auth identities/table |
| `user_skills` | `user_skills_user_id_fkey` | `f` | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | Blocked by absent imported Auth identities/table |
## Indexes missing from target (0)

| Table | Index | Definition | Decision |
| --- | --- | --- | --- |

Auth foreign keys are deferred until the identity mapping and Auth-backed target are designed. The institute trigram indexes and partner URL check were restored on staging. Neither these objects nor the two views prove route-level authorization.
