/**
 * Builds a lossless, read-only source-to-source delta plan for a future
 * maintenance window. It never connects to, writes to, or configures a target.
 */
import { readEncryptedSourceSnapshot } from "./source-snapshot-artifact.mjs";
import { canonicalSnapshotValue, snapshotFingerprint } from "./source-snapshot-reconciliation.mjs";
import { parseLosslessSnapshotRow } from "./lossless-snapshot-json.mjs";
import { summarizeSourceSnapshot } from "./source-auth-snapshot.mjs";
import { pathToFileURL } from "node:url";

const absoluteArtifact = value => typeof value === "string" && value.startsWith("/") && !value.includes("\0");

function parsePrimaryKeyColumns(definition) {
  const match = /^PRIMARY KEY \((.+)\)$/i.exec(String(definition ?? "").trim());
  if (!match) throw new Error("SOURCE_SNAPSHOT_PRIMARY_KEY_DEFINITION_REQUIRED");
  const columns = [];
  let cursor = ""; let quoted = false;
  for (const character of match[1]) {
    if (character === '"') quoted = !quoted;
    if (character === "," && !quoted) { columns.push(cursor.trim().replace(/^"|"$/g, "")); cursor = ""; }
    else cursor += character;
  }
  columns.push(cursor.trim().replace(/^"|"$/g, ""));
  if (!columns.length || columns.some(column => !/^[A-Za-z_][A-Za-z0-9_$]*$/.test(column))) {
    throw new Error("SOURCE_SNAPSHOT_PRIMARY_KEY_DEFINITION_INVALID");
  }
  return columns;
}

export function sourceSnapshotPrimaryKeys(snapshot) {
  if (!snapshot?.schema?.constraints || !Array.isArray(snapshot.schema.constraints)) {
    throw new Error("FINAL_SOURCE_SNAPSHOT_SCHEMA_REQUIRED");
  }
  const keys = new Map();
  for (const raw of snapshot.schema.constraints) {
    const constraint = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (constraint?.type !== "p" || typeof constraint.table_name !== "string") continue;
    if (keys.has(constraint.table_name)) throw new Error("SOURCE_SNAPSHOT_PRIMARY_KEY_AMBIGUOUS");
    keys.set(constraint.table_name, parsePrimaryKeyColumns(constraint.definition));
  }
  return keys;
}

function keyedRows(rows, columns) {
  const keyed = new Map();
  for (const row of rows) {
    if (columns.some(column => !Object.hasOwn(row, column) || row[column] === null)) {
      throw new Error("SOURCE_SNAPSHOT_PRIMARY_KEY_VALUE_MISSING");
    }
    const key = canonicalSnapshotValue(columns.map(column => row[column]));
    if (keyed.has(key)) throw new Error("SOURCE_SNAPSHOT_PRIMARY_KEY_DUPLICATED");
    keyed.set(key, row);
  }
  return keyed;
}

/** Returns only opaque row fingerprints; never source row values or PII. */
export function planSourceSnapshotDelta(baseline, final) {
  if (baseline?.sourceProject !== final?.sourceProject || baseline?.database !== final?.database ||
      baseline?.transactionReadOnly !== "on" || final?.transactionReadOnly !== "on") {
    throw new Error("SOURCE_SNAPSHOT_LINEAGE_INVALID");
  }
  if (!Number.isFinite(Date.parse(baseline.statementTimestamp)) || !Number.isFinite(Date.parse(final.statementTimestamp)) ||
      Date.parse(final.statementTimestamp) < Date.parse(baseline.statementTimestamp)) {
    throw new Error("SOURCE_SNAPSHOT_TIMESTAMP_ORDER_INVALID");
  }
  const baselineTables = Object.keys(baseline.public ?? {}).sort();
  const finalTables = Object.keys(final.public ?? {}).sort();
  if (JSON.stringify(baselineTables) !== JSON.stringify(finalTables)) throw new Error("SOURCE_SNAPSHOT_TABLE_SET_CHANGED");
  const keys = sourceSnapshotPrimaryKeys(final);
  const tables = [];
  for (const table of finalTables) {
    const keyColumns = keys.get(table);
    if (!keyColumns) {
      tables.push({ table, status: "PRIMARY_KEY_UNAVAILABLE", expectedInserts: [], expectedUpdates: [], expectedDeletes: [] });
      continue;
    }
    const before = keyedRows(baseline.public[table].map(parseLosslessSnapshotRow), keyColumns);
    const after = keyedRows(final.public[table].map(parseLosslessSnapshotRow), keyColumns);
    const expectedInserts = []; const expectedUpdates = []; const expectedDeletes = [];
    for (const [key, row] of after) {
      const prior = before.get(key);
      if (!prior) expectedInserts.push(snapshotFingerprint(key));
      else if (canonicalSnapshotValue(prior) !== canonicalSnapshotValue(row)) expectedUpdates.push(snapshotFingerprint(key));
    }
    for (const key of before.keys()) if (!after.has(key)) expectedDeletes.push(snapshotFingerprint(key));
    tables.push({ table, status: "DELTA_READY", keyColumns, expectedInserts, expectedUpdates, expectedDeletes,
      unchangedRows: after.size - expectedInserts.length - expectedUpdates.length });
  }
  const blockedTables = tables.filter(table => table.status !== "DELTA_READY");
  return {
    mode: "READ_ONLY_SOURCE_FINAL_DELTA_PLAN",
    baseline: summarizeSourceSnapshot(baseline), final: summarizeSourceSnapshot(final),
    tables, blockedTables: blockedTables.map(table => table.table),
    expectedInserts: tables.reduce((sum, table) => sum + table.expectedInserts.length, 0),
    expectedUpdates: tables.reduce((sum, table) => sum + table.expectedUpdates.length, 0),
    expectedDeletes: tables.reduce((sum, table) => sum + table.expectedDeletes.length, 0),
    targetConflictAnalysis: {
      status: "REQUIRES_SEPARATE_TARGET_RECONCILIATION",
      inspected: false,
      reason: "A source-only planner must not infer target conflicts or staging fixture records.",
    },
    syntheticRecordPolicy: "SOURCE_PLAN_EXCLUDES_TARGET_ONLY_SYNTHETIC_RECORDS_BY_DESIGN",
    targetWrites: 0,
    productionWrites: 0,
    readyForOperatorReview: blockedTables.length === 0,
  };
}

const args = process.argv.slice(2);
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const values = Object.fromEntries(args.map(argument => {
    const match = /^--(baseline|final)=(.+)$/.exec(argument);
    if (!match) throw new Error("USAGE: --baseline=/absolute/path --final=/absolute/path");
    return [match[1], match[2]];
  }));
  if (!absoluteArtifact(values.baseline) || !absoluteArtifact(values.final) || values.baseline === values.final) {
    throw new Error("TWO_DISTINCT_ABSOLUTE_ENCRYPTED_ARTIFACTS_REQUIRED");
  }
  const [baseline, final] = await Promise.all([readEncryptedSourceSnapshot(values.baseline), readEncryptedSourceSnapshot(values.final)]);
  console.log(JSON.stringify(planSourceSnapshotDelta(baseline, final)));
}
