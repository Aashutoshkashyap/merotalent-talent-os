import { describe, expect, it, vi } from "vitest";
import type { PoolClient } from "pg";
import { activateVerifiedNeonModuleAccess, NeonModuleAccess, prepareNeonModuleAccessCheckout } from "@/lib/server/neon-module-access";
import type { NeonActor } from "@/lib/server/neon-authorization";

const userId = "10000000-0000-4000-8000-000000000001";
const authId = "10000000-0000-4000-8000-000000000002";
const requestId = "10000000-0000-4000-8000-000000000003";
const packageId = "10000000-0000-4000-8000-000000000004";
const actor: NeonActor = { userId, neonAuthUserId: authId, roles: [], permissions: [], platformAdmin: false };
const request = { id: requestId, user_id: userId, status: "pending", requested_modules: ["college"], package_id: packageId,
  payment_id: null, payment_status: "not_started", requested_entity_scopes: [] };
const profile = { full_name: "Trusted Person", email: "person@example.test", phone: "9800000000", admin: false };
function clientWith(...rows: unknown[][]) {
  const query = vi.fn();
  for (const row of rows) query.mockResolvedValueOnce({ rows: row, rowCount: row.length });
  query.mockResolvedValue({ rows: [], rowCount: 0 });
  return { client: { query } as unknown as PoolClient, query };
}

describe("Neon delegated module access", () => {
  it("uses only the matching server plan for an owned request", async () => {
    const { client, query } = clientWith([profile], [request], [{ id: packageId, price: 500, currency: "NPR" }]);
    expect(await prepareNeonModuleAccessCheckout(actor, requestId, packageId, client)).toEqual({ amount: 500, currency: "NPR", packageId });
    expect(query.mock.calls[2][1]).toEqual([packageId, ["college"]]);
  });
  it("denies forged identities before reading a request", async () => {
    const { client, query } = clientWith([]);
    await expect(prepareNeonModuleAccessCheckout(actor, requestId, packageId, client)).rejects.toMatchObject({ code: "ACCESS_DENIED" });
    expect(query).toHaveBeenCalledTimes(1);
  });
  it("denies another user's request", async () => {
    const { client } = clientWith([profile], [{ ...request, user_id: authId }]);
    await expect(prepareNeonModuleAccessCheckout(actor, requestId, packageId, client)).rejects.toMatchObject({ code: "REQUEST_NOT_FOUND" });
  });
  it("denies a changed plan, successful payment and unavailable module", async () => {
    for (const [row, selected, code] of [
      [request, authId, "PLAN_CHANGED"], [{ ...request, payment_status: "success" }, packageId, "REQUEST_NOT_PAYABLE"],
      [{ ...request, requested_modules: ["super_admin"] }, packageId, "INVALID_MODULES"],
    ] as const) {
      const { client } = clientWith([profile], [row]);
      await expect(prepareNeonModuleAccessCheckout(actor, requestId, selected, client)).rejects.toMatchObject({ code });
    }
  });
  it("payment alone cannot grant capabilities or scopes", async () => {
    const { client, query } = clientWith([{ ...request, payment_status: "success", payment_id: authId }]);
    expect(await activateVerifiedNeonModuleAccess(client, requestId)).toEqual({ activated: false, reason: "awaiting_approval" });
    expect(query).toHaveBeenCalledTimes(1);
  });
  it("approved but unpaid request cannot activate access", async () => {
    const { client, query } = clientWith([{ ...request, status: "approved" }]);
    expect(await activateVerifiedNeonModuleAccess(client, requestId)).toEqual({ activated: false, reason: "awaiting_payment" });
    expect(query).toHaveBeenCalledTimes(1);
  });
  it("rejects fake success without a matching verified payment", async () => {
    const { client, query } = clientWith([{ ...request, status: "approved", payment_status: "success", payment_id: authId }],
      [{ id: packageId, price: 500, currency: "NPR", duration_days: 30 }], []);
    await expect(activateVerifiedNeonModuleAccess(client, requestId)).rejects.toMatchObject({ code: "PAYMENT_NOT_VERIFIED" });
    expect(query.mock.calls.some(call => String(call[0]).includes("INSERT"))).toBe(false);
  });
  it("submission rejects aliases and missing proofs without database writes", async () => {
    const { client, query } = clientWith([]);
    const service = new NeonModuleAccess(async operation => operation(client));
    await expect(service.submit(actor, { draftId: requestId, packageId, modules: ["jobs"], reason: "I manage this company", organization: "Company", proofs: {} }))
      .rejects.toMatchObject({ code: "PROOF_REQUIRED" });
    await expect(service.submit(actor, { draftId: requestId, packageId, modules: ["job"] as never, reason: "I manage this company", organization: "Company", proofs: {} }))
      .rejects.toMatchObject({ code: "INVALID_REQUEST" });
    expect(query).not.toHaveBeenCalled();
  });
  it("only a live linked Super Admin can approve", async () => {
    const { client } = clientWith([profile]);
    const service = new NeonModuleAccess(async operation => operation(client));
    await expect(service.decide({ ...actor, platformAdmin: true }, requestId, true)).rejects.toMatchObject({ code: "ACCESS_DENIED" });
  });
  it("paid request approval refuses pending payments", async () => {
    const { client } = clientWith([{ ...profile, admin: true }], [request], [{ user_id: userId }]);
    const service = new NeonModuleAccess(async operation => operation(client));
    await expect(service.decide({ ...actor, platformAdmin: true }, requestId, true)).rejects.toMatchObject({ code: "PAYMENT_NOT_VERIFIED" });
  });
  it("paid requests cannot be cancelled to bypass approval", async () => {
    const { client } = clientWith([profile], [{ ...request, payment_status: "success" }]);
    const service = new NeonModuleAccess(async operation => operation(client));
    await expect(service.cancel(actor, requestId)).rejects.toMatchObject({ code: "REQUEST_NOT_CANCELLABLE" });
  });
  it("explicit assignment rejects another college and unapproved requests", async () => {
    const { client } = clientWith([{ ...profile, admin: true }], [{ ...request, status: "approved",
      requested_entity_scopes: [{ module_key: "college", entity_id: authId }] }]);
    const service = new NeonModuleAccess(async operation => operation(client));
    await expect(service.assign({ ...actor, platformAdmin: true }, requestId, "college", packageId)).rejects.toMatchObject({ code: "SCOPE_MISMATCH" });
  });
});
