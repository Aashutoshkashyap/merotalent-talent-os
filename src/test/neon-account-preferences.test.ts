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

import { GET, PUT } from "../../app/api/v1/neon-staging/preferences/route";

const endpoint = "https://app.test/api/v1/neon-staging/preferences";
const actor = { userId: "4da2dbaa-e1c6-4c29-88ce-6716761985d1",
  neonAuthUserId: "f37ca3df-fb76-4107-802b-03feec324620",
  roles: ["talent"], permissions: [], platformAdmin: false };
const preferences = { email: true, push: false, competitions: true, mentorship: false, jobs: true, marketing: false };

function put(body: unknown, origin = "https://app.test") {
  return PUT(new Request(endpoint, { method: "PUT", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body) }));
}

describe("linked own-account Neon preferences", () => {
  beforeEach(() => {
    actorMock.mockReset(); queryRowsMock.mockReset(); actorMock.mockResolvedValue(actor);
  });

  it("loads defaults only for an authenticated linked user", async () => {
    queryRowsMock.mockResolvedValueOnce([]);
    const response = await GET(new Request(endpoint));
    expect(response.status).toBe(200);
    expect((await response.json()).data.notification_preferences.email).toBe(true);
    expect(queryRowsMock.mock.calls[0][1]).toEqual([actor.userId, actor.neonAuthUserId]);
    actorMock.mockRejectedValueOnce(new NeonAuthorizationError(403, "IDENTITY_NOT_LINKED", "Unlinked"));
    expect((await GET(new Request(endpoint))).status).toBe(403);
  });

  it("upserts exact own linked preferences and does not accept client user IDs", async () => {
    queryRowsMock.mockResolvedValueOnce([{ notification_preferences: preferences, language: "ne" }]);
    const response = await put({ language: "ne", notification_preferences: preferences });
    expect(response.status).toBe(200);
    const [sql, params] = queryRowsMock.mock.calls[0];
    expect(sql).toContain("p.user_id=$1::uuid AND l.neon_auth_user_id=$2::uuid");
    expect(sql).toContain("p.account_status='active'");
    expect(params).toEqual([actor.userId, actor.neonAuthUserId, JSON.stringify(preferences), "ne"]);
    expect((await put({ user_id: "another-account", language: "ne", notification_preferences: preferences })).status).toBe(400);
  });

  it("denies cross-origin writes, invalid settings and missing linked profiles", async () => {
    expect((await put({ language: "en", notification_preferences: preferences }, "https://evil.test")).status).toBe(403);
    expect((await put({ language: "invalid", notification_preferences: preferences })).status).toBe(400);
    expect(queryRowsMock).not.toHaveBeenCalled();
    queryRowsMock.mockResolvedValueOnce([]);
    expect((await put({ language: "en", notification_preferences: preferences })).status).toBe(404);
  });
});
