# Neon migration-staging readiness gate — 2026-10-08

Decision: **AUTH BLOCKED; PRODUCTION CUTOVER NO-GO.** At the time of this readiness audit, no production Auth users were imported, no Auth login test was run, no GitHub push/deployment occurred, and no production configuration was changed. A later source-control checkpoint does not change the Auth or cutover decision.

| Gate | Evidence | Decision |
| --- | --- | --- |
| Database row parity | 80/80 tables, 2,168/2,168 rows, 80/80 table SHA-256 matches after schema writes | Pass |
| Required schema objects | 47/87 source triggers retained, 2/2 views present, 16 reviewed application functions retained, 58 Auth-user FKs absent | Partial |
| Authorization | 390 source policies classified; 0 target RLS policies; four public-read replacements, 345 redesign, 41 manual review | Partial; no trusted Neon actor context |
| View behavior | Profile view exact 103 rows/SHA; institute view 292 rows semantically equal after normalizing PostgreSQL-version-dependent derived tag/program ordering | Pass with documented raw-hash difference |
| Storage objects | 22/22 objects, 8,552,263/8,552,263 bytes, 22/22 SHA-256 and content-type matches | Pass |
| Storage buckets | 12/13 exact names; missing empty and unmapped legacy `Merotalent` bucket; 12/12 active mapped names present | Partial exact parity; intentional legacy exclusion |
| Staging branch identity | Database/storage and runtime guards target `br-frosty-haze-azsnybmr`; staging JWKS endpoint was previously observed responding for this branch | Branch guard passes; no Auth login exercised |
| Identity link | `public.neon_identity_links` absent; trustworthy mapping workflow not yet implemented | Blocked |
| Runtime | Only selected Neon-backed server routes and storage operations work; most existing client/RPC paths remain on Supabase | Partial |

The missing RLS policies must **not** be copied blindly. With the current architecture, the next Auth phase must establish a verified Neon Managed Auth session, trusted legacy-ID mapping, and operation/resource checks for each migrated route, then address the remaining high-risk trigger/RPC behavior and identity foreign keys. The server-only staging database credential must never be supplied to browsers.

Current verification: staging integration tests 20/20 (including rollback-only trigger checks and storage), unit tests 409/409, typecheck pass, lint 0 errors/53 warnings, build pass, `git diff --check` pass. The first parallel typecheck raced with Next's `.next/types` regeneration during build and failed on missing generated files; a sequential rerun after build passed.

No Auth readiness approval is inferred from successful table hashes, views, build, or synthetic policy actors. Realtime is not migrated.
