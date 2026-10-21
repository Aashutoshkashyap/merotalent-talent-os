/** Pure three-way planner and transactional replay. The CLI alone supplies remote credentials. */
import { createHash } from "node:crypto";
import { canonicalSnapshotValue, snapshotFingerprint, semanticDifferences } from "./source-snapshot-reconciliation.mjs";
import { parseLosslessSnapshotRow } from "./lossless-snapshot-json.mjs";
import { quoteIdentifier as q } from "./recovery-integrity.mjs";

const digest = value => createHash("sha256").update(canonicalSnapshotValue(value)).digest("hex");
const projection = (row, columns) => Object.fromEntries(columns.map(column => [column, row[column]]));

/** Normalize only declared timestamptz columns, retaining all six PostgreSQL fractional digits. */
export function exactTimestampInstant(value) {
  if(typeof value!=="string")return value;
  const match=/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}:\d{2})(?:\.(\d{1,6}))?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  if(!match)return value; // Unsupported representations remain exact-string comparisons, never rounded.
  const wholeMilliseconds=Date.parse(`${match[1]}T${match[2]}${match[4]}`);
  if(!Number.isSafeInteger(wholeMilliseconds))return value;
  return `timestamptz:${BigInt(wholeMilliseconds)*1000n+BigInt((match[3]??"").padEnd(6,"0"))}`;
}

function indexRows(rawRows, keys, columns, timestampColumns) {
  const result = new Map();
  for (const raw of rawRows) {
    const row = parseLosslessSnapshotRow(raw);
    if (keys.some(key => row[key] === undefined || row[key] === null) || columns.some(key => !Object.hasOwn(row, key))) {
      throw new Error("INCOMPLETE_ROW_OR_KEY");
    }
    const comparable={...row};
    for(const column of timestampColumns)comparable[column]=exactTimestampInstant(row[column]);
    const key = canonicalSnapshotValue(keys.map(column => comparable[column]));
    if (result.has(key)) throw new Error("DUPLICATE_ROW_KEY");
    result.set(key, { raw, value: row, hash: digest(projection(comparable, columns)) });
  }
  return result;
}

export function planTableDelta({ table, baseline, final, target, keys, columns, timestampColumns=[] }) {
  const before = indexRows(baseline, keys, columns, timestampColumns), desired = indexRows(final, keys, columns, timestampColumns);
  const current = indexRows(target, keys, columns, timestampColumns);
  const operations = [], conflicts = [], targetOnly = [], matched = [];
  for (const key of [...new Set([...before.keys(), ...desired.keys(), ...current.keys()])].sort()) {
    const b = before.get(key), f = desired.get(key), t = current.get(key);
    const fingerprint = snapshotFingerprint(key);
    if (!b && !f) { targetOnly.push(fingerprint); continue; }
    if (!f) {
      if (t) conflicts.push({ row: fingerprint, reason: "SOURCE_DELETE_REQUIRES_APPROVED_POLICY" });
      continue;
    }
    if (t?.hash === f.hash) { matched.push(fingerprint); continue; }
    if (!t && !b) operations.push({ kind: "insert", row: fingerprint, raw: f.raw });
    else if (!t) conflicts.push({ row: fingerprint, reason: "TARGET_DELETION_OR_MISSING_BASELINE_ROW" });
    else if (b?.hash === t.hash) operations.push({ kind: "update", row: fingerprint, raw: f.raw });
    else {
      const differences = semanticDifferences(projection(f.value,columns),projection(t.value,columns));
      conflicts.push({ row: fingerprint, reason: differences.every(d => d.reason === "timestamp_precision_or_format")
        ? "TIMESTAMP_PRECISION_OR_FORMAT_REQUIRES_REVIEW" : "INDEPENDENT_TARGET_CHANGE", fields: differences.map(d=>({path:d.path,reason:d.reason})) });
    }
  }
  return { table, operations, conflicts, targetOnly, matched,
    targetOnlyFingerprint: digest([...current].filter(([key]) => !before.has(key) && !desired.has(key)).map(([key,row]) => [key,digest(row.value)]).sort()),
    sourceCount: desired.size, targetCount: current.size,
    sourceFingerprint: digest([...desired].map(([key, row]) => [key, row.hash]).sort()),
    targetFingerprint: digest([...current].map(([key, row]) => [key, row.hash]).sort()) };
}

export const opaqueDelta = plan => ({ ...plan, operations: plan.operations.map(({ kind, row }) => ({ kind, row })) });

export function dependencyOrder(tables, foreignKeys) {
  const pending = new Set(tables), ordered = [];
  while (pending.size) {
    const ready = [...pending].sort().filter(table => !foreignKeys.some(fk => fk.child === table && pending.has(fk.parent)));
    if (!ready.length) throw new Error("CYCLIC_OR_SELF_REFERENTIAL_MUTATION_REQUIRES_REVIEW");
    for (const table of ready) { pending.delete(table); ordered.push(table); }
  }
  return ordered;
}

/** Caller holds a transaction and SHARE ROW EXCLUSIVE locks; no sequence-changing defaults or triggers allowed. */
export async function replayTableDelta(client, plan, columns, keys) {
  const repairs=plan.operations.filter(o=>o.kind==="timestamp-repair"),groups=new Map();
  for(const operation of repairs) {
    if(!operation.columns?.length||operation.columns.some(c=>keys.includes(c)||!columns.includes(c)))throw new Error("INVALID_TIMESTAMP_REPAIR_FIELDS");
    const key=JSON.stringify([...operation.columns].sort());
    if(!groups.has(key))groups.set(key,[]);groups.get(key).push(operation);
  }
  for(const [fields,group] of groups)for(let offset=0;offset<group.length;offset+=250) {
    const batch=group.slice(offset,offset+250);
    // Splice already validated raw PostgreSQL JSON to retain arbitrary numeric precision.
    const payload=`[${batch.map(o=>`{"source":${o.raw},"before":${o.beforeRaw}}`).join(",")}]`;
    const result=await client.query(`UPDATE public.${q(plan.table)} t SET ${JSON.parse(fields).map(c=>`${q(c)}=s.${q(c)}`).join(",")}
      FROM jsonb_array_elements($1::jsonb) AS input_rows(data)
      CROSS JOIN LATERAL jsonb_populate_record(NULL::public.${q(plan.table)},input_rows.data->'source') s
      WHERE ${keys.map(c=>`t.${q(c)} IS NOT DISTINCT FROM s.${q(c)}`).join(" AND ")} AND to_jsonb(t)=input_rows.data->'before'`,[payload]);
    if(result.rowCount!==batch.length)throw new Error("STALE_TIMESTAMP_REPAIR_PLAN");
  }
  for (const operation of plan.operations) {
    if(operation.kind==="timestamp-repair")continue;
    const values = columns.map(column => `s.${q(column)}`).join(",");
    const source = `jsonb_populate_record(NULL::public.${q(plan.table)},$1::jsonb) s`;
    const sql = operation.kind === "insert"
      ? `INSERT INTO public.${q(plan.table)} (${columns.map(q).join(",")}) SELECT ${values} FROM ${source}`
      : `UPDATE public.${q(plan.table)} t SET ${columns.filter(c => !keys.includes(c)).map(c => `${q(c)}=s.${q(c)}`).join(",")}
          FROM ${source} WHERE ${keys.map(c => `t.${q(c)} IS NOT DISTINCT FROM s.${q(c)}`).join(" AND ")}`;
    if (operation.kind === "update" && columns.every(c => keys.includes(c))) throw new Error("KEY_ONLY_UPDATE_UNSUPPORTED");
    const result = await client.query(sql, [operation.raw]);
    if (result.rowCount !== 1) throw new Error("REPLAY_ROW_COUNT_MISMATCH");
  }
}
