import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
const rpc = vi.fn();

vi.mock("@/lib/server/supabase", () => ({
  getUserClient: () => ({ auth: { getUser }, rpc }),
  ServerConfigurationError: class ServerConfigurationError extends Error {},
}));

import { authenticateAdminRequest } from "@/lib/server/auth";

describe("admin request authentication", () => {
  beforeEach(() => {
    getUser.mockReset();
    rpc.mockReset();
  });

  it("uses the caller-bound RLS client without requiring a service-role client", async () => {
    const user = {
      id: "11111111-1111-4111-8111-111111111111",
      email: "admin@example.com",
      email_confirmed_at: "2026-08-06T00:00:00.000Z",
    };
    getUser.mockResolvedValue({ data: { user }, error: null });
    rpc.mockResolvedValue({
      data: {
        account_status: "active",
        roles: ["admin"],
        permissions: [],
      },
      error: null,
    });

    const context = await authenticateAdminRequest(
      new Request("https://merotalent.test/api/v1/admin/jobs", {
        headers: { Authorization: "Bearer test.jwt.token" },
      }),
    );

    expect(context.user).toBe(user);
    expect(context.actor.roles).toEqual(["admin"]);
    expect(context.userClient).toHaveProperty("rpc");
    expect(context).not.toHaveProperty("adminClient");
  });
});
