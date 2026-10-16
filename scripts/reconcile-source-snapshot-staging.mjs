/** Read-only semantic reconciliation against one encrypted consistent source snapshot. */
import pg from "pg";
import dotenv from "dotenv";
import { readEncryptedSourceSnapshot } from "./source-snapshot-artifact.mjs";
import { requireNeonMigrationStaging } from "./require-neon-migration-staging.mjs";
import { hasVerifiedProfileContactReplay, semanticDifferences, snapshotFingerprint as fingerprint } from "./source-snapshot-reconciliation.mjs";
import { summarizeSourceSnapshot } from "./source-auth-snapshot.mjs";
import { parseLosslessSnapshotRow } from "./lossless-snapshot-json.mjs";
import { compareSourceSnapshotTable } from "./compare-source-snapshot-table.mjs";

dotenv.config({ path: ".migration.env", quiet: true });
const artifact = process.argv[2];
const source = await readEncryptedSourceSnapshot(artifact);
const allPublic = process.argv.includes("--all-public");
const tables = allPublic ? Object.keys(source.public).sort() : ["audit_logs", "leads", "media_upload_intents", "notifications", "profiles"];
const quote = name => {
  if (!/^[a-z][a-z0-9_]*$/.test(name)) throw new Error("UNVERIFIED_SCHEMA_IDENTIFIER");
  return `"${name}"`;
};
requireNeonMigrationStaging(process.env.NEON_STAGING_DATABASE_URL);
const target = new pg.Client({ connectionString: process.env.NEON_STAGING_DATABASE_URL, connectionTimeoutMillis: 15000 });
try {
  await target.connect();
  await target.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  const snapshotTime = (await target.query("SELECT statement_timestamp()::text AS time")).rows[0].time;
  const sourceAuth = new Set(source.auth.users.map(row => JSON.parse(row).id));
  const sourceDigest = summarizeSourceSnapshot(source).snapshotSha256;
  const replayAudits = (await target.query(`SELECT action,entity_type,entity_id,metadata,created_at::text
    FROM public.audit_logs WHERE action IN ('migration_source_profile_contact_delta','staging_configure_esewa_uat')`)).rows;
  const results = [];
  if (allPublic) {
    const columns = (await target.query(`SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='public' ORDER BY ordinal_position`)).rows;
    const keys = (await target.query(`SELECT c.relname AS table_name,array_agg(a.attname::text ORDER BY k.ordinality) AS key_columns
      FROM pg_constraint p JOIN pg_class c ON c.oid=p.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace
      JOIN LATERAL unnest(p.conkey) WITH ORDINALITY k(attnum,ordinality) ON true
      JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum=k.attnum
      WHERE n.nspname='public' AND p.contype='p' GROUP BY c.relname`)).rows;
    const sourceColumns = source.publicColumns.map(row => JSON.parse(row));
    for (const table of tables) {
      const targetColumns = columns.filter(row => row.table_name === table).map(row => row.column_name);
      const keyColumns = keys.find(row => row.table_name === table)?.key_columns ?? [];
      if (!targetColumns.length || !keyColumns.length) {
        results.push({ table, status: !targetColumns.length ? "TARGET_TABLE_MISSING" : "TARGET_PRIMARY_KEY_UNAVAILABLE" });
        continue;
      }
      results.push(compareSourceSnapshotTable({ table, keyColumns, sourceDigest, replayAudits,
        sourceColumns: sourceColumns.filter(row => row.table_name === table).map(row => row.column_name), targetColumns,
        sourceRows: source.public[table].map(parseLosslessSnapshotRow),
        targetRows: (await target.query(`SELECT to_jsonb(t)::text AS row_data FROM public.${quote(table)} t`)).rows.map(row => parseLosslessSnapshotRow(row.row_data)) }));
    }
    const matched = results.filter(row => row.status === "SHARED_SOURCE_BUSINESS_VALUES_MATCH");
    console.log(JSON.stringify({ mode: "READ_ONLY_ALL_PUBLIC_LOSSLESS_SNAPSHOT_RECONCILIATION",
      sourceSnapshot: source.statementTimestamp, sourceMvcc: source.mvccSnapshot, targetSnapshot: snapshotTime,
      target: "migration-staging", sourceTables: tables.length, comparedTables: results.length, matchedTables: matched.length,
      expectedSandboxConfigurationTables: results.filter(row => row.status === "EXPECTED_AUDITED_STAGING_SANDBOX_CONFIGURATION").length,
      unresolvedTables: results.filter(row => !["SHARED_SOURCE_BUSINESS_VALUES_MATCH","EXPECTED_AUDITED_STAGING_SANDBOX_CONFIGURATION"].includes(row.status)).length,
      sharedBusinessDeltaRows: results.reduce((sum, row) => sum + (row.changedShared?.length ?? 0), 0),
      sourceOnlyRows: results.reduce((sum, row) => sum + (row.sourceOnly ?? 0), 0),
      stagingOnlyRows: results.reduce((sum, row) => sum + (row.stagingOnly ?? 0), 0),
      keyEvidence: "Target primary-key columns exist and every source/target row has unique non-null keys; source DDL comparison is separate",
      schemaParityVerified: false, finalCutoverDeltaVerified: false, results }));
  } else {
  for (const table of tables) {
    const sourceRows = source.public[table].map(parseLosslessSnapshotRow);
    const targetRows = (await target.query(`SELECT to_jsonb(t)::text AS row_data FROM public.${table} t ORDER BY t.id`))
      .rows.map(row => parseLosslessSnapshotRow(row.row_data));
    const sourceById = new Map(sourceRows.map(row => [String(row.id), row]));
    const targetById = new Map(targetRows.map(row => [String(row.id), row]));
    const shared = [];
    for (const [id, original] of sourceById) {
      const staging = targetById.get(id);
      if (!staging) continue;
      const sourceFields = Object.keys(original);
      const comparable = Object.fromEntries(sourceFields.filter(field => Object.hasOwn(staging, field)).map(field => [field, staging[field]]));
      const differences = semanticDifferences(original, comparable);
      if (!differences.length) continue;
      const verifiedReplay = table === "profiles" && hasVerifiedProfileContactReplay(original, staging, replayAudits, sourceDigest);
      shared.push({ row: fingerprint(id), sourceCreatedAt: original.created_at ?? null,
        sourceUpdatedAt: original.updated_at ?? null, targetUpdatedAt: staging.updated_at ?? null,
        sourceDeleted: original.deleted_at !== null && original.deleted_at !== undefined,
        targetDeleted: staging.deleted_at !== null && staging.deleted_at !== undefined,
        fields: differences,
        decision: verifiedReplay ? "VERIFIED_AUDITED_SOURCE_CONTACT_REPLAY"
          : differences.every(field => field.reason === "timestamp_precision_or_format")
          ? "PRESERVE_ROW_AND_DOCUMENT_MIGRATION_TIMESTAMP_PRECISION_LOSS"
          : "PRESERVE_BOTH_PENDING_PROVENANCE" });
    }
    const stagingOnly = targetRows.filter(row => !sourceById.has(String(row.id))).map(row => ({
      row: fingerprint(row.id), createdAt: row.created_at ?? null, updatedAt: row.updated_at ?? null,
      ownerPresentInSource: sourceAuth.has(row.user_id ?? row.owner_user_id ?? row.recipient_id ?? row.actor_user_id),
      applicationPresentInSource: row.source_type && row.source_id
        ? Object.entries(source.public).some(([, values]) => values.some(value => JSON.parse(value).id === row.source_id)) : null,
      action: table === "audit_logs" ? row.action : undefined,
      sourceType: table === "leads" ? row.source_type : undefined,
      module: table === "media_upload_intents" ? row.module : undefined,
      status: row.status, decision: "PRESERVE_STAGING_RECORD" }));
    const businessChanges = shared.filter(row => row.decision !== "VERIFIED_AUDITED_SOURCE_CONTACT_REPLAY" &&
      row.fields.some(field => field.reason === "business_value"));
    const precisionRows = shared.filter(row => row.fields.every(field => field.reason === "timestamp_precision_or_format"));
    const precisionFieldCounts = {};
    for (const row of shared) for (const field of row.fields.filter(field => field.reason === "timestamp_precision_or_format")) {
      precisionFieldCounts[field.path] = (precisionFieldCounts[field.path] ?? 0) + 1;
    }
    results.push({ table, sourceRows: sourceRows.length, targetRows: targetRows.length,
      sourceOnly: sourceRows.filter(row => !targetById.has(String(row.id))).length,
      stagingOnly, precisionOnlyRows: precisionRows.length, precisionFieldCounts,
      verifiedSourceContactReplays: shared.filter(row => row.decision === "VERIFIED_AUDITED_SOURCE_CONTACT_REPLAY").length,
      changedShared: businessChanges });
  }
  console.log(JSON.stringify({ mode: "READ_ONLY_SNAPSHOT_SEMANTIC_RECONCILIATION",
    sourceSnapshot: source.statementTimestamp, sourceMvcc: source.mvccSnapshot,
    targetSnapshot: snapshotTime, target: "migration-staging", results }));
  }
} catch (error) {
  console.error("Snapshot reconciliation stopped:", typeof error?.code === "string" ? error.code : "RECONCILIATION_UNAVAILABLE");
  process.exitCode = 1;
} finally {
  await target.query("ROLLBACK").catch(() => undefined);
  await target.end().catch(() => undefined);
}
