/**
 * Classifies a legacy account for a proof-based recovery *attempt*.
 *
 * This is deliberately not an identity matcher: a status of
 * ELIGIBLE_FOR_PROOF_BASED_RECOVERY only means the target has the minimum
 * migrated records required to start the dual-session challenge. It never
 * proves ownership or permits an email-address-only link.
 */
export function classifyIdentityRecovery({ sourceActive, profilePresent, identityTypes, candidates, attemptCount = 0 }) {
  const reasons = [];
  const normalizedIdentities = [...new Set(identityTypes ?? [])].filter(Boolean).sort();
  const accounts = candidates ?? [];
  const verified = accounts.length === 1 && accounts[0].account_status === "active" &&
    accounts[0].link_status === "verified" && accounts[0].managed_user_present &&
    accounts[0].verification_method === "dual_authenticated_session" && accounts[0].verified_at &&
    profilePresent && sourceActive;

  if (verified) {
    return {
      status: "LINKED",
      recoveryTested: false,
      attempted: true, verified: true, linked: true,
      reasonCodes: ["LINK_VERIFIED_DUAL_AUTHENTICATED_SESSION"],
    };
  }
  if (!sourceActive) reasons.push("SOURCE_ACCOUNT_INACTIVE");
  if (!profilePresent) reasons.push("TARGET_PROFILE_MISSING");
  if (!normalizedIdentities.length) reasons.push("SOURCE_IDENTITY_PROOF_UNAVAILABLE");
  // The verified dual-session linker can create this anchor under the locked
  // original profile. Its absence is not ownership and is not a recovery ban.
  const anchorNeedsProof = accounts.length === 0;
  if (accounts.length > 1) reasons.push("TARGET_APPLICATION_ACCOUNT_AMBIGUOUS");

  const account = accounts[0];
  if (account && account.account_status !== "active") reasons.push("TARGET_APPLICATION_ACCOUNT_INACTIVE");
  if (account?.link_status) {
    reasons.push(account.link_status === "verified"
      ? "LINK_PROVENANCE_OR_MANAGED_ACCOUNT_UNVERIFIED"
      : "EXISTING_UNVERIFIED_IDENTITY_LINK_REQUIRES_REVIEW");
  }

  const result = reasons.length === 0
    ? { status: "ELIGIBLE_FOR_PROOF_BASED_RECOVERY", recoveryTested: false, reasonCodes: ["DUAL_SESSION_CHALLENGE_REQUIRED",
        ...(anchorNeedsProof ? ["TARGET_ANCHOR_CREATED_ONLY_AFTER_VERIFIED_PROOF"] : [])] }
    : { status: "UNRESOLVED", recoveryTested: false, reasonCodes: reasons };
  return {...result, attempted: attemptCount > 0 ? true : null, verified:false,linked:false};
}
