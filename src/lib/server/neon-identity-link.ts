/** Staging-only, dual-session identity link. Never maps accounts by matching email. */
import { withTransaction } from "./db";
import { NeonAuthorizationError } from "./neon-authorization";
import { managedSessionVerifier, NeonSessionUnavailable } from "./neon-session";

const sourceHost = "https://dtirpilgzlsfryucanlg.supabase.co";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface LegacyIdentityProof {
  legacyUserId: string;
  verified: boolean;
}

/** Uses Supabase Auth only to verify a user-provided current source session. No admin key. */
export async function verifyLegacySession(accessToken: string): Promise<LegacyIdentityProof> {
  if (!accessToken || accessToken.length > 8192 || !/^[A-Za-z0-9._-]+$/.test(accessToken)) {
    throw new NeonAuthorizationError(401, "LEGACY_PROOF_INVALID", "A valid legacy session is required.");
  }
  const configured = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  const mode = process.env.NEON_STAGING_IDENTITY_LINK_MODE ?? "synthetic-only";
  const allowedSourceId = process.env.NEON_STAGING_IDENTITY_ALLOWED_SOURCE_ID;
  if (configured !== sourceHost || !key || !["synthetic-only", "verified-source"].includes(mode) ||
      (mode === "synthetic-only" && (!allowedSourceId || !uuid.test(allowedSourceId)))) {
    throw new NeonSessionUnavailable("Legacy proof verification is not configured.");
  }
  const response = await fetch(`${sourceHost}/auth/v1/user`, {
    headers: { authorization: `Bearer ${accessToken}`, apikey: key, accept: "application/json" },
    cache: "no-store", redirect: "manual", signal: AbortSignal.timeout(8000),
  }).catch(() => { throw new NeonSessionUnavailable("Legacy proof verification is unavailable."); });
  if (response.status === 401 || response.status === 403) {
    throw new NeonAuthorizationError(401, "LEGACY_PROOF_INVALID", "The legacy session is invalid or expired.");
  }
  if (!response.ok) throw new NeonSessionUnavailable("Legacy proof verification is unavailable.");
  const source: unknown = await response.json().catch(() => null);
  if (!source || typeof source !== "object") throw new NeonSessionUnavailable("Legacy proof response is invalid.");
  const user = source as Record<string, unknown>;
  if (typeof user.id !== "string" || !uuid.test(user.id)) throw new NeonSessionUnavailable("Legacy proof response is invalid.");
  if (mode === "synthetic-only" && user.id !== allowedSourceId) {
    throw new NeonAuthorizationError(403, "SOURCE_ACCOUNT_NOT_ALLOWED", "This proof of concept is restricted to one approved synthetic account.");
  }
  if (user.deleted_at || (typeof user.banned_until === "string" &&
      (!Number.isFinite(Date.parse(user.banned_until)) || Date.parse(user.banned_until) > Date.now()))) {
    throw new NeonAuthorizationError(403, "LEGACY_ACCOUNT_INACTIVE", "The legacy account is inactive.");
  }
  const confirmed = user.email_confirmed_at || user.confirmed_at;
  return { legacyUserId: user.id, verified: typeof confirmed === "string" &&
    Number.isFinite(Date.parse(confirmed)) && Date.parse(confirmed) <= Date.now() };
}

export async function linkVerifiedLegacyIdentity(request: Request, accessToken: string, dryRun = false) {
  const managed = await managedSessionVerifier.verify(request);
  if (!managed) throw new NeonAuthorizationError(401, "AUTH_REQUIRED", "A current Managed Auth session is required.");
  if (!managed.session || managed.session.userId !== managed.user.id ||
      !Number.isFinite(Date.parse(managed.session.expiresAt)) || Date.parse(managed.session.expiresAt) <= Date.now()) {
    throw new NeonAuthorizationError(401, "AUTH_REQUIRED", "A current Managed Auth session is required.");
  }
  if (managed.user.emailVerified !== true || managed.user.banned === true) {
    throw new NeonAuthorizationError(403, "MANAGED_ACCOUNT_UNVERIFIED", "Verify the new account before linking.");
  }
  if (!uuid.test(managed.user.id)) throw new NeonSessionUnavailable("Managed Auth subject is invalid.");
  const proof = await verifyLegacySession(accessToken);
  if (!proof.verified) throw new NeonAuthorizationError(403, "LEGACY_ACCOUNT_UNVERIFIED", "The legacy account is not verified.");

  try {
    return await withTransaction(async (client) => {
      const profiles = await client.query<{ user_id: string; account_status: string }>(`SELECT user_id,account_status FROM public.profiles
        WHERE user_id=$1::uuid AND deleted_at IS NULL LIMIT 1 FOR UPDATE`, [proof.legacyUserId]);
      if (!profiles.rows[0]) throw new NeonAuthorizationError(404, "LEGACY_PROFILE_MISSING", "No migrated application profile exists.");
      if (profiles.rows[0].account_status !== "active") {
        throw new NeonAuthorizationError(403, "LEGACY_ACCOUNT_INACTIVE", "The migrated application profile is inactive.");
      }
      const existing = await client.query<{ id: string; status: string; neon_auth_user_id: string | null; link_status: string | null }>(`
        SELECT a.id, a.status, l.neon_auth_user_id, l.status AS link_status
        FROM public.neon_application_accounts a
        LEFT JOIN public.neon_identity_links l ON l.application_account_id=a.id
        WHERE a.legacy_user_id=$1::uuid LIMIT 1 FOR UPDATE OF a`, [proof.legacyUserId]);
      const account = existing.rows[0];
      if (account && account.status !== "active") throw new NeonAuthorizationError(403, "LEGACY_ACCOUNT_INACTIVE", "The application account is inactive.");
      if (account?.neon_auth_user_id) {
        if (account.neon_auth_user_id === managed.user.id && account.link_status === "verified") return { status: "already_linked" as const };
        throw new NeonAuthorizationError(409, "LEGACY_IDENTITY_CONFLICT", "This profile is linked to another account or disabled link.");
      }
      const subject = await client.query<{ application_account_id: string }>(`SELECT application_account_id
        FROM public.neon_identity_links WHERE neon_auth_user_id=$1::uuid LIMIT 1 FOR UPDATE`, [managed.user.id]);
      if (subject.rows[0]) throw new NeonAuthorizationError(409, "MANAGED_IDENTITY_CONFLICT", "This Managed Auth account is linked to another profile.");
      if (dryRun) return { status: "would_link" as const };
      let accountId = account?.id;
      if (!accountId) {
        const inserted = await client.query<{ id: string }>(`INSERT INTO public.neon_application_accounts
          (legacy_user_id, status) VALUES ($1::uuid, 'active') RETURNING id`, [proof.legacyUserId]);
        accountId = inserted.rows[0].id;
      }
      await client.query(`INSERT INTO public.neon_identity_links
        (neon_auth_user_id, application_account_id, status, verification_method, verified_at)
        VALUES ($1::uuid, $2::uuid, 'verified', 'dual_authenticated_session', now())`, [managed.user.id, accountId]);
      await client.query(`INSERT INTO public.audit_logs
        (actor_user_id, action, entity_type, entity_id, metadata)
        VALUES ($1::uuid, 'neon_identity_link_verified', 'profile', $1::text,
          jsonb_build_object('managed_user_id', $2::text, 'method', 'dual_authenticated_session'))`,
        [proof.legacyUserId, managed.user.id]);
      return { status: "linked" as const };
    });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "23505") {
      throw new NeonAuthorizationError(409, "IDENTITY_LINK_RACE", "An identity link changed concurrently. Retry after review.");
    }
    throw error;
  }
}
