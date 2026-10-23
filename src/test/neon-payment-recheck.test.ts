import { afterEach, describe, expect, it, vi } from "vitest";
import type { PoolClient } from "pg";
import { NeonCheckoutService } from "@/lib/server/neon-checkout";
const actor = { userId: "10000000-0000-4000-8000-000000000001", neonAuthUserId: "10000000-0000-4000-8000-000000000002", roles:['talent'],permissions:[],platformAdmin:false };
const reference = "10000000-0000-4000-8000-000000000003";

describe("payer-owned eSewa pending recovery", () => {
  afterEach(() => vi.restoreAllMocks());
  it("requires ownership of both ledgers before looking up provider state", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const service = new NeonCheckoutService();
    const verify = vi.spyOn(service, "verifyReturn");
    await expect(service.recheckOwnPayment(actor, reference, { query } as unknown as PoolClient)).rejects.toMatchObject({ code: "CHECKOUT_NOT_FOUND" });
    expect(query).toHaveBeenCalledOnce();
    expect(query.mock.calls[0][0]).toContain("p.user_id=c.user_id");
    expect(query.mock.calls[0][1]).toEqual([actor.userId, reference]);
    expect(verify).not.toHaveBeenCalled();
  });
  it("does not wait behind or duplicate an in-flight provider check", async () => {
    const query = vi.fn().mockResolvedValueOnce({ rows: [{ provider_reference: reference }] }).mockResolvedValueOnce({ rows: [{ acquired: false }] });
    const service = new NeonCheckoutService(); const verify = vi.spyOn(service, "verifyReturn");
    await expect(service.recheckOwnPayment(actor, reference, { query } as unknown as PoolClient)).rejects.toMatchObject({ status: 429, code: "VERIFICATION_IN_PROGRESS" });
    expect(verify).not.toHaveBeenCalled();
  });
  it("reuses the authoritative verifier and its one transaction, never a client result", async () => {
    const query = vi.fn().mockResolvedValueOnce({ rows: [{ provider_reference: reference }] }).mockResolvedValueOnce({ rows: [{ acquired: true }] });
    const db = { query } as unknown as PoolClient;
    const service = new NeonCheckoutService();
    const verify = vi.spyOn(service, "verifyReturn").mockResolvedValue({ status: "pending", duplicate: false });
    await expect(service.recheckOwnPayment(actor, reference, db)).resolves.toMatchObject({ status: "pending" });
    expect(verify).toHaveBeenCalledWith({ reference }, db);
    expect(query.mock.calls.every(([sql]) => sql.startsWith("SELECT"))).toBe(true);
  });
});
