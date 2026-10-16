import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PoolClient } from "pg";
const mocks = vi.hoisted(() => ({ head: vi.fn(), event: vi.fn() }));
vi.mock("@/lib/server/storage", async (load) => ({
  ...await load<typeof import("@/lib/server/storage")>(), headObject: mocks.head,
}));
vi.mock("@/lib/server/neon-application-events", async (load) => ({
  ...await load<typeof import("@/lib/server/neon-application-events")>(), appendNotificationEvent: mocks.event,
}));
import { NeonJobsRepository } from "@/lib/server/neon-jobs";

const userId = "10000000-0000-4000-8000-000000000001";
const authId = "20000000-0000-4000-8000-000000000002";
const jobId = "30000000-0000-4000-8000-000000000003";
const doc = `${userId}/job_attachment/${jobId}/40000000-0000-4000-8000-000000000004.pdf`;
const actor = { userId, neonAuthUserId: authId, platformAdmin: false, roles: ["talent"], permissions: [] };
function mockClient() {
  const calls: Array<{ sql: string; params: unknown[] }> = [];
  const query = vi.fn(async (sql: string, params: unknown[] = []) => {
    calls.push({ sql, params });
    if (sql.includes("FROM public.jobs")) return { rows: [{ id: jobId, title: "Staging role", is_active: true,
      status: "published", approval_status: "approved", application_deadline: null, expires_at: null,
      skills_required: [], location: "Kathmandu", experience_level: "entry", is_remote: false }] };
    if (sql.includes("FROM public.job_applications")) return { rows: [] };
    if (sql.includes("FROM public.profiles")) return { rows: [{ id: userId, full_name: "Test Applicant", email: "test@example.test",
      phone: "9800000000", skills: [], education_history: [], experience_history: [], certifications: [], resume_url: null }] };
    if (sql.includes("FROM public.neon_job_document_drafts")) return { rows: [{ path: doc }] };
    if (sql.includes("INSERT INTO public.job_applications")) return { rows: [{ id: "50000000-0000-4000-8000-000000000005", job_id: jobId, user_id: userId, form_data: JSON.parse(String(params[9])) }] };
    if (sql.includes("INSERT INTO public.notifications")) return { rows: [{ id: "60000000-0000-4000-8000-000000000006" }] };
    return { rows: [] };
  });
  return { calls, query };
}
beforeEach(() => { mocks.head.mockResolvedValue({}); mocks.event.mockResolvedValue(undefined); });

describe("Neon Jobs application supporting-document snapshot", () => {
  it("persists only a real applicant-owned object in the submitted snapshot", async () => {
    const client = mockClient();
    const result = await new NeonJobsRepository().submitJobApplication(actor, {
      jobId, fullName: "", email: "", phone: "", experienceLetterUrl: doc,
    }, client as unknown as Pick<PoolClient, "query">);
    expect((result.form_data as Record<string, unknown>).experienceLetterUrl).toBe(doc);
    expect(mocks.head).toHaveBeenCalledWith("job-files", doc);
    expect(client.calls.some((call) => call.sql.includes("SET state='submitted'"))).toBe(true);
  });
  it("rejects a foreign or missing document before any application insert", async () => {
    const client = mockClient();
    await expect(new NeonJobsRepository().submitJobApplication(actor, {
      jobId, fullName: "", email: "", phone: "", trainingDocumentUrl: doc.replace(userId, authId),
    }, client as unknown as Pick<PoolClient, "query">)).rejects.toMatchObject({ code: "MEDIA_OWNER_MISMATCH" });
    mocks.head.mockResolvedValueOnce(null);
    await expect(new NeonJobsRepository().submitJobApplication(actor, {
      jobId, fullName: "", email: "", phone: "", trainingDocumentUrl: doc,
    }, client as unknown as Pick<PoolClient, "query">)).rejects.toMatchObject({ code: "APPLICATION_DOCUMENT_MISSING" });
    expect(client.calls.some((call) => call.sql.includes("INSERT INTO public.job_applications"))).toBe(false);
  });
});
