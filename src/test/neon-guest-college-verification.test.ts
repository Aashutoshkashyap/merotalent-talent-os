import { describe, expect, it, vi } from "vitest";
import { normalizeGuestIdentity } from "@/lib/server/guest-college-verification";
import { startNeonGuestVerification, checkNeonGuestVerification, submitNeonGuestCollegeApplication } from "@/lib/server/neon-guest-college-verification";

const identity = normalizeGuestIdentity({ guestToken: "11111111-1111-4111-8111-111111111111",
  collegeId: "22222222-2222-4222-8222-222222222222", email: "guest@example.test", whatsappNumber: "+9779800000001" });
const environment = { MEROTALENT_BACKEND_MODE: "neon-staging", GUEST_VERIFICATION_HMAC_KEY: Buffer.alloc(32, 11).toString("base64") };

describe("Neon guest proof guards", () => {
  it("rejects disabled and unallowlisted delivery before reservation or sending", async () => {
    const run = vi.fn(); const sender = vi.fn();
    for (const channel of ["email", "whatsapp"] as const) {
      await expect(startNeonGuestVerification(identity, channel, { environment, run, sender })).rejects.toMatchObject({ status: 503 });
    }
    expect(run).not.toHaveBeenCalled(); expect(sender).not.toHaveBeenCalled();
  });
  it("never accepts malformed codes or an absent challenge identifier", async () => {
    const run = vi.fn();
    await expect(checkNeonGuestVerification(identity, "not-a-uuid", "email", "123456", { environment, run })).rejects.toMatchObject({ code: "INVALID_CODE" });
    await expect(checkNeonGuestVerification(identity, identity.guestToken, "email", "123", { environment, run })).rejects.toMatchObject({ code: "INVALID_CODE" });
    expect(run).not.toHaveBeenCalled();
  });
  it("rejects server-owned application fields and missing idempotency proof before database access", async () => {
    const run = vi.fn(); const payload = { collegeId: identity.collegeId, fullName: "Guest Applicant", email: identity.email, phone: identity.whatsappNumber };
    await expect(submitNeonGuestCollegeApplication({ ...payload, applicant_id: identity.guestToken }, identity.guestToken,
      identity.guestToken, "request-key-1", { environment, run })).rejects.toMatchObject({ code: "INVALID_GUEST_DETAILS" });
    await expect(submitNeonGuestCollegeApplication(payload, identity.guestToken,
      identity.guestToken, undefined, { environment, run })).rejects.toMatchObject({ code: "GUEST_VERIFICATION_REQUIRED" });
    expect(run).not.toHaveBeenCalled();
  });
  it("cannot run against production", async () => {
    await expect(startNeonGuestVerification(identity, "email", { environment: { ...environment, VERCEL_ENV: "production" } }))
      .rejects.toMatchObject({ name: "BackendConfigurationError" });
  });
});
