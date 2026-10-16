/** Read-only schema inventory for the approved Supabase source and isolated Neon staging branch. */
import fs from "node:fs";
import dotenv from "dotenv";
import pg from "pg";
import { requireNeonMigrationStaging } from "./require-neon-migration-staging.mjs";
import { parseReadOnlySourceConfig, verifyReadOnlySource } from "./require-supabase-source-readonly.mjs";

dotenv.config({ path: ".migration.env", quiet: true });
const sourceConfig = parseReadOnlySourceConfig(process.env.SUPABASE_SOURCE_READONLY_DATABASE_URL,
  process.env.SUPABASE_SOURCE_EXPECTED_POOLER_HOST,
  process.env.SUPABASE_SOURCE_READONLY_ROLE);
const stageDatabaseUrl = process.env.NEON_STAGING_DATABASE_URL;
requireNeonMigrationStaging(stageDatabaseUrl);
const catalog = {
  policies: `SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies WHERE schemaname='public' ORDER BY tablename, policyname`,
  triggers: `SELECT c.relname AS table_name, t.tgname AS name, p.proname AS function_name,
      np.nspname AS function_schema, pg_get_triggerdef(t.oid) AS definition
    FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
    JOIN pg_namespace n ON n.oid=c.relnamespace
    JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_namespace np ON np.oid=p.pronamespace
    WHERE n.nspname='public' AND NOT t.tgisinternal ORDER BY c.relname,t.tgname`,
  views: `SELECT viewname AS name, definition FROM pg_views WHERE schemaname='public' ORDER BY viewname`,
  functions: `SELECT p.proname AS name, pg_get_function_identity_arguments(p.oid) AS args,
      pg_get_function_result(p.oid) AS returns, l.lanname AS language, p.prosecdef AS security_definer,
      p.proconfig AS config,
      CASE WHEN l.lanname IN ('sql','plpgsql') THEN pg_get_functiondef(p.oid) ELSE NULL END AS definition
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    JOIN pg_language l ON l.oid=p.prolang WHERE n.nspname='public' ORDER BY p.proname,args`,
  constraints: `SELECT c.conname AS name, t.relname AS table_name, c.contype AS type,
      pg_get_constraintdef(c.oid) AS definition
    FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid
    JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname='public'
    ORDER BY t.relname,c.conname`,
  indexes: `SELECT tablename AS table_name,indexname AS name,indexdef AS definition
    FROM pg_indexes WHERE schemaname='public' ORDER BY tablename,indexname`,
};
const source = new pg.Client(sourceConfig);
const stage = new pg.Client({ connectionString: stageDatabaseUrl, connectionTimeoutMillis: 10000 });
let sourceStarted = false;
let stageStarted = false;
try {
  await source.connect();
  await source.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  sourceStarted = true;
  await source.query("SET LOCAL statement_timeout = '30s'");
  await verifyReadOnlySource(source, process.env.SUPABASE_SOURCE_READONLY_ROLE);
  await stage.connect();
  await stage.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  stageStarted = true;
  const result = { at: new Date().toISOString(), sourceHost: sourceConfig.host,
    stageHost: new URL(stageDatabaseUrl).hostname, source: {}, stage: {} };
  for (const [kind, sql] of Object.entries(catalog)) {
    result.source[kind] = (await source.query(sql)).rows;
    result.stage[kind] = (await stage.query(sql)).rows;
  }
  result.source.buckets = (await source.query(`SELECT id,name,public,file_size_limit,allowed_mime_types
    FROM storage.buckets ORDER BY id`)).rows;
  const target = "/private/tmp/merotalent-neon-schema-inventory-2026-10-08.json";
  fs.writeFileSync(target, JSON.stringify(result, null, 2), { mode: 0o600 });
  console.log(JSON.stringify({ sourceHost: result.sourceHost, stageHost: result.stageHost,
    source: Object.fromEntries(Object.entries(result.source).map(([key,value]) => [key,value.length])),
    stage: Object.fromEntries(Object.entries(result.stage).map(([key,value]) => [key,value.length])),
    inventoryPath: target }, null, 2));
} finally {
  if (sourceStarted) await source.query("ROLLBACK").catch(() => undefined);
  if (stageStarted) await stage.query("ROLLBACK").catch(() => undefined);
  await Promise.all([source.end().catch(() => {}), stage.end().catch(() => {})]);
}
