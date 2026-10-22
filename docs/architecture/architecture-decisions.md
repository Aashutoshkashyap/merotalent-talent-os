# Architecture decisions

| ID | Decision | Enforcement / consequence |
| --- | --- | --- |
| ADR-001 | Neon Managed Auth, not self-hosted Better Auth, is canonical | Remove unmounted prototype; exact branch session verifier; no synthetic provider mappings |
| ADR-002 | PostgreSQL domain repositories enforce authorization | `neon-authorization.ts`, parameterized SQL and atomic lead/payment predicates; copied Supabase RLS alone is not Neon authorization |
| ADR-003 | One explicit runtime, no silent Supabase fallback | Server rejects mode disagreement; Neon browser legacy facade throws before SDK construction or env access |
| ADR-004 | Recovery is not a second application Auth system | Explicit nonpersistent source proof plus unique verified identity ledger; retain until historical recovery disposition |
| ADR-005 | Object storage paths and permissions remain server-owned | Existing S3 adapter/policy, signed private downloads, byte/type checks and exact replacement/deletion rules |
| ADR-006 | Payment returns never establish success | Existing order/signature/status verification and atomic idempotent fulfillment; production disabled while merchant credential/settlement gates fail |
| ADR-007 | Entitlements differ from packages and listing verification | Manual/free/trial entitlements retain exact features/scope/expiry; UI must not require an unrelated paid package |
| ADR-008 | Notifications are durable and scoped | Persist events; bounded SSE; provider email result reported separately |
| ADR-009 | Preserve official mark and shared UI stack | Central brand constants + existing Tailwind/Radix primitives; no new CSS/component framework |
| ADR-010 | Vercel is the application release path | Review, tests, build, Git SHA, READY deployment and live acceptance; Cloudflare DNS is not evidence of a second app deployment |
| ADR-011 | Cleanup requires reachability and replacement evidence | Per-file conservative inventory; retain UNKNOWN, migration history, snapshots and rollback assets |
| ADR-012 | Performance claims require measured scope | Record dependency/bundle/request evidence; no unsupported Lighthouse or “lightning fast” claims |

Architecture documents describe ownership and intent, not proof of migration
acceptance. The existing sprint ledger is the single execution/acceptance record.
