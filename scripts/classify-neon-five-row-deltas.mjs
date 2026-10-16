/** Read-only field-level classification of the five remaining source/staging row deltas. */
import { createHash } from "node:crypto";
import dotenv from "dotenv";
import pg from "pg";
import { requireNeonMigrationStaging } from "./require-neon-migration-staging.mjs";
import { sourceReadOnlyQuery } from "./supabase-readonly-management-api.mjs";

dotenv.config({ path: ".migration.env", quiet: true });
const targetUrl = process.env.NEON_STAGING_DATABASE_URL;
requireNeonMigrationStaging(targetUrl);
const target = new pg.Client({ connectionString: targetUrl, connectionTimeoutMillis: 15000 });
const tables = ["audit_logs", "leads", "media_upload_intents", "notifications", "profiles"];
const fingerprint = value => createHash("sha256").update(value).digest("hex").slice(0, 16);
const fieldSql = (table, excluded) => `SELECT t.id::text AS row_key,
  jsonb_object_agg(e.key, md5(e.value::text)) AS field_hashes
  FROM public.${table} t CROSS JOIN LATERAL jsonb_each(to_jsonb(t) - ARRAY[${excluded.map(value => `'${value}'`).join(",")}]::text[]) e
  GROUP BY t.id ORDER BY t.id`;

try {
  await target.connect();
  await target.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  const results = [];
  for (const table of tables) {
    const columnQuery = `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='${table}'`;
    const sourceColumns = (await sourceReadOnlyQuery(columnQuery)).map(row => row.column_name);
    const stageColumns = (await target.query(columnQuery)).rows.map(row => row.column_name);
    const sourceExcluded = sourceColumns.filter(column => !stageColumns.includes(column));
    const stageExcluded = stageColumns.filter(column => !sourceColumns.includes(column));
    const source = await sourceReadOnlyQuery(fieldSql(table, sourceExcluded));
    const stage = (await target.query(fieldSql(table, stageExcluded))).rows;
    const sourceMap = new Map(source.map(row => [row.row_key, row.field_hashes]));
    const stageMap = new Map(stage.map(row => [row.row_key, row.field_hashes]));
    const sourceOnly = [...sourceMap.keys()].filter(key => !stageMap.has(key));
    const stageOnly = [...stageMap.keys()].filter(key => !sourceMap.has(key));
    const changed = [];
    const fieldCounts = {};
    for (const [key, sourceFields] of sourceMap) {
      const stageFields = stageMap.get(key);
      if (!stageFields) continue;
      const fields = [...new Set([...Object.keys(sourceFields), ...Object.keys(stageFields)])]
        .filter(field => sourceFields[field] !== stageFields[field]).sort();
      if (!fields.length) continue;
      for (const field of fields) fieldCounts[field] = (fieldCounts[field] ?? 0) + 1;
      changed.push({ keyFingerprint: fingerprint(key), fields });
    }
    results.push({ table, sourceRows: source.length, stageRows: stage.length,
      sourceOnlyCount: sourceOnly.length, sourceOnlySample: sourceOnly.slice(0, 5).map(fingerprint),
      stageOnlyCount: stageOnly.length, stageOnlySample: stageOnly.slice(0, 5).map(fingerprint),
      changedSharedCount: changed.length, changedSharedSample: changed.slice(0, 5),
      differingFieldCounts: fieldCounts, sourceOnlyColumns: sourceExcluded, targetOnlyColumns: stageExcluded });
  }
  console.log(JSON.stringify({ mode: "READ_ONLY_FIVE_TABLE_FIELD_CLASSIFICATION",
    snapshots: "One read-only statement per source table; one target repeatable-read snapshot at a different time",
    results }));
} catch (error) {
  console.error("Five-table classification stopped:", error instanceof Error ? error.message : "UNKNOWN_ERROR");
  process.exitCode = 1;
} finally {
  await target.query("ROLLBACK").catch(() => undefined);
  await target.end().catch(() => undefined);
}
