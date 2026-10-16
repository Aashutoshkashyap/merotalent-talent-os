import dotenv from "dotenv";
import { describe, expect, it } from "vitest";
import type { PoolClient, QueryResultRow } from "pg";
import { getPool } from "@/lib/server/db";
import { getNeonDatabaseConfig, NEON_MIGRATION_STAGING_BRANCH_ID } from "@/lib/neon/neon-config";
import type { NeonActor } from "@/lib/server/neon-authorization";
import { listMyCompetitionIds, listPublicCompetitions, registerNeonCompetition } from "@/lib/server/neon-competitions";

describe("isolated Neon competition registration", () => {
  it("lists the real schema and atomically registers once with a confirmed row, then rolls back", async () => {
    const parsed = dotenv.config({ path: ".migration.env", quiet: true }).parsed ?? {};
    if (!parsed.NEON_STAGING_DATABASE_URL) throw new Error("Isolated Neon staging credentials are required.");
    Object.assign(process.env, parsed, { MEROTALENT_BACKEND_MODE: "neon-staging",
      NEON_STAGING_BRANCH_ID: NEON_MIGRATION_STAGING_BRANCH_ID });
    getNeonDatabaseConfig();
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      const identity = (await client.query<{ legacy_user_id: string; neon_auth_user_id: string }>(`
        SELECT a.legacy_user_id,l.neon_auth_user_id FROM public.neon_identity_links l
        JOIN public.neon_application_accounts a ON a.id=l.application_account_id
        JOIN public.profiles p ON p.user_id=a.legacy_user_id
        WHERE l.status='verified' AND a.status='active' AND p.account_status='active'
          AND p.deleted_at IS NULL LIMIT 1`)).rows[0];
      expect(identity).toBeDefined();
      const actor: NeonActor = { userId: identity.legacy_user_id,
        neonAuthUserId: identity.neon_auth_user_id, roles: ["talent"], permissions: [], platformAdmin: false };
      const created = (await client.query<{ id: string }>(`INSERT INTO public.competitions
        (title,description,type,format,status,start_date,end_date,registration_deadline,
         max_participants,is_team_based,cover_image)
        VALUES ('Isolated staging competition','Synthetic rollback-only competition',
          'coding','online','upcoming',now()+interval '1 day',now()+interval '2 days',
          now()+interval '1 day',1,false,'/synthetic.png') RETURNING id`)).rows[0];
      const query = <T extends QueryResultRow>(sql: string, values: readonly unknown[]) =>
        client.query<T>(sql, [...values]).then(result => result.rows);
      const run = <T>(operation: (connection: PoolClient) => Promise<T>) => operation(client);
      const publicRows = await listPublicCompetitions(100,0,query);
      expect(publicRows.find(row => row.id === created.id)?.cover_image_url).toBe("/synthetic.png");
      const registration = await registerNeonCompetition(actor, { competitionId: created.id }, run);
      expect(registration).toMatchObject({ competition_id: created.id, user_id: actor.userId,
        alreadyRegistered: false });
      const duplicate = await registerNeonCompetition(actor, { competitionId: created.id }, run);
      expect(duplicate).toMatchObject({ id: registration.id, alreadyRegistered: true });
      expect(await listMyCompetitionIds(actor, query)).toContain(created.id);
      await client.query(`UPDATE public.competitions SET status='completed' WHERE id=$1::uuid`, [created.id]);
      await expect(registerNeonCompetition({ ...actor, userId: "30000000-0000-4000-8000-000000000003" },
        { competitionId: created.id }, run)).rejects.toMatchObject({ code: "REGISTRATION_CLOSED" });
    } finally {
      await client.query("ROLLBACK").catch(() => undefined);
      client.release();
      await getPool().end();
    }
  }, 60_000);
});
