import { afterEach, describe, expect, it } from "vitest";
import { GET, PATCH } from "../../app/api/v1/neon-staging/notifications/route";
import { listOwnNotifications, markOwnNotificationsRead } from "@/lib/server/neon-notifications";
import type { NeonActor, NeonQueryExecutor } from "@/lib/server/neon-authorization";

const actor: NeonActor = {
  userId: "10000000-0000-4000-8000-000000000001",
  neonAuthUserId: "20000000-0000-4000-8000-000000000002",
  roles: ["talent"], permissions: [], platformAdmin: false,
};
const notificationId = "30000000-0000-4000-8000-000000000003";
const previousMode = process.env.MEROTALENT_BACKEND_MODE;

afterEach(() => {
  if (previousMode === undefined) delete process.env.MEROTALENT_BACKEND_MODE;
  else process.env.MEROTALENT_BACKEND_MODE = previousMode;
});

describe("Neon own-recipient notifications", () => {
  it("reads only the actor's recipient rows under a live identity link", async () => {
    const calls: Array<{ sql: string; params: readonly unknown[] }> = [];
    const db: NeonQueryExecutor = { query: async (sql, params) => {
      calls.push({ sql, params });
      return [{ allowed: true, notifications: [{ id: notificationId }], unread_count: 1 }] as never;
    } };
    const data = await listOwnNotifications(actor, db);
    expect(data.notifications).toEqual([{ id: notificationId }]);
    expect(data.unreadCount).toBe(1);
    expect(calls).toHaveLength(1);
    expect(calls[0].params).toEqual([actor.userId, actor.neonAuthUserId]);
    expect(calls[0].sql).toContain("n.recipient_id = $1::uuid");
    expect(calls[0].sql).toContain("l.neon_auth_user_id = $2::uuid");
  });

  it("denies a revoked account rather than returning an empty successful inbox", async () => {
    const db: NeonQueryExecutor = { query: async () => [{
      allowed: false, notifications: [], unread_count: 0,
    }] as never };
    await expect(listOwnNotifications(actor, db))
      .rejects.toMatchObject({ status: 403, code: "IDENTITY_NOT_LINKED" });
  });

  it("updates only own unread rows with authorization in the same SQL statement", async () => {
    const calls: Array<{ sql: string; params: readonly unknown[] }> = [];
    const db: NeonQueryExecutor = { query: async (sql, params) => {
      calls.push({ sql, params }); return [{ id: notificationId }] as never;
    } };
    expect(await markOwnNotificationsRead(actor, notificationId, db)).toBe(1);
    expect(calls[0].params).toEqual([actor.userId, actor.neonAuthUserId, notificationId]);
    expect(calls[0].sql).toContain("UPDATE public.notifications n SET is_read = true");
    expect(calls[0].sql).toContain("n.recipient_id = $1::uuid");
    expect(calls[0].sql).toContain("l.status = 'verified'");
  });

  it("rejects invalid and cross-origin writes before touching private state", async () => {
    process.env.MEROTALENT_BACKEND_MODE = "legacy";
    expect((await GET(new Request("https://app.test/api/v1/neon-staging/notifications"))).status).toBe(404);
    process.env.MEROTALENT_BACKEND_MODE = "neon-staging";
    const url = "https://app.test/api/v1/neon-staging/notifications";
    expect((await PATCH(new Request(url, { method: "PATCH", headers: { origin: "https://evil.test" }, body: "{}" }))).status).toBe(403);
    expect((await PATCH(new Request(url, { method: "PATCH", body: "{}" }))).status).toBe(403);
    expect((await PATCH(new Request(url, { method: "PATCH", headers: { origin: "https://app.test" }, body: JSON.stringify({ id: "wrong" }) }))).status).toBe(400);
  });
});
