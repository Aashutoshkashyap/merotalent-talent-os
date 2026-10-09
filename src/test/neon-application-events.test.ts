import { afterEach, describe, expect, it } from "vitest";
import { GET } from "../../app/api/v1/realtime/stream/route";
import {
  appendMessageEvent, appendNotificationEvent, listApplicationEvents,
  requireConversationMembership, type EventReader,
} from "@/lib/server/neon-application-events";
import type { NeonActor } from "@/lib/server/neon-authorization";

const actor: NeonActor = {
  userId: "10000000-0000-4000-8000-000000000001",
  neonAuthUserId: "20000000-0000-4000-8000-000000000002",
  roles: ["talent"], permissions: [], platformAdmin: false,
};
const conversationId = "30000000-0000-4000-8000-000000000003";
const previousMode = process.env.MEROTALENT_BACKEND_MODE;
const previousConfig = {
  NEON_STAGING_DATABASE_URL: process.env.NEON_STAGING_DATABASE_URL,
  NEON_STAGING_BRANCH_ID: process.env.NEON_STAGING_BRANCH_ID,
  NEON_AUTH_BASE_URL: process.env.NEON_AUTH_BASE_URL,
};

afterEach(() => {
  if (previousMode === undefined) delete process.env.MEROTALENT_BACKEND_MODE;
  else process.env.MEROTALENT_BACKEND_MODE = previousMode;
  for (const [key, value] of Object.entries(previousConfig)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("durable staging application events", () => {
  it("requires live membership before a conversation subscription", async () => {
    const db: EventReader = { query: async () => [{ allowed: false }] as never };
    await expect(requireConversationMembership(actor, conversationId, db))
      .rejects.toMatchObject({ status: 403, code: "CONVERSATION_FORBIDDEN" });
  });

  it("seeks only the verified actor's events and rechecks message membership", async () => {
    const calls: Array<{ sql: string; params: readonly unknown[] }> = [];
    const db: EventReader = { query: async (sql, params) => {
      calls.push({ sql, params });
      return [{ id: "9", kind: "notification", source_id: conversationId, conversation_id: null }] as never;
    } };
    const rows = await listApplicationEvents(actor, "8", null, db);
    expect(rows).toHaveLength(1);
    expect(calls).toHaveLength(1);
    expect(calls[0].params).toEqual([actor.userId, "8", null]);
    expect(calls[0].sql).toContain("e.recipient_user_id = $1::uuid");
    expect(calls[0].sql).toContain("mentor.user_id = $1::uuid");
    expect(calls[0].sql).toContain("ORDER BY e.id ASC LIMIT 50");
  });

  it("only enqueues a notification for its actual recipient", async () => {
    const client = { query: async (sql: string) => sql.includes("INSERT INTO")
      ? { rowCount: 0 } : { rowCount: 0 } } as never;
    await expect(appendNotificationEvent(client, actor.userId, conversationId))
      .rejects.toMatchObject({ code: "EVENT_RECIPIENT_MISMATCH" });
  });

  it("validates both message participants before event insertion", async () => {
    let sql = "";
    const client = { query: async (query: string) => {
      sql = query;
      return { rowCount: 1 };
    } } as never;
    await appendMessageEvent(client, actor.userId, conversationId);
    expect(sql).toContain("m.receiver_id = $1::uuid");
    expect(sql).toContain("c.mentee_id = m.sender_id");
    expect(sql).toContain("c.mentee_id = m.receiver_id");
  });

  it("keeps legacy closed and rejects malformed staging cursors before session lookup", async () => {
    process.env.MEROTALENT_BACKEND_MODE = "legacy";
    expect((await GET(new Request("https://app.test/api/v1/realtime/stream"))).status).toBe(404);
    process.env.MEROTALENT_BACKEND_MODE = "neon-staging";
    expect((await GET(new Request("https://app.test/api/v1/realtime/stream?cursor=9223372036854775808"))).status).toBe(400);
    expect((await GET(new Request("https://app.test/api/v1/realtime/stream?conversationId=anything"))).status).toBe(400);
    process.env.NEON_STAGING_DATABASE_URL =
      "postgresql://staging:unused@ep-wispy-credit-azt6tgwj-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb";
    process.env.NEON_STAGING_BRANCH_ID = "br-frosty-haze-azsnybmr";
    process.env.NEON_AUTH_BASE_URL =
      "https://ep-wispy-credit-azt6tgwj.neonauth.c-3.ap-southeast-1.aws.neon.tech/neondb/auth";
    expect((await GET(new Request("https://app.test/api/v1/realtime/stream"))).status).toBe(401);
  });
});
