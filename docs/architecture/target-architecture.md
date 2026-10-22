# MeroTalent target architecture

This is an evolution of the existing Next.js application, not a replacement.
Operational evidence and outstanding acceptance remain in
[`../neon-runtime-sprint-status-2026-10-09.md`](../neon-runtime-sprint-status-2026-10-09.md).

## Boundaries

| Layer | Canonical implementation | Contract |
| --- | --- | --- |
| Public application | Next App Router in `app/`, existing client router in `src/App.tsx` | Record-driven public visibility and metadata; do not duplicate routing frameworks |
| Authentication | Branch-bound Neon Managed Auth, `neon-session.ts`, same-origin Auth bridge | Validate provider session, then explicit identity ledger; email equality is not ownership; source-proof recovery UI loads separately |
| Authorization | `neon-authorization.ts` and atomic domain repository predicates | Active account, role/capability, exact entity, current entitlement and feature |
| Database | `src/lib/server/db.ts`, PostgreSQL `pg` pool | Parameterized SQL; single-connection transactions; no generic browser query facade |
| Object storage | `storage.ts` + `application-storage.ts` + media policy | Server-authorized uploads/downloads, canonical paths, short-lived private URLs |
| Payments | `payment-provider.ts`, ePay V2 form/signature adapter, Neon payment services | Durable pending order; authoritative settlement; atomic idempotent fulfillment |
| Notifications | Durable application events/notifications + bounded SSE | Recipient scope and account checks; email is a separately recorded delivery outcome |
| Email | Existing transactional provider adapter / Resend | No sent claim without provider acceptance; no marketing expansion |
| UI | `components/ui`, Tailwind tokens, `index.css`, `lib/brand.ts` | Existing logo, readable type, semantic controls, responsive shells |
| Release | GitHub main → Vercel, canonical `www.merotalent.com` | Verified revision, READY deployment, HTTP and authenticated acceptance |

## Domain ownership

College services own claims, approval, assignments, profiles, notices/blogs and
admission leads. Jobs own listings, applications, employment documents, review
and interviews. Mentors own services, availability and bookings. Events own
registration, capacity, ticket tiers and issuance. Courses retain the approved
partner redirect boundary. Subscription services own expiry/renewal/access;
payment services alone verify settlement. Administration invokes these services
and audits mutations; it does not recreate business rules in client state.

## Operations and recovery

Cron authorization and maintenance live under existing `app/api/cron` routes.
Secrets remain server-only. Logs expose bounded codes, not cookies, credentials,
SQL parameters or private records. Recovery retains encrypted snapshots, byte
manifests, immutable migration history and source read-only gates. Removing
Supabase infrastructure requires final reconciliation, identity disposition,
workflow acceptance and verified rollback—not merely a successful build.
