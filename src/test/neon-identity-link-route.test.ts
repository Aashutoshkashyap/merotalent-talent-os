import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NeonAuthorizationError } from "@/lib/server/neon-authorization";

const mocks = vi.hoisted(() => ({ link: vi.fn() }));
vi.mock("@/lib/server/neon-identity-link", () => ({ linkVerifiedLegacyIdentity: mocks.link }));
import { POST } from "../../app/api/v1/neon-staging/auth/link-legacy/route";

const oldMode = process.env.MEROTALENT_BACKEND_MODE;
function send(body: unknown, origin = "https://app.test") {
  const text = JSON.stringify(body);
  return POST(new Request("https://app.test/api/v1/neon-staging/auth/link-legacy", {
    method: "POST", headers: { origin, "content-type": "application/json", "content-length": String(text.length) }, body: text,
  }));
}
beforeEach(() => { process.env.MEROTALENT_BACKEND_MODE = "neon-staging"; mocks.link.mockResolvedValue({ status: "would_link" }); });
afterEach(() => {
  if (oldMode === undefined) delete process.env.MEROTALENT_BACKEND_MODE; else process.env.MEROTALENT_BACKEND_MODE = oldMode;
  vi.clearAllMocks();
});
describe("staging-only identity proof endpoint", () => {
  it("is absent in production mode and rejects cross-origin proof", async () => {
    process.env.MEROTALENT_BACKEND_MODE = "legacy";
    expect((await send({ sourceAccessToken: "sensitive" })).status).toBe(404);
    process.env.MEROTALENT_BACKEND_MODE = "neon-staging";
    expect((await send({ sourceAccessToken: "sensitive" }, "https://attacker.test")).status).toBe(403);
    expect(mocks.link).not.toHaveBeenCalled();
  });
  it("accepts only the proof and dry-run flag, without echoing a credential", async () => {
    const response = await send({ sourceAccessToken: "sensitive", dryRun: true });
    expect(response.status).toBe(200);
    expect(await response.text()).not.toContain("sensitive");
    expect(mocks.link).toHaveBeenCalledWith(expect.any(Request), "sensitive", true);
    expect((await send({ sourceAccessToken: "sensitive", legacyUserId: "forged" })).status).toBe(422);
  });
  it("returns an authorization denial without leaking proof", async () => {
    mocks.link.mockRejectedValueOnce(new NeonAuthorizationError(409, "LEGACY_IDENTITY_CONFLICT", "conflict"));
    const response = await send({ sourceAccessToken: "sensitive" });
    expect(response.status).toBe(409);
    expect(await response.text()).not.toContain("sensitive");
  });
});
