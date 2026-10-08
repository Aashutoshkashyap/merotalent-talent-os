/** Read-only schema inventory for the approved Supabase source and isolated Neon staging branch. */
import fs from "node:fs";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config({ path: ".migration.env", quiet: true });
const sourceUrl = new URL(process.env.SUPABASE_DATABASE_URL || "postgresql://invalid@invalid");
const stageUrl = new URL(process.env.NEON_STAGING_DATABASE_URL || "postgresql://invalid@invalid");
if (sourceUrl.hostname !== "db.dtirpilgzlsfryucanlg.supabase.co" ||
    stageUrl.hostname !== "ep-wispy-credit-azt6tgwj-pooler.c-3.ap-southeast-1.aws.neon.tech") {
  throw new Error("Only the approved read-only source and isolated staging catalogs may be inventoried.");
}
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
const source = new pg.Client({ connectionString: sourceUrl.toString(), options: "-c default_transaction_read_only=on" });
const stage = new pg.Client({ connectionString: stageUrl.toString(), options: "-c default_transaction_read_only=on" });
try {
  await Promise.all([source.connect(), stage.connect()]);
  const result = { at: new Date().toISOString(), sourceHost: sourceUrl.hostname, stageHost: stageUrl.hostname, source: {}, stage: {} };
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
  await Promise.all([source.end().catch(() => {}), stage.end().catch(() => {})]);
}
