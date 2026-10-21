import { describe, expect, it } from "vitest";
import { classifyIdentityRecovery } from "../../../scripts/identity-recovery-classification.mjs";

const activeAccount = { account_status: "active", link_status: null, managed_user_present: null };

describe("identity recovery classification", () => {
  it("makes a complete migrated account eligible only for dual-session proof", () => {
    expect(classifyIdentityRecovery({ sourceActive: true, profilePresent: true, identityTypes: ["google"], candidates: [activeAccount] }))
      .toMatchObject({ status: "ELIGIBLE_FOR_PROOF_BASED_RECOVERY", recoveryTested: false, reasonCodes: ["DUAL_SESSION_CHALLENGE_REQUIRED"],attempted:null,verified:false,linked:false });
  });

  it("does not mistake an email/provider record or missing target account for ownership", () => {
    const result = classifyIdentityRecovery({ sourceActive: true, profilePresent: true, identityTypes: ["email"], candidates: [] });
    expect(result.status).toBe("UNRESOLVED");
    expect(result.reasonCodes).toContain("TARGET_APPLICATION_ACCOUNT_MISSING");
  });

  it("keeps collisions and unverified links out of the automatic recovery path", () => {
    const result = classifyIdentityRecovery({ sourceActive: true, profilePresent: true, identityTypes: ["google"], candidates: [activeAccount, activeAccount] });
    expect(result.status).toBe("UNRESOLVED");
    expect(result.reasonCodes).toContain("TARGET_APPLICATION_ACCOUNT_AMBIGUOUS");
  });

  it("reports a verified ledger link without claiming the user journey was tested", () => {
    const result = classifyIdentityRecovery({
      sourceActive: true, profilePresent: true, identityTypes: ["google"],
      candidates: [{ account_status: "active", link_status: "verified", managed_user_present: "managed", verification_method: "dual_authenticated_session", verified_at: "2026-10-17T00:00:00Z" }],
    });
    expect(result).toMatchObject({ status: "LINKED", recoveryTested: false, reasonCodes: ["LINK_VERIFIED_DUAL_AUTHENTICATED_SESSION"],attempted:true,verified:true,linked:true });
  });
  it("distinguishes recorded attempts from verified ownership",()=>{
    const result=classifyIdentityRecovery({sourceActive:true,profilePresent:true,identityTypes:["google","email"],candidates:[activeAccount],attemptCount:2});
    expect(result).toMatchObject({attempted:true,linked:false,verified:false,status:"ELIGIBLE_FOR_PROOF_BASED_RECOVERY"});
  });
});
