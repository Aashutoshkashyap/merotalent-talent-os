/** Narrow append-only policy; retained conflicts are evidence, never silently resolved. */
import { canonicalSnapshotValue } from "./source-snapshot-reconciliation.mjs";
import { parseLosslessSnapshotRow } from "./lossless-snapshot-json.mjs";

export function appendTriggerUnsafe(trigger) {
  // PostgreSQL trigger event bits: INSERT=4. UPDATE/DELETE-only guards stay enabled.
  return (Number(trigger.type) & 4) !== 0;
}
export function appendColumnUnsafe(column, sourceNames) {
  if (column.is_generated !== "NEVER" || column.is_identity === "YES") return true;
  if (sourceNames.includes(column.column_name) || column.column_default === null) return false;
  // The only reviewed extra default: empty job preferences, no grant or side effect.
  return !(column.table_name === "profiles" && column.column_name === "job_preferences" &&
    column.column_default === "'{}'::jsonb");
}
export function assertAppendOnly(plans) {
  if (plans.some(plan => plan.operations.some(operation => operation.kind !== "insert"))) {
    throw new Error("APPEND_ONLY_POLICY_REJECTS_UPDATES");
  }
}
export function assertExistingRowsUnchanged(before, after, keys) {
  const index = rows => new Map(rows.map(raw => {
    const row = parseLosslessSnapshotRow(raw);
    return [canonicalSnapshotValue(keys.map(key => row[key])), canonicalSnapshotValue(row)];
  }));
  const previous = index(before), current = index(after);
  if (current.size !== after.length || [...previous].some(([key, value]) => current.get(key) !== value)) {
    throw new Error("APPEND_CHANGED_OR_DELETED_EXISTING_ROW");
  }
}
