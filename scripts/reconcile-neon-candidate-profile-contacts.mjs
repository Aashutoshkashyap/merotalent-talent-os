/** Replay only canonical source-newer contact fields; never roles, identity or unrelated data. */
import dotenv from "dotenv";
import pg from "pg";
import { readFile, lstat, writeFile } from "node:fs/promises";
import { readEncryptedSourceSnapshot } from "./source-snapshot-artifact.mjs";
import { summarizeSourceSnapshot } from "./source-auth-snapshot.mjs";
import { productionCandidateUrl } from "./production-candidate-boundary.mjs";
import { sourceNewerProfileContactDelta, canonicalSnapshotValue } from "./source-snapshot-reconciliation.mjs";
import { parseLosslessSnapshotRow } from "./lossless-snapshot-json.mjs";
import { classifyTimestampDrift, isPureTimestampTrigger, evidenceHash } from "./staging-timestamp-drift.mjs";
import { tableFingerprintsBatched, assertFingerprints, schemaFingerprints, compareRecoveryEvidence, quoteIdentifier as q } from "./recovery-integrity.mjs";
let client,open=false;
try {
  const args=Object.fromEntries(process.argv.slice(2).map(v=>{const m=/^--(snapshot|snapshot-sha256|baseline|backup-report|mode|expected-ledger-sha256|report)=(.+)$/.exec(v);if(!m)throw new Error("INVALID_ARGUMENT");return[m[1],m[2]];}));
  const mode=args.mode??'dry-run';if(!['dry-run','rollback-probe','apply-candidate'].includes(mode))throw new Error("INVALID_MODE");
  if(!args.report?.startsWith('/'))throw new Error("PRIVATE_REPORT_REQUIRED");
  const stat=await lstat(args['backup-report']);if(!stat.isFile()||stat.isSymbolicLink()||stat.uid!==process.getuid()||stat.mode&0o077)throw new Error("PRIVATE_BACKUP_REPORT_REQUIRED");
  const backup=JSON.parse(await readFile(args['backup-report'],'utf8'));
  if(backup.result!=='PASS'||backup.target!=='existing-production-candidate'||!backup.applicationRowAndSchemaFingerprintsVerified||!backup.restoredFromEncryptedArchive)throw new Error("VERIFIED_RESTORE_REQUIRED");
  const source=await readEncryptedSourceSnapshot(args.snapshot),baseline=await readEncryptedSourceSnapshot(args.baseline);
  if(summarizeSourceSnapshot(source).snapshotSha256!==args['snapshot-sha256'])throw new Error("SOURCE_HASH_MISMATCH");
  dotenv.config({path:'.migration.env',quiet:true});
  client=new pg.Client({connectionString:productionCandidateUrl(process.env.NEON_PRODUCTION_DATABASE_URL).href,connectionTimeoutMillis:15000,query_timeout:30000});client.on('error',()=>{});await client.connect();
  await client.query(mode==='dry-run'?'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY':'BEGIN ISOLATION LEVEL SERIALIZABLE');open=true;
  await client.query("SET LOCAL statement_timeout='30s';SET LOCAL lock_timeout='5s';SET LOCAL TIME ZONE 'UTC'");
  if((await client.query('SELECT count(*)::int AS n FROM neon_auth."user"')).rows[0].n!==0)throw new Error("OFFLINE_CANDIDATE_REQUIRED");
  if(mode!=='dry-run')await client.query('LOCK TABLE public.profiles IN SHARE ROW EXCLUSIVE MODE');
  const before=(await client.query('SELECT to_jsonb(p)::text AS raw FROM public.profiles p')).rows.map(r=>r.raw);
  const fingerprints=await tableFingerprintsBatched(client),schema=await schemaFingerprints(client);
  const triggers=(await client.query(`SELECT t.tgname AS name,t.tgenabled AS enabled,t.tgtype::int AS type,
    n.nspname AS function_schema,p.proname AS function_name,p.prosrc AS body,l.lanname AS language
    FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang
    WHERE t.tgrelid='public.profiles'::regclass AND NOT t.tgisinternal AND t.tgenabled<>'D' AND (t.tgtype&16)<>0`)).rows;
  if(triggers.some(t=>!isPureTimestampTrigger(t))||(await client.query("SELECT 1 FROM pg_rewrite WHERE ev_class='public.profiles'::regclass")).rowCount)throw new Error("UNREVIEWED_PROFILE_UPDATE_SIDE_EFFECT");
  const plans=[],target=new Map(before.map(raw=>[parseLosslessSnapshotRow(raw).id,raw]));
  for(const raw of source.public.profiles){const s=parseLosslessSnapshotRow(raw),old=target.get(s.id);if(!old)throw new Error("SOURCE_PROFILE_MISSING");
    const t=parseLosslessSnapshotRow(old),decision=sourceNewerProfileContactDelta(s,t);
    if(decision.decision!=='REPLAY_SOURCE_NEWER_CONTACT_FIELDS')continue;
    const b=baseline.public.profiles.find(row=>parseLosslessSnapshotRow(row).id===s.id);if(!b)throw new Error("CONTACT_BASELINE_REQUIRED");
    const proof=classifyTimestampDrift({baseline:b,source:raw,target:old,keys:['id'],columns:source.publicColumns.map(JSON.parse).filter(c=>c.table_name==='profiles')});
    const fields=[...decision.fields,'updated_at'];
    if(proof.fields.some(f=>f.field==='created_at'&&f.reason==='PG_DATE_MICROSECOND_TRUNCATION'))fields.push('created_at');
    const expected={...t};for(const f of fields)expected[f]=s[f];
    plans.push({raw,before:old,id:s.id,fields,expected});
  }
  const ledger=evidenceHash({source:args['snapshot-sha256'],before:before.toSorted(),schema,plans});
  if(mode!=='dry-run'&&args['expected-ledger-sha256']!==ledger)throw new Error("STALE_OR_UNREVIEWED_LEDGER");
  if(mode!=='dry-run'){
    for(const t of triggers)await client.query(`ALTER TABLE public.profiles DISABLE TRIGGER ${q(t.name)}`);
    for(const plan of plans){const r=await client.query(`UPDATE public.profiles t SET ${plan.fields.map(f=>`${q(f)}=s.${q(f)}`).join(',')}
      FROM jsonb_populate_record(NULL::public.profiles,$1::jsonb) s WHERE t.id=s.id AND t.user_id=s.user_id AND to_jsonb(t)=$2::jsonb
      RETURNING to_jsonb(t)::text AS raw`,[plan.raw,plan.before]);
      if(r.rowCount!==1||canonicalSnapshotValue(parseLosslessSnapshotRow(r.rows[0].raw))!==canonicalSnapshotValue(plan.expected))throw new Error("CONTACT_READBACK_MISMATCH");}
    for(const t of triggers)await client.query(`ALTER TABLE public.profiles ENABLE ${t.enabled==='A'?'ALWAYS ':t.enabled==='R'?'REPLICA ':''}TRIGGER ${q(t.name)}`);
    const after=(await client.query('SELECT to_jsonb(p)::text AS raw FROM public.profiles p')).rows.map(r=>r.raw);
    const expected=before.map(raw=>plans.find(p=>p.id===parseLosslessSnapshotRow(raw).id)?.expected??parseLosslessSnapshotRow(raw)).map(canonicalSnapshotValue).sort();
    if(JSON.stringify(after.map(raw=>canonicalSnapshotValue(parseLosslessSnapshotRow(raw))).sort())!==JSON.stringify(expected))throw new Error("UNRELATED_PROFILE_CHANGED");
    const unchanged=rows=>rows.filter(r=>!(r.schema==='public'&&r.name==='profiles'));
    assertFingerprints(unchanged(fingerprints),unchanged(await tableFingerprintsBatched(client)));
    if(compareRecoveryEvidence(schema,await schemaFingerprints(client)).length)throw new Error("SCHEMA_TRIGGER_OR_SEQUENCE_CHANGED");
  }
  await client.query(mode==='apply-candidate'?'COMMIT':'ROLLBACK');open=false;
  const report={result:'PASS',mode,ledgerSha256:ledger,profiles:plans.length,fields:[...new Set(plans.flatMap(p=>p.fields))],
    persistedProfiles:mode==='apply-candidate'?plans.length:0,unrelatedValuesPreserved:true,sourceWrites:0,productionTrafficSwitched:false};
  await writeFile(args.report,JSON.stringify(report,null,2),{mode:0o600,flag:'wx'});console.log(JSON.stringify(report));
}catch(error){console.error(JSON.stringify({result:'FAIL',code:/^[A-Z_]+$/.test(error?.message??'')?error.message:error.code??'CANDIDATE_CONTACT_FAILED'}));process.exitCode=1;}
finally{if(open)await client?.query('ROLLBACK').catch(()=>{});await client?.end().catch(()=>{});}
