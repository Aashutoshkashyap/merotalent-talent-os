# MeroTalent Database Migration Matrix (Supabase → Neon PostgreSQL)

> Historical planning matrix. Its older per-table “VERIFIED” labels refer mainly to copied data/DDL and must not be read as current authorization or runtime parity. Use the live-catalog classifications in `neon-staging-security-object-classification-2026-10-08.md` and `neon-staging-schema-parity-2026-10-08.md` for the actual staging state. Production remains on the existing backend.

| Source Object | Type | Migrated? | Target Object | Transformation / Replacement | Validation Method | Staging Status |
| :--- | :--- | :---: | :--- | :--- | :--- | :---: |
| `public.profiles` | Table | YES | `public.profiles` | Standard DDL; FK links to `merotalent_accounts.id` | Row count, PK coverage, null checks | VERIFIED |
| `public.user_roles` | Table | YES | `public.user_roles` | Standard DDL; enum `app_role` preserved | FK constraint check, role integrity | VERIFIED |
| `public.user_capabilities` | Table | YES | `public.user_capabilities` | Standard DDL | Capability scope validation | VERIFIED |
| `public.entity_scopes` | Table | YES | `public.entity_scopes` | Standard DDL | Multi-role entity assignment check | VERIFIED |
| `public.institutes` | Table | YES | `public.institutes` | Standard DDL; 295 records preserved | Geographic coordinate & slug checks | VERIFIED |
| `public.programs` | Table | YES | `public.programs` | Standard DDL | Institute relation check | VERIFIED |
| `public.college_applications` | Table | YES | `public.college_applications` | Standard DDL | Application document & status check | VERIFIED |
| `public.jobs` | Table | YES | `public.jobs` | Standard DDL | Skills array & lifecycle status check | VERIFIED |
| `public.job_applications` | Table | YES | `public.job_applications` | Standard DDL; immutable snapshots retained | Resume URL & timeline check | VERIFIED |
| `public.mentors` | Table | YES | `public.mentors` | Standard DDL; availability JSONB retained | Rating and total sessions check | VERIFIED |
| `public.mentor_services` | Table | YES | `public.mentor_services` | Standard DDL; pricing & duration retained | Active services check | VERIFIED |
| `public.mentor_bookings` | Table | YES | `public.mentor_bookings` | Standard DDL; overlap trigger attached | Double booking constraint check | VERIFIED |
| `public.mentor_reviews` | Table | YES | `public.mentor_reviews` | Standard DDL; rating trigger attached | Rating sync test | VERIFIED |
| `public.events` | Table | YES | `public.events` | Standard DDL; programs and schedules | Ticket type relation check | VERIFIED |
| `public.event_registrations` | Table | YES | `public.event_registrations` | Standard DDL; QR codes & attendee data | Registration code integrity | VERIFIED |
| `public.event_tickets` | Table | YES | `public.event_tickets` | Standard DDL | Ticket status check | VERIFIED |
| `public.payments` | Table | YES | `public.payments` | Standard DDL | Gateway transaction reference check | VERIFIED |
| `public.payment_checkout_sessions`| Table | YES | `public.payment_checkout_sessions` | Standard DDL | Session expiration check | VERIFIED |
| `public.subscriptions` | Table | YES | `public.subscriptions` | Standard DDL | Entitlement ledger check | VERIFIED |
| `public.notifications` | Table | YES | `public.notifications` | Standard DDL (`recipient_id`, `action_url`) | Unread count and link check | VERIFIED |
| `public.audit_logs` | Table | YES | `public.audit_logs` | Standard DDL | Action tracking check | VERIFIED |
| `public.contact_queries` | Table | YES | `public.contact_queries` | Standard DDL | Resolution status check | VERIFIED |
| `public.advertisements` | Table | YES | `public.advertisements` | Standard DDL | Placement & schedule check | VERIFIED |
| `public.public_profile_directory` | View | YES | `public.public_profile_directory` | Recreated on isolated staging with `security_barrier` | Query active-profile projection | VERIFIED ON STAGING |
| `public.institute_directory` | View | YES | `public.institute_directory` | Recreated on isolated staging; verification function retained | Query approved listing | VERIFIED ON STAGING |
| `public.app_role` | Enum | YES | `public.app_role` | PostgreSQL `CREATE TYPE app_role AS ENUM` | Enum value parity check | VERIFIED |
| `pg_trgm` | Extension | YES | `pg_trgm` | Enabled on isolated staging to restore institute search indexes | Index catalog comparison | VERIFIED ON STAGING |
| `pgcrypto` | Extension | YES | `pgcrypto` | Native Neon PostgreSQL extension | AES-GCM / SHA-256 test | VERIFIED |
| `uuid-ossp` | Extension | YES | `uuid-ossp` | Native Neon PostgreSQL extension | `gen_random_uuid()` test | VERIFIED |
| `supabase_vault` | Extension | NO | `public.provider_configurations` | Replaced with `pgcrypto` symmetric encryption | Secret encryption & decryption test | VERIFIED |
| `wrappers` | Extension | NO | Direct Node/Postgres Query | Replaced with application server Data API | External API integration test | VERIFIED |
| `auth.uid()` | Function | NO | None | Trusted Neon Auth database actor propagation is not established | Identity-link readiness gate | BLOCKED |
| Source triggers | Trigger | PARTIAL | 47 of 87 | Reviewed portable functions/triggers retained; Auth-context triggers excluded | Rollback-only category tests | PARTIAL |
| Source RLS policies | Policies | NO | Server-side authorization for a subset of routes | 390 source rules classified; 345 need redesign, 41 manual review, four public reads have application replacements | Staging policy inventory and route tests | PARTIAL — NO DATABASE RLS |
