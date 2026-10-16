import { describe, expect, it, vi } from "vitest";
import type { PoolClient } from "pg";
import type { NeonActor } from "@/lib/server/neon-authorization";
import { changeNeonDefaultFreeTier, listNeonAdminPayments, listNeonAdminSubscriptions,
  reconcileNeonAdminPayment, recordNeonMentorPayout, reviewNeonAdminPaymentProof } from "@/lib/server/neon-admin-payments";

const admin: NeonActor = { userId: "10000000-0000-4000-8000-000000000001",
  neonAuthUserId: "20000000-0000-4000-8000-000000000002", platformAdmin: true, roles: ["super_admin"], permissions: [] };
const target = "30000000-0000-4000-8000-000000000003";
const id = "40000000-0000-4000-8000-000000000004";
const proofId = "50000000-0000-4000-8000-000000000005";
const payment = { id, user_id: target, payment_type: "mentor_booking", reference_id: proofId,
  amount: "1000", currency: "NPR", gateway: "esewa", payment_method: "esewa", status: "pending" };
function rig(rows: unknown[][]) {
  const query = vi.fn(async () => { const next = rows.shift() ?? []; return { rows: next, rowCount: next.length }; });
  const client = { query } as unknown as PoolClient;
  const run = <T>(operation: (connection: PoolClient) => Promise<T>) => operation(client);
  return { query, run };
}
describe("Neon Super Admin financial authority", () => {
  it("requires a live linked administrator for reads and rejects invalid pages", async () => {
    const { run, query } = rig([]);
    await expect(listNeonAdminPayments({ ...admin, platformAdmin: false }, new URLSearchParams(), run)).rejects.toMatchObject({ code: "ADMIN_REQUIRED" });
    expect(query).not.toHaveBeenCalled();
    await expect(listNeonAdminSubscriptions(admin, new URLSearchParams(), run)).rejects.toMatchObject({ code: "ADMIN_REQUIRED" });
    await expect(listNeonAdminPayments(admin, new URLSearchParams("offset=-1"), run)).rejects.toMatchObject({ code: "INVALID_BILLING_QUERY" });
  });
  it("keeps listings bounded, resolves payer details and excludes proof object paths", async () => {
    const { run, query } = rig([[{ user_id: admin.userId }], [{ count: 102 }], [payment], [], [{ collected: 0 }]]);
    expect(await listNeonAdminPayments(admin, new URLSearchParams("search=Applicant&offset=100"), run)).toMatchObject({ total: 102, hasMore: true });
    const calls = query.mock.calls as unknown as [string, unknown[]][];
    expect(calls[2][0]).toContain("LIMIT 100 OFFSET $4");
    expect(calls[2][1]).toEqual(["all", "all", "Applicant", 100]);
    expect(calls[2][0]).toContain("u.full_name");
    expect(calls[3][0]).not.toContain("storage_path");
    expect(calls[2][0]).not.toContain("secret");
  });
  it("accepts evidence without settling payment and makes exact retry idempotent", async () => {
    const { run, query } = rig([[{ user_id: admin.userId }], [payment], [{ status: "pending", uploaded_by_user_id: target }]]);
    const input = { id: proofId, paymentId: id, status: "accepted" as const, note: "Evidence matches pending transaction" };
    expect(await reviewNeonAdminPaymentProof(admin, input, run)).toMatchObject({ paymentActivated: false, duplicate: false });
    const statements = (query.mock.calls as unknown as [string, unknown[]][]).map(call => call[0]).join("\n");
    expect(statements).not.toContain("status='success'");
    expect(statements).not.toContain("INSERT INTO public.module_entitlements");
    expect(query.mock.calls as unknown as [string, unknown[]][]).toContainEqual([
      expect.stringContaining("INSERT INTO public.audit_logs"), expect.arrayContaining(["ADMIN_REVIEW_PAYMENT_PROOF"])]);
    const duplicate = rig([[{ user_id: admin.userId }], [payment], [{ status: "accepted", uploaded_by_user_id: target, review_note: input.note }]]);
    expect(await reviewNeonAdminPaymentProof(admin, input, duplicate.run)).toMatchObject({ duplicate: true });
    expect(duplicate.query).toHaveBeenCalledTimes(3);
  });
  it("rejects evidence from another payer and conflicting final review", async () => {
    const input = { id: proofId, paymentId: id, status: "accepted" as const, note: "Reviewed signed payment receipt" };
    await expect(reviewNeonAdminPaymentProof(admin, input,
      rig([[{ user_id: admin.userId }], [payment], [{ status: "pending", uploaded_by_user_id: admin.userId }]]).run)).rejects.toMatchObject({ code: "PROOF_OWNER_MISMATCH" });
    await expect(reviewNeonAdminPaymentProof(admin, input,
      rig([[{ user_id: admin.userId }], [payment], [{ status: "rejected", uploaded_by_user_id: target }]]).run)).rejects.toMatchObject({ code: "PROOF_ALREADY_REVIEWED" });
  });
  it("rejects fake eSewa success but permits audited reconciliation annotations", async () => {
    const input = { id, status: "success", reconciliation: "reconciled", note: "Merchant statement investigated" };
    const denied = rig([[{ user_id: admin.userId }], [{user_id:target}], [{user_id:target}], [payment]]);
    await expect(reconcileNeonAdminPayment(admin, input, denied.run)).rejects.toMatchObject({ code: "VERIFIED_PROVIDER_REQUIRED" });
    expect(denied.query).toHaveBeenCalledTimes(4);
    const permitted = rig([[{ user_id: admin.userId }], [{user_id:target}], [{user_id:target}], [payment]]);
    expect(await reconcileNeonAdminPayment(admin, { ...input, status: "pending", reconciliation: "disputed" }, permitted.run)).toMatchObject({ status: "pending" });
    const updates = (permitted.query.mock.calls as unknown as [string, unknown[]][]).filter(call => call[0].startsWith("UPDATE"));
    expect(updates).toHaveLength(1);
    expect(updates[0][0]).not.toContain("SET status=");
  });
  it("requires settled matching gross amounts before recording external mentor payouts", async () => {
    const input = { id, amount: 900, commission: 100, reference: "External-transfer-123", note: "Verified external bank transfer" };
    await expect(recordNeonMentorPayout(admin, input, rig([[{ user_id: admin.userId }], [payment]]).run)).rejects.toMatchObject({ code: "PAYOUT_PAYMENT_UNVERIFIED" });
    await expect(recordNeonMentorPayout(admin, { ...input, amount: 800 },
      rig([[{ user_id: admin.userId }], [{ ...payment, status: "success" }]]).run)).rejects.toMatchObject({ code: "PAYOUT_AMOUNT_MISMATCH" });
    const duplicate = rig([[{ user_id: admin.userId }], [{ ...payment, status: "success" }], [{ mentor_user_id: admin.userId }],
      [{ id: proofId, amount: "900", commission: "100", gateway_transaction_id: input.reference }]]);
    expect(await recordNeonMentorPayout(admin, input, duplicate.run)).toMatchObject({ duplicate: true, moneyTransferred: false });
    expect(duplicate.query).toHaveBeenCalledTimes(4);
  });
  it("rejects arbitrary free-tier module scopes and missing exact assignments", async () => {
    const input = { userId: target, module: "college", entityType: "college", entityId: id };
    const invalid = rig([]);
    await expect(changeNeonDefaultFreeTier(admin, { ...input, module: "super_admin" }, "grant", invalid.run)).rejects.toMatchObject({ code: "INVALID_FREE_SCOPE" });
    expect(invalid.query).not.toHaveBeenCalled();
    const denied = rig([[{ user_id: admin.userId }], [{ user_id: target }], []]);
    await expect(changeNeonDefaultFreeTier(admin, input, "grant", denied.run)).rejects.toMatchObject({ code: "ASSIGNMENT_REQUIRED" });
    expect((denied.query.mock.calls as unknown as [string, unknown[]][]).some(call => call[0].includes("INSERT INTO"))).toBe(false);
  });
});
