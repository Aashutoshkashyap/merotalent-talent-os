# Merotalent Talent OS

Merotalent is a role-based talent ecosystem for Nepal and South Asia. It brings
opportunity discovery, competitions, learning, mentorship, institutions, hiring,
and platform administration into one responsive web application.

## Product workspaces

- **Talent:** proof-of-skill profile, learning, competitions, jobs, badges,
  mentor sessions, and messages.
- **Mentor:** sessions, mentees, availability, resources, and follow-ups.
- **Company:** jobs, matched talent, shortlists, interviews, and hosted
  challenges.
- **Institution:** student programs, notices, courses, and outcomes.
- **Admin:** people, roles, content, jobs, competitions, partners, support, and
  platform health.

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

Required public environment variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SUPABASE_PROJECT_ID=
```

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

## Deployment

The app is Vercel-ready. Configure the three `NEXT_PUBLIC_SUPABASE_*` variables
for Production, Preview, and Development, then deploy:

```bash
vercel --prod
```
