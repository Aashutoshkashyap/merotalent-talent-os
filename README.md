# MeroTalent Talent OS

MeroTalent is a role-based talent ecosystem for Nepal and South Asia. It brings
opportunity discovery, competitions, learning, mentorship, institutions, hiring,
and platform administration into one responsive web application.

## Product workspaces

- **Talent:** proof-of-skill profile, competitions, jobs, badges,
  mentor sessions, and messages.
- **Mentor:** sessions, mentees, availability, resources, and follow-ups.
- **Company:** jobs, matched talent, shortlists, interviews, and hosted
  challenges.
- **Institution:** profile, applications, notices, programs, and outcomes.
- **Admin:** people, roles, content, jobs, competitions, partners, support, and
  platform health.
- **Partnered courses:** discovery listings that redirect to
  `https://learn.merotalent.com`; course delivery is outside this application.

## Stack

- Next.js App Router
- React + TypeScript
- Tailwind CSS and Radix UI
- Supabase Auth, Postgres, Storage, RLS, and Edge Functions
- TanStack Query, React Hook Form, Zod, Framer Motion, and Recharts

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Toolchain

The project requires Node.js >= 20.19.0 and npm >= 10, declared under `engines`.
`npm run dev` runs an offline check first and stops with update instructions if
either is below the floor.

To find out whether a newer Node LTS or npm release is available:

```bash
npm run check:toolchain
```

That variant queries nodejs.org and the npm registry, prints the update command
for anything out of date, and never fails the build — so a registry outage or
working offline will not block you. Prefer `npm` for installs; a `bun install`
resolves a different dependency tree and leaves `.next/types` inconsistent with
the pinned Next version, which surfaces as unrelated `tsc` errors.

Copy `.env.example` and configure the public browser variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SUPABASE_PROJECT_ID=
```

Server routes additionally require the unprefixed Supabase variables. Keep
`SUPABASE_SECRET_KEY`, database connection strings, and `CRON_SECRET` in the
local/Vercel secret manager only; never expose them through `NEXT_PUBLIC_*`.
Set `AUTH_INVITE_REDIRECT_URL` to the exact allowlisted production password
setup route, for example
`https://merotalent.vercel.app/reset-password`. Administrator invitation
links fail closed unless this server-only value is HTTPS, has no query,
fragment, credentials, or custom port, and uses the exact `/reset-password`
path. It is never derived from the request Host header.

Provider credentials (eSewa, email, and platform AI) additionally require the
server-only `PROVIDER_CONFIG_ENCRYPTION_KEY`: base64 for exactly 32 random bytes.
It encrypts provider credentials with AES-256-GCM and must never be named with a
`NEXT_PUBLIC_` prefix or committed. Generate it with `openssl rand -base64 32`.
Read [provider-secret storage](docs/provider-secret-storage.md) before setting
or rotating it in Vercel; rotation makes secrets encrypted by the prior key
unreadable until they are replaced.

Apply every SQL file in `supabase/migrations` in timestamp order before enabling
sign-ups against a new Supabase project. The modular platform migration adds
RBAC permissions, subscriptions, college applications, mentor bookings, jobs,
events, leads, payments, notifications, advertisements, featured content,
auditing, generated-form submissions, private media buckets, and maintenance.

## Continuous integration

`.github/workflows/ci.yml` runs on every pull request and push to `main`:

| Check | Command |
| --- | --- |
| Migrations are append-only | `npm run check:migrations` |
| Types | `npm run typecheck` |
| Lint | `npm run lint` |
| Tests | `npm run test` |
| Build | `npm run build` |

A separate job checks live schema drift on pushes to `main`, on a daily
schedule, and on demand. It needs two repository secrets —
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Until
they are set the job emits a warning and passes, so CI is not blocked by a
missing secret. Both values are already public in the browser bundle; the
secrets exist so CI does not need a committed env file.

## Quality checks

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

Or run the complete pipeline:

```bash
npm run check
```

## Role security

Roles are stored separately from profiles in `public.user_roles` and protected
with row-level security. Apply migrations in timestamp order. The
`20260729023000_safe_self_service_roles.sql` migration permits self-service
selection only for non-privileged roles; administrator access still requires an
existing administrator.

Role names retain compatibility with the current frontend: `admin` is Super
Admin, `talent` is Student/User, and `institution` is College. Job posting and
event organizing are permissions and can be granted independently. Premium
lead access is enforced by database row-level security and active-subscription
checks, not by UI visibility alone.

## Versioned APIs

- `GET /api/v1/forms` lists generated form definitions.
- `GET /api/v1/forms/{module}` returns a college, job, mentor, or event form.
- `POST /api/v1/submissions/{module}` validates and stores an authenticated
  form submission through a database-owned transaction.
- `POST /api/v1/media/upload-url` and `/api/v1/media/download-url` issue scoped,
  short-lived Storage URLs after database authorization.
- `/api/v1/admin/*` provides authenticated Super Admin CRUD and reports with
  pagination, filtering, sorting, JSON, CSV, and Excel-readable XML exports.
- `/api/v1/admin/auth-users` provides invite-only Auth user provisioning,
  sanitized listings, access suspension/reactivation, role changes, and
  confirmation-gated deletion. It never accepts or generates passwords.

All API responses disable caching and use a consistent `{ data, error, meta }`
shape. Administrative writes are protected by both server guards and RLS.
On a new project, accept and verify the first administrator invitation before a
trusted service-role client calls the one-time `bootstrap_first_admin` RPC.

## Outstanding production tasks

Production is behind this repository, and one migration in it must never be
applied. Everything that remains is operational rather than code:

```bash
npm run check:drift          # what production is missing
```

The SQL to apply is committed at
[`docs/pending-migrations.sql`](docs/pending-migrations.sql) — six migrations in
order, with bookkeeping and verification appended. Regenerate it with
`npm run db:bundle-pending` if the pending set changes.

The full task list — five ordered steps, the verified current state and how it
was measured, per-migration verification queries, the security finding behind
the exclusion, and rollback notes — is in
[`docs/HANDOFF-production-tasks.md`](docs/HANDOFF-production-tasks.md). It is
written to be handed straight to whoever holds the database credentials, or to
their coding agent.

## Never edit an applied migration

This is the single biggest cause of "it works locally but not on the deployed
site" in this project.

A migration that has already run is recorded in
`supabase_migrations.schema_migrations` and never runs again. Editing the file
therefore changes nothing in that database — but a local `supabase db reset`
replays every migration from empty, so the edit appears to work perfectly on
your machine. `CREATE TABLE IF NOT EXISTS` makes it worse: on a database that
already has the table it is a no-op and reconciles no columns, so a column added
to that block reaches only fresh databases.

`page_sections.parent_id` and `page_sections.extra_data` were lost exactly this
way and needed `20260822130000` to reconcile them.

**To change an existing table, always add a new migration with an explicit
`ALTER TABLE ... ADD COLUMN IF NOT EXISTS`.** Never reopen a merged migration.

To check any environment against the repo:

```bash
npm run check:drift                       # uses .env
node scripts/check-schema-drift.mjs --env .env.prod
```

It reports tables, columns, and functions the database is missing, and exits
non-zero when it finds any, so CI can gate on it. Only the public anon key is
needed — PostgREST resolves column names before applying row-level security.

CI enforces the rule mechanically. `npm run check:migrations` fails when a
branch modifies, renames, or deletes a migration that already exists on the base
branch; only new files pass. It runs on every pull request.

## Database schema & query guidelines

Developers must watch out for local database schema drift. Always verify definitions against files in `supabase/migrations/` rather than relying on current local DB state (e.g. if the local DB has not been reset).

* **College Applications:** The student reference column is `applicant_id`, NOT `user_id`. Queries must target `applicant_id` directly.
* **Direct Table Inserts vs API Submissions:** Direct insert policy is disabled for `college_applications`. Direct inserts will fail. Always submit applications using the versioned API wrapper `submitAuthenticatedModuleForm` (which maps details into the JSON `form_data` field and executes via database RPC).

## Scheduled maintenance

`vercel.json` runs `/api/cron/maintenance` daily at midnight Nepal time (18:15 UTC). Vercel
sends `Authorization: Bearer <CRON_SECRET>`; the route rejects missing or invalid
secrets and invokes the idempotent `run_platform_maintenance()` database
function to expire subscriptions, jobs, events, and advertisements.

## Deployment

The app is Vercel-ready. Configure public variables for Production, Preview,
and Development. Configure server secrets only in environments that need the
server APIs (the Supabase secret and cron secret should normally be Production
only), then deploy:

```bash
vercel --prod
```
