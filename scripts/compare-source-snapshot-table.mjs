/** Compare all source fields using exact numeric tokens and verified row keys. */
import { canonicalSnapshotValue, hasVerifiedProfileContactReplay, semanticDifferences, snapshotFingerprint } from "./source-snapshot-reconciliation.mjs";

/** An explicitly audited sandbox configuration is not source/production parity. */
export function isAuditedStagingProviderConfiguration(row, audits) {
  if (row?.provider_kind !== "payment" || row.provider_name !== "esewa" || row.is_enabled !== true ||
      row.configured_by !== null || row.public_config?.environment !== "uat" || row.public_config?.merchant_code !== "EPAYTEST" ||
      ![row.secret_ciphertext, row.secret_iv, row.secret_tag].every(value => typeof value === "string" && value.length > 0)) return false;
  return audits.some(audit => audit.action === "staging_configure_esewa_uat" && audit.entity_type === "provider_configuration" &&
    audit.entity_id === "payment" && audit.metadata?.operator_bootstrap === true && audit.metadata.environment === "uat" &&
    audit.metadata.merchant_code === "EPAYTEST" && Number.isFinite(Date.parse(audit.created_at)) &&
    Date.parse(row.configured_at) === Date.parse(audit.created_at) && Date.parse(row.updated_at) === Date.parse(audit.created_at));
}

function keyedRows(rows, keyColumns) {
  if (!keyColumns.length) throw new Error("SNAPSHOT_PRIMARY_KEY_REQUIRED");
  const keyed = new Map();
  for (const row of rows) {
    if (keyColumns.some(column => !Object.hasOwn(row, column) || row[column] === null)) throw new Error("SNAPSHOT_PRIMARY_KEY_MISSING");
    const key = canonicalSnapshotValue(keyColumns.map(column => row[column]));
    if (keyed.has(key)) throw new Error("SNAPSHOT_PRIMARY_KEY_DUPLICATED");
    keyed.set(key, row);
  }
  return keyed;
}

export function compareSourceSnapshotTable({ table, sourceRows, targetRows, keyColumns, sourceColumns, targetColumns, replayAudits = [], sourceDigest }) {
  const missingColumns = sourceColumns.filter(column => !targetColumns.includes(column));
  if (missingColumns.length) return { table, status: "TARGET_COLUMNS_MISSING", missingColumns };
  if (sourceRows.some(row => sourceColumns.some(column => !Object.hasOwn(row, column)))) throw new Error("SNAPSHOT_SOURCE_ROW_INCOMPLETE");
  if (targetRows.some(row => sourceColumns.some(column => !Object.hasOwn(row, column)))) throw new Error("SNAPSHOT_TARGET_ROW_INCOMPLETE");
  const source = keyedRows(sourceRows, keyColumns);
  const target = keyedRows(targetRows, keyColumns);
  const changes = [];
  const precisionFieldCounts = {};
  let precisionOnlyRows = 0;
  let verifiedSourceContactReplays = 0;
  let expectedStagingProviderRows = 0;
  for (const [key, original] of source) {
    const staging = target.get(key);
    if (!staging) continue;
    const originalFields = Object.fromEntries(sourceColumns.map(column => [column, original[column]]));
    const stagingFields = Object.fromEntries(sourceColumns.map(column => [column, staging[column]]));
    const differences = semanticDifferences(originalFields, stagingFields);
    if (!differences.length) continue;
    for (const field of differences.filter(field => field.reason === "timestamp_precision_or_format")) {
      precisionFieldCounts[field.path] = (precisionFieldCounts[field.path] ?? 0) + 1;
    }
    if (differences.every(field => field.reason === "timestamp_precision_or_format")) { precisionOnlyRows++; continue; }
    if (table === "profiles" && hasVerifiedProfileContactReplay(original, staging, replayAudits, sourceDigest)) {
      verifiedSourceContactReplays++; continue;
    }
    const sandboxConfiguration = table === "provider_configurations" && isAuditedStagingProviderConfiguration(staging, replayAudits);
    if (sandboxConfiguration) expectedStagingProviderRows++;
    changes.push({ rowFingerprint: snapshotFingerprint(key), fields: differences,
      decision: sandboxConfiguration ? "EXPECTED_AUDITED_STAGING_SANDBOX_CONFIGURATION_NOT_PRODUCTION_PARITY" : "PRESERVE_BOTH_PENDING_PROVENANCE" });
  }
  const sourceOnly = [...source.keys()].filter(key => !target.has(key));
  const stagingOnly = [...target.keys()].filter(key => !source.has(key));
  const unresolved = changes.filter(change => change.decision === "PRESERVE_BOTH_PENDING_PROVENANCE");
  return { table, status: sourceOnly.length || unresolved.length ? "UNRESOLVED_SOURCE_DELTA" : expectedStagingProviderRows
    ? "EXPECTED_AUDITED_STAGING_SANDBOX_CONFIGURATION" : "SHARED_SOURCE_BUSINESS_VALUES_MATCH",
    keyColumns, sourceRows: source.size, targetRows: target.size, sourceOnly: sourceOnly.length,
    sourceOnlyFingerprints: sourceOnly.map(snapshotFingerprint), stagingOnly: stagingOnly.length,
    stagingOnlyFingerprints: stagingOnly.map(snapshotFingerprint), precisionOnlyRows, precisionFieldCounts,
    verifiedSourceContactReplays, expectedStagingProviderRows, changedShared: changes,
    targetOnlyColumns: targetColumns.filter(column => !sourceColumns.includes(column)) };
}
