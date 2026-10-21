/** Proven timestamp precision only; no key, contact, entitlement or relationship changes. */
import { sourceSnapshotPrimaryKeys } from "./plan-source-snapshot-delta.mjs";
import { planTableDelta, replayTableDelta } from "./staging-snapshot-delta.mjs";
import { precisionRepairPlan, isPureTimestampTrigger, isUnchangedFieldGuard, isColumnDisjointTrigger,
  expectedRepairedTableFingerprint, evidenceHash } from "./staging-timestamp-drift.mjs";
import { quoteIdentifier as q, schemaFingerprints, compareRecoveryEvidence } from "./recovery-integrity.mjs";
import { productionCandidateUrl } from "./production-candidate-boundary.mjs";

export async function rehearseCandidatePrecision(client, baseline, source) {
  if (!/^\/private\/tmp\/mt-restore-[a-zA-Z0-9]+$/.test(client.connectionParameters.host) || client.connectionParameters.database!=="postgres") throw new Error("PRIVATE_LOCAL_RESTORE_REQUIRED");
  return execute(client,baseline,source,{mode:"local-rehearsal"});
}
export async function runCandidatePrecision(client, baseline, source, options) {
  const url=productionCandidateUrl(options.targetUrl);
  if(client.connectionParameters.host!==url.hostname||client.connectionParameters.database!=="neondb"||
    !["dry-run","rollback-probe","apply-candidate"].includes(options.mode))throw new Error("VERIFIED_CANDIDATE_REQUIRED");
  if(options.mode!=="dry-run"&&(!options.backup?.candidatePrecisionRehearsal?.originalUnrelatedValuesPreserved ||
    options.backup.candidatePrecisionRehearsal.operations<1))throw new Error("PRECISION_RESTORE_REHEARSAL_REQUIRED");
  return execute(client,baseline,source,options);
}

async function execute(client,baseline,source,options) {
  const mutate=options.mode!=="dry-run", tables=source.publicTableNames,keys=sourceSnapshotPrimaryKeys(source);
  const sourceColumns=source.publicColumns.map(JSON.parse);
  await client.query(mutate?'BEGIN ISOLATION LEVEL SERIALIZABLE':'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  try {
    await client.query("SET LOCAL statement_timeout='60s';SET LOCAL lock_timeout='5s';SET LOCAL TIME ZONE 'UTC'");
    if(options.mode!=="local-rehearsal"&&(await client.query('SELECT count(*)::int AS n FROM neon_auth."user"')).rows[0].n!==0)throw new Error("OFFLINE_CANDIDATE_WITHOUT_LIVE_IDENTITIES_REQUIRED");
    if(mutate)await client.query(`LOCK TABLE ${tables.map(t=>`public.${q(t)}`).join(',')} IN SHARE ROW EXCLUSIVE MODE`);
    const read=async()=>{const rows=(await client.query(tables.map(t=>`SELECT '${t}'::text AS table_name,to_jsonb(t)::text AS raw FROM public.${q(t)} t`).join(' UNION ALL '))).rows;return new Map(tables.map(t=>[t,rows.filter(r=>r.table_name===t).map(r=>r.raw)]));};
    const before=await read(),schemaBefore=await schemaFingerprints(client);
    const cols=(await client.query("SELECT table_name,column_name,udt_name,datetime_precision FROM information_schema.columns WHERE table_schema='public'")).rows;
    const triggers=(await client.query(`SELECT c.relname AS table_name,t.tgname AS name,t.tgenabled AS enabled,t.tgtype::int AS type,
      ARRAY(SELECT a.attname::text FROM pg_attribute a WHERE a.attrelid=t.tgrelid AND a.attnum=ANY(t.tgattr::smallint[]) ORDER BY a.attnum) AS update_columns,
      n.nspname AS function_schema,p.proname AS function_name,p.prosrc AS body,l.lanname AS language
      FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace cn ON cn.oid=c.relnamespace
      JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang
      WHERE cn.nspname='public' AND NOT t.tgisinternal AND t.tgenabled<>'D' AND (t.tgtype&16)<>0 ORDER BY c.relname,t.tgname`)).rows;
    const rules=(await client.query("SELECT c.relname AS table_name FROM pg_rewrite r JOIN pg_class c ON c.oid=r.ev_class JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'")).rows;
    const plans=[],suspended=[],blocked=[];let retained=0;
    for(const table of tables){const meta=sourceColumns.filter(c=>c.table_name===table),names=meta.map(c=>c.column_name);
      const plan=planTableDelta({table,baseline:baseline.public[table],final:source.public[table],target:before.get(table),keys:keys.get(table),columns:names,timestampColumns:meta.filter(c=>c.udt_name==='timestamptz'&&c.udt_schema==='pg_catalog').map(c=>c.column_name)});
      if(plan.operations.length)throw new Error("SOURCE_INSERT_OR_UPDATE_REQUIRES_SEPARATE_POLICY");
      const precision=precisionRepairPlan({plan,baseline:baseline.public[table],source:source.public[table],target:before.get(table),keys:keys.get(table),columns:meta});
      retained+=precision.ledger.filter(r=>r.classification==='RETAIN_UNRESOLVED').length;
      const fields=[...new Set(precision.operations.flatMap(o=>o.columns))], active=triggers.filter(t=>t.table_name===table);
      if(precision.operations.length){
        if(rules.some(r=>r.table_name===table)||active.some(t=>!isPureTimestampTrigger(t)&&!isUnchangedFieldGuard(t)&&!isColumnDisjointTrigger(t,fields))||
          fields.some(f=>!cols.some(c=>c.table_name===table&&c.column_name===f&&c.udt_name==='timestamptz'&&c.datetime_precision===6)))blocked.push(table);
        suspended.push(...active.filter(isPureTimestampTrigger).map(t=>({...t,table})));
      }
      plans.push({table,operations:precision.operations,expected:expectedRepairedTableFingerprint(before.get(table),precision.operations,keys.get(table))});
    }
    if(blocked.length)throw new Error("UNREVIEWED_TIMESTAMP_SIDE_EFFECT");
    const ledger=evidenceHash({source,baseline,rows:[...before].map(([t,r])=>[t,r.toSorted()]),schemaBefore,plans});
    const count=plans.reduce((n,p)=>n+p.operations.length,0);
    if(mutate&&options.mode!=='local-rehearsal'&&options.expectedLedger!==ledger)throw new Error("STALE_OR_UNREVIEWED_LEDGER");
    if(mutate){
      // No authorization/audit trigger is disabled. Exact reviewed timestamp-only
      // bodies alone are suspended and restored atomically with the repair.
      for(const t of suspended)await client.query(`ALTER TABLE public.${q(t.table)} DISABLE TRIGGER ${q(t.name)}`);
      for(const plan of plans)if(plan.operations.length)await replayTableDelta(client,plan,sourceColumns.filter(c=>c.table_name===plan.table).map(c=>c.column_name),keys.get(plan.table));
      await client.query('SET CONSTRAINTS ALL IMMEDIATE');
      for(const t of suspended)await client.query(`ALTER TABLE public.${q(t.table)} ENABLE ${t.enabled==='A'?'ALWAYS ':t.enabled==='R'?'REPLICA ':''}TRIGGER ${q(t.name)}`);
      const after=await read();
      for(const plan of plans)if(expectedRepairedTableFingerprint(after.get(plan.table),[],keys.get(plan.table))!==plan.expected)throw new Error("UNRELATED_FIELD_OR_ROW_CHANGED");
      if(compareRecoveryEvidence(schemaBefore,await schemaFingerprints(client)).length)throw new Error("SCHEMA_TRIGGER_OR_SEQUENCE_CHANGED");
    }
    await client.query(['local-rehearsal','apply-candidate'].includes(options.mode)?'COMMIT':'ROLLBACK');
    return {result:'PASS',mode:options.mode,operations:count,ledgerSha256:ledger,retainedUnresolved:retained,
      pureTimestampTriggersRestored:suspended.length,originalUnrelatedValuesPreserved:true,
      persistedRows:options.mode==='apply-candidate'?count:0,sourceWrites:0,productionTrafficSwitched:false};
  }catch(error){await client.query('ROLLBACK');throw error;}
}
