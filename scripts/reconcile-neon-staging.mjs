/** Read-only live-source to isolated staging table/hash reconciliation. */
import crypto from "node:crypto";
import fs from "node:fs";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config({ path: ".migration.env", quiet: true });
const sourceUrl = new URL(process.env.SUPABASE_DATABASE_URL || "postgresql://invalid@invalid");
const stageUrl = new URL(process.env.NEON_STAGING_DATABASE_URL || "postgresql://invalid@invalid");
if (sourceUrl.hostname !== "db.dtirpilgzlsfryucanlg.supabase.co" ||
    stageUrl.hostname !== "ep-wispy-credit-azt6tgwj-pooler.c-3.ap-southeast-1.aws.neon.tech") {
  throw new Error("Reconciliation targets are not the approved source and isolated staging database.");
}
const source = new pg.Client({ connectionString: sourceUrl.toString(), options: "-c default_transaction_read_only=on" });
const stage = new pg.Client({ connectionString: stageUrl.toString(), options: "-c default_transaction_read_only=on" });
const canonicalHash = rows => crypto.createHash("sha256").update(rows.map(row => {
  const sorted = {};
  for (const key of Object.keys(row).sort()) sorted[key] = row[key] instanceof Date ? row[key].toISOString() : row[key];
  return JSON.stringify(sorted);
}).join("\n")).digest("hex");
try {
  await Promise.all([source.connect(), stage.connect()]);
  const tables = (await source.query(`SELECT table_name FROM information_schema.tables
    WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name`)).rows.map(r => r.table_name);
  const stageTables = (await stage.query(`SELECT table_name FROM information_schema.tables
    WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name`)).rows.map(r => r.table_name);
  const reconciliation = [];
  for (const table of tables) {
    const quotedTable = `"${table.replaceAll('"', '""')}"`;
    const primaryKeys = (await source.query(`SELECT a.attname FROM pg_index i
      JOIN pg_class t ON t.oid=i.indrelid JOIN pg_namespace n ON n.oid=t.relnamespace
      JOIN pg_attribute a ON a.attrelid=t.oid AND a.attnum=ANY(i.indkey)
      WHERE n.nspname='public' AND t.relname=$1 AND i.indisprimary
      ORDER BY array_position(i.indkey::smallint[],a.attnum)`, [table])).rows.map(r => r.attname);
    const order = primaryKeys.length ? ` ORDER BY ${primaryKeys.map(k => `"${k.replaceAll('"', '""')}"`).join(',')}` : '';
    const sourceRows = (await source.query(`SELECT * FROM public.${quotedTable}${order}`)).rows;
    const targetRows = stageTables.includes(table) ? (await stage.query(`SELECT * FROM public.${quotedTable}${order}`)).rows : [];
    const sourceSha256 = canonicalHash(sourceRows);
    const targetSha256 = canonicalHash(targetRows);
    reconciliation.push({ table, sourceRows: sourceRows.length, stageRows: targetRows.length,
      sourceSha256, targetSha256, match: sourceRows.length === targetRows.length && sourceSha256 === targetSha256 });
  }
  const objectSql = `SELECT
    (SELECT count(*)::int FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public') AS functions,
    (SELECT count(*)::int FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal) AS triggers,
    (SELECT count(*)::int FROM pg_policies WHERE schemaname='public') AS policies,
    (SELECT count(*)::int FROM pg_views WHERE schemaname='public') AS views`;
  const report = {
    at: new Date().toISOString(), sourceHost: sourceUrl.hostname, stageHost: stageUrl.hostname,
    sourceTables: tables.length, stageTables: stageTables.length,
    sourceRows: reconciliation.reduce((n,r) => n+r.sourceRows,0),
    stageRows: reconciliation.reduce((n,r) => n+r.stageRows,0),
    matchedTables: reconciliation.filter(r => r.match).length,
    sourceSchemaObjects: (await source.query(objectSql)).rows[0],
    stageSchemaObjects: (await stage.query(objectSql)).rows[0],
    tables: reconciliation,
  };
  fs.writeFileSync("docs/neon-isolated-staging-reconciliation-2026-10-08.json", JSON.stringify(report,null,2), { mode: 0o600 });
  console.log(JSON.stringify({sourceHost:report.sourceHost,stageHost:report.stageHost,sourceTables:report.sourceTables,
    stageTables:report.stageTables,sourceRows:report.sourceRows,stageRows:report.stageRows,
    matchedTables:report.matchedTables,sourceSchemaObjects:report.sourceSchemaObjects,
    stageSchemaObjects:report.stageSchemaObjects,
    mismatchedTables:reconciliation.filter(r=>!r.match).map(r=>r.table)},null,2));
} finally { await Promise.all([source.end().catch(()=>{}),stage.end().catch(()=>{})]); }
