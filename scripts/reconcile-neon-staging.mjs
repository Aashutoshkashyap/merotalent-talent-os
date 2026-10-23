/** Read-only live-source to isolated staging table/hash reconciliation. */
import fs from "node:fs";
import dotenv from "dotenv";
import pg from "pg";
import { requireNeonMigrationStaging } from "./require-neon-migration-staging.mjs";
import { parseReadOnlySourceConfig, verifyReadOnlySource } from "./require-supabase-source-readonly.mjs";
import { losslessTableFingerprint } from './lossless-table-fingerprint.mjs';

dotenv.config({ path: ".migration.env", quiet: true });
const sourceConfig = parseReadOnlySourceConfig(process.env.SUPABASE_SOURCE_READONLY_DATABASE_URL,
  process.env.SUPABASE_SOURCE_EXPECTED_POOLER_HOST,
  process.env.SUPABASE_SOURCE_READONLY_ROLE);
const stageDatabaseUrl = process.env.NEON_STAGING_DATABASE_URL;
requireNeonMigrationStaging(stageDatabaseUrl);
const source = new pg.Client(sourceConfig);
const stage = new pg.Client({ connectionString: stageDatabaseUrl, connectionTimeoutMillis: 10000 });
const reportPath = process.argv[2];
if (reportPath && (!reportPath.startsWith('/') || process.argv.length !== 3)) throw new Error('PRIVATE_ABSOLUTE_REPORT_PATH_REQUIRED');
source.on('error', () => {});
stage.on('error', () => {});
try {
  await source.connect();
  await source.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  await source.query("SET LOCAL TIME ZONE 'UTC'");
  await source.query("SET LOCAL statement_timeout = '30s'");
  await verifyReadOnlySource(source, process.env.SUPABASE_SOURCE_READONLY_ROLE);
  await stage.connect();
  await stage.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  await stage.query("SET LOCAL TIME ZONE 'UTC'");
  const tables = (await source.query(`SELECT table_name FROM information_schema.tables
    WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name`)).rows.map(r => r.table_name);
  const stageTables = (await stage.query(`SELECT table_name FROM information_schema.tables
    WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name`)).rows.map(r => r.table_name);
  const reconciliation = [];
  for (const table of tables) {
    const origin = await losslessTableFingerprint(source, 'public', table);
    const target = stageTables.includes(table) ? await losslessTableFingerprint(stage, 'public', table) : null;
    reconciliation.push({ table, sourceRows: origin.count, stageRows: target?.count ?? null,
      sourceSha256: origin.sha256, targetSha256: target?.sha256 ?? null,
      match: target !== null && origin.count === target.count && origin.sha256 === target.sha256 });
  }
  const objectSql = `SELECT
    (SELECT count(*)::int FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public') AS functions,
    (SELECT count(*)::int FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal) AS triggers,
    (SELECT count(*)::int FROM pg_policies WHERE schemaname='public') AS policies,
    (SELECT count(*)::int FROM pg_views WHERE schemaname='public') AS views`;
  const report = {
    at: new Date().toISOString(), sourceHost: sourceConfig.host, stageHost: new URL(stageDatabaseUrl).hostname,
    sourceTables: tables.length, stageTables: stageTables.length,
    sourceRows: reconciliation.reduce((n,r) => n+r.sourceRows,0),
    stageRows: reconciliation.reduce((n,r) => n+r.stageRows,0),
    matchedTables: reconciliation.filter(r => r.match).length,
    sourceSchemaObjects: (await source.query(objectSql)).rows[0],
    stageSchemaObjects: (await stage.query(objectSql)).rows[0],
    tables: reconciliation,
  };
  // Never overwrite the historical reconciliation evidence or commit fresh data.
  if (reportPath) fs.writeFileSync(reportPath, JSON.stringify(report,null,2), { mode: 0o600, flag:'wx' });
  console.log(JSON.stringify({sourceHost:report.sourceHost,stageHost:report.stageHost,sourceTables:report.sourceTables,
    stageTables:report.stageTables,sourceRows:report.sourceRows,stageRows:report.stageRows,
    matchedTables:report.matchedTables,sourceSchemaObjects:report.sourceSchemaObjects,
    stageSchemaObjects:report.stageSchemaObjects,
    mismatchedTables:reconciliation.filter(r=>!r.match).map(r=>r.table)},null,2));
} finally {
  await source.query("ROLLBACK").catch(() => undefined);
  await stage.query("ROLLBACK").catch(() => undefined);
  await Promise.all([source.end().catch(()=>{}), stage.end().catch(()=>{})]);
}
