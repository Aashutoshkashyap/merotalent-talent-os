/**
 * Neon Managed Auth Adapter & Stable Identity Layer
 *
 * Implements the Stable Identity Model:
 *   legacy_supabase_id -> merotalent_account_id -> neon_auth_id
 *
 * This in-memory model is NOT a Managed Auth integration. It must not issue
 * sessions or link real legacy accounts. In particular, matching a verified
 * Google email is not proof of ownership of a Supabase account.
 */

export interface MerotalentAccount {
  id: string; // Master stable UUID
  email: string;
  legacySupabaseId: string | null;
  neonAuthId: string | null;
  isVerified: boolean;
  status: "active" | "suspended" | "pending_reauth";
}

export interface AuthSession {
  token: string;
  accountId: string;
  email: string;
  expiresAt: string;
  roles: string[];
}

export interface GoogleAuthPayload {
  googleSub: string;
  email: string;
  emailVerified: boolean;
  fullName?: string;
  avatarUrl?: string;
}

export class NeonAuthService {
  private accounts = new Map<string, MerotalentAccount>();

  /**
   * Pre-seeds existing legacy users into the stable identity ledger.
   */
  seedLegacyAccount(account: MerotalentAccount) {
    this.accounts.set(account.id, account);
  }

  /** Look up a synthetic account by immutable ID only. */
  findAccount(identifier: { accountId?: string; legacyId?: string; email?: string }): MerotalentAccount | null {
    if (identifier.accountId && this.accounts.has(identifier.accountId)) {
      return this.accounts.get(identifier.accountId)!;
    }
    for (const acc of this.accounts.values()) {
      if (identifier.legacyId && acc.legacySupabaseId === identifier.legacyId) {
        return acc;
      }
    }
    return null;
  }

  /**
   * Securely links a Google OAuth identity to an existing MeroTalent account.
   * Enforces that email must be verified by Google to prevent impersonation.
   */
  async handleGoogleOAuthCallback(_payload: GoogleAuthPayload, _neonAuthId: string): Promise<{
    session: AuthSession;
    isExistingUser: boolean;
    accountId: string;
  }> {
    throw new Error("Legacy Google account linking requires a verified, persistent Managed Auth migration flow.");
  }

  /**
   * Handles Password re-authentication for existing legacy email accounts.
   */
  async completePasswordReAuth(_email: string, _neonAuthId: string): Promise<MerotalentAccount> {
    throw new Error("Password re-authentication requires verified identity linking; email alone is insufficient.");
  }
}

export const neonAuth = new NeonAuthService();
