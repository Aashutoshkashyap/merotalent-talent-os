/** Read-only proof that actual dual-session links retain source IDs and access grants. */
import dotenv from "dotenv";
import pg from "pg";
import { writeFile } from "node:fs/promises";
import { isAbsolute } from "node:path";
import { readEncryptedSourceSnapshot } from "./source-snapshot-artifact.mjs";
import { summarizeSourceSnapshot } from "./source-auth-snapshot.mjs";
import { requireNeonMigrationStaging } from "./require-neon-migration-staging.mjs";
import { sourceSnapshotPrimaryKeys } from "./plan-source-snapshot-delta.mjs";
import { planTableDelta } from "./staging-snapshot-delta.mjs";
import { snapshotFingerprint } from "./source-snapshot-reconciliation.mjs";
import { parseLosslessSnapshotRow } from "./lossless-snapshot-json.mjs";
let client;
try {
  const args = {};
  for (const arg of process.argv.slice(2)) {
    const match = /^--(snapshot|snapshot-sha256|report)=(.+)$/.exec(arg);
    if (!match || args[match[1]]) throw new Error("INVALID_ARGUMENT"); args[match[1]] = match[2];
  }
  if (!isAbsolute(args.report ?? "")) throw new Error("PRIVATE_REPORT_REQUIRED");
  dotenv.config({ path: ".migration.env", quiet: true });
  const url = new URL(process.env.NEON_STAGING_DATABASE_URL);
  requireNeonMigrationStaging(url.href);
  if (process.env.VERCEL_ENV === "production") throw new Error("STAGING_ONLY");
  url.searchParams.set("sslmode", "verify-full");
  const snapshot = await readEncryptedSourceSnapshot(args.snapshot);
  if (summarizeSourceSnapshot(snapshot).snapshotSha256 !== args["snapshot-sha256"]) throw new Error("SOURCE_HASH_MISMATCH");
  const sourceIds = new Set(snapshot.auth.users.map(raw => JSON.parse(raw).id));
  const keys = sourceSnapshotPrimaryKeys(snapshot), columns = snapshot.publicColumns.map(JSON.parse);
  client = new pg.Client({ connectionString: url.href, connectionTimeoutMillis: 15000 }); await client.connect();
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY"); await client.query("SET LOCAL TIME ZONE 'UTC'");
  const links = (await client.query(`SELECT a.legacy_user_id,l.verification_method,l.verified_at,
    u."emailVerified" AS email_verified,u.id IS NOT NULL AS managed_present
    FROM public.neon_application_accounts a JOIN public.neon_identity_links l ON l.application_account_id=a.id
    LEFT JOIN neon_auth."user" u ON u.id::uuid=l.neon_auth_user_id
    WHERE a.status='active' AND l.status='verified'`)).rows.filter(row => sourceIds.has(row.legacy_user_id));
  const checks = [];
  for (const link of links) {
    const sourceProfile = snapshot.public.profiles.map(JSON.parse).find(row => row.user_id === link.legacy_user_id);
    const profile = (await client.query("SELECT id,user_id FROM public.profiles WHERE user_id=$1::uuid", [link.legacy_user_id])).rows;
    const grants = [];
    for (const table of ["user_roles", "user_module_capabilities", "entity_admin_assignments", "entity_feature_grants"]) {
      const source = snapshot.public[table].filter(raw => parseLosslessSnapshotRow(raw).user_id === link.legacy_user_id);
      const target = (await client.query(`SELECT to_jsonb(t)::text AS row FROM public.${table} t WHERE user_id=$1::uuid`, [link.legacy_user_id])).rows.map(row => row.row);
      const cols = columns.filter(row => row.table_name === table);
      const plan = planTableDelta({ table, baseline: source, final: source, target,
        keys: keys.get(table), columns: cols.map(row => row.column_name),
        timestampColumns: cols.filter(row => row.udt_name === "timestamptz" && row.udt_schema === "pg_catalog").map(row => row.column_name) });
      grants.push({ table, sourceCount: source.length, targetCount: target.length,
        exactTypedMatch: plan.operations.length === 0 && plan.conflicts.length === 0 && plan.targetOnly.length === 0 });
    }
    checks.push({ account: snapshotFingerprint(link.legacy_user_id),
      sourceProfileIdPreserved: profile.length === 1 && sourceProfile?.id === profile[0].id && sourceProfile.user_id === profile[0].user_id,
      ownershipVerified: link.verification_method === "dual_authenticated_session" && !!link.verified_at && link.managed_present && link.email_verified === true,
      grants });
  }
  const pass = checks.length > 0 && checks.every(row => row.sourceProfileIdPreserved && row.ownershipVerified && row.grants.every(grant => grant.exactTypedMatch));
  const report = { result: pass ? "PASS" : "BLOCKED", at: new Date().toISOString(),
    sourceSnapshot: snapshot.statementTimestamp, sourceUsers: sourceIds.size, verifiedSourceLinks: checks.length,
    remainingUnlinkedSourceUsers: sourceIds.size - checks.length, checks,
    sourceWrites: 0, targetWrites: 0, productionWrites: 0, productionCutover: false };
  await client.query("ROLLBACK");
  await writeFile(args.report, JSON.stringify(report, null, 2), { mode: 0o600, flag: "wx" });
  console.log(JSON.stringify(report)); if (!pass) process.exitCode = 2;
} catch (error) {
  console.error(JSON.stringify({ result: "FAIL", code: /^[A-Z_]+$/.test(error?.message ?? "") ? error.message : "SOURCE_LINK_VERIFICATION_FAILED" })); process.exitCode = 1;
} finally { await client?.query("ROLLBACK").catch(() => {}); await client?.end().catch(() => {}); }
