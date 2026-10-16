import { afterEach, describe, expect, it, vi } from "vitest";
import { listNeonAdministrators, loadNeonDirectoryProfiles } from "@/lib/server/neon-admin-directory";
import type { NeonActor } from "@/lib/server/neon-authorization";
import { loadAdminProfiles } from "@/lib/admin/profile-hydration";

const { from } = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from } }));
const admin: NeonActor = { userId: "10000000-0000-4000-8000-000000000001", neonAuthUserId: "20000000-0000-4000-8000-000000000002",
  roles: ["admin"], platformAdmin: true, permissions: [] };
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.clearAllMocks(); });
describe("Neon administrator directory and profile hydration", () => {
  it("denies ordinary, revoked and wrongly linked administrators", async () => {
    const query = vi.fn().mockResolvedValue([{ allowed: false, records: [] }]);
    await expect(listNeonAdministrators({ ...admin, platformAdmin: false }, { query })).rejects.toMatchObject({ code: "ADMIN_REQUIRED" });
    expect(query).not.toHaveBeenCalled();
    await expect(listNeonAdministrators(admin, { query })).rejects.toMatchObject({ code: "ADMIN_REQUIRED" });
    expect(query.mock.calls[0][0]).toContain("l.neon_auth_user_id=$2::uuid");
    expect(query.mock.calls[0][0]).toContain("p.account_status='active'");
  });
  it("returns only directory summaries, never credentials or additional role grants", async () => {
    const records = [{ roleId: "role", userId: admin.userId, role: "admin", addedAt: "2026-10-14T00:00:00Z",
      profile: { email: "directory@example.test", fullName: "Directory", avatarUrl: null } }];
    const query = vi.fn().mockResolvedValue([{ allowed: true, records }]);
    expect(await listNeonAdministrators(admin, { query })).toEqual(records);
    expect(query.mock.calls[0][0]).not.toMatch(/INSERT|UPDATE|DELETE/);
  });
  it("rejects manipulated and oversized profile-ID batches before any read", async () => {
    const query = vi.fn();
    await expect(loadNeonDirectoryProfiles(admin, ["invalid"], { query })).rejects.toMatchObject({ code: "INVALID_PROFILE_IDS" });
    await expect(loadNeonDirectoryProfiles(admin, Array(101).fill(admin.userId), { query })).rejects.toMatchObject({ code: "INVALID_PROFILE_IDS" });
    expect(query).not.toHaveBeenCalled();
  });
  it("parameterizes and deduplicates IDs and never reads deleted profile data", async () => {
    const query = vi.fn().mockResolvedValue([{ allowed: true, records: [] }]);
    await loadNeonDirectoryProfiles(admin, [admin.userId, admin.userId], { query });
    expect(query.mock.calls[0][1]).toEqual([admin.userId, admin.neonAuthUserId, [admin.userId]]);
    expect(query.mock.calls[0][0]).toContain("deleted_at IS NULL");
  });
  it("uses guarded Neon cookie requests without calling Supabase for shared profile hydration", async () => {
    vi.stubEnv("NEXT_PUBLIC_MEROTALENT_BACKEND_MODE", "neon-staging");
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [{ user_id: admin.userId, email: "test@example.test", full_name: "Test" }] })));
    vi.stubGlobal("fetch", fetch);
    const profiles = await loadAdminProfiles([admin.userId, admin.userId, null]);
    expect(profiles.get(admin.userId)?.full_name).toBe("Test");
    expect(fetch).toHaveBeenCalledWith("/api/v1/neon-staging/admin/profiles", expect.objectContaining({ credentials: "same-origin", cache: "no-store" }));
    expect(from).not.toHaveBeenCalled();
  });
});
