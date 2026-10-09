import { describe, expect, it } from "vitest";
import { listOwnSavedJobs } from "@/lib/server/neon-saved-jobs";
import type { NeonActor, NeonQueryExecutor } from "@/lib/server/neon-authorization";

const actor: NeonActor = {
  userId: "10000000-0000-4000-8000-000000000001",
  neonAuthUserId: "20000000-0000-4000-8000-000000000002",
  roles: ["talent"], permissions: [], platformAdmin: false,
};

describe("Neon saved Jobs repository scope", () => {
  it("binds the verified actor ID and excludes deleted/unpublished rows", async () => {
    let sql = "";
    let params: readonly unknown[] = [];
    const db: NeonQueryExecutor = { query: async (statement, values) => {
      sql = statement;
      params = values;
      return [];
    } };
    await listOwnSavedJobs(actor, 20, 0, db);
    expect(params).toEqual([actor.userId, actor.neonAuthUserId, 20, 0]);
    expect(sql).toContain("s.user_id = $1::uuid");
    expect(sql).toContain("link.neon_auth_user_id = $2::uuid");
    expect(sql).toContain("s.deleted_at IS NULL");
    expect(sql).toContain("j.status = 'published'");
    expect(sql).not.toContain(actor.userId);
  });
});
