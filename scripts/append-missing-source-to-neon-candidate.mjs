/** Source-authoritative missing rows only; existing candidate rows are immutable. */
import dotenv from "dotenv";
import pg from "pg";
import { readFile, writeFile, lstat } from "node:fs/promises";
import { readEncryptedSourceSnapshot } from "./source-snapshot-artifact.mjs";
import { summarizeSourceSnapshot } from "./source-auth-snapshot.mjs";
import { productionCandidateUrl } from "./production-candidate-boundary.mjs";
import { sourceSnapshotPrimaryKeys } from "./plan-source-snapshot-delta.mjs";
import { planTableDelta, replayTableDelta, dependencyOrder } from "./staging-snapshot-delta.mjs";
import { appendTriggerUnsafe, appendColumnUnsafe, assertExistingRowsUnchanged } from "./staging-append-policy.mjs";
import { evidenceHash } from "./staging-timestamp-drift.mjs";
import { quoteIdentifier as q, schemaFingerprints, compareRecoveryEvidence } from "./recovery-integrity.mjs";
import {verifiedCandidateOwnerLedger,preserveApprovedOwnerRole} from './candidate-owner-exceptions.mjs';

let client, open=false, phase="preflight";
try {
  const args=Object.fromEntries(process.argv.slice(2).map(v=>{
    const m=/^--(snapshot|snapshot-sha256|backup-report|report|mode|expected-ledger-sha256|preserve-verified-owner|expected-identity-ledger-sha256)=(.+)$/.exec(v);if(!m)throw new Error("INVALID_ARGUMENT");return[m[1],m[2]];
  }));
  const mode=args.mode??'dry-run';if(!['dry-run','rollback-probe','apply-candidate'].includes(mode))throw new Error("INVALID_MODE");
  if(!args.report?.startsWith('/')||!args['backup-report']?.startsWith('/'))throw new Error("PRIVATE_REPORT_REQUIRED");
  const stat=await lstat(args['backup-report']);if(!stat.isFile()||stat.isSymbolicLink()||stat.mode&0o077||stat.uid!==process.getuid())throw new Error("PRIVATE_BACKUP_REPORT_REQUIRED");
  const backup=JSON.parse(await readFile(args['backup-report'],'utf8'));
  if(backup.result!=='PASS'||backup.target!=='existing-production-candidate'||!backup.restoredFromEncryptedArchive||!backup.applicationRowAndSchemaFingerprintsVerified)throw new Error("VERIFIED_RESTORE_REQUIRED");
  const source=await readEncryptedSourceSnapshot(args.snapshot);
  if(summarizeSourceSnapshot(source).snapshotSha256!==args['snapshot-sha256'])throw new Error("SOURCE_HASH_MISMATCH");
  dotenv.config({path:'.migration.env',quiet:true});
  client=new pg.Client({connectionString:productionCandidateUrl(process.env.NEON_PRODUCTION_DATABASE_URL).href,connectionTimeoutMillis:15000,query_timeout:30000});client.on('error',()=>{});
  await client.connect();await client.query(mode==='dry-run'?'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY':'BEGIN ISOLATION LEVEL SERIALIZABLE');open=true;
  await client.query("SET LOCAL statement_timeout='30s';SET LOCAL lock_timeout='5s';SET LOCAL TIME ZONE 'UTC'");
  let identityLedger=null;
  if((await client.query('SELECT count(*)::int AS n FROM neon_auth."user"')).rows[0].n!==0){
    if(args['preserve-verified-owner']!=='approved-owner-20261020')throw new Error("OFFLINE_CANDIDATE_WITHOUT_LIVE_IDENTITIES_REQUIRED");
    identityLedger=await verifiedCandidateOwnerLedger(client,source);
    if(mode!=='dry-run'&&args['expected-identity-ledger-sha256']!==identityLedger.hash)throw new Error('STALE_OR_UNREVIEWED_IDENTITY_LEDGER');
  }
  const tables=source.publicTableNames, keys=sourceSnapshotPrimaryKeys(source), columns=source.publicColumns.map(JSON.parse);
  if(mode!=='dry-run')await client.query(`LOCK TABLE ${tables.map(t=>`public.${q(t)}`).join(',')} IN SHARE ROW EXCLUSIVE MODE`);
  const readRows=async()=>{const all=(await client.query(tables.map(t=>`SELECT '${t}'::text AS table_name,to_jsonb(t)::text AS raw FROM public.${q(t)} t`).join(' UNION ALL '))).rows;return new Map(tables.map(t=>[t,all.filter(r=>r.table_name===t).map(r=>r.raw)]));};
  phase='plan';const rows=await readRows(),schemaBefore=await schemaFingerprints(client),plans=[],blockers=[];
  const targetCols=(await client.query("SELECT table_name,column_name,udt_schema,udt_name,is_generated,is_identity,column_default FROM information_schema.columns WHERE table_schema='public'")).rows;
  const triggers=(await client.query("SELECT c.relname AS table_name,t.tgtype::int AS type FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal AND t.tgenabled<>'D'")).rows;
  const fks=(await client.query("SELECT c.relname AS child,p.relname AS parent FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_class p ON p.oid=k.confrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND k.contype='f'")).rows;
  let approvedOwnerRoleExceptions=0;
  const desiredRows=new Map();
  for(const table of tables){const meta=columns.filter(c=>c.table_name===table),names=meta.map(c=>c.column_name);
    const adjusted=identityLedger?preserveApprovedOwnerRole({table,sourceRows:source.public[table],targetRows:rows.get(table),ownerId:identityLedger.ownerId}):{rows:source.public[table],approvedExceptions:0};
    desiredRows.set(table,adjusted.rows);approvedOwnerRoleExceptions+=adjusted.approvedExceptions;
    const plan=planTableDelta({table,baseline:[],final:adjusted.rows,target:rows.get(table),keys:keys.get(table),columns:names,timestampColumns:meta.filter(c=>c.udt_name==='timestamptz'&&c.udt_schema==='pg_catalog').map(c=>c.column_name)});
    if(plan.operations.some(o=>o.kind!=='insert'))throw new Error("INSERT_ONLY_POLICY_REQUIRED");
    if(plan.conflicts.length)throw new Error('UNREVIEWED_SOURCE_TARGET_CONFLICT');
    if(plan.operations.length&&(triggers.some(t=>t.table_name===table&&appendTriggerUnsafe(t))||targetCols.filter(c=>c.table_name===table).some(c=>appendColumnUnsafe(c,names))))blockers.push(table);
    plans.push(plan);
  }
  const ledger=evidenceHash({source:args['snapshot-sha256'],identityLedger:identityLedger?.hash??null,rows:[...rows].map(([t,r])=>[t,r.toSorted()]),schemaBefore,operations:plans.map(p=>({table:p.table,rows:p.operations.map(o=>o.row)}))});
  const summary={sourceSnapshotSha256:args['snapshot-sha256'],ledgerSha256:ledger,identityLedgerSha256:identityLedger?.hash??null,approvedOwnerRoleExceptions,targetOnlyRowsRetained:plans.reduce((n,p)=>n+p.targetOnly.length,0),insertions:plans.reduce((n,p)=>n+p.operations.length,0),byTable:plans.filter(p=>p.operations.length).map(p=>({table:p.table,insertions:p.operations.length})),blockers,policy:'SOURCE_AUTHORITATIVE_MISSING_ONLY_PRESERVE_ALL_EXISTING',sourceWrites:0,productionTrafficSwitched:false};
  if(blockers.length)throw new Error("INSERT_TRIGGER_OR_DEFAULT_REQUIRES_REVIEW");
  if(mode==='dry-run'){await client.query('ROLLBACK');open=false;const report={result:'DRY_RUN_READY',...summary,persistedRows:0};await writeFile(args.report,JSON.stringify(report,null,2),{mode:0o600,flag:'wx'});console.log(JSON.stringify(report));}
  else{
    if(args['expected-ledger-sha256']!==ledger)throw new Error("STALE_OR_UNREVIEWED_LEDGER");
    phase='insert';for(const table of dependencyOrder(plans.filter(p=>p.operations.length).map(p=>p.table),fks))await replayTableDelta(client,plans.find(p=>p.table===table),columns.filter(c=>c.table_name===table).map(c=>c.column_name),keys.get(table));
    await client.query('SET CONSTRAINTS ALL IMMEDIATE');
    const after=await readRows();
    for(const plan of plans){
      assertExistingRowsUnchanged(rows.get(plan.table),after.get(plan.table),keys.get(plan.table));
      if(after.get(plan.table).length!==rows.get(plan.table).length+plan.operations.length)throw new Error("INSERT_COUNT_MISMATCH");
      const meta=columns.filter(c=>c.table_name===plan.table);
      const verified=planTableDelta({table:plan.table,baseline:[],final:desiredRows.get(plan.table),target:after.get(plan.table),keys:keys.get(plan.table),columns:meta.map(c=>c.column_name),timestampColumns:meta.filter(c=>c.udt_name==='timestamptz'&&c.udt_schema==='pg_catalog').map(c=>c.column_name)});
      if(plan.operations.some(o=>!verified.matched.includes(o.row)))throw new Error("INSERTED_SOURCE_ROW_MISMATCH");
    }
    // RESTART is transactional, unlike setval; a probe cannot consume or rewind IDs.
    const sequenceAdvances=[];
    for(const table of ['audit_logs','guest_college_verification_sends']){
      const seq=(await client.query("SELECT pg_get_serial_sequence($1,'id') AS name",[`public.${q(table)}`])).rows[0].name;
      if(!/^public\.[a-z_]+$/.test(seq??''))throw new Error("APPROVED_SEQUENCE_REQUIRED");
      const state=(await client.query(`SELECT last_value::text,is_called FROM ${seq}`)).rows[0];
      const max=(await client.query(`SELECT COALESCE(max(id),0)::text AS n FROM public.${q(table)}`)).rows[0].n;
      if(BigInt(max)>=BigInt(state.last_value)+(state.is_called?1n:0n)){await client.query(`ALTER SEQUENCE ${seq} RESTART WITH ${BigInt(max)+1n}`);sequenceAdvances.push(table);}
    }
    const changed=compareRecoveryEvidence(schemaBefore,await schemaFingerprints(client));
    if(changed.some(c=>c.category!=='sequences'))throw new Error("UNEXPECTED_SCHEMA_CHANGE");
    if(identityLedger&&(await verifiedCandidateOwnerLedger(client,source)).hash!==identityLedger.hash)throw new Error('CANDIDATE_IDENTITY_LEDGER_CHANGED');
    phase='commit';await client.query(mode==='apply-candidate'?'COMMIT':'ROLLBACK');open=false;
    const report={result:'PASS',mode,...summary,persistedRows:mode==='apply-candidate'?summary.insertions:0,existingRowsUnchanged:true,sequenceAdvances};
    await writeFile(args.report,JSON.stringify(report,null,2),{mode:0o600,flag:'wx'});console.log(JSON.stringify(report));
  }
}catch(error){console.error(JSON.stringify({result:'FAIL',phase,code:/^[A-Z_]+$/.test(error?.message??'')?error.message:error.code??'CANDIDATE_INSERT_FAILED'}));process.exitCode=1;}
finally{if(open)await client?.query('ROLLBACK').catch(()=>{});await client?.end().catch(()=>{});}
