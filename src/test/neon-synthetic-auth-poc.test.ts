import { describe, expect, it } from "vitest";
import { NeonAuthService, type MerotalentAccount } from "@/lib/neon/neon-auth";

const legacyAccount: MerotalentAccount = {
  id: "a0000000-0000-0000-0000-000000000001",
  email: "synthetic@example.invalid",
  legacySupabaseId: "a0000000-0000-0000-0000-000000000001",
  neonAuthId: null,
  isVerified: true,
  status: "pending_reauth",
};

describe("unimplemented Neon account-linking contract fails closed", () => {
  it("does not treat an email match as identity proof", () => {
    const service = new NeonAuthService();
    service.seedLegacyAccount({ ...legacyAccount });
    expect(service.findAccount({ email: legacyAccount.email })).toBeNull();
    expect(service.findAccount({ legacyId: legacyAccount.legacySupabaseId! })?.id).toBe(legacyAccount.id);
  });

  it("does not issue a fake Google session or link a legacy account", async () => {
    const service = new NeonAuthService();
    service.seedLegacyAccount({ ...legacyAccount });
    await expect(service.handleGoogleOAuthCallback({
      googleSub: "synthetic-google-sub",
      email: legacyAccount.email,
      emailVerified: true,
    }, "neon-synthetic-id")).rejects.toThrow("requires a verified, persistent");
    expect(service.findAccount({ accountId: legacyAccount.id })?.neonAuthId).toBeNull();
  });

  it("does not activate a legacy password account from an email alone", async () => {
    const service = new NeonAuthService();
    service.seedLegacyAccount({ ...legacyAccount });
    await expect(service.completePasswordReAuth(legacyAccount.email, "neon-synthetic-id"))
      .rejects.toThrow("email alone is insufficient");
    expect(service.findAccount({ accountId: legacyAccount.id })?.status).toBe("pending_reauth");
  });
});
