# Neon Managed Auth identity reconciliation — 2026-10-09

This is a read-only migration planning artifact, **not** permission to import or link production users. No production Auth, OAuth, sessions, passwords, or Neon managed Auth tables were changed.

## Current official support boundary

- Current Neon Managed Auth runs Better Auth inside Neon's managed service, with Auth data in `neon_auth`. It is **not** a drop-in self-hosted Better Auth deployment. Neon says custom server-side plugins and handlers are not yet supported. See [Neon's current architecture announcement](https://neon.com/blog/neon-auth-branchable-identity-in-your-database).
- Neon's older [Supabase-to-Neon Auth article](https://neon.com/blog/supabase-auth-neon-auth) uses **Stack Auth** and its user-create API. It does not establish an import API for current Managed Auth.
- Better Auth's [Supabase migration guide](https://better-auth.com/docs/guides/supabase-migration-guide) documents a **self-hosted** database import: preserves source UUIDs and provider account IDs in tables, and requires a custom bcrypt verifier to retain password login. It explicitly invalidates existing sessions. That guide cannot be assumed to work against Neon Managed Auth, because its server-side verifier/plugin control has not been shown available there.
- No current official Neon Managed Auth import contract was found for Supabase password hashes, Google provider identities, legacy UUID preservation, or session transfer. **Do not write directly into managed `neon_auth` tables** as a substitute for a supported import API. This is an absence-of-confirmation finding, not proof that Neon can never support it.

## Deterministic read-only report

Run `node scripts/neon-identity-reconciliation-report.mjs` only in the approved migration environment. The script hard-checks the exact source host and isolated Neon migration-staging compute, uses `REPEATABLE READ READ ONLY` transactions on both databases, and emits no email, UUID, provider ID, password hash, token, or connection string. Each record has a stable SHA-256-based fingerprint; **fingerprints are pseudonyms, not anonymity**, because someone who already knows a source UUID can recompute one. Keep the full JSON report access-restricted.

Observed source snapshot: **103 users, 104 identities**. Target: one synthetic staging Managed Auth user and one synthetic identity link, with **zero** verified source-user links. The synthetic target link is deliberately reported as an orphan from this source-user perspective; it is not a production identity collision.

| Classification | Count | Meaning |
| --- | ---: | --- |
| Explicitly verified source link | 0 | No production user has an approved, valid ledger link. |
| Candidate for approved linking flow | 97 | 91 have a Google provider subject; 6 have a verified email identity. These are **candidates only**; neither source records nor email equality prove ownership in Neon. A live provider assertion or verified recovery challenge and an approved policy are still required. |
| Reset or reauthentication required | 5 | No verified Managed Auth bcrypt import path; the source has a password hash but no classified provider proof path. |
| Collision | 0 | No duplicate normalized source email, source provider account, or target link was observed. |
| Unresolved | 1 | No supported identity-proof path established from the available source attributes. Needs manual, privacy-preserving review. |

The script also reports zero orphan source identities. Its 103 user records and 104 identity records carry only opaque fingerprints, identity type, classification, and non-PII reason codes. Identity classifications inherit their owner's status; orphan identities are unresolved. It intentionally does not create a mapping from an email match.

## Safe next decision

Ask Neon for an explicit **current Managed Auth** import/linking contract covering bcrypt verification, Google subject continuity, UUID preservation, and required session behavior. If none exists, approve a controlled user-action plan: each person signs in through current Managed Auth (or resets credentials), proves ownership of the **legacy** account through a separately verified challenge, then a privileged server transaction creates the one-to-one identity-ledger link. The staging Auth session by itself is insufficient to select a legacy account, and an email match must never grant access. This is still a proposed plan, not an implemented production flow.

Production cutover remains **NO-GO** until all source users are reconciled or explicitly handled and the unrelated runtime migration gates also pass.
