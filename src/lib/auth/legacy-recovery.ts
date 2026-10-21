import { isNeonClientRuntime } from "@/lib/backend-selection";
/** Temporary source ownership proof for migration recovery; no persistent source session. */
import { createClient } from "@supabase/supabase-js";

const sourceOrigin = "https://dtirpilgzlsfryucanlg.supabase.co";
export function createLegacyRecoveryClient(detectSessionInUrl = false) {
  if (!isNeonClientRuntime() ||
      process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") !== sourceOrigin ||
      !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    throw new Error("Existing-account verification is unavailable in this environment.");
  }
  return createClient(sourceOrigin, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl, flowType: "implicit" },
  });
}

/** These source callback patterns are already approved; never change source OAuth configuration. */
export function supportsSourceRecoveryPopup(origin: string): boolean {
  try {
    const url = new URL(origin);
    if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) return false;
    return (url.protocol === "https:" && !url.port && ["www.merotalent.com", "merotalent.com"].includes(url.hostname)) ||
      (url.protocol === "http:" && url.hostname === "localhost" && ["3000", "3001"].includes(url.port)) ||
      (url.protocol === "https:" && /^[a-z0-9-]+\.vercel\.app$/.test(url.hostname));
  } catch { return false; }
}

export const sourceRecoveryMarker = "merotalent.source-recovery-started";
/** A popup marker chooses the callback UI only; it is never an identity proof. */
export function isSourceRecoveryCallback(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const started = Number(window.sessionStorage.getItem(sourceRecoveryMarker));
    return started > 0 && started <= Date.now() && Date.now() - started < 10 * 60_000;
  } catch { return false; }
}

const errors: Record<string, string> = {
  AUTH_REQUIRED: "Sign into your new account again before restoring your profile.",
  MANAGED_ACCOUNT_UNVERIFIED: "Verify your new account email before continuing.",
  LEGACY_PROOF_INVALID: "Your existing-account sign-in expired. Sign in again.",
  LEGACY_ACCOUNT_UNVERIFIED: "Verify your existing MeroTalent account before restoring it.",
  LEGACY_ACCOUNT_INACTIVE: "This existing account is inactive. Contact MeroTalent support.",
  LEGACY_PROFILE_MISSING: "The existing profile has not been copied into this environment yet.",
  LEGACY_IDENTITY_CONFLICT: "This profile is already connected to another account. Contact MeroTalent support.",
  MANAGED_IDENTITY_CONFLICT: "This new account is already connected to another profile.",
  IDENTITY_LINK_RACE: "The account link changed while restoring. Refresh and try again.",
  AUTH_UNAVAILABLE: "Existing-account verification is unavailable. Please try again later.",
};

export async function submitLegacyRecoveryProof(sourceAccessToken: string): Promise<void> {
  const response = await fetch("/api/v1/neon-staging/auth/link-legacy", {
    method: "POST", credentials: "same-origin", cache: "no-store",
    headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sourceAccessToken }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !["linked", "already_linked"].includes(body?.data?.status)) {
    throw new Error(errors[body?.error] ?? "Your profile could not be restored. Please try again.");
  }
}
