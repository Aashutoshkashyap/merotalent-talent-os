/** Read-only primary-key delta inventory for the current source/staging drift. No row contents leave the process. */
import pg from "pg";
import dotenv from "dotenv";
import { requireNeonMigrationStaging } from "./require-neon-migration-staging.mjs";
import { sourceReadOnlyQuery, sourceProjectRef } from "./supabase-readonly-management-api.mjs";

dotenv.config({ path: ".migration.env", quiet: true });
const targetUrl = process.env.NEON_STAGING_DATABASE_URL;
requireNeonMigrationStaging(targetUrl);
const target = new pg.Client({ connectionString: targetUrl, connectionTimeoutMillis: 10000 });
const tables = ["audit_logs", "leads", "media_upload_intents", "notifications", "saved_jobs",
  "sub_admin_requests", "user_roles", "profiles"];
const quote = value => `"${value.replaceAll('"', '""')}"`;
// information_schema hides constraints from Supabase's read-only query role;
// pg_catalog still exposes the structural metadata without any write privilege.
const pkSql = `SELECT c.relname AS table_name,a.attname AS column_name,k.ord::int AS ordinal_position
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  JOIN pg_index i ON i.indrelid=c.oid AND i.indisprimary
  JOIN LATERAL unnest(i.indkey) WITH ORDINALITY k(attnum,ord) ON true
  JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum=k.attnum
  WHERE n.nspname='public' ORDER BY c.relname,k.ord`;

try {
  const sourceKeys = await sourceReadOnlyQuery(pkSql);
  await target.connect();
  await target.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  const targetKeys = (await target.query(pkSql)).rows;
  const output = [];
  for (const table of tables) {
    const sourcePk = sourceKeys.filter(row => row.table_name === table).map(row => row.column_name);
    const targetPk = targetKeys.filter(row => row.table_name === table).map(row => row.column_name);
    if (!sourcePk.length || sourcePk.join("|") !== targetPk.join("|")) {
      output.push({ table, result: "PRIMARY_KEY_MISMATCH" });
      continue;
    }
    const fields = sourcePk.map(column => `t.${quote(column)}`).join(",");
    const query = `SELECT jsonb_build_array(${fields})::text AS row_key FROM public.${quote(table)} t`;
    const source = new Set((await sourceReadOnlyQuery(query)).map(row => row.row_key));
    const stage = new Set((await target.query(query)).rows.map(row => row.row_key));
    output.push({ table, sourceRows: source.size, stageRows: stage.size,
      sourceOnly: [...source].filter(key => !stage.has(key)).length,
      stageOnly: [...stage].filter(key => !source.has(key)).length,
      shared: [...source].filter(key => stage.has(key)).length });
  }
  console.log(JSON.stringify({ mode: "READ_ONLY_PRIMARY_KEY_DELTA", sourceProject: sourceProjectRef,
    targetBranch: process.env.NEON_STAGING_BRANCH_ID,
    consistency: "Separate source queries are not one transactional snapshot", tables: output }));
} catch (error) {
  console.error("Read-only key reconciliation failed:", error instanceof Error ? error.message : "UNKNOWN_ERROR");
  process.exitCode = 1;
} finally {
  await target.query("ROLLBACK").catch(() => undefined);
  await target.end().catch(() => undefined);
}
