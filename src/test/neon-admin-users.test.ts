import { describe, expect, it, vi } from "vitest";
import type { NeonActor } from "@/lib/server/neon-authorization";
import { listNeonAdminUsers, setNeonUserStatus } from "@/lib/server/neon-admin-users";

const admin: NeonActor = {
  userId: "10000000-0000-4000-8000-000000000001",
  neonAuthUserId: "20000000-0000-4000-8000-000000000002",
  roles: ["admin"], permissions: [], platformAdmin: true,
};
const other = "30000000-0000-4000-8000-000000000003";

describe("Neon Super Admin user management", () => {
  it("denies ordinary users and invalid list bounds before database access", async () => {
    const query = vi.fn();
    await expect(listNeonAdminUsers({ ...admin, platformAdmin: false },
      { page: 1, pageSize: 25, search: "" }, { query })).rejects.toMatchObject({ code: "ADMIN_REQUIRED" });
    await expect(listNeonAdminUsers(admin, { page: 0, pageSize: 25, search: "" },
      { query })).rejects.toMatchObject({ code: "INVALID_USER_QUERY" });
    await expect(listNeonAdminUsers(admin, { page: 1, pageSize: 101, search: "" },
      { query })).rejects.toMatchObject({ code: "INVALID_USER_QUERY" });
    expect(query).not.toHaveBeenCalled();
  });

  it("paginates linked users and repeats active linked admin guard in SQL", async () => {
    const query = vi.fn().mockResolvedValue([{
      user_id: other, email: "user@example.test", full_name: "User", phone: null,
      account_status: "active", email_verified_at: new Date(), created_at: new Date(),
      roles: ["talent"], identity_linked: false, total_count: 3,
    }]);
    const result = await listNeonAdminUsers(admin,
      { page: 2, pageSize: 2, search: "User" }, { query });
    expect(result.data[0]).toMatchObject({ user_id: other, email_verified: true,
      roles: ["talent"], identity_linked: false });
    expect(result).toMatchObject({ page: 2, total: 3, totalPages: 2, hasNextPage: false });
    expect(query).toHaveBeenCalledWith(expect.stringContaining("al.neon_auth_user_id=$2::uuid"),
      [admin.userId, admin.neonAuthUserId, "User", 2, 2]);
  });

  it("denies self-suspension, checks linked admin again, updates and audits in one transaction", async () => {
    const queries = vi.fn()
      .mockResolvedValueOnce({ rows: [{ allowed: true }] })
      .mockResolvedValueOnce({ rows: [{ user_id: other, account_status: "active" }] })
      .mockResolvedValueOnce({ rows: [{ user_id: other, account_status: "suspended" }] })
      .mockResolvedValueOnce({ rows: [] });
    const run = vi.fn(async callback => callback({ query: queries }));
    await expect(setNeonUserStatus(admin, admin.userId, "suspended", run))
      .rejects.toMatchObject({ code: "SELF_STATUS_CHANGE_DENIED" });
    expect(run).not.toHaveBeenCalled();
    expect(await setNeonUserStatus(admin, other, "suspended", run))
      .toEqual({ user_id: other, account_status: "suspended" });
    expect(queries).toHaveBeenCalledTimes(4);
    expect(queries.mock.calls[3][0]).toContain("INSERT INTO public.audit_logs");
  });

  it("does not mutate when the caller lost admin access or target is missing", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ allowed: false }] });
    const run = vi.fn(async callback => callback({ query }));
    await expect(setNeonUserStatus(admin, other, "suspended", run))
      .rejects.toMatchObject({ code: "ADMIN_REQUIRED" });
    expect(query).toHaveBeenCalledOnce();
  });

  it("deactivates an ordinary account without deleting identity or business records", async () => {
    const queries = vi.fn()
      .mockResolvedValueOnce({ rows: [{ allowed: true }] })
      .mockResolvedValueOnce({ rows: [{ user_id: other, account_status: "active" }] })
      .mockResolvedValueOnce({ rows: [{ is_admin: false }] })
      .mockResolvedValueOnce({ rows: [{ user_id: other, account_status: "deactivated" }] })
      .mockResolvedValueOnce({ rows: [] });
    const run = vi.fn(async callback => callback({ query: queries }));
    expect(await setNeonUserStatus(admin, other, "deactivated", run))
      .toEqual({ user_id: other, account_status: "deactivated" });
    expect(queries.mock.calls[3][0]).toContain("UPDATE public.profiles");
    expect(queries.mock.calls[4][0]).toContain("INSERT INTO public.audit_logs");
    expect(queries.mock.calls[4][1]).toContain("deactivated");
  });

  it("denies deactivation of another Super Admin and allows explicit reactivation", async () => {
    const denied = vi.fn()
      .mockResolvedValueOnce({ rows: [{ allowed: true }] })
      .mockResolvedValueOnce({ rows: [{ user_id: other, account_status: "active" }] })
      .mockResolvedValueOnce({ rows: [{ is_admin: true }] });
    await expect(setNeonUserStatus(admin, other, "deactivated", async callback => callback({ query: denied } as never)))
      .rejects.toMatchObject({ code: "ADMIN_RETIREMENT_DENIED" });
    expect(denied).toHaveBeenCalledTimes(3);
    const reactivation = vi.fn()
      .mockResolvedValueOnce({ rows: [{ allowed: true }] })
      .mockResolvedValueOnce({ rows: [{ user_id: other, account_status: "deactivated" }] })
      .mockResolvedValueOnce({ rows: [{ user_id: other, account_status: "active" }] })
      .mockResolvedValueOnce({ rows: [] });
    await expect(setNeonUserStatus(admin, other, "active", async callback => callback({ query: reactivation } as never)))
      .resolves.toEqual({ user_id: other, account_status: "active" });
  });

  it("does not silently turn a deactivated account into a suspended one", async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [{ allowed: true }] })
      .mockResolvedValueOnce({ rows: [{ user_id: other, account_status: "deactivated" }] });
    await expect(setNeonUserStatus(admin, other, "suspended", async callback => callback({ query } as never)))
      .rejects.toMatchObject({ code: "INVALID_STATUS_TRANSITION" });
    expect(query).toHaveBeenCalledTimes(2);
  });
});
