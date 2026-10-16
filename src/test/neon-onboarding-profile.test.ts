import { beforeEach, describe, expect, it, vi } from "vitest";
import { NeonAuthorizationError } from "@/lib/server/neon-authorization";

const queryRowsMock = vi.hoisted(() => vi.fn());
const actorMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/server/backend-mode", () => ({ getBackendMode: () => "neon-staging" }));
vi.mock("@/lib/server/db", () => ({ queryRows: queryRowsMock }));
vi.mock("@/lib/server/neon-session", async original => ({
  ...await original<typeof import("@/lib/server/neon-session")>(),
  getAuthenticatedApplicationUser: actorMock,
}));

import { PATCH } from "../../app/api/v1/neon-staging/profile/route";

const endpoint = "https://app.test/api/v1/neon-staging/profile";
const userId = "4da2dbaa-e1c6-4c29-88ce-6716761985d1";
const neonAuthUserId = "f37ca3df-fb76-4107-802b-03feec324620";
const actor = { userId, neonAuthUserId, roles: ["talent"], permissions: [], platformAdmin: false };

function request(body: Record<string, unknown>, origin = "https://app.test") {
  return PATCH(new Request(endpoint, { method: "PATCH", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body) }));
}

describe("Neon onboarding profile completion", () => {
  beforeEach(() => {
    actorMock.mockReset(); queryRowsMock.mockReset();
    actorMock.mockResolvedValue(actor);
    queryRowsMock.mockResolvedValue([{ user_id: userId, full_name: "Student One", onboarding_completed: true }]);
  });

  it("writes only the verified linked profile and accepts a complete wizard submission", async () => {
    const response = await request({ full_name: "Student One", bio: "Learning", location: "Kathmandu",
      education: "Engineering", experience_level: "student", skills: ["React"], onboarding_completed: true });
    expect(response.status).toBe(200);
    expect((await response.json()).data.onboarding_completed).toBe(true);
    const [sql, values] = queryRowsMock.mock.calls[0];
    expect(sql).toContain("p.user_id=$1::uuid");
    expect(sql).toContain("l.neon_auth_user_id=$2::uuid");
    expect(sql).toContain("l.status='verified'");
    expect(sql).toContain("onboarding_completed=");
    expect(values.slice(0, 2)).toEqual([userId, neonAuthUserId]);
  });

  it("requires a full name and never accepts a browser-supplied resume path", async () => {
    expect((await request({ onboarding_completed: true })).status).toBe(400);
    expect((await request({ full_name: "Student One", onboarding_completed: true,
      resume_url: "someone-else/resume.pdf" })).status).toBe(400);
    expect(queryRowsMock).not.toHaveBeenCalled();
  });

  it("denies cross-origin, unlinked and missing linked-profile updates", async () => {
    expect((await request({ full_name: "Student One", onboarding_completed: true }, "https://evil.test")).status).toBe(403);
    actorMock.mockRejectedValueOnce(new NeonAuthorizationError(403, "IDENTITY_NOT_LINKED", "Unlinked"));
    expect((await request({ full_name: "Student One", onboarding_completed: true })).status).toBe(403);
    queryRowsMock.mockResolvedValueOnce([]);
    expect((await request({ full_name: "Student One", onboarding_completed: true })).status).toBe(404);
  });
});
