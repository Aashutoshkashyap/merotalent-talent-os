import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PoolClient } from "pg";
import { runNeonMaintenance } from "@/lib/server/neon-maintenance";

const environment = { MEROTALENT_BACKEND_MODE: "neon-staging", CRON_SECRET: "isolated-cron-test" };
const authorization = "Bearer isolated-cron-test";
const query = vi.fn();
const transactionStarted = vi.fn();
const run = async <T>(operation: (client: PoolClient) => Promise<T>): Promise<T> => {
  transactionStarted(); return operation({ query } as unknown as PoolClient);
};
beforeEach(() => { vi.clearAllMocks(); query.mockImplementation(async (sql: string) =>
  sql.includes("pg_try_advisory_xact_lock") ? { rows: [{ acquired: true }], rowCount: 1 } : { rows: [{ id: "changed" }], rowCount: 1 }); });

describe("Neon cron maintenance authorization and transaction", () => {
  it("rejects missing/incorrect cron credentials before starting database work", async () => {
    for (const header of [null, "Bearer incorrect"]) {
      await expect(runNeonMaintenance(header, run, environment)).rejects.toMatchObject({ name: "NeonCronAuthorizationError" });
    }
    expect(transactionStarted).not.toHaveBeenCalled();
  });
  it("rejects production mode before starting database work", async () => {
    await expect(runNeonMaintenance(authorization, run, { ...environment, VERCEL_ENV: "production" })).rejects.toMatchObject({ name: "BackendConfigurationError" });
    expect(transactionStarted).not.toHaveBeenCalled();
  });
  it("serializes maintenance and retains persisted file ownership", async () => {
    expect(await runNeonMaintenance(authorization, run, environment)).toMatchObject({ expired_subscriptions: 1,
      expired_entitlements: 1, expired_checkouts: 1, upload_intents_removed: 0,
      guestVerification: { guest_challenges_removed: 1, guest_rate_records_removed: 1 } });
    expect(query.mock.calls.some(([sql]) => /DELETE FROM public\.media_upload_intents/.test(sql))).toBe(false);
    expect(query.mock.calls.some(([sql]) => /auth\.role|set_config/.test(sql))).toBe(false);
  });
  it("returns a truthful skip if another maintenance transaction owns the lock", async () => {
    query.mockResolvedValue({ rows: [{ acquired: false }] });
    expect(await runNeonMaintenance(authorization, run, environment)).toMatchObject({ skipped: true });
    expect(query).toHaveBeenCalledTimes(1);
  });
});
