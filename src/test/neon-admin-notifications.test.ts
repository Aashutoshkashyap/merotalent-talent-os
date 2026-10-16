import { beforeEach, describe, expect, it, vi } from "vitest";
import { NeonAuthorizationError } from "@/lib/server/neon-authorization";

const queryRowsMock = vi.hoisted(() => vi.fn());
const transactionMock = vi.hoisted(() => vi.fn());
const actorMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/server/backend-mode", () => ({ getBackendMode: () => "neon-staging" }));
vi.mock("@/lib/server/db", () => ({ queryRows: queryRowsMock, withTransaction: transactionMock }));
vi.mock("@/lib/server/neon-session", async original => ({
  ...await original<typeof import("@/lib/server/neon-session")>(),
  getAuthenticatedApplicationUser: actorMock,
}));

import { DELETE, GET, PATCH, POST } from "../../app/api/v1/neon-staging/admin/notifications/route";

const endpoint = "https://app.test/api/v1/neon-staging/admin/notifications";
const userId = "4da2dbaa-e1c6-4c29-88ce-6716761985d1";
const recipientId = "f37ca3df-fb76-4107-802b-03feec324620";
const notificationId = "5acae79e-3f64-444b-bca1-3519871695a7";
const actor = { userId, neonAuthUserId: userId, roles: ["super_admin"], permissions: [], platformAdmin: true };
const request = (method: "POST" | "PATCH" | "DELETE", body: unknown, origin = "https://app.test") =>
  new Request(endpoint, { method, headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body) });

describe("Neon Super Admin notifications workflow", () => {
  beforeEach(() => {
    actorMock.mockReset(); queryRowsMock.mockReset(); transactionMock.mockReset();
    actorMock.mockResolvedValue(actor);
  });

  it("reads live records and recipients only for a Super Admin", async () => {
    queryRowsMock.mockResolvedValueOnce([{ id: notificationId }]).mockResolvedValueOnce([{ user_id: recipientId }]).mockResolvedValueOnce([]);
    const response = await GET(new Request(endpoint));
    expect(response.status).toBe(200);
    expect((await response.json()).data.notifications).toHaveLength(1);
    expect(queryRowsMock.mock.calls[0][0]).toContain("deleted_at IS NULL");
    actorMock.mockResolvedValueOnce({ ...actor, platformAdmin: false });
    expect((await GET(new Request(endpoint))).status).toBe(403);
  });

  it("resolves recipients server-side and atomically creates the confirmed count", async () => {
    transactionMock.mockImplementationOnce(async callback => callback({ query: vi.fn(async (sql: string) =>
      sql.includes("SELECT user_id") ? { rows: [{ user_id: recipientId }] } : { rows: [{ id: notificationId }] }) }));
    const response = await POST(request("POST", { title: "News", message: "Update", type: "info", recipients: `user:${recipientId}` }));
    expect(response.status).toBe(201);
    expect((await response.json()).data.created).toBe(1);
    expect(transactionMock).toHaveBeenCalledOnce();
  });

  it("denies cross-origin, forged recipients and inactive recipients without inserting", async () => {
    expect((await POST(request("POST", { title: "News", message: "Update", type: "info", recipients: "self" }, "https://evil.test"))).status).toBe(403);
    expect((await POST(request("POST", { title: "News", message: "Update", type: "info", recipients: "user:not-a-uuid" }))).status).toBe(400);
    transactionMock.mockImplementationOnce(async callback => callback({ query: vi.fn(async () => ({ rows: [] })) }));
    expect((await POST(request("POST", { title: "News", message: "Update", type: "info", recipients: `user:${recipientId}` }))).status).toBe(404);
  });

  it("updates or soft-removes a single record and denies unlinked sessions", async () => {
    queryRowsMock.mockResolvedValueOnce([{ id: notificationId }]).mockResolvedValueOnce([{ id: notificationId }]);
    expect((await PATCH(request("PATCH", { id: notificationId }))).status).toBe(200);
    expect((await DELETE(request("DELETE", { id: notificationId }))).status).toBe(200);
    expect(queryRowsMock.mock.calls[1][0]).toContain("SET deleted_at=now()");
    actorMock.mockRejectedValueOnce(new NeonAuthorizationError(403, "IDENTITY_NOT_LINKED", "Unlinked"));
    expect((await DELETE(request("DELETE", { id: notificationId }))).status).toBe(403);
  });
});
