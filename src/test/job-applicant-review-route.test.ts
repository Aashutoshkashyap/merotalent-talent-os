import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), rpc: vi.fn(), admin: vi.fn(), provider: vi.fn(), send: vi.fn() }));
vi.mock("@/lib/server/auth", async (original) => ({ ...await original<typeof import("@/lib/server/auth")>(), authenticateRequest: mocks.auth }));
vi.mock("@/lib/server/supabase", async (original) => ({ ...await original<typeof import("@/lib/server/supabase")>(), getAdminClient: mocks.admin }));
vi.mock("@/lib/server/provider-config-service", () => ({ loadProviderSecret: mocks.provider }));
vi.mock("@/lib/server/email-provider", () => ({ getTransactionalEmailProvider: () => ({ send: mocks.send }), getConfiguredTransactionalEmailProvider: () => ({ send: mocks.send }) }));
import { GET, PATCH } from "../../app/api/v1/jobs/applications/route";
import { ApiAuthError } from "@/lib/server/auth";
const id = "11111111-1111-4111-8111-111111111111";
const patch = (values: Record<string, unknown>) => PATCH(new Request("https://example.com/api/v1/jobs/applications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status: "screening", ...values }) }));
beforeEach(() => { vi.resetAllMocks(); mocks.auth.mockResolvedValue({ userClient: { rpc: mocks.rpc } }); });
describe("job applicant review", () => {
  it("requires authentication before listing private applications", async () => {
    mocks.auth.mockRejectedValue(new ApiAuthError(401, "UNAUTHORIZED", "Sign in"));
    expect((await GET(new Request("https://example.com/api/v1/jobs/applications"))).status).toBe(401);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("does not send email when the database denies another entity's application", async () => {
    mocks.rpc.mockResolvedValue({ error: { code: "42501", message: "Access denied" } });
    expect((await patch({ status: "confirmed" })).status).toBe(403);
    expect(mocks.admin).not.toHaveBeenCalled();
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("rejects an injected recipient and invalid status", async () => {
    expect((await patch({ to: "attacker@example.com" })).status).toBe(422);
    expect((await patch({ status: "paid" })).status).toBe(422);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("persists interview time and duration through the authorized RPC", async () => {
    mocks.rpc.mockResolvedValue({ data: { id, status: "interview" }, error: null });
    const response = await patch({ status: "interview", interviewAt: "2027-01-01T10:00:00Z", interviewLocation: "Office", duration: 45 });
    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("review_job_application", expect.objectContaining({ p_id: id, p_interview_at: "2027-01-01T10:00:00Z", p_duration: 45 }));
  });
  it("keeps a saved decision successful but reports unavailable email", async () => {
    mocks.rpc.mockResolvedValue({ data: { id, status: "confirmed", notificationId: id }, error: null });
    mocks.admin.mockImplementation(() => { throw new Error("Email infrastructure unavailable"); });
    const response = await patch({ status: "confirmed" });
    expect(response.status).toBe(200);
    expect((await response.json()).data.emailStatus).toBe("failed");
  });
  it.each(["sent", "failed", "not_configured"])("reports the email provider's %s result without changing the decision", async (status) => {
    mocks.rpc.mockResolvedValue({ data: { id, status: "confirmed", notificationId: id }, error: null });
    const read = { eq: vi.fn(), single: vi.fn().mockResolvedValue({ data: { title: "Selected", message: "Application selected", email_to: "applicant@example.com" }, error: null }) };
    read.eq.mockReturnValue(read);
    const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
    mocks.admin.mockReturnValue({ from: () => ({ select: () => read, update }) });
    mocks.provider.mockResolvedValue(null);
    mocks.send.mockResolvedValue({ status, provider: "resend" });
    const response = await patch({ status: "confirmed" });
    expect((await response.json()).data).toMatchObject({ status: "confirmed", emailStatus: status });
    expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({ to: "applicant@example.com", idempotencyKey: `job-application-${id}` }));
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ status: status === "sent" ? "sent" : "failed" }));
  });
});
