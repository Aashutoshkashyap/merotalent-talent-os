import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/backend-mode", () => ({ getBackendMode: () => "neon-staging" }));
vi.mock("@/lib/neon/neon-config", () => ({ getNeonAuthBaseUrl: () => "https://auth.staging.test/api/auth" }));

import { POST } from "../../app/api/v1/neon-staging/auth/[...action]/route";

const endpoint = "https://app.test/api/v1/neon-staging/auth/change-password";
const context = { params: Promise.resolve({ action: ["change-password"] }) };
function request(body: unknown, origin = "https://app.test") {
  return POST(new Request(endpoint, { method: "POST", headers: {
    origin, cookie: "better-auth.session_token=opaque", "content-type": "application/json",
  }, body: JSON.stringify(body) }), context);
}

describe("same-origin Neon Managed Auth password change bridge", () => {
  const priorFetch = globalThis.fetch;
  beforeEach(() => { globalThis.fetch = vi.fn(async () => new Response("{}", { status: 200 })); });
  afterEach(() => { globalThis.fetch = priorFetch; });

  it("forwards only current and new passwords with the current session cookie", async () => {
    const response = await request({ currentPassword: "previous-secret", newPassword: "replacement-secret" });
    expect(response.status).toBe(200);
    expect(globalThis.fetch).toHaveBeenCalledOnce();
    const [url, options] = vi.mocked(globalThis.fetch).mock.calls[0];
    expect(url).toBe("https://auth.staging.test/api/auth/change-password");
    expect(options?.headers).toMatchObject({ cookie: "better-auth.session_token=opaque" });
    expect(options?.body).toBe(JSON.stringify({ currentPassword: "previous-secret", newPassword: "replacement-secret" }));
  });

  it("rejects cross-site, incomplete and extra-field requests before forwarding", async () => {
    expect((await request({ currentPassword: "previous-secret", newPassword: "replacement-secret" }, "https://evil.test")).status).toBe(403);
    expect((await request({ newPassword: "replacement-secret" })).status).toBe(400);
    expect((await request({ currentPassword: "previous-secret", newPassword: "replacement-secret", userId: "someone-else" })).status).toBe(400);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
