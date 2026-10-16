/** Read-only, key-level source/staging comparison in one statement snapshot per side. */
import { createHash } from "node:crypto";
import pg from "pg";
import dotenv from "dotenv";
import { requireNeonMigrationStaging } from "./require-neon-migration-staging.mjs";
import { sourceReadOnlyQuery, sourceProjectRef } from "./supabase-readonly-management-api.mjs";

dotenv.config({ path: ".migration.env", quiet: true });
const targetUrl = process.env.NEON_STAGING_DATABASE_URL;
requireNeonMigrationStaging(targetUrl);
const target = new pg.Client({ connectionString: targetUrl, connectionTimeoutMillis: 15000 });
const tableSql = `SELECT table_name FROM information_schema.tables
  WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name`;
const columnSql = `SELECT table_name,column_name,data_type FROM information_schema.columns
  WHERE table_schema='public' ORDER BY table_name,ordinal_position`;
const pkSql = `SELECT c.relname AS table_name,a.attname AS column_name,k.ord::int AS ordinal_position
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  JOIN pg_index i ON i.indrelid=c.oid AND i.indisprimary
  JOIN LATERAL unnest(i.indkey) WITH ORDINALITY k(attnum,ord) ON true
  JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum=k.attnum
  WHERE n.nspname='public' ORDER BY c.relname,k.ord`;
const quote = value => `"${value.replaceAll('"', '""')}"`;
const fingerprint = value => createHash("sha256").update(value).digest("hex").slice(0, 16);
const columnsFor = (rows, name) => rows.filter(row => row.table_name === name).map(row => row.column_name);
const normalizeMilliseconds = process.argv.includes("--normalize-millisecond-timestamps");
const rowSql = (name, pk, omit, timestamps) => {
  const row = omit.length ? `(to_jsonb(t) - ARRAY[${omit.map(column => `'${column}'`).join(",")}]::text[])` : "to_jsonb(t)";
  const normalizations = normalizeMilliseconds && timestamps.length
    ? ` || jsonb_build_object(${timestamps.map(({ column, type }) => {
      const timestamp = type === "timestamp with time zone" ? `t.${quote(column)} AT TIME ZONE 'UTC'` : `t.${quote(column)}`;
      return `'${column}',to_char(${timestamp},'YYYY-MM-DD"T"HH24:MI:SS.MS')`;
    }).join(",")})` : "";
  return `SELECT '${name}' AS table_name,jsonb_build_array(${pk.map(column => `t.${quote(column)}`).join(",")})::text AS row_key,
    md5((${row}${normalizations})::text) AS row_digest FROM public.${quote(name)} t`;
};

try {
  const [sourceTables, sourceColumns, sourceKeys] = await Promise.all([
    sourceReadOnlyQuery(tableSql), sourceReadOnlyQuery(columnSql), sourceReadOnlyQuery(pkSql),
  ]);
  await target.connect();
  await target.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  const targetTables = await target.query(tableSql);
  const targetColumns = await target.query(columnSql);
  const targetKeys = await target.query(pkSql);
  const targetNames = new Set(targetTables.rows.map(row => row.table_name));
  const comparable = [];
  const exceptions = [];
  for (const { table_name: name } of sourceTables) {
    if (!/^[a-z][a-z0-9_]*$/.test(name) || !targetNames.has(name)) {
      exceptions.push({ table: name, reason: "MISSING_TARGET_OR_INVALID_NAME" });
      continue;
    }
    const sourcePk = columnsFor(sourceKeys, name);
    const targetPk = columnsFor(targetKeys.rows, name);
    if (!sourcePk.length || sourcePk.join("|") !== targetPk.join("|")) {
      exceptions.push({ table: name, reason: "PRIMARY_KEY_MISMATCH_OR_ABSENT" });
      continue;
    }
    const sourceCols = columnsFor(sourceColumns, name);
    const targetCols = columnsFor(targetColumns.rows, name);
    const sourceOnly = sourceCols.filter(column => !targetCols.includes(column));
    const targetOnly = targetCols.filter(column => !sourceCols.includes(column));
    const timestamps = sourceColumns.filter(row => row.table_name === name
      && targetCols.includes(row.column_name)
      && ["timestamp with time zone", "timestamp without time zone"].includes(row.data_type))
      .map(row => ({ column: row.column_name, type: row.data_type }));
    comparable.push({ name, pk: sourcePk, sourceOnly, targetOnly, timestamps });
  }
  const sourceSql = comparable.map(row => rowSql(row.name, row.pk, row.sourceOnly, row.timestamps)).join(" UNION ALL ");
  const targetSql = comparable.map(row => rowSql(row.name, row.pk, row.targetOnly, row.timestamps)).join(" UNION ALL ");
  const sourceRows = await sourceReadOnlyQuery(sourceSql);
  const targetRows = (await target.query(targetSql)).rows;
  const group = rows => {
    const result = new Map();
    for (const row of rows) {
      if (!result.has(row.table_name)) result.set(row.table_name, new Map());
      result.get(row.table_name).set(row.row_key, row.row_digest);
    }
    return result;
  };
  const sourceByTable = group(sourceRows);
  const targetByTable = group(targetRows);
  const tableResults = comparable.map(({ name, sourceOnly, targetOnly }) => {
    const source = sourceByTable.get(name) ?? new Map();
    const stage = targetByTable.get(name) ?? new Map();
    const onlySource = [...source.keys()].filter(key => !stage.has(key));
    const onlyStage = [...stage.keys()].filter(key => !source.has(key));
    const changed = [...source].filter(([key, digest]) => stage.has(key) && stage.get(key) !== digest);
    return { table: name, sourceRows: source.size, stageRows: stage.size,
      sourceOnly: onlySource.length, stageOnly: onlyStage.length, changedSharedRows: changed.length,
      sourceOnlyColumns: sourceOnly, targetOnlyColumns: targetOnly,
      sourceOnlyFingerprints: onlySource.slice(0, 5).map(fingerprint),
      stageOnlyFingerprints: onlyStage.slice(0, 5).map(fingerprint),
      changedFingerprints: changed.slice(0, 5).map(([key]) => fingerprint(key)) };
  });
  console.log(JSON.stringify({ mode: "READ_ONLY_ALL_TABLE_ROW_DELTA", sourceProject: sourceProjectRef,
    targetBranch: process.env.NEON_STAGING_BRANCH_ID,
    consistency: "One source statement and one target repeatable-read snapshot, taken at different times",
    timestampComparison: normalizeMilliseconds ? "UTC millisecond precision; exact microsecond fidelity remains separate" : "exact",
    sourceTables: sourceTables.length, comparableTables: comparable.length, exceptions,
    tablesWithDifferences: tableResults.filter(row => row.sourceOnly || row.stageOnly || row.changedSharedRows).length,
    tables: tableResults.filter(row => row.sourceOnly || row.stageOnly || row.changedSharedRows
      || row.sourceOnlyColumns.length || row.targetOnlyColumns.length) }));
} catch (error) {
  console.error("Row-delta reconciliation stopped:", error instanceof Error ? error.message : "UNKNOWN_ERROR");
  process.exitCode = 1;
} finally {
  await target.query("ROLLBACK").catch(() => undefined);
  await target.end().catch(() => undefined);
}
