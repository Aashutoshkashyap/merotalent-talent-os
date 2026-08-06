import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticateAdminRequest: vi.fn(),
  deleteUser: vi.fn(),
  getAdminClient: vi.fn(),
  inviteUserByEmail: vi.fn(),
  loadPlatformUserContext: vi.fn(),
  updatePlatformUserAccess: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  ApiAuthError: class ApiAuthError extends Error {},
  authenticateAdminRequest: mocks.authenticateAdminRequest,
}));

vi.mock("@/lib/server/supabase", () => ({
  ServerConfigurationError: class ServerConfigurationError extends Error {},
  getAdminClient: mocks.getAdminClient,
}));

vi.mock("@/lib/admin/admin-auth-user-service", () => ({
  loadPlatformUserContext: mocks.loadPlatformUserContext,
  updatePlatformUserAccess: mocks.updatePlatformUserAccess,
}));

import { POST as inviteAuthUser } from "../../app/api/v1/admin/auth-users/route";

const originalRedirect = process.env.AUTH_INVITE_REDIRECT_URL;
const adminId = "11111111-1111-4111-8111-111111111111";
const invitedId = "22222222-2222-4222-8222-222222222222";
const invitedUser = {
  id: invitedId,
  aud: "authenticated",
  app_metadata: { provider: "email" },
  user_metadata: { full_name: "Invited Mentor", account_type: "mentor" },
  email: "mentor@example.com",
  created_at: "2026-08-06T00:00:00.000Z",
  invited_at: "2026-08-06T00:00:00.000Z",
};

describe("administrator invitation route redirect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authenticateAdminRequest.mockResolvedValue({
      actor: { roles: ["admin"] },
      user: { id: adminId },
      userClient: {},
    });
    mocks.getAdminClient.mockReturnValue({
      auth: {
        admin: {
          deleteUser: mocks.deleteUser,
          inviteUserByEmail: mocks.inviteUserByEmail,
        },
      },
    });
    mocks.inviteUserByEmail.mockResolvedValue({
      data: { user: invitedUser },
      error: null,
    });
    mocks.updatePlatformUserAccess.mockResolvedValue(undefined);
    mocks.loadPlatformUserContext.mockResolvedValue({
      profiles: new Map(),
      roles: new Map([[invitedId, ["mentor"]]]),
    });
  });

  afterEach(() => {
    if (originalRedirect === undefined) {
      delete process.env.AUTH_INVITE_REDIRECT_URL;
    } else {
      process.env.AUTH_INVITE_REDIRECT_URL = originalRedirect;
    }
  });

  it("passes the validated server redirect and ignores request host headers", async () => {
    process.env.AUTH_INVITE_REDIRECT_URL =
      "https://merotalent.vercel.app/reset-password";

    const response = await inviteAuthUser(
      new Request("https://attacker.example/api/v1/admin/auth-users", {
        method: "POST",
        headers: {
          Authorization: "Bearer admin.jwt.token",
          "Content-Type": "application/json",
          Host: "attacker.example",
          "X-Forwarded-Host": "attacker.example",
        },
        body: JSON.stringify({
          email: "mentor@example.com",
          role: "mentor",
          metadata: { full_name: "Invited Mentor" },
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(mocks.inviteUserByEmail).toHaveBeenCalledWith(
      "mentor@example.com",
      {
        data: {
          account_type: "mentor",
          full_name: "Invited Mentor",
        },
        redirectTo: "https://merotalent.vercel.app/reset-password",
      },
    );
  });

  it("fails closed before creating an Auth user when redirect config is missing", async () => {
    delete process.env.AUTH_INVITE_REDIRECT_URL;

    const response = await inviteAuthUser(
      new Request("https://merotalent.vercel.app/api/v1/admin/auth-users", {
        method: "POST",
        headers: {
          Authorization: "Bearer admin.jwt.token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "mentor@example.com",
          role: "mentor",
        }),
      }),
    );

    expect(response.status).toBe(503);
    expect(mocks.getAdminClient).not.toHaveBeenCalled();
    expect(mocks.inviteUserByEmail).not.toHaveBeenCalled();
  });
});
