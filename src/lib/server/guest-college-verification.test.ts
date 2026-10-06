import { afterEach, describe, expect, it, vi } from "vitest";
import { guestCodeHash, GuestVerificationError, normalizeGuestIdentity } from "./guest-college-verification";

const base = {
  guestToken: "44444444-4444-4444-8444-444444444444",
  collegeId: "11111111-1111-4111-8111-111111111111",
  email: "Maya@Example.com ",
  whatsappNumber: "9801111111",
};

describe("guest college identity verification", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("normalizes Nepal WhatsApp numbers and account emails", () => {
    expect(normalizeGuestIdentity(base)).toMatchObject({
      email: "maya@example.com",
      whatsappNumber: "+9779801111111",
    });
    expect(normalizeGuestIdentity({ ...base, whatsappNumber: "+977 9801111111" }).whatsappNumber).toBe("+9779801111111");
  });

  it("rejects an absent or invalid WhatsApp number", () => {
    expect(() => normalizeGuestIdentity({ ...base, whatsappNumber: "" })).toThrow(GuestVerificationError);
    expect(() => normalizeGuestIdentity({ ...base, whatsappNumber: "not-a-number" })).toThrow(GuestVerificationError);
  });

  it("binds each code to guest token, college, channel, and destination", () => {
    vi.stubEnv("GUEST_VERIFICATION_HMAC_KEY", Buffer.alloc(32, 7).toString("base64"));
    const identity = normalizeGuestIdentity(base);
    const hash = guestCodeHash(identity, "whatsapp", "012345");
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toBe(guestCodeHash(identity, "email", "012345"));
    expect(hash).not.toBe(guestCodeHash({ ...identity, whatsappNumber: "+9779801111112" }, "whatsapp", "012345"));
    expect(hash).not.toBe(guestCodeHash({ ...identity, collegeId: "22222222-2222-4222-8222-222222222222" }, "whatsapp", "012345"));
  });
});
