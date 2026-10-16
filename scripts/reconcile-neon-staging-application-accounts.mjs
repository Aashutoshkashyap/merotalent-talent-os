/** Build stable staging application-account anchors; never link Auth identities. */
import dotenv from "dotenv";
import pg from "pg";
import { requireNeonMigrationStaging } from "./require-neon-migration-staging.mjs";

dotenv.config({ path: ".migration.env", quiet: true });
const url = process.env.NEON_STAGING_DATABASE_URL;
requireNeonMigrationStaging(url);
const apply = process.argv.includes("--apply");
if (process.argv.some(arg => arg.startsWith("--") && arg !== "--apply")) throw new Error("Unsupported account-reconciliation option.");
const client = new pg.Client({ connectionString: url, connectionTimeoutMillis: 10000 });
let started = false;
try {
  await client.connect();
  await client.query(apply ? "BEGIN ISOLATION LEVEL SERIALIZABLE" : "BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  started = true;
  await client.query("SET LOCAL statement_timeout = '30s'");
  const identity = (await client.query(`SELECT current_database() AS database_name,
    to_regclass('public.neon_application_accounts') IS NOT NULL AS ledger_exists,
    to_regclass('public.neon_identity_links') IS NOT NULL AS links_exist`)).rows[0];
  if (identity?.database_name !== "neondb" || !identity.ledger_exists || !identity.links_exist) {
    throw new Error("Unexpected isolated staging database or missing identity ledger.");
  }
  const before = (await client.query(`SELECT
      (SELECT count(*)::int FROM public.profiles) AS profiles,
      (SELECT count(*)::int FROM public.neon_application_accounts) AS accounts,
      (SELECT count(*)::int FROM public.neon_identity_links WHERE status='verified') AS verified_links,
      (SELECT count(*)::int FROM public.profiles p LEFT JOIN public.neon_application_accounts a
        ON a.legacy_user_id=p.user_id WHERE a.id IS NULL) AS missing_accounts`)).rows[0];
  let created = 0;
  if (apply) {
    const inserted = await client.query(`INSERT INTO public.neon_application_accounts (legacy_user_id, status)
      SELECT p.user_id,
        CASE WHEN p.account_status='active' AND p.deleted_at IS NULL THEN 'active' ELSE 'disabled' END
      FROM public.profiles p
      WHERE NOT EXISTS (SELECT 1 FROM public.neon_application_accounts a WHERE a.legacy_user_id=p.user_id)
      ON CONFLICT (legacy_user_id) DO NOTHING`);
    created = inserted.rowCount ?? 0;
  }
  const after = (await client.query(`SELECT
      (SELECT count(*)::int FROM public.neon_application_accounts) AS accounts,
      (SELECT count(*)::int FROM public.neon_identity_links WHERE status='verified') AS verified_links,
      (SELECT count(*)::int FROM public.profiles p LEFT JOIN public.neon_application_accounts a
        ON a.legacy_user_id=p.user_id WHERE a.id IS NULL) AS missing_accounts,
      (SELECT count(*)::int FROM public.neon_application_accounts a
        LEFT JOIN public.neon_identity_links l ON l.application_account_id=a.id WHERE l.application_account_id IS NULL) AS unlinked_accounts`)).rows[0];
  if (after.verified_links !== before.verified_links || (apply && after.missing_accounts !== 0)) {
    throw new Error("Identity-link invariant changed; refusing account reconciliation.");
  }
  await client.query(apply ? "COMMIT" : "ROLLBACK");
  started = false;
  console.log(JSON.stringify({ mode: apply ? "APPLY" : "DRY_RUN", before, created,
    after, note: "No Managed Auth user was imported, linked, or granted access." }));
} catch (error) {
  if (started) await client.query("ROLLBACK").catch(() => undefined);
  console.error(`Staging application-account reconciliation failed (${typeof error?.code === "string" ? error.code : "INVARIANT_FAILED"}).`);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}
