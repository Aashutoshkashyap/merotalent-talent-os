import { afterEach, describe, expect, it } from "vitest";
import { GET } from "../../app/api/v1/neon-staging/institutes/[id]/applications/route";
import { listManagedCollegeLeads } from "@/lib/server/neon-college-leads";
import type { NeonActor, NeonQueryExecutor } from "@/lib/server/neon-authorization";

const actor: NeonActor = {
  userId: "10000000-0000-4000-8000-000000000001",
  neonAuthUserId: "20000000-0000-4000-8000-000000000002",
  roles: ["college_admin"], permissions: [], platformAdmin: false,
};
const instituteId = "30000000-0000-4000-8000-000000000003";
const original = {
  mode: process.env.MEROTALENT_BACKEND_MODE,
  url: process.env.NEON_STAGING_DATABASE_URL,
  branch: process.env.NEON_STAGING_BRANCH_ID,
  auth: process.env.NEON_AUTH_BASE_URL,
};

afterEach(() => {
  const entries: Array<[string, string | undefined]> = [
    ["MEROTALENT_BACKEND_MODE", original.mode],
    ["NEON_STAGING_DATABASE_URL", original.url],
    ["NEON_STAGING_BRANCH_ID", original.branch],
    ["NEON_AUTH_BASE_URL", original.auth],
  ];
  for (const [key, value] of entries) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("Neon staging college lead boundary", () => {
  it("uses one parameterized SQL snapshot for authorization and private rows", async () => {
    const calls: Array<{ sql: string; params: readonly unknown[] }> = [];
    const db: NeonQueryExecutor = { query: async (sql, params) => {
      calls.push({ sql, params });
      return [{ exists: true, allowed: true, applications: [{ id: "lead-1" }] }] as never;
    } };
    const rows = await listManagedCollegeLeads(actor, instituteId, db);
    expect(rows).toEqual([{ id: "lead-1" }]);
    expect(calls).toHaveLength(1);
    expect(calls[0].params).toEqual([actor.userId, instituteId]);
    expect(calls[0].sql).toContain("JOIN access a ON a.id = ca.institute_id AND a.allowed");
    expect(calls[0].sql).toContain("e.expires_at IS NULL OR e.expires_at > now()");
    expect(calls[0].sql).toContain("ea.entity_id = i.id");
    expect(calls[0].sql).toContain("ca.deleted_at IS NULL");
  });

  it("denies an unrelated or expired college without returning applications", async () => {
    const db: NeonQueryExecutor = { query: async () => [{
      exists: true, allowed: false, applications: [],
    }] as never };
    await expect(listManagedCollegeLeads(actor, instituteId, db))
      .rejects.toMatchObject({ status: 403, code: "ENTITY_ACCESS_REQUIRED" });
  });

  it("distinguishes a nonexistent institution from an empty authorized inbox", async () => {
    const missing: NeonQueryExecutor = { query: async () => [{
      exists: false, allowed: false, applications: [],
    }] as never };
    const empty: NeonQueryExecutor = { query: async () => [{
      exists: true, allowed: true, applications: [],
    }] as never };
    expect(await listManagedCollegeLeads(actor, instituteId, missing)).toBeNull();
    expect(await listManagedCollegeLeads(actor, instituteId, empty)).toEqual([]);
  });

  it("does not expose the route outside isolated staging and requires a session", async () => {
    const context = { params: Promise.resolve({ id: instituteId }) };
    process.env.MEROTALENT_BACKEND_MODE = "legacy";
    expect((await GET(new Request("https://app.test/"), context)).status).toBe(404);
    process.env.MEROTALENT_BACKEND_MODE = "neon-staging";
    process.env.NEON_STAGING_DATABASE_URL =
      "postgresql://staging:unused@ep-wispy-credit-azt6tgwj-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb";
    process.env.NEON_STAGING_BRANCH_ID = "br-frosty-haze-azsnybmr";
    process.env.NEON_AUTH_BASE_URL =
      "https://ep-wispy-credit-azt6tgwj.neonauth.c-3.ap-southeast-1.aws.neon.tech/neondb/auth";
    expect((await GET(new Request("https://app.test/"), context)).status).toBe(401);
  });
});
