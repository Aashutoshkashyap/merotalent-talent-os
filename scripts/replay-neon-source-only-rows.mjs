/** Idempotent, source-read-only replay of a bounded missing-row set into isolated Neon staging. */
import pg from "pg";
import dotenv from "dotenv";
import { requireNeonMigrationStaging } from "./require-neon-migration-staging.mjs";
import { sourceReadOnlyQuery } from "./supabase-readonly-management-api.mjs";

dotenv.config({ path: ".migration.env", quiet: true });
const branchId = "br-frosty-haze-azsnybmr";
const targetUrl = process.env.NEON_STAGING_DATABASE_URL;
requireNeonMigrationStaging(targetUrl);
if (process.env.NEON_STAGING_BRANCH_ID !== branchId) throw new Error("Unexpected Neon staging branch.");
const apply = process.argv.includes("--apply-staging");
if (process.argv.some(arg => arg.startsWith("--") && arg !== "--apply-staging")) {
  throw new Error("Only --apply-staging is supported; default mode rolls back.");
}

const quote = value => `"${value.replaceAll('"', '""')}"`;
const tables = ["profiles", "user_roles", "saved_jobs", "sub_admin_requests", "notifications", "audit_logs"];
const pkSql = `SELECT c.relname AS table_name,a.attname AS column_name,k.ord::int AS ordinal_position
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  JOIN pg_index i ON i.indrelid=c.oid AND i.indisprimary
  JOIN LATERAL unnest(i.indkey) WITH ORDINALITY k(attnum,ord) ON true
  JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum=k.attnum
  WHERE n.nspname='public' ORDER BY c.relname,k.ord`;
const target = new pg.Client({ connectionString: targetUrl, connectionTimeoutMillis: 10000 });
let inTransaction = false;

try {
  const sourceKeys = await sourceReadOnlyQuery(pkSql);
  await target.connect();
  await target.query("BEGIN");
  inTransaction = true;
  const targetKeys = (await target.query(pkSql)).rows;
  const results = [];
  const newProfiles = [];
  for (const table of tables) {
    const sourcePk = sourceKeys.filter(row => row.table_name === table).map(row => row.column_name);
    const targetPk = targetKeys.filter(row => row.table_name === table).map(row => row.column_name);
    if (!sourcePk.length || sourcePk.join("|") !== targetPk.join("|")) {
      throw new Error(`Primary-key mapping is not identical for ${table}.`);
    }
    const fields = sourcePk.map(column => `t.${quote(column)}`).join(",");
    const query = `SELECT jsonb_build_array(${fields})::text AS row_key,to_jsonb(t) AS row_data
      FROM public.${quote(table)} t`;
    const sourceRows = await sourceReadOnlyQuery(query);
    const targetRows = (await target.query(`SELECT jsonb_build_array(${fields})::text AS row_key
      FROM public.${quote(table)} t`)).rows;
    const existing = new Set(targetRows.map(row => row.row_key));
    let inserted = 0;
    for (const row of sourceRows) {
      if (existing.has(row.row_key)) continue;
      const result = await target.query(`INSERT INTO public.${quote(table)}
        SELECT * FROM jsonb_populate_record(NULL::public.${quote(table)}, $1::jsonb)
        ON CONFLICT (${sourcePk.map(quote).join(",")}) DO NOTHING`, [JSON.stringify(row.row_data)]);
      if (result.rowCount !== 1) throw new Error(`Missing source row conflicted during ${table} replay.`);
      existing.add(row.row_key);
      inserted += 1;
      if (table === "profiles") newProfiles.push(row.row_data.user_id);
    }
    results.push({ table, sourceRows: sourceRows.length, existingTargetRows: targetRows.length, inserted });
  }
  for (const userId of newProfiles) {
    await target.query(`INSERT INTO public.neon_application_accounts(legacy_user_id,status)
      VALUES ($1::uuid,'active') ON CONFLICT DO NOTHING`, [userId]);
  }
  const missingAccounts = (await target.query(`SELECT count(*)::int AS n FROM public.profiles p
    LEFT JOIN public.neon_application_accounts a ON a.legacy_user_id=p.user_id
    WHERE a.id IS NULL`)).rows[0].n;
  if (missingAccounts !== 0) throw new Error("One or more profiles have no application-account mapping.");
  await target.query(apply ? "COMMIT" : "ROLLBACK");
  inTransaction = false;
  console.log(JSON.stringify({ mode: apply ? "APPLY_STAGING" : "ROLLBACK_PROBE",
    branchId, results, newApplicationAccounts: newProfiles.length,
    profilesWithoutApplicationAccounts: missingAccounts }));
} catch (error) {
  console.error("Source-only staging replay stopped:", error instanceof Error ? error.message : "UNKNOWN_ERROR");
  process.exitCode = 1;
} finally {
  if (inTransaction) await target.query("ROLLBACK").catch(() => undefined);
  await target.end().catch(() => undefined);
}
