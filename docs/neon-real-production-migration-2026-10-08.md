# MeroTalent — Supabase Production → Isolated Neon Staging Migration Report

**Date:** 2026-10-08
**Auditor:** Antigravity AI Engine & MeroTalent Database Architecture Team
**Scope:** Full Production Data Migration, Schema Adaptation & Live Reconciliation
**Target Project:** `summer-sky-63693897`
**Target Branch:** `migration-staging`

---

## 1. Executive Status Matrix

```text
============================================================
MIGRATION VERDICT: REAL STAGING RUN VERIFIED
============================================================

SOURCE:                 CURRENT PRODUCTION VERIFIED (dtirpilgzlsfryucanlg.supabase.co)
DATABASE:               REAL IMPORT VERIFIED (PostgreSQL 18.6)
AUTH:                   REAL SOURCE MANIFEST VERIFIED (102 users mapped)
STORAGE:                VERIFIED (22/22 objects, 100% SHA-256 byte parity)
RECONCILIATION:         PASSED (100% Deterministic Parity)
STAGING APPLICATION:    VERIFIED

PRODUCTION CUTOVER:     NO-GO
============================================================
```

---

## 2. Provenance & Target Details

| Target | Host / Identifier | Database | Role | Status |
|---|---|---|---|:---:|
| **Source** | `db.dtirpilgzlsfryucanlg.supabase.co:5432` | `postgres` | `postgres` | **LIVE PRODUCTION (Read-Only)** |
| **Destination** | `ep-polished-flower-azsezy8a-pooler.c-3.ap-southeast-1.aws.neon.tech` | `neondb` | `neondb_owner` | **ISOLATED STAGING BRANCH** |

* **Migration Workspace:** `/Users/aashutoshjha/merotalent-migration-2026-10-08`
* **Execution Timestamp:** `2026-10-08T08:26:10.963Z`
* **Completed Timestamp:** `2026-10-08T08:36:25.556Z`

---

## 3. Database Reconciliation (Live Source vs Neon Staging)

| Table Name | Source Rows | Neon Rows | Variance | Source SHA-256 (16) | Neon SHA-256 (16) | Status |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| `advertisements` | 0 | 0 | 0 | `e3b0c44298fc1c14` | `e3b0c44298fc1c14` | **PASS** |
| `ai_usage_logs` | 0 | 0 | 0 | `e3b0c44298fc1c14` | `e3b0c44298fc1c14` | **PASS** |
| `appointments` | 0 | 0 | 0 | `e3b0c44298fc1c14` | `e3b0c44298fc1c14` | **PASS** |
| `audit_logs` | 1276 | 1276 | 0 | `060bad58894bc798` | `060bad58894bc798` | **PASS** |
| `badges` | 4 | 4 | 0 | `7e714e09c6041319` | `7e714e09c6041319` | **PASS** |
| `certificates` | 0 | 0 | 0 | `e3b0c44298fc1c14` | `e3b0c44298fc1c14` | **PASS** |
| `college_applications` | 11 | 11 | 0 | `4041026df8be6e55` | `4041026df8be6e55` | **PASS** |
| `college_blogs` | 0 | 0 | 0 | `e3b0c44298fc1c14` | `e3b0c44298fc1c14` | **PASS** |
| `companies` | 1 | 1 | 0 | `522384f4883bfa38` | `522384f4883bfa38` | **PASS** |
| `competition_participants` | 0 | 0 | 0 | `e3b0c44298fc1c14` | `e3b0c44298fc1c14` | **PASS** |
| `competition_registrations` | 2 | 2 | 0 | `20cdae9bf46711f6` | `20cdae9bf46711f6` | **PASS** |
| `competitions` | 1 | 1 | 0 | `6a842f39c1b7792a` | `6a842f39c1b7792a` | **PASS** |
| `contact_queries` | 1 | 1 | 0 | `32daae7b37129fd6` | `32daae7b37129fd6` | **PASS** |
| `conversations` | 0 | 0 | 0 | `e3b0c44298fc1c14` | `e3b0c44298fc1c14` | **PASS** |
| `course_enrollments` | 0 | 0 | 0 | `e3b0c44298fc1c14` | `e3b0c44298fc1c14` | **PASS** |
| `course_modules` | 0 | 0 | 0 | `e3b0c44298fc1c14` | `e3b0c44298fc1c14` | **PASS** |
| `course_referrals` | 0 | 0 | 0 | `e3b0c44298fc1c14` | `e3b0c44298fc1c14` | **PASS** |
| `course_tags` | 0 | 0 | 0 | `e3b0c44298fc1c14` | `e3b0c44298fc1c14` | **PASS** |
| `course_videos` | 0 | 0 | 0 | `e3b0c44298fc1c14` | `e3b0c44298fc1c14` | **PASS** |
| `courses` | 0 | 0 | 0 | `e3b0c44298fc1c14` | `e3b0c44298fc1c14` | **PASS** |
| `entity_admin_assignments` | 7 | 7 | 0 | `69be30bce4d5114f` | `69be30bce4d5114f` | **PASS** |
| `entity_feature_grants` | 8 | 8 | 0 | `7e92e983db2fca0d` | `7e92e983db2fca0d` | **PASS** |
| `entity_scope_requests` | 1 | 1 | 0 | `79034467b2914a7b` | `79034467b2914a7b` | **PASS** |
| `event_registrations` | 2 | 2 | 0 | `53c2c4989ed085a2` | `53c2c4989ed085a2` | **PASS** |
| `events` | 2 | 2 | 0 | `8776a203fdcd9b4c` | `8776a203fdcd9b4c` | **PASS** |
| `featured_items` | 5 | 5 | 0 | `9096e7ac12afd8d5` | `9096e7ac12afd8d5` | **PASS** |
| `guest_college_verification_sends` | 0 | 0 | 0 | `e3b0c44298fc1c14` | `e3b0c44298fc1c14` | **PASS** |
| `guest_college_verifications` | 0 | 0 | 0 | `e3b0c44298fc1c14` | `e3b0c44298fc1c14` | **PASS** |
| `institute_admins` | 6 | 6 | 0 | `d2fe62843dd3f655` | `d2fe62843dd3f655` | **PASS** |
| `institute_content_ownership` | 2 | 2 | 0 | `148237924ae91548` | `148237924ae91548` | **PASS** |
| `institute_ingestion_provenance` | 123 | 123 | 0 | `c6660e30047696ed` | `c6660e30047696ed` | **PASS** |
| `institute_ingestion_reviews` | 0 | 0 | 0 | `e3b0c44298fc1c14` | `e3b0c44298fc1c14` | **PASS** |
| `institute_notices` | 0 | 0 | 0 | `e3b0c44298fc1c14` | `e3b0c44298fc1c14` | **PASS** |
| `institutes` | 295 | 295 | 0 | `db212569e4b68725` | `db212569e4b68725` | **PASS** |
| `institutions` | 0 | 0 | 0 | `e3b0c44298fc1c14` | `e3b0c44298fc1c14` | **PASS** |
| `job_applications` | 5 | 5 | 0 | `dcee11a7c20fccf2` | `dcee11a7c20fccf2` | **PASS** |
| `jobs` | 3 | 3 | 0 | `05fc9f8c0102ec44` | `05fc9f8c0102ec44` | **PASS** |
| `leads` | 24 | 24 | 0 | `41087c47eafc78f9` | `41087c47eafc78f9` | **PASS** |
| `lesson_progress` | 0 | 0 | 0 | `e3b0c44298fc1c14` | `e3b0c44298fc1c14` | **PASS** |
| `lessons` | 0 | 0 | 0 | `e3b0c44298fc1c14` | `e3b0c44298fc1c14` | **PASS** |
| `media_upload_intents` | 7 | 7 | 0 | `59c24766d23e300a` | `59c24766d23e300a` | **PASS** |
| `mentor_bookings` | 5 | 5 | 0 | `d8a2b4ac06729f59` | `d8a2b4ac06729f59` | **PASS** |
| `mentor_services` | 2 | 2 | 0 | `9f786c9474b39408` | `9f786c9474b39408` | **PASS** |
| `mentor_trial_settings` | 0 | 0 | 0 | `e3b0c44298fc1c14` | `e3b0c44298fc1c14` | **PASS** |
| `mentor_trial_usage` | 0 | 0 | 0 | `e3b0c44298fc1c14` | `e3b0c44298fc1c14` | **PASS** |
| `mentors` | 1 | 1 | 0 | `5451ab7a635455e6` | `5451ab7a635455e6` | **PASS** |
| `mentorship_sessions` | 0 | 0 | 0 | `e3b0c44298fc1c14` | `e3b0c44298fc1c14` | **PASS** |
| `messages` | 0 | 0 | 0 | `e3b0c44298fc1c14` | `e3b0c44298fc1c14` | **PASS** |
| `module_ai_credentials` | 0 | 0 | 0 | `e3b0c44298fc1c14` | `e3b0c44298fc1c14` | **PASS** |
| `module_capabilities` | 5 | 5 | 0 | `eb4c3aa7ae96bcea` | `eb4c3aa7ae96bcea` | **PASS** |
| `module_entitlements` | 2 | 2 | 0 | `81b6b1a5b7ce8878` | `81b6b1a5b7ce8878` | **PASS** |
| `module_form_definitions` | 4 | 4 | 0 | `1518c7d992d4bac1` | `1518c7d992d4bac1` | **PASS** |
| `module_form_submissions` | 16 | 16 | 0 | `970625028e03850c` | `970625028e03850c` | **PASS** |
| `notifications` | 30 | 30 | 0 | `c4b929a4c87268d3` | `c4b929a4c87268d3` | **PASS** |
| `packages` | 9 | 9 | 0 | `b59014a11a2e3cc8` | `b59014a11a2e3cc8` | **PASS** |
| `page_sections` | 17 | 17 | 0 | `42bf93a97b71d3d9` | `42bf93a97b71d3d9` | **PASS** |
| `payment_checkout_sessions` | 0 | 0 | 0 | `e3b0c44298fc1c14` | `e3b0c44298fc1c14` | **PASS** |
| `payment_proofs` | 0 | 0 | 0 | `e3b0c44298fc1c14` | `e3b0c44298fc1c14` | **PASS** |
| `payment_webhook_events` | 0 | 0 | 0 | `e3b0c44298fc1c14` | `e3b0c44298fc1c14` | **PASS** |
| `payments` | 1 | 1 | 0 | `5c9cfb213d60fe75` | `5c9cfb213d60fe75` | **PASS** |
| `permissions` | 10 | 10 | 0 | `5f50a3bb744ecd39` | `5f50a3bb744ecd39` | **PASS** |
| `platform_module_trial_settings` | 4 | 4 | 0 | `b337177bd2d72ea4` | `b337177bd2d72ea4` | **PASS** |
| `profiles` | 102 | 102 | 0 | `d8023d07397d40a6` | `d8023d07397d40a6` | **PASS** |
| `provider_configurations` | 1 | 1 | 0 | `73bc44467d8dbdca` | `73bc44467d8dbdca` | **PASS** |
| `quiz_attempts` | 0 | 0 | 0 | `e3b0c44298fc1c14` | `e3b0c44298fc1c14` | **PASS** |
| `quiz_questions` | 0 | 0 | 0 | `e3b0c44298fc1c14` | `e3b0c44298fc1c14` | **PASS** |
| `quizzes` | 0 | 0 | 0 | `e3b0c44298fc1c14` | `e3b0c44298fc1c14` | **PASS** |
| `role_permissions` | 13 | 13 | 0 | `8a4986f1f9db70c4` | `8a4986f1f9db70c4` | **PASS** |
| `saved_jobs` | 0 | 0 | 0 | `e3b0c44298fc1c14` | `e3b0c44298fc1c14` | **PASS** |
| `site_settings` | 10 | 10 | 0 | `75b5c2f2baffd15a` | `75b5c2f2baffd15a` | **PASS** |
| `skills` | 10 | 10 | 0 | `1933c0532a98d443` | `1933c0532a98d443` | **PASS** |
| `sub_admin_requests` | 3 | 3 | 0 | `fc6e130be8068d35` | `fc6e130be8068d35` | **PASS** |
| `subscriptions` | 3 | 3 | 0 | `4a18a8baf257e34a` | `4a18a8baf257e34a` | **PASS** |
| `tags` | 0 | 0 | 0 | `e3b0c44298fc1c14` | `e3b0c44298fc1c14` | **PASS** |
| `user_badges` | 0 | 0 | 0 | `e3b0c44298fc1c14` | `e3b0c44298fc1c14` | **PASS** |
| `user_module_capabilities` | 9 | 9 | 0 | `b1885b7314af1888` | `b1885b7314af1888` | **PASS** |
| `user_permissions` | 11 | 11 | 0 | `0d33501657e8b302` | `0d33501657e8b302` | **PASS** |
| `user_preferences` | 1 | 1 | 0 | `f4027964aa599250` | `f4027964aa599250` | **PASS** |
| `user_roles` | 102 | 102 | 0 | `6164dc5c19973f1b` | `6164dc5c19973f1b` | **PASS** |
| `user_skills` | 7 | 7 | 0 | `3dc3d9ca24304dd9` | `3dc3d9ca24304dd9` | **PASS** |

### Aggregate Statistics
* **Total Application Tables Migrated:** `80`
* **Total Source Rows:** `2164`
* **Total Neon Rows:** `2164`
* **Row Count Parity:** `100% MATCH`
* **Deterministic SHA-256 Parity:** `100% MATCH`

---

## 4. Live Auth System Inventory & Manifest

* **Total Live Users:** `102`
* **Total Identities:** `103`
* **Verified Emails:** `96`
* **Users with Passwords:** `15`
* **Users with Multiple Identities:** `1`
* **Provider Distribution:**
  - **email:** 13
  - **google:** 90
* **Auth Manifest Artifact:** `reports/auth-manifest.json` (Legacy Supabase UUIDs strictly preserved).

---

## 5. Storage Inventory & Binary Verification (22/22 VERIFIED)

### 5.1 Verified Bucket Inventory (13 Buckets on Neon S3)
* **All 13 Buckets Configured on Neon S3:** `ad-media`, `college-media`, `course-media`, `event-media`, `mentor-media`, `profile-media`, `application-files`, `chat-attachments`, `event-attachments`, `job-files`, `Merotalent`, `payment-proofs`, `resumes`.

### 5.2 22-Object Deterministic Binary Parity Matrix
| Bucket | Object Key | Size (Bytes) | MIME Type | SHA-256 (16) | Status |
|---|---|:---:|---|:---:|:---:|
| `college-media` | `...-b6e8-e119de82e65d/.emptyFolderPlaceholder` | 0 | `application/octet-stream` | `e3b0c44298fc1c14` | **✓ PASS** |
| `college-media` | `...6/8529c6f6-eb92-4325-afd6-cbacff8557b1.png` | 2649 | `image/png` | `4399d349abab6f48` | **✓ PASS** |
| `college-media` | `.../c92cf69d-923e-4bab-8b51-0bcde39482ec.webp` | 155526 | `image/webp` | `4d31841529d54458` | **✓ PASS** |
| `college-media` | `...6/a6b17bb1-6c6d-48d4-bd38-9717dee206f5.jpg` | 20676 | `image/jpeg` | `54517085a8f7d68b` | **✓ PASS** |
| `college-media` | `...6/fac479b0-aa7a-4155-ac3c-20aca181aa58.png` | 4289 | `image/png` | `213dd3bb81aeedb0` | **✓ PASS** |
| `college-media` | `.../860865f6-03e7-48e4-a733-d37b0080b41d.webp` | 138568 | `image/webp` | `f3cd433228991f42` | **✓ PASS** |
| `college-media` | `.../ffd210a6-e2d5-4ee6-8158-6f078339d5fe.webp` | 25968 | `image/webp` | `cd25b09f6f974fa7` | **✓ PASS** |
| `job-files` | `...9/5f68a9f3-bf29-4b8d-8741-e1ab8b44ab7f.pdf` | 191119 | `application/pdf` | `7cee6087382b6b9e` | **✓ PASS** |
| `job-files` | `...9/ee188cc3-51d2-4b84-bd08-4691257eece5.pdf` | 191119 | `application/pdf` | `7cee6087382b6b9e` | **✓ PASS** |
| `job-files` | `...9/f518234e-9753-4fb6-9756-3e0af978040e.pdf` | 43963 | `application/pdf` | `03763e388221d51c` | **✓ PASS** |
| `job-files` | `...9/9b8c6806-077f-45b8-9548-1c63a8992d7e.pdf` | 4547600 | `application/pdf` | `b28057c3b1731c07` | **✓ PASS** |
| `job-files` | `...9/691528cc-cea8-4ebd-9d59-cf0d9dfc1688.pdf` | 1650161 | `application/pdf` | `2a25f5fa90b32b57` | **✓ PASS** |
| `job-files` | `...9/f8a533e0-e5ef-45de-8734-1a9c3fb71451.pdf` | 191119 | `application/pdf` | `7cee6087382b6b9e` | **✓ PASS** |
| `job-files` | `...9/4575d97f-4a35-4c77-8d6e-76d6f4e036d3.pdf` | 5609 | `application/pdf` | `89c78ec5c2468c03` | **✓ PASS** |
| `job-files` | `...9/8dd9ac0a-b766-4aae-af83-ff494dc323e7.pdf` | 949 | `application/pdf` | `86a00b38cbe921ac` | **✓ PASS** |
| `job-files` | `...9/653366d3-18b0-440a-85a2-790f381dd355.pdf` | 331004 | `application/pdf` | `880189cab081d17e` | **✓ PASS** |
| `resumes` | `...494-885d-4f7f-ba7a-86c5873800bd/resume.pdf` | 191119 | `application/pdf` | `7cee6087382b6b9e` | **✓ PASS** |
| `resumes` | `...332-b994a4245f84/resume-1786079104102.docx` | 37731 | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | `d01c6d964c7090fb` | **✓ PASS** |
| `resumes` | `...02f-8ce0-4f51-8763-8b1f6b92fff9/resume.pdf` | 236734 | `application/pdf` | `59db44afa4825a54` | **✓ PASS** |
| `resumes` | `...bbe-91a9-4d54-b9ea-d5bcd8d2a318/resume.pdf` | 67560 | `application/pdf` | `3f33ba742f895e07` | **✓ PASS** |
| `resumes` | `...a745-393aa6ddb182/resume-1786507507914.pdf` | 121311 | `application/pdf` | `0ff0c2d53554d11f` | **✓ PASS** |
| `resumes` | `...b3d-d373-4859-a745-393aa6ddb182/resume.pdf` | 397489 | `application/pdf` | `774544d72ff007d0` | **✓ PASS** |

### 5.3 Aggregate Binary Parity Statistics
* **Live Supabase Storage Objects:** `22`
* **Objects Transferred to Neon S3:** `22/22`
* **Exact Byte-Size Matches:** `22/22` (`8552263` bytes total)
* **Exact SHA-256 Matches:** `22/22`
* **SHA-256 Mismatches:** `0`

### 5.4 Storage Access & Security Tests
* **Target Neon S3 Endpoint:** `https://br-falling-breeze-azr6q64l.storage.c-3.ap-southeast-1.aws.neon.tech` (Verified)
* **Unauthenticated Private Access:** **REJECTED (HTTP 403)**
* **Presigned Private Retrieval:** **VERIFIED (HTTP 200 via S3 Presigned URL)**
* **Public / Media Access:** **VERIFIED**
* **Storage Status:** **VERIFIED**

## 6. Staging Application & RLS Verification

* **Profiles:** `102` active profile records verified.
* **Institutes:** `295` colleges and universities across `231` locations.
* **Job Portal:** `3` active job postings with recruiter relationships.
* **Mentorship & LMS:** `1` mentors, `2` events, `0` courses loaded with full referential integrity.
* **Transaction RLS Isolation:** Verified via `set_config('app.current_user_id', ...)` with automatic rollback on transaction boundaries.

---

## 7. Supabase Runtime Dependency Audit (Current Codebase)

* **Category A (Active Production Core):** `src/integrations/supabase/client.ts`, `src/contexts/AuthContext.tsx`, `src/lib/server/supabase.ts` (Kept intact for live production until cutover).
* **Category B (Neon Adapters Ready):** `src/lib/neon/database.ts`, `src/lib/neon/auth.ts`, `src/lib/neon/storage.ts`.
* **Category C (Test Fixtures):** `src/test/neon-*.test.ts`.
* **Category D (Documentation):** `docs/neon-*.md`.
* **Category E (Cutover Replacements):** API route handlers in `app/api/v1/*`.

---

## 8. Final Verdict & Stop Condition

```text
SOURCE:                 CURRENT PRODUCTION VERIFIED
DATABASE:               REAL IMPORT VERIFIED
AUTH:                   REAL SOURCE MANIFEST VERIFIED
STORAGE:                VERIFIED
RECONCILIATION:         PASSED
STAGING APPLICATION:    VERIFIED
PRODUCTION CUTOVER:     NO-GO
```
