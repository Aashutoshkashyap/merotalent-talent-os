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

Apply every SQL file in `supabase/migrations` in timestamp order before enabling
sign-ups against a new Supabase project. The modular platform migration adds
RBAC permissions, subscriptions, college applications, mentor bookings, jobs,
events, leads, payments, notifications, advertisements, featured content,
auditing, generated-form submissions, private media buckets, and maintenance.

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

## Scheduled maintenance

`vercel.json` runs `/api/cron/maintenance` daily at midnight Nepal time. Vercel
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
