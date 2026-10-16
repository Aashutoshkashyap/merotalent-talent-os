/** Bounded source-to-isolated-staging table and row-content inventory. Read-only on both sides. */
import pg from "pg";
import dotenv from "dotenv";
import { requireNeonMigrationStaging } from "./require-neon-migration-staging.mjs";
import { sourceReadOnlyQuery, sourceProjectRef } from "./supabase-readonly-management-api.mjs";

dotenv.config({ path: ".migration.env", quiet: true });
const targetUrl = process.env.NEON_STAGING_DATABASE_URL;
requireNeonMigrationStaging(targetUrl);
const target = new pg.Client({ connectionString: targetUrl, connectionTimeoutMillis: 10000 });
const tableSql = `SELECT table_name FROM information_schema.tables
  WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name`;
const columnSql = `SELECT table_name,column_name,data_type,udt_name,is_nullable
  FROM information_schema.columns WHERE table_schema='public'
  ORDER BY table_name,ordinal_position`;
const quote = value => `"${value.replaceAll('"', '""')}"`;
const digestSql = name => `SELECT '${name}' AS table_name,count(*)::int AS n,
  md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' ORDER BY to_jsonb(t)::text),'')) AS digest
  FROM public.${quote(name)} t`;

try {
  const [sourceTables, sourceColumns] = await Promise.all([
    sourceReadOnlyQuery(tableSql), sourceReadOnlyQuery(columnSql),
  ]);
  await target.connect();
  await target.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  const targetTables = (await target.query(tableSql)).rows;
  const targetColumns = (await target.query(columnSql)).rows;
  const sourceNames = sourceTables.map(row => row.table_name);
  if (sourceNames.some(name => !/^[a-z][a-z0-9_]*$/.test(name))) {
    throw new Error("Unexpected source table identifier.");
  }
  const targetNames = new Set(targetTables.map(row => row.table_name));
  const sharedNames = sourceNames.filter(name => targetNames.has(name));
  // One SQL statement gives all source table digests one MVCC statement snapshot.
  // The target also reads its tables in one repeatable-read transaction.
  const batchSql = sharedNames.map(digestSql).join(" UNION ALL ");
  const sourceDigests = new Map((await sourceReadOnlyQuery(batchSql))
    .map(row => [row.table_name, row]));
  const targetDigests = new Map((await target.query(batchSql)).rows
    .map(row => [row.table_name, row]));
  const columnSignature = (rows, table) => rows.filter(row => row.table_name === table)
    .map(row => `${row.column_name}:${row.data_type}:${row.udt_name}:${row.is_nullable}`).join("|");
  const columnDifferences = (table) => {
    const source = new Map(sourceColumns.filter(row => row.table_name === table)
      .map(row => [row.column_name, `${row.data_type}:${row.udt_name}:${row.is_nullable}`]));
    const stage = new Map(targetColumns.filter(row => row.table_name === table)
      .map(row => [row.column_name, `${row.data_type}:${row.udt_name}:${row.is_nullable}`]));
    return [...new Set([...source.keys(), ...stage.keys()])].sort()
      .filter(column => source.get(column) !== stage.get(column))
      .map(column => ({ column, source: source.get(column) ?? null, stage: stage.get(column) ?? null }));
  };
  const results = [];
  for (const table of sourceNames) {
    const sourceShape = columnSignature(sourceColumns, table);
    const targetShape = columnSignature(targetColumns, table);
    if (!targetNames.has(table)) {
      results.push({ table, result: "MISSING_TARGET_TABLE" });
      continue;
    }
    try {
      const source = sourceDigests.get(table);
      const stage = targetDigests.get(table);
      if (!source || !stage) throw new Error("Table digest missing from batched snapshot.");
      results.push({ table, sourceRows: Number(source.n), stageRows: Number(stage.n),
        schemaMatch: sourceShape === targetShape,
        ...(sourceShape !== targetShape ? { columnDifferences: columnDifferences(table) } : {}),
        rowContentMatch: Number(source.n) === Number(stage.n) && source.digest === stage.digest,
        result: sourceShape !== targetShape ? "SCHEMA_DRIFT"
          : Number(source.n) !== Number(stage.n) ? "ROW_COUNT_DRIFT"
            : source.digest !== stage.digest ? "ROW_CONTENT_DRIFT" : "MATCH" });
    } catch (error) {
      results.push({ table, result: "QUERY_FAILED", error: error instanceof Error ? error.message : "UNKNOWN" });
    }
  }
  console.log(JSON.stringify({ mode: "READ_ONLY_API_TABLE_RECONCILIATION",
    sourceProject: sourceProjectRef, targetBranch: process.env.NEON_STAGING_BRANCH_ID,
    consistency: "Each side has a single table-digest snapshot, taken at different times; not a row export or final transactional parity",
    sourceTables: sourceNames.length, targetTables: targetNames.size,
    matched: results.filter(row => row.result === "MATCH").length,
    drift: results.filter(row => row.result !== "MATCH") }));
} catch (error) {
  console.error("Read-only table reconciliation failed:", error instanceof Error ? error.message : "UNKNOWN_ERROR");
  process.exitCode = 1;
} finally {
  await target.query("ROLLBACK").catch(() => undefined);
  await target.end().catch(() => undefined);
}
