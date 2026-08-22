# Handoff — production catch-up tasks

**For:** whoever holds Supabase production credentials for project
`dtirpilgzlsfryucanlg`, plus GitHub admin on this repository.
**Status:** all application code is done and merged to `main`. Only the tasks
below remain, and none of them are code changes.
**Written:** 2026-08-21. **Last measured:** 2026-08-22.

You can hand this file to a coding agent as-is. Every step states its expected
output so the agent can verify rather than assume.

---

## 0. Task list

Five tasks, in order. Tasks 1–4 are one sitting; task 5 is independent.

| # | Task | Who / what is needed | Section |
| - | ---- | -------------------- | ------- |
| 1 | Take a database backup | Supabase dashboard | [§3](#3-before-you-start) |
| 2 | Apply 6 pending migrations | Supabase SQL editor | [§4](#4-apply-in-this-order) |
| 3 | Record the versions applied | same SQL editor session | [§6](#6-record-the-versions-afterwards) |
| 4 | Verify the outcome | terminal + the app | [§7](#7-confirm-the-outcome) |
| 5 | Add two CI secrets | GitHub repo settings | [§8](#8-enable-the-drift-check-in-ci) |

**An agent can do most of this.** What it cannot do is click through the
Supabase dashboard or the GitHub settings UI — so tasks 1 and 5, and the paste
in task 2, need a human. Everything else is a command.

### Quick version for an agent

```bash
# from the repo root, after `git pull`
npm ci
npm run check:drift          # shows what production is missing (expect 23)
npm run db:bundle-pending    # writes pending-migrations.sql
# --- human: paste that file into the Supabase SQL editor and run it ---
npm run check:drift          # expect: "No drift"
```

The generated bundle already contains the migrations in order, the task-3
bookkeeping, and verification queries. **Do not skip §3** — the first migration
mutates live rows.

**Do not apply `20260820163000_confirm_test_user_email.sql`.** It is excluded
from the bundle by construction; [§5](#5-do-not-apply-20260820163000_confirm_test_user_emailsql)
explains why.

---

## 1. Why this exists

Students' college applications were never reaching the database, and colleges
could not see the ones that did. The application-code causes are fixed and
pushed. What is left is that **production is three migrations behind**, and one
of the pending migrations must never be applied.

### Already fixed in code — do not re-introduce

Listed so you don't undo them while working in this area:

| Fix | Detail |
| --- | --- |
| Client-side insert into `college_applications` | Removed. The table has no RLS `INSERT` policy; submissions now go through `submitAuthenticatedModuleForm` → `/api/v1/submissions/college_application` → RPC `submit_college_application`. |
| Silent success on failure | Several screens `await`ed Supabase calls without reading `error`. supabase-js *resolves* with `{ error }` instead of throwing, so failures reported success. All now check `error`. |
| Phantom columns | `target_program`, `education_level`, `institute_name`, `user_id` and four others do not exist on `college_applications`. Guarded by `src/lib/institutes/college-application-status-contract.test.ts`. |
| Invalid statuses | UI wrote `pending` / `followed_up` / `admitted`; the CHECK constraint allows only `submitted, reviewing, contacted, accepted, rejected, withdrawn`. Now typed via `CollegeApplicationStatus`. |
| Client-side auth bypass | `AuthContext` fabricated a session and called `setRoles(["admin"])` for ten hardcoded `@merotalent.com` addresses when real sign-in failed — no correct password required. Removed (189 lines). Guarded by `src/contexts/auth-client-authority-contract.test.ts`. |
| `invalid input syntax for type uuid` | Caused by the above mock user id `test-institution-id`, plus a synthetic institute id `unclaimed-workspace` reaching uuid columns. Both fixed. |
| Silent writes across the app | An audit found the same pattern in nine more places — admin site settings, institute access requests, early-access signups, the notification bell, manual enrolment, subscription extension and two admin deletes. All fixed. Guarded by `src/lib/db/schema-contract.test.ts`, which checks every table for phantom columns, omitted `NOT NULL` columns, and discarded write results. |
| AI provider key | No longer written to `site_settings`, which is publicly readable until `20260812130000` lands. It stays browser-local; it should move to a server-side env var. |

Test users are now created only by the sanctioned path:

```bash
npm run seed:test-users
```

---

## 2. Verified production state

Established by probing the REST surface with the public anon key. A function
that exists but is not callable by `anon` returns `42501`; one that does not
exist returns `PGRST202`. That distinction was confirmed against a deliberately
fake function name before being relied on.

| Migration | State |
| --- | --- |
| `20260806090000_modular_platform_backend` | applied |
| `20260810110000_secure_college_directory_and_applications` | applied |
| `20260810110500_rbac_and_entitlement_hardening` | applied |
| `20260812130000_free_tiers_and_access_hardening` | **pending** |
| `20260817193000_public_competition_access_hardening` | **pending** |
| `20260817230000_multi_role_support` | **pending** |
| `20260820163000_confirm_test_user_email` | **do not apply — see §5** |
| `20260821120000_harden_confirm_test_user_email` | **pending** (no-op here; see §5) |
| `20260822120000_admin_delete_policies` | **pending** (see §4.5) |
| `20260822130000_reconcile_page_sections_columns` | **pending** (see §4.6 — required; not fixed by any other migration) |

Measured directly against production on 2026-08-22 with
`npm run check:drift`: **23 differences** — 12 missing columns and 11 missing
functions, no missing tables. Re-run that command any time to refresh this.

Confirm the starting point before doing anything:

```sql
select proname
from   pg_proc p
join   pg_namespace n on n.oid = p.pronamespace
where  n.nspname = 'public'
  and  proname in ('submit_module_form',
                   'provision_default_free_tier',
                   'admin_grant_role',
                   'confirm_test_user_email')
order  by proname;
```

**Expect exactly one row: `submit_module_form`.** Anything else means production
has moved since this was written — stop and re-audit.

---

## 3. Before you start

Step 4.1 mutates live rows in `packages`, `sub_admin_requests` and
`site_settings`. Each migration is wrapped in a single `BEGIN … COMMIT`, so a
*failure* rolls back cleanly — but a *successful* migration you later regret has
no undo.

**Confirm a recent backup or PITR window in Database → Backups first.**

---

## 4. Apply, in this order

### The short path

Generate one ordered file containing every pending migration, the
`schema_migrations` bookkeeping, and the verification queries:

```bash
npm run db:bundle-pending      # writes pending-migrations.sql (gitignored)
```

Paste that into the Supabase SQL editor and run it top to bottom. It is built
from the migration files themselves, so it cannot drift from them, and it
deliberately excludes `20260820163000` (§5). Each migration keeps its own
`BEGIN`/`COMMIT`: if one fails it rolls itself back and execution stops there,
leaving the ones above it applied.

The per-migration detail below explains what each one does and how to verify it
individually — useful if the bundle stops partway.

### The detailed path

Order is the migration timestamp order and it is load-bearing. Paste each file
whole; never split one across runs or you lose its transaction.

### 4.1 `20260812130000_free_tiers_and_access_hardening.sql`

1090 lines. Atomic, and re-runnable (`ADD COLUMN IF NOT EXISTS`, `ON CONFLICT`).

This is the one that fixes the reported symptom. Colleges could not see
applications because the read policy requires
`has_entity_entitlement(…, 'college_applications', 'read_only')`, and with no
default free package an owner without a paid subscription never satisfies it.

Adds five columns to `packages`, seeds the `student-free` / `college-free` /
`mentor-free` tiers, normalises `sub_admin_requests`, and creates the free-tier
provisioning functions. It does **not** backfill subscriptions for existing
users — the `subscriptions` writes sit inside function bodies and only run when
those functions are later called.

```sql
select code, package_kind, is_default_free, module_scope
from   public.packages
where  package_kind = 'free'
order  by code;
```

**Expect** three or more rows including `college-free`, each with
`is_default_free = true`.

### 4.2 `20260817193000_public_competition_access_hardening.sql`

14 lines, policy only. Narrows public competition visibility to `upcoming` and
`ongoing` — a tightening, not a widening.

⚠️ This file has **no transaction of its own** and drops the old policy before
creating the new one, leaving a brief window where the public cannot read
competitions at all. Wrap it:

```sql
begin;
  -- full contents of the migration file here
commit;
```

```sql
select policyname, roles, cmd
from   pg_policies
where  schemaname = 'public' and tablename = 'competitions';
```

**Expect** `Public views active competitions` present and
`Anyone can view published competitions` gone.

### 4.3 `20260817230000_multi_role_support.sql`

81 lines. Atomic, functions only.

Adds `admin_grant_role` and `admin_revoke_role` so one user can hold several
roles. Both are `SECURITY DEFINER` but open with an
`is_platform_admin(auth.uid())` check and raise `42501` otherwise, so the
`authenticated` grant is safe — the real gate is inside the function. Its
dependency `is_platform_admin` is already live. No top-level data mutation; the
`DELETE FROM user_roles` is inside `admin_revoke_role` and is further protected
by the existing `protect_last_admin_role` trigger.

```sql
select proname
from   pg_proc p
join   pg_namespace n on n.oid = p.pronamespace
where  n.nspname = 'public'
  and  proname in ('admin_grant_role', 'admin_revoke_role');
```

**Expect exactly 2 rows.**

### 4.4 `20260821120000_harden_confirm_test_user_email.sql`

Apply it. On production it is a deliberate **no-op** — it only acts if
`confirm_test_user_email` exists, which it does not here. Applying it keeps the
migration ledger honest and protects any environment that *did* apply the
fixture. See §5 for why it exists.

### 4.5 `20260822120000_admin_delete_policies.sql`

Adds the missing `DELETE` policies on `profiles` and `packages`, restricted to
an active platform admin. Neither table had one, so the admin UI's delete
actions were denied under RLS while the UI reported success. The call sites now
surface the error, so until this lands an admin will see an explicit failure
rather than a silent one.

```sql
select tablename, policyname
from   pg_policies
where  schemaname = 'public'
  and  tablename in ('profiles', 'packages')
  and  cmd = 'DELETE';
```

**Expect 2 rows.**

### 4.6 `20260822130000_reconcile_page_sections_columns.sql`

**Apply this even if you skip everything else.** It is the only migration here
that fixes a problem no other migration can.

`page_sections.parent_id` and `extra_data` are declared inside the
`CREATE TABLE IF NOT EXISTS` block of `20260812000000`, but were added by editing
that file *after* it had already been applied. The migration is recorded as run
so it never repeats, and `CREATE TABLE IF NOT EXISTS` reconciles nothing on an
existing table — so those columns can never arrive on their own. Confirmed
absent from production.

This is why nested page sections work locally and silently do not nest on the
deployed site: `AdminPageEditor` catches the missing-column error and retries
without the parent. It now says so instead of reporting a clean success.

```sql
select column_name
from   information_schema.columns
where  table_schema = 'public' and table_name = 'page_sections'
  and  column_name in ('parent_id', 'extra_data');
```

**Expect 2 rows.**

---

## 5. Do not apply `20260820163000_confirm_test_user_email.sql`

This migration creates a `SECURITY DEFINER` function that sets
`auth.users.email_confirmed_at` for any address ending `@merotalent.com`, then
ends with:

```sql
GRANT EXECUTE ON FUNCTION public.confirm_test_user_email(text)
  TO anon, authenticated;
```

Because `anon` is included, **any unauthenticated caller on the internet** can
invoke it against the production REST endpoint. The domain is not neutral —
`AuthContext.tsx` previously mapped `superadmin@merotalent.com` and
`qa.admin@merotalent.com` to the `admin` role. It is the only `anon`-granted
function in this schema that performs a write; every other one is a read-only
boolean predicate used inside RLS policies.

Its own first line calls it a fixture "for local development."

**Nothing depends on it.** The client no longer calls it — those call sites were
removed along with the mock-auth path. If you ever do need it in an environment,
`20260821120000` restricts it to `service_role`.

Mitigating detail, for completeness: `bootstrap_first_admin` is correctly
restricted to `service_role`, so this cannot be chained directly into admin
bootstrap. That lowers severity but does not make an anonymous write path into
`auth.users` acceptable.

---

## 6. Record the versions afterwards

Applying SQL by hand does **not** update `supabase_migrations.schema_migrations`,
the ledger the CLI reads. Leave it untouched and a later `supabase db push` will
try to replay these files. 4.1 and 4.3 are re-runnable, but 4.2 would drop and
recreate its policy again.

```sql
insert into supabase_migrations.schema_migrations (version)
values ('20260812130000'),
       ('20260817193000'),
       ('20260817230000'),
       ('20260821120000'),
       ('20260822120000'),
       ('20260822130000')
on conflict (version) do nothing;
```

Deliberately omit `20260820163000`. Leaving it unrecorded is what stops a future
push from quietly re-introducing the anon grant. If your CLI then reports it as
pending, that is the intended state — treat it as permanently skipped.

---

## 7. Confirm the outcome

```sql
select proname
from   pg_proc p
join   pg_namespace n on n.oid = p.pronamespace
where  n.nspname = 'public'
  and  proname in ('provision_default_free_tier',
                   'admin_grant_role',
                   'admin_revoke_role',
                   'confirm_test_user_email')
order  by proname;
```

**Expect** the first three present and `confirm_test_user_email` absent.

Or simply re-run the drift check, which should then report no drift:

```bash
npm run check:drift
```

Then check the original symptom end to end:

1. Sign in as a college owner and open the institute dashboard. Applications
   should list instead of showing the "Plan required" gate.
2. Sign in as a student, open `/dashboard/colleges`, and submit an application.
   It should succeed, and appear on the college's dashboard.
3. If submission fails, the error is now shown rather than swallowed. Map it:
   - `403 SUBMISSION_NOT_ALLOWED` → entitlement/permission gate, check §4.1 landed
   - `503 SERVICE_UNAVAILABLE` (`PGRST202`) → the RPC is missing
   - `422 VALIDATION_FAILED` → payload rejected by the form definition

---

## 8. Enable the drift check in CI

Independent of the database work, and the thing that stops this handoff being
needed again.

`.github/workflows/ci.yml` already contains a job that runs
`npm run check:drift` against production on every push to `main`, daily at
02:00 UTC, and on demand. It is inert until two repository secrets exist.

**GitHub → repository → Settings → Secrets and variables → Actions → New
repository secret.** Add both:

| Secret name | Value |
| ----------- | ----- |
| `NEXT_PUBLIC_SUPABASE_URL` | same value as in `.env` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | same value as in `.env` |

Both are already public — they ship in the browser bundle. The secrets exist so
CI does not need a committed env file, not because the values are sensitive.
**Do not** put `SUPABASE_SECRET_KEY` or any database connection string here; the
drift check only ever needs the anon key.

Until they are set the job prints a warning and passes, so CI is never blocked
by the missing configuration. Once set, verify with **Actions → CI → Run
workflow**; the `Schema drift vs production` job should pass after the database
tasks above are complete.

While you are in there: the same workflow runs `npm run check:migrations` on
every pull request, which fails if a branch edits an existing migration instead
of adding a new one. That is the guard against the `page_sections` problem
described in [§4.6](#46-20260822130000_reconcile_page_sections_columnssql)
happening again. Consider making the `verify` job a required status check on
`main` in **Settings → Branches** so it cannot be bypassed.

---

## 9. If something goes wrong

- A migration that raises inside its `BEGIN … COMMIT` leaves **no partial
  state** — fix the cause and re-run the whole file.
- 4.1 and 4.3 are safe to re-run as-is. 4.2 is safe to re-run but will briefly
  drop the public policy again.
- If 4.1's unique indexes fail, production already has more than one
  `is_default_free = true` row for a scope. Inspect before forcing:

  ```sql
  select code, audience, module_scope, is_default_free, is_active
  from   public.packages
  where  is_default_free = true;
  ```

- Only 4.1 touches billing-adjacent data. If you need to walk it back, restore
  from the backup taken in §3 rather than hand-reversing it.

---

## 10. Open items not covered here

- Production is only reachable by hand right now: no linked Supabase project
  (`supabase/.temp` absent), no Supabase CLI installed, and `.env` carries only
  the public anon key. Consider linking the project and adopting
  `supabase db push` so this handoff is not needed next time.
- `src/screens/institute/InstituteDashboard.tsx` still synthesises an
  "unclaimed workspace" record with a non-uuid id. Queries are now guarded, but
  a real nullable-institute state would be cleaner than a fake row.
