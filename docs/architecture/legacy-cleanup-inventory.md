# Legacy cleanup inventory

The complete per-file reference disposition and AST runtime-import records are
in [`legacy-cleanup-inventory.json`](legacy-cleanup-inventory.json). Generate via
`node scripts/build-architecture-inventory.mjs`; verify using `--check`.
Output contains paths/counts, never matched credential values. It covers tracked
and nonignored text files, including imports, scripts, configuration, tests,
documentation and migrations; private ignored artifacts are intentionally excluded.

Dispositions: ACTIVE means intentionally retained; MIGRATION REQUIRED means
caller-by-caller retirement evidence is still required; DEAD means proven unused;
HISTORICAL/RECOVERY means preserve; UNKNOWN means investigate before deleting.
Conservative file classification does not prove every conditional branch is live.
The AST inventory now explicitly labels erased type imports. At this checkpoint
109 files contain import references: 102 static-reference files, 97 with a
non-type static edge, three containing only type edges, seven dynamic-import
files, and two conditional-require files. These categories overlap; none is a
count of live production network calls. Server SDK construction is now lazy as
well as the existing browser denial boundary and recovery split.

## Executed removals

| Candidate | Proof | Disposition |
| --- | --- | --- |
| `src/screens/ComingSoonPage.tsx` | No import/dynamic caller after competition route switched to real directory; regression asserts real route | DEAD; removed, recoverable from Git |
| `src/lib/server/neon-auth-experiment.ts` | No application caller; unmounted RPC compatibility experiment; real session/authorization services supersede it | DEAD; removed, recoverable from Git |
| `src/lib/server/better-auth.ts` | Only consumer was the dead experiment; no route mounts self-hosted instance | DEAD; removed, recoverable from Git |
| Direct `better-auth`, `@neondatabase/serverless` dependencies | Source-wide import trace found only removed prototype consumers | DEAD direct dependencies; removed; Managed Auth transitive Better Auth retained |
| `xlsx` dependency | No source/script import; exports already use tested dependency-free SpreadsheetML with honest `.xml` extension | DEAD dependency; removed; spreadsheet export behavior retained |

## Deliberately retained

- Supabase SDK: proof-only historical recovery and legacy compatibility/source
  tooling still import it. Removal now would break legitimate recovery.
- Generated Supabase structural types: consumed by domain/schema contracts;
  a type name is not a network client.
- Legacy branches in domain services: disabled by explicit Neon selection;
  require complete domain acceptance before removal, not mass search/replace.
- Applied SQL, source-export/reconciliation/storage/backup scripts and old
  handoffs: historical/recovery assets, not current deployment instructions.
- `neon-db.ts` retired denial contract: tests explicitly require it to reject
  unsupported user-context RLS; do not silently turn it into a privileged facade.
- CI source drift check: UNKNOWN for production ownership until the live backend
  and read-only Neon drift mechanism are reconciled; do not feed it admin secrets.

Removal gate: identify all static/dynamic/aliased callers, verify replacement
including security and browser persistence, confirm deployed runtime no longer
uses the legacy path, preserve rollback, then remove in a reviewed release.
