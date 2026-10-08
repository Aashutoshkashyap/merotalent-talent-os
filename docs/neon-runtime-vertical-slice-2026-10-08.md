# Neon institute vertical slice — isolated staging

This is a canonical implementation pattern, **not** a completed Auth migration or production cutover. Production remains on legacy Supabase. No source database/storage migration was rerun, no users were imported, and no deployment was made.

## Boundary and route switch

`MEROTALENT_BACKEND_MODE` defaults to `legacy`; `neon-staging` is forbidden when `VERCEL_ENV=production`. `/api/v1/institutes/[id]` switches the actual database client:

| Request | Legacy | Neon staging |
| --- | --- | --- |
| `GET` | Existing Supabase public approved/nondeleted query | Parameterized `NeonRepositories.getPublicInstitute` |
| `GET ?view=managed` | Supabase bearer session and RLS-scoped query | Managed Auth session → verified identity link → active profile/roles → exact entity/entitlement check → narrow query |
| `PATCH {description}` | Supabase bearer session and RLS-authorized update | Managed Auth session → verified identity link → active profile/roles → **single conditional UPDATE** |

Only `description` is accepted for this slice; no create, delete, publication, ranking, or subscription mutation is exposed. UUID and body validation return 400. A nonexistent public record returns 404. Protected missing session returns 401, denied scope returns 403, and absent Auth/mapping infrastructure returns 503. A staging failure never falls back to Supabase.

## Authentication and identity mapping

`src/lib/server/neon-session.ts` is the one server-side entry point, `getAuthenticatedApplicationUser(request)`. It obtains a cookie-backed session from the configured Neon Managed Auth branch `/get-session` endpoint, requires an unexpired verified identity, looks up a **unique verified** `neon_auth_user_id → legacy_user_id` record, then resolves the active application profile, roles, and permissions. Request-body IDs, arbitrary headers, bearer-looking UUIDs, and email matches are not accepted as identity evidence. `NEON_AUTH_BASE_URL` must be the staging branch HTTPS Auth URL. A staging trusted-origin/cookie proxy may also be required for first-party browser cookies; this has not been configured or exercised.

The target `public.neon_identity_links` table is **not present** in the isolated staging database; its absence was confirmed with `to_regclass`. No link is fabricated and no 102-user import is attempted. A future, separately approved forward schema change needs a unique Neon Auth ID, unique legacy UUID FK to `profiles.user_id`, verification status/provenance, and a controlled linking process for Google, password, and dual identities. Until then, verified-looking test fixtures prove policy SQL only; they do not prove a real login. Existing Supabase sessions and hashes are not presumed portable.

## Atomic institute mutation

`NeonRepositories.updateInstituteDescription` uses **one** parameterized PostgreSQL `UPDATE ... WHERE ... RETURNING` statement. The same statement snapshot verifies:

1. actor profile active and not deleted;
2. platform `admin`/`super_admin` role **or** all of: active college capability, exact active college entity assignment, active module entitlement, and `profile_editing` feature in an entitlement/package/manual grant;
3. target institute ID and nondeleted state.

Zero returned rows cause a narrow existence check: missing target → 404; existing but unauthorized → 403. No update is issued after a separate JavaScript authorization decision. A staging test updated a migrated institute only within a deliberately rolled-back transaction, then confirmed its original value; another test attempted a denied update and confirmed the row remained unchanged. This matches the entitlement migration's `authorize_module_access` / `Entitled college admins manage assigned profiles` rule for the edited field. The service is not a generic unrestricted SQL wrapper.

## Institute authorization matrix

`ALLOW` below describes the existing approved-directory semantics or this slice's scoped operation. `DENY` for create/delete in **this route** does not remove existing legacy Super Admin workflows. An institution role alone never implies an assigned college entitlement.

| Actor | Public approved read | Managed read | Direct create | Description update | Direct delete | Admin operation in this route |
| --- | --- | --- | --- | --- | --- | --- |
| Unauthenticated | ALLOW | DENY 401 | DENY | DENY 401 | DENY | DENY |
| Ordinary student | ALLOW | DENY | DENY | DENY 403 | DENY | DENY |
| Institution role, no matching scope | ALLOW | DENY | DENY | DENY 403 | DENY | DENY |
| Institute administrator with active exact scope/entitlement/feature | ALLOW | ALLOW | DENY | ALLOW | DENY | DENY |
| Company user | ALLOW | DENY | DENY | DENY 403 | DENY | DENY |
| Mentor user | ALLOW | DENY | DENY | DENY 403 | DENY | DENY |
| `super_admin` | ALLOW | ALLOW | DENY here | ALLOW | DENY here | Existing separate Super Admin routes only |
| `platform_admin` (`admin` role in schema) | ALLOW | ALLOW | DENY here | ALLOW | DENY here | Existing separate Super Admin routes only |

Source policy allows Super Admin institute creation/update and deletion through separately governed paths, but this slice intentionally exposes only description PATCH. Public SELECT follows `status='approved' AND deleted_at IS NULL`, independent of payment. Managed read is conservatively entitlement-gated; the older Supabase SELECT policy also allowed an owner to see certain nonpublic records, so complete read-policy parity remains a separate institute-module task.

## Institute media

The existing `college-media` bucket is a **public listing bucket**, not private institute storage. In legacy mode it retains Supabase behavior. In staging, anonymous S3 GET returned 403, so public listing reads use short-lived signed GET URLs. This is delivery compatibility, not a claim that the images are private.

Managed staging operations validate the canonical `<uploader UUID>/<college_logo|college_cover|college_gallery>/<institute UUID>/<object UUID>.<allowed extension>` path, MIME/size, target scope, and owner. Non-admin operations additionally require exact college `media_management` entitlement; platform admins follow the existing bypass. `managedInstituteMediaSignedUrl`, `uploadBytes`, and `deleteInstituteMedia` cannot sign/upload/delete another uploader's or another institute's object through those managed paths. No raw S3 credential reaches a browser. There is no private institute-media bucket to claim private-read parity for. The tests used a fresh, isolated object for upload/delete; no migrated object was deleted. Non-admin college-media success is not proven by current staging entitlements and remains to be exercised when such a grant is present.

Replacement of a media object referenced by a live institute record still needs a coordinated DB-pointer update/cleanup service. The new delete helper is not exposed as an HTTP route.

## Verification and limits

- Unit: institute route boundary rejects no-session managed GET/PATCH, malformed IDs, undeclared fields, and forged identity headers.
- Real Neon staging integration: migrated institute/profile/job rows; active college assignment vs unrelated college; atomic authorized edit rolled back; denied edit unchanged; Super Admin policy; signed public/private read; scoped institute-media upload/signed read/delete; missing identity-link table fail-closed.
- Local staging HTTP: public GET 200 with matching ID, missing ID 404, malformed ID 400, managed GET without session 401, PATCH without session 401, undeclared PATCH field 400. The temporary server was stopped. No authenticated Neon HTTP request succeeded or was claimed.
- Remaining blockers: branch Auth URL/trusted origins and real session, verified identity-link schema/process, authenticated route UAT, non-admin media entitlement fixture, complete institute create/delete and media-pointer workflows, and all other RPC/modules. Realtime remains legacy-only.

For the next module, reuse this order: documented source RLS/RPC rule → trusted session and immutable mapping → narrow repository → single-statement or serializable authorization+mutation → legacy/staging route switch → denial and rollback tests against real staging rows → authenticated HTTP/UAT before declaring verified.
