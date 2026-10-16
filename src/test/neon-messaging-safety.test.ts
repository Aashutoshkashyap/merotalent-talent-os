import { afterEach, describe, expect, it } from "vitest";
import { GET, POST } from "../../app/api/v1/neon-staging/messaging/route";
import { NeonMessagingRepository } from "@/lib/server/neon-messaging";
import type { NeonActor, NeonQueryExecutor } from "@/lib/server/neon-authorization";

const actor: NeonActor = {
  userId: "10000000-0000-4000-8000-000000000001",
  neonAuthUserId: "20000000-0000-4000-8000-000000000002",
  roles: ["talent"], permissions: [], platformAdmin: false,
};
const conversationId = "30000000-0000-4000-8000-000000000003";
const previousMode = process.env.MEROTALENT_BACKEND_MODE;

afterEach(() => {
  if (previousMode === undefined) delete process.env.MEROTALENT_BACKEND_MODE;
  else process.env.MEROTALENT_BACKEND_MODE = previousMode;
});

describe("Neon staging messaging boundary", () => {
  it("keeps the staging endpoint unavailable in legacy production mode", async () => {
    process.env.MEROTALENT_BACKEND_MODE = "legacy";
    expect((await GET(new Request("https://app.test/api/v1/neon-staging/messaging"))).status).toBe(404);
  });

  it("rejects cross-origin and malformed sends before touching storage", async () => {
    process.env.MEROTALENT_BACKEND_MODE = "neon-staging";
    const url = "https://app.test/api/v1/neon-staging/messaging";
    expect((await POST(new Request(url, { method: "POST", headers: { origin: "https://evil.test" },
      body: JSON.stringify({ conversationId, content: "hi" }) }))).status).toBe(403);
    expect((await POST(new Request(url, { method: "POST", headers: { origin: "https://app.test" },
      body: JSON.stringify({ conversationId, content: "hi", receiverId: actor.userId }) }))).status).toBe(400);
    expect((await GET(new Request(`${url}?conversationId=bad-id`))).status).toBe(400);
  });

  it("queries message pages under the exact active conversation membership", async () => {
    const queries: Array<{ sql: string; params: readonly unknown[] }> = [];
    const db: NeonQueryExecutor = { query: async (sql, params) => {
      queries.push({ sql, params });
      if (sql.includes("AS allowed")) return [{ allowed: true }] as never;
      return [{ id: "40000000-0000-4000-8000-000000000004" }] as never;
    } };
    const result = await new NeonMessagingRepository(db).listMessages(actor, conversationId);
    expect(result.messages).toHaveLength(1);
    expect(queries[1].sql).toContain("c.is_active=true");
    expect(queries[1].params).toEqual([conversationId, null, actor.userId]);
  });

  it("refuses an unverified attachment path before attempting a write", async () => {
    const db: NeonQueryExecutor = { query: async () => { throw new Error("Must not query"); } };
    const repo = new NeonMessagingRepository(db);
    await expect(repo.sendMessage(actor, conversationId, "hello", { path: "other-user/private.pdf", mimeType: "application/pdf" }))
      .rejects.toMatchObject({ code: "INVALID_MEDIA_PATH", status: 422 });
  });

  it("requires message metadata in the same conversation for an attachment read", async () => {
    const calls: Array<{ sql: string; params: readonly unknown[] }> = [];
    const db: NeonQueryExecutor = { query: async (sql, params) => {
      calls.push({ sql, params });
      if (sql.includes("AS allowed")) return [{ allowed: true }] as never;
      return [] as never;
    } };
    await expect(new NeonMessagingRepository(db).attachmentForMessage(actor, conversationId,
      "40000000-0000-4000-8000-000000000004"))
      .rejects.toMatchObject({ code: "ATTACHMENT_NOT_FOUND", status: 404 });
    expect(calls[1].sql).toContain("m.conversation_id=$1::uuid");
    expect(calls[1].sql).toContain("m.id=$2::uuid");
    expect(calls[1].params[2]).toBe(actor.userId);
  });
});
