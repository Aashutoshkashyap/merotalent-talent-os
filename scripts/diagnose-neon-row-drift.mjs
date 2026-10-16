/** Read-only column-hash drift diagnostic for one source-matched row. No values printed. */
import pg from "pg";
import dotenv from "dotenv";
import { requireNeonMigrationStaging } from "./require-neon-migration-staging.mjs";
import { sourceReadOnlyQuery } from "./supabase-readonly-management-api.mjs";

dotenv.config({ path: ".migration.env", quiet: true });
const table = process.argv[2];
if (!table || !/^[a-z][a-z0-9_]*$/.test(table)) throw new Error("Provide one public table name.");
const targetUrl = process.env.NEON_STAGING_DATABASE_URL;
requireNeonMigrationStaging(targetUrl);
const target = new pg.Client({ connectionString: targetUrl, connectionTimeoutMillis: 10000 });
const sourceSql = `SELECT t.id::text AS id,jsonb_object_agg(e.key,md5(e.value::text)) AS hashes
  FROM public."${table}" t CROSS JOIN LATERAL jsonb_each(to_jsonb(t)) e
  GROUP BY t.id ORDER BY t.id LIMIT 1`;
try {
  const source = (await sourceReadOnlyQuery(sourceSql))[0];
  if (!source) throw new Error("Source table has no rows.");
  if (!(/^[0-9a-f-]{36}$/.test(source.id) || /^\d+$/.test(source.id))) {
    throw new Error("Unexpected source row key format.");
  }
  await target.connect();
  await target.query("BEGIN TRANSACTION READ ONLY");
  const result = await target.query(`SELECT t.id::text AS id,jsonb_object_agg(e.key,md5(e.value::text)) AS hashes
    FROM public."${table}" t CROSS JOIN LATERAL jsonb_each(to_jsonb(t)) e
    WHERE t.id::text=$1 GROUP BY t.id`, [source.id]);
  const targetRow = result.rows[0];
  if (!targetRow) throw new Error("Matching target row not found.");
  const columns = [...new Set([...Object.keys(source.hashes), ...Object.keys(targetRow.hashes)])].sort();
  const differingColumns = columns.filter(column => source.hashes[column] !== targetRow.hashes[column]);
  const timestampEpochEquality = {};
  for (const column of differingColumns.filter(column => column.endsWith("_at"))) {
    const sql = `SELECT extract(epoch FROM t."${column}")::text AS epoch
      FROM public."${table}" t WHERE t.id::text=$1`;
    const sourceEpoch = (await sourceReadOnlyQuery(sql.replace("$1", `'${source.id}'`)))[0]?.epoch;
    const stageEpoch = (await target.query(sql, [source.id])).rows[0]?.epoch;
    timestampEpochEquality[column] = sourceEpoch === stageEpoch;
    if (sourceEpoch != null && stageEpoch != null) {
      timestampEpochEquality[`${column}DeltaSeconds`] = Number(stageEpoch) - Number(sourceEpoch);
    }
  }
  console.log(JSON.stringify({ table, columns: columns.length, differingColumns, timestampEpochEquality }));
} catch (error) {
  console.error("Row drift diagnostic failed:", error instanceof Error ? error.message : "UNKNOWN_ERROR");
  process.exitCode = 1;
} finally {
  await target.query("ROLLBACK").catch(() => undefined);
  await target.end().catch(() => undefined);
}
