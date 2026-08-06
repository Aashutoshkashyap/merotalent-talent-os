import { describe, expect, it } from "vitest";

import {
  GET as listAuthUsers,
  POST as inviteAuthUser,
} from "../../app/api/v1/admin/auth-users/route";
import {
  DELETE as deleteAuthUser,
  PATCH as patchAuthUser,
} from "../../app/api/v1/admin/auth-users/[id]/route";

const expectAuthRequired = async (response: Response) => {
  expect(response.status).toBe(401);
  await expect(response.json()).resolves.toMatchObject({
    data: null,
    error: { code: "AUTH_REQUIRED" },
  });
};

describe("admin Auth user API authentication order", () => {
  it("authenticates before parsing list query parameters", async () => {
    await expectAuthRequired(
      await listAuthUsers(
        new Request(
          "https://merotalent.test/api/v1/admin/auth-users?page_size=999999",
        ),
      ),
    );
  });

  it("authenticates before reading an invitation payload", async () => {
    await expectAuthRequired(
      await inviteAuthUser(
        new Request("https://merotalent.test/api/v1/admin/auth-users", {
          method: "POST",
          headers: { "Content-Type": "text/plain" },
          body: "password=unsafe",
        }),
      ),
    );
  });

  it("authenticates before validating an update target or body", async () => {
    await expectAuthRequired(
      await patchAuthUser(
        new Request(
          "https://merotalent.test/api/v1/admin/auth-users/not-a-uuid",
          { method: "PATCH" },
        ),
        { params: Promise.resolve({ id: "not-a-uuid" }) },
      ),
    );
  });

  it("authenticates before validating a destructive action", async () => {
    await expectAuthRequired(
      await deleteAuthUser(
        new Request(
          "https://merotalent.test/api/v1/admin/auth-users/not-a-uuid",
          { method: "DELETE" },
        ),
        { params: Promise.resolve({ id: "not-a-uuid" }) },
      ),
    );
  });
});
