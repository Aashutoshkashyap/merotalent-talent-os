import { describe, expect, it } from "vitest";
import { listOwnSavedJobs, saveJob, unsaveJob } from "@/lib/server/neon-saved-jobs";
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

  it("saves only when a current verified link and published job produce a row", async () => {
    let sql = "";
    let params: readonly unknown[] = [];
    const db: NeonQueryExecutor = { query: async (statement, values) => {
      sql = statement; params = values;
      return [{ job_id: "job-id" }] as never;
    } };
    await expect(saveJob(actor, "30000000-0000-4000-8000-000000000003", db))
      .resolves.toMatchObject({ saved: true });
    expect(params).toEqual([actor.userId, "30000000-0000-4000-8000-000000000003", actor.neonAuthUserId]);
    expect(sql).toContain("link.neon_auth_user_id = $3::uuid");
    expect(sql).toContain("j.approval_status = 'approved'");
    expect(sql).toContain("RETURNING job_id");
    await expect(saveJob(actor, "30000000-0000-4000-8000-000000000003", { query: async () => [] }))
      .rejects.toMatchObject({ code: "JOB_SAVE_DENIED" });
  });

  it("unsaves only the actor's row while checking the live identity link", async () => {
    let sql = "";
    let params: readonly unknown[] = [];
    await unsaveJob(actor, "30000000-0000-4000-8000-000000000003", { query: async (statement, values) => {
      sql = statement; params = values; return [];
    } });
    expect(params).toEqual([actor.userId, "30000000-0000-4000-8000-000000000003", actor.neonAuthUserId]);
    expect(sql).toContain("WHERE user_id = $1::uuid AND job_id = $2::uuid");
    expect(sql).toContain("link.neon_auth_user_id = $3::uuid");
  });
});
