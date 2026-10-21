/** Staging-only three-way reconciliation. Defaults to READ ONLY; never deletes target rows. */
import dotenv from "dotenv";
import pg from "pg";
import { writeFile } from "node:fs/promises";
import { isAbsolute } from "node:path";
import { readEncryptedSourceSnapshot } from "./source-snapshot-artifact.mjs";
import { summarizeSourceSnapshot } from "./source-auth-snapshot.mjs";
import { planSourceSnapshotDelta, sourceSnapshotPrimaryKeys } from "./plan-source-snapshot-delta.mjs";
import { requireNeonMigrationStaging } from "./require-neon-migration-staging.mjs";
import { planTableDelta, opaqueDelta, dependencyOrder, replayTableDelta } from "./staging-snapshot-delta.mjs";
import { quoteIdentifier as q,schemaFingerprints,compareRecoveryEvidence } from "./recovery-integrity.mjs";
import {precisionRepairPlan,isPureTimestampTrigger,isUnchangedFieldGuard,isColumnDisjointTrigger,evidenceHash,expectedRepairedTableFingerprint,retainedConflictProvenance,auditedProfileCreationRepair,rowHash} from "./staging-timestamp-drift.mjs";
import {sourceSchemaEvidence}from"./staging-schema-evidence.mjs";
import { appendTriggerUnsafe, appendColumnUnsafe, assertAppendOnly, assertExistingRowsUnchanged } from "./staging-append-policy.mjs";

const branch = "br-frosty-haze-azsnybmr";
let client, open = false;
let phase = "preflight";
let activeTable;
try {
  const options = {};
  for (const arg of process.argv.slice(2)) {
    const match = /^--(baseline|final|baseline-sha256|final-sha256|target|mode|report|repair|expected-ledger-sha256|schema-evidence|policy)=(.+)$/.exec(arg);
    if (!match || Object.hasOwn(options, match[1])) throw new Error("INVALID_OR_DUPLICATE_ARGUMENT");
    options[match[1]] = match[2];
  }
  const mode = options.mode ?? "dry-run";
  const repair=options.repair==="pg-date-precision";
  const append = options.policy === "append-only-preserve-conflicts";
  if (options.policy && !append || append && repair) throw new Error("INVALID_RECONCILIATION_POLICY");
  if(options["schema-evidence"]&&options["schema-evidence"]!=="yes")throw new Error("INVALID_SCHEMA_EVIDENCE_OPTION");
  if(options.repair&&!repair)throw new Error("UNSUPPORTED_REPAIR_POLICY");
  if((repair||append)&&mode!=="dry-run"&&!/^[a-f0-9]{64}$/.test(options["expected-ledger-sha256"]??""))throw new Error("REVIEWED_LEDGER_HASH_REQUIRED");
  if(options.report && !isAbsolute(options.report))throw new Error("ABSOLUTE_REPORT_PATH_REQUIRED");
  const emit=async report=>{
    if(options.report)await writeFile(options.report,JSON.stringify(report,null,2),{mode:0o600,flag:"wx"});
    console.log(JSON.stringify(report));
  };
  if (options.target !== branch || !["dry-run", "rollback-probe", "apply-staging"].includes(mode)) throw new Error("EXPLICIT_STAGING_TARGET_AND_MODE_REQUIRED");
  if (![options["baseline-sha256"], options["final-sha256"]].every(v => /^[a-f0-9]{64}$/.test(v ?? ""))) throw new Error("EXPECTED_SNAPSHOT_HASHES_REQUIRED");
  dotenv.config({ path: ".migration.env", quiet: true });
  if (process.env.VERCEL_ENV === "production" || process.env.NEON_STAGING_BRANCH_ID !== branch) throw new Error("PRODUCTION_OR_UNVERIFIED_ENVIRONMENT_DENIED");
  if (mode === "apply-staging" && process.env.NEON_STAGING_DELTA_APPLY !== branch) throw new Error("STAGING_APPLY_NOT_ENABLED");
  const url = process.env.NEON_STAGING_DATABASE_URL;
  requireNeonMigrationStaging(url);
  const parsed = new URL(url);
  if (parsed.searchParams.has("host") || parsed.searchParams.has("hostaddr") || parsed.searchParams.has("options") || parsed.pathname !== "/neondb") throw new Error("CONNECTION_OVERRIDE_DENIED");
  const baseline = await readEncryptedSourceSnapshot(options.baseline);
  const final = await readEncryptedSourceSnapshot(options.final);
  if (summarizeSourceSnapshot(baseline).snapshotSha256 !== options["baseline-sha256"] ||
      summarizeSourceSnapshot(final).snapshotSha256 !== options["final-sha256"]) throw new Error("SNAPSHOT_INTEGRITY_MISMATCH");
  const sourcePlan = planSourceSnapshotDelta(baseline, final);
  if (!sourcePlan.readyForOperatorReview) throw new Error("SOURCE_PRIMARY_KEY_UNAVAILABLE");
  const tables = Object.keys(final.public).sort(), sourceKeys = sourceSnapshotPrimaryKeys(final);
  const sourceColumns = final.publicColumns.map(JSON.parse);
  const baselineColumns = baseline.publicColumns.map(JSON.parse);
  const columnSignature = items => JSON.stringify(items.map(c => [c.table_name,c.column_name,c.udt_schema,c.udt_name,c.is_nullable]).sort());
  if (columnSignature(baselineColumns) !== columnSignature(sourceColumns)) throw new Error("SOURCE_COLUMN_SCHEMA_CHANGED");
  parsed.searchParams.set("sslmode","verify-full");
  client = new pg.Client({ connectionString: parsed.href, connectionTimeoutMillis: 15000 });
  await client.connect();
  await client.query(mode === "dry-run" ? "BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY" : "BEGIN ISOLATION LEVEL SERIALIZABLE"); open = true;
  await client.query("SET LOCAL statement_timeout='60s'; SET LOCAL lock_timeout='5s'; SET LOCAL TIME ZONE 'UTC'");
  if (mode !== "dry-run") {
    // Block concurrent DML, including new inserts, before reading the candidate state.
    await client.query(`LOCK TABLE ${tables.map(t => `public.${q(t)}`).join(",")} IN SHARE ROW EXCLUSIVE MODE`);
  }
  phase = "target_plan";
  const columns = (await client.query(`SELECT table_name,column_name,udt_schema,udt_name,datetime_precision,is_generated,is_identity,column_default
    FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,ordinal_position`)).rows;
  const keys = (await client.query(`SELECT c.relname AS table_name,array_agg(a.attname::text ORDER BY k.ordinality) AS columns
    FROM pg_constraint p JOIN pg_class c ON c.oid=p.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    JOIN LATERAL unnest(p.conkey) WITH ORDINALITY k(attnum,ordinality) ON true
    JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum=k.attnum
    WHERE n.nspname='public' AND p.contype='p' GROUP BY c.relname`)).rows;
  const foreignKeys = (await client.query(`SELECT c.relname AS child,pc.relname AS parent,p.convalidated AS validated
    FROM pg_constraint p JOIN pg_class c ON c.oid=p.conrelid JOIN pg_class pc ON pc.oid=p.confrelid
    JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND p.contype='f'`)).rows;
  const unvalidatedConstraints=(await client.query(`SELECT c.relname AS table,p.conname AS name,p.contype AS type
    FROM pg_constraint p JOIN pg_class c ON c.oid=p.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND NOT p.convalidated ORDER BY c.relname,p.conname`)).rows;
  const plans = [], blockers = [], configs = new Map(),driftLedger=[],suspendedTriggers=[];
  const schemaBefore=repair||append?await schemaFingerprints(client):null;
  const readAllRows=async()=>{
    const rows=(await client.query(tables.map(table=>`SELECT '${table}'::text AS table_name,to_jsonb(t)::text AS row FROM public.${q(table)} t`).join(" UNION ALL "))).rows;
    const result=new Map(tables.map(t=>[t,[]]));for(const row of rows)result.get(row.table_name).push(row.row);return result;
  };
  let currentRows=await readAllRows();
  const readRows=async table=>currentRows.get(table);
  const repairTriggers=repair?(await client.query(`SELECT c.relname AS table_name,t.tgname AS name,t.tgenabled AS enabled,t.tgtype::int AS type,
    ARRAY(SELECT a.attname::text FROM pg_attribute a WHERE a.attrelid=t.tgrelid AND a.attnum=ANY(t.tgattr::smallint[]) ORDER BY a.attnum) AS update_columns,
    n.nspname AS function_schema,p.proname AS function_name,p.prosrc AS body,l.lanname AS language
    FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace cn ON cn.oid=c.relnamespace
    JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_namespace n ON n.oid=p.pronamespace
    JOIN pg_language l ON l.oid=p.prolang WHERE cn.nspname='public' AND NOT t.tgisinternal AND t.tgenabled<>'D' AND (t.tgtype & 16)<>0 ORDER BY c.relname,t.tgname`)).rows:[];
  const repairRules=repair?(await client.query("SELECT c.relname AS table_name,count(*)::int AS n FROM pg_rewrite r JOIN pg_class c ON c.oid=r.ev_class JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' GROUP BY c.relname")).rows:[];
  for (const table of tables) {
    const cols = sourceColumns.filter(c => c.table_name === table), names = cols.map(c => c.column_name);
    const targetCols = columns.filter(c => c.table_name === table), pk = sourceKeys.get(table);
    if (!names.length || JSON.stringify(keys.find(k => k.table_name === table)?.columns) !== JSON.stringify(pk) ||
        cols.some(c => !targetCols.some(t => t.column_name === c.column_name && t.udt_name === c.udt_name && t.udt_schema === c.udt_schema))) {
      blockers.push({ table, reason: "TARGET_SCHEMA_OR_PRIMARY_KEY_MISMATCH" }); continue;
    }
    const timestampColumns=cols.filter(c=>c.udt_schema==="pg_catalog"&&c.udt_name==="timestamptz").map(c=>c.column_name);
    const rows=await readRows(table);
    const plan = planTableDelta({ table, baseline: baseline.public[table], final: final.public[table], target: rows, keys: pk, columns: names,timestampColumns });
    const config={names,pk,timestampColumns,rows};
    if(repair) {
      if(plan.operations.length)blockers.push({table,reason:"SOURCE_DELTA_REQUIRES_SEPARATE_PLAN"});
      const precision=precisionRepairPlan({plan,baseline:baseline.public[table],source:final.public[table],target:rows,keys:pk,columns:cols});
      if(table==="profiles"&&precision.ledger.some(p=>auditedProfileCreationRepair(p,1))) {
        const provenance=await retainedConflictProvenance(client,[plan],currentRows,new Map([[table,config]]),[options["baseline-sha256"],options["final-sha256"]]);
        for(const entry of precision.ledger)if(auditedProfileCreationRepair(entry,provenance.find(p=>p.row===entry.row)?.approvedSnapshotAuditEvents??0)) {
          // Keep the exact row texts whose hashes were already verified by the primary-key classifier.
          const target=rows.find(raw=>rowHash(raw)===entry.beforeHash);
          const desired=final.public[table].find(raw=>rowHash(raw)===entry.sourceHash);
          if(!target||!desired)throw new Error("AUDITED_PROFILE_ROW_MISSING");
          precision.operations.push({kind:"timestamp-repair",row:entry.row,raw:desired,beforeRaw:target,columns:["created_at"]});
          entry.classification="PROVEN_CREATION_PRECISION_WITH_RETAINED_AUDIT_UPDATE";entry.repairFields=["created_at"];entry.retainedFields=["updated_at"];
        }
      }
      const triggers=repairTriggers.filter(t=>t.table_name===table);
      const assignedColumns=[...new Set(precision.operations.flatMap(o=>o.columns))];
      const unsafeTriggers=triggers.filter(t=>!isPureTimestampTrigger(t)&&!isUnchangedFieldGuard(t)&&!isColumnDisjointTrigger(t,assignedColumns));
      const rules=repairRules.find(r=>r.table_name===table)?.n??0;
      const unsupportedType=precision.operations.some(o=>o.columns.some(c=>!targetCols.some(t=>t.column_name===c&&t.udt_name==="timestamptz"&&t.datetime_precision===6)));
      if(unsafeTriggers.length||rules||unsupportedType) {
        for(const entry of precision.ledger.filter(e=>e.classification==="PROVEN_IMPORT_PRECISION_LOSS")) {
          entry.retainedReason=unsupportedType?"TARGET_TIMESTAMP_PRECISION_UNSUPPORTED":"UNREVIEWED_UPDATE_TRIGGER_OR_RULE";
          entry.blockingTriggers=unsafeTriggers.map(t=>t.name);
        }
        precision.operations=[];
      } else if(precision.operations.length) suspendedTriggers.push(...triggers.filter(isPureTimestampTrigger).map(t=>({...t,table})));
      driftLedger.push(...precision.ledger);
      plan.operations=precision.operations;
      config.expectedFingerprint=expectedRepairedTableFingerprint(rows,precision.operations,pk);
      config.beforeFingerprint=expectedRepairedTableFingerprint(rows,[],pk);
    }
    plans.push(plan); configs.set(table,config);
    if (plan.operations.length&&!repair) {
      const triggerRows = (await client.query(`SELECT tgtype::int AS type FROM pg_trigger WHERE tgrelid=$1::regclass AND NOT tgisinternal AND tgenabled<>'D'`, [`public.${q(table)}`])).rows;
      const triggers = append ? triggerRows.filter(appendTriggerUnsafe).length : triggerRows.length;
      const rules = (await client.query(`SELECT count(*)::int AS count FROM pg_rewrite WHERE ev_class=$1::regclass`, [`public.${q(table)}`])).rows[0].count;
      if (triggers || rules) blockers.push({ table, reason: "ENABLED_TRIGGER_OR_RULE_SIDE_EFFECT_REQUIRES_REVIEW" });
      // nextval is not rolled back; generated expressions/default functions may also have external effects.
      if (targetCols.some(c => append ? appendColumnUnsafe(c, names) : c.is_generated !== "NEVER" || c.is_identity === "YES" || (!names.includes(c.column_name) && c.column_default !== null))) {
        blockers.push({ table, reason: "GENERATED_IDENTITY_OR_TARGET_DEFAULT_REQUIRES_REVIEW" });
      }
      if (foreignKeys.some(fk => fk.child === table && !fk.validated)) blockers.push({ table, reason: "UNVALIDATED_FOREIGN_KEY" });
    }
  }
  const sequenceChecks = [];
  for (const column of columns.filter(c => tables.includes(c.table_name) && (c.is_identity === "YES" || /nextval\(/.test(c.column_default ?? "")))) {
    const sequence = (await client.query("SELECT pg_get_serial_sequence($1,$2) AS name", [`public.${q(column.table_name)}`, column.column_name])).rows[0].name;
    if (!sequence || !/^public\.[A-Za-z_][A-Za-z0-9_]*$/.test(sequence)) { blockers.push({ table: column.table_name, reason: "UNRESOLVED_SEQUENCE" }); continue; }
    const state = (await client.query(`SELECT last_value::text,is_called FROM ${sequence}`)).rows[0];
    const maximum = (await client.query(`SELECT max(${q(column.column_name)})::text AS value FROM public.${q(column.table_name)}`)).rows[0].value;
    const safe = maximum === null || BigInt(state.last_value) > BigInt(maximum) || (state.is_called && BigInt(state.last_value) === BigInt(maximum));
    sequenceChecks.push({ table: column.table_name, column: column.column_name, safe });
    if (!safe) blockers.push({ table: column.table_name, reason: "SEQUENCE_BEHIND_DATA" });
  }
  const conflicts = plans.reduce((n,p) => n + p.conflicts.length, 0);
  const operations = plans.reduce((n,p) => n + p.operations.length, 0);
  if (append) assertAppendOnly(plans);
  const ledgerHash=repair||append?evidenceHash({source:options["final-sha256"],baseline:options["baseline-sha256"],tables:[...configs].map(([table,c])=>({table,hash:repair?c.beforeFingerprint:evidenceHash(c.rows.slice().sort())})),plans:append?plans.map(opaqueDelta):undefined,driftLedger,schemaBefore}):null;
  if((repair||append)&&options["expected-ledger-sha256"]&&options["expected-ledger-sha256"]!==ledgerHash)throw new Error("STALE_REVIEWED_LEDGER");
  const before = { tables: plans.map(opaqueDelta), blockers, conflicts, operations, sequenceChecks,unvalidatedConstraints,
    ...(options["schema-evidence"]==="yes"?{sourceSchemaComparison:await sourceSchemaEvidence(client,final),conflictProvenance:await retainedConflictProvenance(client,plans,currentRows,configs,[options["baseline-sha256"],options["final-sha256"]])}:{}),
    ...(repair?{driftLedger,ledgerHash,schemaEvidence:schemaBefore,repairPolicy:"PG_DATE_PRECISION_ONLY",retained:driftLedger.filter(e=>e.retainedReason||e.classification==="RETAIN_UNRESOLVED"||e.retainedFields?.length).length}:{}),
    ...(append?{ledgerHash,policy:options.policy,retainedConflicts:conflicts}:{}),
    targetConstraintsAllValidated:unvalidatedConstraints.length===0,
    constraintParityVerified:false };
  if (blockers.length || (!repair&&!append&&conflicts) || mode === "dry-run") {
    await client.query("ROLLBACK"); open = false;
    await emit({ mode, result: blockers.length || (!repair&&!append&&conflicts) ? "BLOCKED" : "DRY_RUN_READY", before, persistedWrites: 0, productionWrites: 0 });
    if (blockers.length || (!repair&&!append&&conflicts)) process.exitCode = 2;
  } else {
    // Timestamp-only updates never change a key or relationship, so insertion dependency cycles do not apply.
    const ordered = repair?plans.filter(p=>p.operations.length).map(p=>p.table).sort():dependencyOrder(plans.filter(p => p.operations.length).map(p => p.table), foreignKeys);
    phase = "replay";
    for(const trigger of suspendedTriggers){activeTable=trigger.table;phase="suspend_timestamp_trigger";await client.query(`ALTER TABLE public.${q(trigger.table)} DISABLE TRIGGER ${q(trigger.name)}`);}
    for (const table of ordered) {
      activeTable=table;phase="replay";
      const config = configs.get(table);
      await replayTableDelta(client, plans.find(p => p.table === table), config.names, config.pk);
    }
    await client.query("SET CONSTRAINTS ALL IMMEDIATE");
    for(const trigger of suspendedTriggers)await client.query(`ALTER TABLE public.${q(trigger.table)} ENABLE ${trigger.enabled==="A"?"ALWAYS ":trigger.enabled==="R"?"REPLICA ":""}TRIGGER ${q(trigger.name)}`);
    phase = "post_apply_verification";
    currentRows=await readAllRows();
    const after = [];
    for (const previous of plans) {
      const config = configs.get(previous.table);
      const rows=await readRows(previous.table);
      const plan = planTableDelta({ table: previous.table, baseline: append?baseline.public[previous.table]:final.public[previous.table], final: final.public[previous.table], target: rows, keys: config.pk, columns: config.names,timestampColumns:config.timestampColumns });
      if (append) {
        assertExistingRowsUnchanged(config.rows, rows, config.pk);
        if (rows.length !== config.rows.length + previous.operations.length ||
          JSON.stringify(plan.conflicts) !== JSON.stringify(previous.conflicts)) throw new Error("APPEND_RETENTION_MISMATCH");
      }
      if(repair&&expectedRepairedTableFingerprint(rows,[],config.pk)!==config.expectedFingerprint)throw new Error("UNRELATED_FIELD_OR_ROW_CHANGED");
      if ((!repair&&(plan.operations.length || (!append&&plan.conflicts.length))) || plan.targetOnlyFingerprint !== previous.targetOnlyFingerprint || JSON.stringify(plan.targetOnly) !== JSON.stringify(previous.targetOnly)) throw new Error("POST_APPLY_FINGERPRINT_OR_FIXTURE_MISMATCH");
      after.push(opaqueDelta(plan));
    }
    const schemaAfter=repair||append?await schemaFingerprints(client):null;
    if((repair||append)&&compareRecoveryEvidence(schemaBefore,schemaAfter).length)throw new Error("REPAIR_SCHEMA_OR_SEQUENCE_STATE_CHANGED");
    // Sequence increments cannot be undone with ROLLBACK. This tool never invokes nextval or setval.
    // Explicit numeric IDs must already fit the target's configured next-value range.
    for(const item of sequenceChecks) {
      const name=(await client.query("SELECT pg_get_serial_sequence($1,$2) AS name",[`public.${q(item.table)}`,item.column])).rows[0].name;
      const state=(await client.query(`SELECT last_value::text,is_called FROM ${name}`)).rows[0];
      const maximum=(await client.query(`SELECT max(${q(item.column)})::text AS value FROM public.${q(item.table)}`)).rows[0].value;
      if(maximum!==null && (BigInt(state.last_value)<BigInt(maximum)||(!state.is_called&&BigInt(state.last_value)===BigInt(maximum))))throw new Error("POST_APPLY_SEQUENCE_BEHIND_DATA");
    }
    phase = mode === "apply-staging" ? "commit" : "rollback";
    await client.query(mode === "apply-staging" ? "COMMIT" : "ROLLBACK"); open = false;
    phase = "report";
    await emit({ mode, result: "PASS", before, after,...(repair||append?{schemaAfter,remainingConflicts:after.reduce((n,p)=>n+p.conflicts.length,0)}:{}), persistedWrites: mode === "apply-staging" ? operations : 0, productionWrites: 0 });
  }
} catch (error) {
  console.error(JSON.stringify({ result: "FAIL", phase,table:activeTable,sqlState:/^[A-Z0-9]{5}$/.test(error?.code??"")?error.code:null,
    constraint:/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(error?.constraint??"")?error.constraint:null,
    code: /^[A-Z_]+$/.test(error?.message ?? "") ? error.message : "STAGING_RECONCILIATION_FAILED", persistedWrites: ["commit","report"].includes(phase) ? "CHECK_TARGET_BEFORE_RETRY" : 0 }));
  process.exitCode = 1;
} finally {
  if (open) await client?.query("ROLLBACK").catch(() => undefined);
  await client?.end().catch(() => undefined);
}
