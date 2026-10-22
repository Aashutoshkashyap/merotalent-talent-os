# Current state and gaps

Measured checkpoint: 2026-10-22 (Asia/Kathmandu). This is not full acceptance.

## Observed baseline

- Local and remote `main` began at `6e9a064dfbfc8e5f5d5f0a66a98a4d5b35cce76c`, clean.
- Canonical Vercel inspection returned READY production deployment
  `dpl_J2qbqqfhNVmhkoqtU2duaJcGuj6c`. A READY deployment is not evidence that
  every privileged journey or migration gate passed.
- Neon production and staging use separately pinned DB/Auth/storage tuples.
  Neon server factories reject legacy database access; ordinary browser legacy
  access now fails locally without constructing an SDK or needing source envs.
- Removed the unmounted self-hosted Auth prototype, its unused adapter and
  Coming Soon screen. Direct self-hosted Auth and serverless-driver dependencies
  were removed; Managed Auth's own Better Auth dependency remains legitimate.
- A real College-admin browser reproduced incorrect package-only lead gating
  and misleading manual-access/listing labels. Effective access now comes from
  the scoped entitlement predicate; forbidden features are not fetched. Selected
  College IDs now persist in Notices/public-listing links.
- Fresh real Jobs and Mentor/Event HTTP checks passed on disposable staging
  sessions, including persistence and denial cases. See the execution ledger for
  exact results. They do not prove all browser forms or production workflows.
- Public home sticky-header failure was reproduced and repaired by removing
  the unintended overflow scroll container. Placeholder testimonials/contact
  details were removed without editing saved CMS records. Contact/FAQ controls
  now have accessible names and expanded-state semantics. Real phone 375×667
  and tablet 768×1024 checks verified width, sticky header and keyboard menu
  behavior; this is not acceptance of every module's mobile forms. The shared
  route scroll boundary also prevents new pages opening at the previous page's
  footer, while leaving filters, fragments and history behavior unchanged.

## Outstanding gates

| Gate | Evidence / required work |
| --- | --- |
| Fresh source parity | Dedicated source read-only URL, expected session-pooler host and role are absent; do not substitute an admin URL |
| Historical identity acceptance | Captured source snapshot has 107 users / 108 identities; current staging reconciliation found 1 linked, 104 eligible for proof recovery, 2 unresolved, 0 collisions; not fresh source counts |
| Production eSewa | Disabled; storage key was repaired, historical merchant ciphertext remains unreadable; legitimate merchant entry/registration and authorized settlement still required |
| Genuine sandbox settlement | Hosted provider login/CAPTCHA quota previously failed; pending status is not settlement |
| Private-file acceptance | Latest isolated matrix passed 155/155 real storage/auth checks and removed its 4 accounts / 7 objects; deployed production acceptance remains separate |
| Crash cleanup | Exact-run recovery removed the interrupted browser run's 2 disposable accounts; replacement browser harness also reported cleanup PASS; no source/unmatched account deletion |
| Legacy retirement | Machine inventory is conservative; type imports, recovery and inactive compatibility branches must not be confused with live traffic |
| Visual/performance acceptance | Shared primitives improved; remaining hardcoded page styles still require desktop/mobile verification; no Lighthouse/CWV result because DevTools tools are unavailable |
| Final release/rollback | Reconcile source after a verified write freeze, preserve restore assets, verify each deployed role/workflow before source retirement |

August `HANDOFF-production-tasks.md` and `pending-migrations.sql` are historical
source artifacts. Do not apply that old bundle to Neon or replay it against the
source based on its outdated claim that only database tasks remain.

## Performance scope

Runtime direct dependencies: 64 → 62; the unused `xlsx` development dependency
was also removed. Lockfile package entries: 1,017 → 1,009 after restoring
four missing optional WASI dependency entries for clean CI installs. The
Managed Auth transitive Better Auth package is retained, not claimed removed.
Ordinary Neon startup constructs zero legacy clients. Profile GET now executes
one profile/capability query instead of two sequential queries after identity
resolution; the regression verifies exact query count and unchanged scope/expiry.
Five staging profile reads varied from 1,538–6,347ms during development changes;
they are not a controlled latency comparison or proof of a production speedup.
Before this batch, all production JS chunks totaled 3,520,650 raw / 1,094,138
gzip bytes across 234 files; this is all chunks, not initial-route transfer size.
Initial brand changes grew that local build by about 4KB gzip, not a speedup.
Controlled explicit-Neon builds then measured the App dynamic entry (excluding
framework and later route chunks): 674,331 → 424,772 raw bytes and
194,782 → 127,604 gzip bytes, a 34.5% gzip reduction. The source recovery UI/SDK
is lazy-loaded; lightweight callback routing retains its original proof rules.
No browser LCP/INP claim follows from this bundle measurement.
