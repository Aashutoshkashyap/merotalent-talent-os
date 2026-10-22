import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { NeonAuthorizationError } from "@/lib/server/neon-authorization";

const mocks = vi.hoisted(() => ({ actor: vi.fn(), rows: vi.fn() }));
vi.mock("@/lib/server/neon-session", async original => ({
  ...await original<typeof import("@/lib/server/neon-session")>(),
  getAuthenticatedApplicationUser: mocks.actor,
}));
vi.mock("@/lib/server/db", () => ({ queryRows: mocks.rows }));
import { GET } from "../../app/api/v1/neon-staging/college-workspaces/route";

const actor = { userId: "10000000-0000-4000-8000-000000000001", neonAuthUserId: "20000000-0000-4000-8000-000000000002",
  roles: ["talent"], permissions: [], platformAdmin: false };
const college = { id: "30000000-0000-4000-8000-000000000003", status: "approved", subscription_active: true,
  package_name: "Granted access", payment_status: "manual_grant", lead_access_mode: "full", can_view_applications: true };
const request = () => new Request("https://app.test/api/v1/neon-staging/college-workspaces?userId=attacker");
beforeEach(() => {
  vi.stubEnv("MEROTALENT_BACKEND_MODE", "neon-staging");
  mocks.actor.mockResolvedValue(actor);
  mocks.rows.mockResolvedValueOnce([{ allowed: true }]).mockResolvedValueOnce([college]).mockResolvedValueOnce([]);
});
afterEach(() => { vi.unstubAllEnvs(); vi.resetAllMocks(); });

describe("College workspace effective access", () => {
  it("reports manual feature access and listing status without requiring a package", async () => {
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect((await response.json()).data.workspaces).toEqual([college]);
    const [sql, params] = mocks.rows.mock.calls[1];
    expect(params).toEqual([actor.userId]);
    for (const predicate of ["e.entity_id=i.id", "e.start_at<=now()", "e.expires_at>now()", "e.status='active'",
      "g.feature_key='college_applications'", "g.status='active'", "umc.user_id=$1::uuid", "a.status='active'"])
      expect(sql).toContain(predicate);
    expect(sql).toContain("effective.applications AS can_view_applications");
    expect(sql).toContain("current_plan.active");
  });
  it("preserves denied feature state instead of treating every active grant as lead access", async () => {
    mocks.rows.mockReset().mockResolvedValueOnce([{ allowed: true }]).mockResolvedValueOnce([
      { ...college, lead_access_mode: "none", can_view_applications: false },
    ]).mockResolvedValueOnce([]);
    expect((await (await GET(request())).json()).data.workspaces[0].can_view_applications).toBe(false);
  });
  it("denies anonymous and suspended accounts before querying workspace data", async () => {
    mocks.actor.mockRejectedValue(new NeonAuthorizationError(403, "ACCOUNT_INACTIVE", "Denied"));
    expect((await GET(request())).status).toBe(403);
    expect(mocks.rows).not.toHaveBeenCalled();
  });
  it("does not expose Neon workspaces in legacy mode", async () => {
    vi.stubEnv("MEROTALENT_BACKEND_MODE", "legacy");
    expect((await GET(request())).status).toBe(404);
    expect(mocks.actor).not.toHaveBeenCalled();
  });
  it("does not request private applicant data when the server denies the feature", () => {
    const source = readFileSync(`${process.cwd()}/src/screens/institute/InstituteDashboard.tsx`, "utf8");
    expect(source).toContain("selected.can_view_applications");
    expect(source).toContain('activeInstitute.status === "approved" ? "Approved listing"');
    expect(source).toContain('/institute/notices?college=${activeInstitute.id}&new=1');
    expect(source).toContain('/institutes/${encodeURIComponent(activeInstitute.slug || activeInstitute.id)}');
  });
});
