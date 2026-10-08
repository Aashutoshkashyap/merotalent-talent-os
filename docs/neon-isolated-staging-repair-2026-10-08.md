# MeroTalent — actual Neon `migration-staging` repair (2026-10-08)

> A subsequent same-day staging reconciliation restored 47 reviewed triggers, two views, three search indexes, and ten constraints. See `neon-staging-schema-parity-2026-10-08.md`, `neon-staging-security-object-classification-2026-10-08.md`, and `neon-staging-storage-bucket-parity-2026-10-08.md` for the current state. This note records the initial branch repair, not the final schema inventory.

This report supersedes the earlier report's claim that `ep-polished-flower-azsezy8a-pooler` was isolated staging. That compute belongs to Neon production. There was no production cutover, deployment, push, Supabase production write, or Supabase Auth import in this repair.

## A–D. Identity and pre-migration gate

| Environment | Project/branch | Database and host | PostgreSQL | Initial application state |
| --- | --- | --- | --- | --- |
| Source | Supabase `dtirpilgzlsfryucanlg`, production | `postgres` on `db.dtirpilgzlsfryucanlg.supabase.co` | 17.6 | 80 tables, 2,168 live rows |
| Existing Neon production | `summer-sky-63693897` / `br-falling-breeze-azr6q64l` | `neondb` on `ep-polished-flower-azsezy8a-pooler.c-3.ap-southeast-1.aws.neon.tech` | 18.6 | 80 tables, 2,164 rows; read-only comparator |
| Required target | `summer-sky-63693897` / `br-frosty-haze-azsnybmr` (`migration-staging`) | `neondb` on `ep-wispy-credit-azt6tgwj-pooler.c-3.ap-southeast-1.aws.neon.tech` | 18.6 | 0 public tables, 0 application rows, 0 Managed Auth users |

The staging branch and compute identity were independently observed in the Neon Console and connected read-only. `.migration.env` was corrected using `dotenv.config({ path: ".migration.env" })`: production and staging database URLs are now separate. The existing production credentials were not rotated or overwritten.

The staging Auth URL shown by that same branch's Console is `https://ep-wispy-credit-azt6tgwj.neonauth.c-3.ap-southeast-1.aws.neon.tech/neondb/auth`. Its JWKS endpoint returned HTTP 200 with one key. No production identities were imported.

## E–F. Database transfer and reconciliation

The existing table-copy process was guarded to require the exact staging host and an empty target; destructive `DROP SCHEMA` and Supabase Auth manifest extraction were removed. The live source had advanced by four rows since the prior 2,164-row report. The target therefore contains **80 tables / 2,168 rows** from the current source, not the stale 2,164-row snapshot.

Read-only per-table deterministic SHA-256 reconciliation: **80/80 table matches, 2,168/2,168 rows, zero row-count variance**. See `neon-isolated-staging-reconciliation-2026-10-08.json`. Source-to-target application *row* parity is verified.

Full PostgreSQL *schema* parity is **not** verified. Source has 153 public functions, 87 triggers, 390 policies, 2 views, 287 non-primary constraints and 177 indexes. Staging has 47 public extension functions, 0 triggers, 0 policies, 0 views, 219 portable non-primary constraints and 174 indexes. The missing definitions include 58 foreign keys referencing the absent Supabase `auth` schema, nine constraints whose referenced unique keys are unavailable in the simplified table schema, one check requiring a missing function, and three indexes with unavailable dependencies. Copying Auth-dependent security logic into Neon before an authorization design review would be unsafe. The previous migration process did not copy functions, triggers or policies either; the earlier “staging verified” wording was inaccurate.

The guarded constraint/index resume used Supabase production for read-only definitions and wrote only to actual staging. Neon production still reports 80 tables and 2,164 rows and was not changed.

## G–H. Storage inventory and SHA-256

Supabase production Storage currently has **13 buckets, 22 objects, 8,552,263 bytes**. The staging branch initially displayed no provisioned buckets, and S3 `ListBuckets` returned `NoSuchBucket`. Creating `college-media` on the selected `migration-staging` branch initialized branch storage and exposed 12 inherited buckets containing 22 objects. This means staging storage was **not actually empty**, despite its initial empty Console view; no bulk upload or overwrite was performed.

Read-only source-to-staging byte comparison found **22/22 SHA-256 matches**, **8,552,263/8,552,263 bytes**, and **22/22 content-type matches**. See `neon-isolated-staging-storage-reconciliation-2026-10-08.json`. Neon production storage remains at 12 buckets, 22 objects, and 8,552,263 bytes.

Storage bucket parity is **not** verified: the source's empty uppercase `Merotalent` bucket has no exact staging counterpart (12/13). Also, source buckets `ad-media`, `course-media`, `event-media`, `mentor-media`, and `profile-media` are public while the inherited staging buckets were shown as private in the Console. The application currently uses signed reads for public media on Neon, but the bucket visibility discrepancy needs an explicit policy decision. No inherited bucket was deleted or made public.

## I–K. Configuration and runtime/institute tests

Local staging configuration now binds database, Auth and object storage to `br-frosty-haze-azsnybmr`. Startup validation rejects production-branch database, Auth, or storage endpoints in `neon-staging` mode. It does not silently fall back to Supabase. This is **local/staging-only** configuration; no Vercel production variables were changed.

Actual staging integration tests passed **14/14**. They covered public institute data, profile/role/entity authorization reads, failed cross-entity updates with unchanged records, signed public and private object reads, unauthorized media denial, authorized test-object upload/read/delete with cleanup, and direct institute route responses: public 200, missing 404, malformed ID 400, managed read without session 401, protected PATCH without session 401, invalid PATCH body 400. The institute policy tests use explicit synthetic actors; they are **not proof of a real Managed Auth login**. Route handlers were invoked directly in the test runner, not via a deployed HTTP server.

## L–N. Auth readiness, discrepancies, and next step

Auth is **blocked for real sign-in**. The staging Auth endpoint and JWKS are reachable and the application profile/roles/entity rows exist, but `public.neon_identity_links` is absent and no controlled staging identity is linked. Do not infer a relationship by email and do not import production Supabase Auth identities. Next Auth step: first resolve the schema/authorization and storage-bucket discrepancies, then create one controlled staging-only Managed Auth identity, establish a verified unique link to a staging application profile, and exercise an actual session without touching production.

**Final status:**

- Database production *row* parity: **VERIFIED** against the current 2,168-row Supabase source.
- Staging database: **NOT VERIFIED as a full runtime/schema replacement** (functions, triggers, policies, views and some constraints/indexes remain absent).
- Staging storage: **NOT VERIFIED in full** (22/22 object bytes verified; 12/13 buckets and visibility mismatch).
- Institute slice on actual staging: **PARTIALLY VERIFIED** (14/14 direct integration tests; no real Auth session or deployed HTTP app).
- Auth: **BLOCKED pending verified staging identity link and schema/security reconciliation**.
- Realtime: **NOT MIGRATED**.
- Production cutover: **NO-GO**.

Verification: `npm run typecheck` passed; `npm run test` passed (95 files, 409 tests); actual-staging integration passed (1 file, 14 tests); `npm run lint` passed with 0 errors and 53 warnings; `npm run build` passed after allowing the build to fetch Google Fonts (its first sandboxed attempt failed on DNS); `git diff --check` passed. No commit, push, or deployment was performed.
