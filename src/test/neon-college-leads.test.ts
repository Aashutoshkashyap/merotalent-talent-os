import { afterEach, describe, expect, it } from "vitest";
import { GET, POST } from "../../app/api/v1/neon-staging/institutes/[id]/applications/route";
import { listManagedCollegeLeads } from "@/lib/server/neon-college-leads";
import { parseCollegeAdmissionInput, submitCollegeAdmission } from "@/lib/server/neon-college-admissions";
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
    expect(calls[0].params).toEqual([actor.userId, instituteId, actor.neonAuthUserId]);
    expect(calls[0].sql).toContain("link.neon_auth_user_id = $3::uuid");
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
    const post = new Request("https://app.test/", {
      method: "POST", headers: { "content-type": "application/json", origin: "https://app.test" },
      body: JSON.stringify({ programInterest: "Computer Science" }),
    });
    expect((await POST(post, context)).status).toBe(401);
  });

  it("rejects identity, status, and attachment fields supplied by a browser", () => {
    expect(parseCollegeAdmissionInput({ programInterest: "Engineering", applicant_id: actor.userId })).toBeNull();
    expect(parseCollegeAdmissionInput({ programInterest: "Engineering", status: "accepted" })).toBeNull();
    expect(parseCollegeAdmissionInput({ programInterest: "Engineering", attachments: ["x"] })).toBeNull();
    expect(parseCollegeAdmissionInput({ programInterest: " " })).toBeNull();
    expect(parseCollegeAdmissionInput({ programInterest: " Engineering ", message: " Hi " }))
      .toEqual({ programInterest: "Engineering", message: "Hi" });
  });

  it("inserts only from the server-side profile and requires INSERT RETURNING before success", async () => {
    const calls: Array<{ sql: string; params: readonly unknown[] }> = [];
    const db: NeonQueryExecutor = { query: async (sql, params) => {
      calls.push({ sql, params });
      return [{ exists: true, accepting: true, linked: true, profile_complete: true,
        application_id: "saved-1", application_status: "submitted", submitted_at: "2026-10-09T00:00:00Z" }] as never;
    } };
    await expect(submitCollegeAdmission(actor, instituteId, { programInterest: "Engineering" }, db))
      .resolves.toEqual({ id: "saved-1", status: "submitted", submittedAt: "2026-10-09T00:00:00Z" });
    expect(calls).toHaveLength(1);
    expect(calls[0].params).toEqual([actor.userId, instituteId, "Engineering", "", "", actor.neonAuthUserId]);
    expect(calls[0].sql).toContain("link.neon_auth_user_id = $6::uuid");
    expect(calls[0].sql).toContain("WHERE p.user_id = $1::uuid");
    expect(calls[0].sql).toContain("WHERE t.accepting AND a.complete");
    expect(calls[0].sql).toContain("RETURNING id, status, submitted_at");
    expect(calls[0].sql).toContain("i.applications_enabled IS TRUE");
    expect(calls[0].sql).toContain("i.admission_status = 'open'");
  });

  it("denies closed admissions or incomplete profiles and never reports false success", async () => {
    const result = (accepting: boolean, complete: boolean, applicationId: string | null): NeonQueryExecutor => ({
      query: async () => [{ exists: true, accepting, linked: true, profile_complete: complete,
        application_id: applicationId, application_status: applicationId ? "submitted" : null,
        submitted_at: applicationId ? "2026-10-09T00:00:00Z" : null }] as never,
    });
    const input = { programInterest: "Engineering" };
    await expect(submitCollegeAdmission(actor, instituteId, input, result(false, true, null)))
      .rejects.toMatchObject({ status: 403, code: "ADMISSIONS_CLOSED" });
    await expect(submitCollegeAdmission(actor, instituteId, input, result(true, false, null)))
      .rejects.toMatchObject({ status: 403, code: "PROFILE_INCOMPLETE" });
    const revoked: NeonQueryExecutor = { query: async () => [{ exists: true, accepting: true,
      linked: false, profile_complete: false, application_id: null,
      application_status: null, submitted_at: null }] as never };
    await expect(submitCollegeAdmission(actor, instituteId, input, revoked))
      .rejects.toMatchObject({ status: 403, code: "IDENTITY_NOT_LINKED" });
    await expect(submitCollegeAdmission(actor, instituteId, input, result(true, true, null)))
      .rejects.toThrow("not saved");
  });
});
