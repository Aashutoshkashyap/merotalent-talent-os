/** Neon Managed Auth boundary. No legacy account is linked by email alone. */
import type { QueryResultRow } from "pg";
import { getNeonAuthBaseUrl } from "@/lib/neon/neon-config";
import { queryRows } from "./db";
import {
  NeonAuthorizationError,
  requireAuthenticatedUser,
  type NeonActor,
} from "./neon-authorization";

interface ManagedSession {
  user: { id: string; emailVerified: boolean };
  session: { userId: string; expiresAt: string };
}

interface IdentityLink extends QueryResultRow { legacy_user_id: string }

export class NeonSessionUnavailable extends Error {
  constructor(message = "Neon staging authentication is not configured.") {
    super(message);
    this.name = "NeonSessionUnavailable";
  }
}

export interface ManagedSessionVerifier {
  verify(request: Request): Promise<ManagedSession | null>;
}

export const managedSessionVerifier: ManagedSessionVerifier = {
  async verify(request) {
    // Independently bind both the database and Auth endpoint to the same
    // approved isolated branch before forwarding any session cookie.
    let configuredUrl: string;
    try { configuredUrl = getNeonAuthBaseUrl(); }
    catch { throw new NeonSessionUnavailable(); }
    const cookie = request.headers.get("cookie");
    if (!cookie || cookie.length > 8192) return null;
    let base: URL;
    try { base = new URL(configuredUrl); } catch { throw new NeonSessionUnavailable(); }
    const response = await fetch(`${base.toString().replace(/\/$/, "")}/get-session`, {
      headers: { cookie, accept: "application/json" },
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
    }).catch(() => { throw new NeonSessionUnavailable("Neon staging Auth is unavailable."); });
    if (response.status === 401 || response.status === 403) return null;
    if (!response.ok) throw new NeonSessionUnavailable("Neon staging Auth is unavailable.");
    const value: unknown = await response.json().catch(() => null);
    if (!value || typeof value !== "object") return null;
    const candidate = value as Partial<ManagedSession>;
    if (!candidate.user || !candidate.session ||
        typeof candidate.user.id !== "string" ||
        typeof candidate.session.userId !== "string" ||
        candidate.user.id !== candidate.session.userId ||
        typeof candidate.session.expiresAt !== "string" ||
        new Date(candidate.session.expiresAt).getTime() <= Date.now()) return null;
    return candidate as ManagedSession;
  },
};

/**
 * Real sessions are accepted only from the Managed Auth verifier. A separate
 * unique, verified mapping must exist before old application UUIDs are used.
 * No user-supplied UUID or email lookup is accepted here.
 */
export async function getAuthenticatedApplicationUser(
  request: Request,
  verifier: ManagedSessionVerifier = managedSessionVerifier,
): Promise<NeonActor> {
  const session = await verifier.verify(request);
  if (!session) throw new NeonAuthorizationError(401, "AUTH_REQUIRED", "A valid session is required.");
  if (session.user.emailVerified !== true) {
    throw new NeonAuthorizationError(403, "EMAIL_NOT_VERIFIED", "Verify your email first.");
  }
  let links: IdentityLink[];
  try {
    links = await queryRows<IdentityLink>(`
      SELECT legacy_user_id FROM public.neon_identity_links
      WHERE neon_auth_user_id = $1 AND status = 'verified' LIMIT 2`, [session.user.id]);
  } catch {
    // The mapping has not been provisioned. Never improvise a match by email.
    throw new NeonSessionUnavailable("Verified Neon-to-legacy identity mapping is unavailable.");
  }
  if (links.length !== 1) {
    throw new NeonAuthorizationError(403, "IDENTITY_NOT_LINKED", "This account is not linked to an application profile.");
  }
  return requireAuthenticatedUser({
    neonAuthUserId: session.user.id,
    legacyUserId: links[0].legacy_user_id,
    emailVerified: true,
  });
}
