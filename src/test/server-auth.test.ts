import { describe, expect, it } from "vitest";

import {
  ApiAuthError,
  getBearerToken,
  hasAnyPermission,
  hasAnyRole,
  requireAnyPermission,
  requireAnyRole,
  type AuthenticatedActor,
} from "@/lib/server/auth";

const actor = {
  accountStatus: "active",
  roles: ["mentor"],
  permissions: ["event.organize"],
} as unknown as AuthenticatedActor;

describe("server authentication utilities", () => {
  it("accepts only a strict bearer authorization header", () => {
    expect(
      getBearerToken(
        new Request("https://example.test", {
          headers: { Authorization: "Bearer abc.def.ghi" },
        }),
      ),
    ).toBe("abc.def.ghi");
    expect(
      getBearerToken(
        new Request("https://example.test", {
          headers: { Authorization: "Basic abc.def.ghi" },
        }),
      ),
    ).toBeNull();
    expect(
      getBearerToken(
        new Request("https://example.test", {
          headers: { Authorization: "Bearer abc extra" },
        }),
      ),
    ).toBeNull();
  });

  it("checks roles and explicit permissions independently", () => {
    expect(hasAnyRole(actor, ["mentor"])).toBe(true);
    expect(hasAnyRole(actor, ["admin"])).toBe(false);
    expect(hasAnyPermission(actor, ["event.organize"])).toBe(true);
    expect(hasAnyPermission(actor, ["job.post"])).toBe(false);
  });

  it("throws a typed forbidden response when access is missing", () => {
    expect(() => requireAnyRole(actor, ["admin"])).toThrow(ApiAuthError);
    expect(() => requireAnyPermission(actor, ["job.post"])).toThrow(
      ApiAuthError,
    );
  });
});
