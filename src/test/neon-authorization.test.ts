import { describe, expect, it } from "vitest";
import {
  requireAuthenticatedUser,
  requireEntityAccess,
  requirePermission,
  requireSuperAdmin,
  type NeonActor,
  type NeonQueryExecutor,
} from "@/lib/server/neon-authorization";
import { NeonRepositories } from "@/lib/server/neon-repositories";

const student: NeonActor = {
  userId: "10000000-0000-4000-8000-000000000001",
  neonAuthUserId: "neon-test-student",
  roles: ["talent"], permissions: ["application.submit"], platformAdmin: false,
};

describe("Neon authorization boundary", () => {
  it("rejects missing or unverified identity before querying private data", async () => {
    const db: NeonQueryExecutor = { query: async () => { throw new Error("must not query"); } };
    await expect(requireAuthenticatedUser(null, db)).rejects.toMatchObject({ status: 401 });
    await expect(requireAuthenticatedUser({
      legacyUserId: student.userId, neonAuthUserId: "x", linkVerified: false,
    } as never, db)).rejects.toMatchObject({ status: 401 });
  });

  it("denies deactivated application profiles even when their Managed Auth session is still valid", async () => {
    const db: NeonQueryExecutor = { query: async () => [{ account_status: "deactivated",
      deleted_at: null, roles: ["talent"], permissions: [] }] as never };
    await expect(requireAuthenticatedUser({ legacyUserId: student.userId,
      neonAuthUserId: "20000000-0000-4000-8000-000000000002", linkVerified: true }, db))
      .rejects.toMatchObject({ code: "ACCOUNT_INACTIVE" });
  });

  it("does not elevate students to platform administrators", () => {
    expect(() => requireSuperAdmin(student)).toThrow();
    expect(() => requirePermission(student, "user.manage")).toThrow();
  });

  it("denies a missing or unrelated entity assignment", async () => {
    const calls: string[] = [];
    const db: NeonQueryExecutor = {
      query: async (sql) => {
        calls.push(sql);
        return [{ allowed: calls.length === 1 }] as never;
      },
    };
    await expect(requireEntityAccess(
      student, "college", "college", "20000000-0000-4000-8000-000000000002", "profile_editing", db,
    )).rejects.toMatchObject({ code: "ENTITY_ACCESS_REQUIRED" });
    expect(calls).toHaveLength(2);
  });

  it("does not let a student read another profile", async () => {
    const db: NeonQueryExecutor = { query: async () => { throw new Error("must not query"); } };
    const repo = new NeonRepositories(db);
    await expect(repo.getProfile(student, "30000000-0000-4000-8000-000000000003"))
      .rejects.toMatchObject({ code: "USER_SCOPE_REQUIRED" });
  });
});
