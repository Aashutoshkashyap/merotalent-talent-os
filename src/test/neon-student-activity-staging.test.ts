import dotenv from "dotenv";
import type { QueryResultRow } from "pg";
import { describe, expect, it } from "vitest";
import { getPool } from "@/lib/server/db";
import { getNeonDatabaseConfig, NEON_MIGRATION_STAGING_BRANCH_ID } from "@/lib/neon/neon-config";
import type { NeonActor } from "@/lib/server/neon-authorization";
import { getNeonStudentActivity } from "@/lib/server/neon-student-activity";

describe("isolated Neon student activity", () => {
  it("queries all four real module tables for only one application user", async () => {
    const parsed = dotenv.config({ path: ".migration.env", quiet: true }).parsed ?? {};
    if (!parsed.NEON_STAGING_DATABASE_URL) throw new Error("Isolated Neon staging credentials are required.");
    Object.assign(process.env, parsed, { MEROTALENT_BACKEND_MODE: "neon-staging",
      NEON_STAGING_BRANCH_ID: NEON_MIGRATION_STAGING_BRANCH_ID });
    getNeonDatabaseConfig();
    const client = await getPool().connect();
    try {
      await client.query("BEGIN TRANSACTION READ ONLY");
      const row = (await client.query<{ user_id: string }>(`SELECT user_id FROM public.profiles
        WHERE deleted_at IS NULL ORDER BY user_id LIMIT 1`)).rows[0];
      expect(row).toBeDefined();
      const actor: NeonActor = { userId: row.user_id, neonAuthUserId: row.user_id,
        roles: ["talent"], permissions: [], platformAdmin: false };
      let previous: Promise<unknown> = Promise.resolve();
      const query = <T extends QueryResultRow>(sql: string, values: readonly unknown[]) => {
        const result = previous.then(() => client.query<T>(sql, [...values]).then(value => value.rows));
        previous = result.then(() => undefined, () => undefined);
        return result;
      };
      const activity = await getNeonStudentActivity(actor, query);
      expect(Object.keys(activity).sort()).toEqual(["collegeApplications", "eventRegistrations",
        "jobApplications", "mentorBookings"].sort());
      for (const value of Object.values(activity)) expect(Array.isArray(value)).toBe(true);
    } finally {
      await client.query("ROLLBACK").catch(() => undefined);
      client.release();
      await getPool().end();
    }
  }, 60_000);
});
