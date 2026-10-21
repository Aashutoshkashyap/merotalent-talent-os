/** Existing two-day reservation retention only; never deletes an object or a source row. */
import dotenv from "dotenv";
import pg from "pg";
import { lstat,readFile,writeFile } from "node:fs/promises";
import { readEncryptedSourceSnapshot } from "./source-snapshot-artifact.mjs";
import { summarizeSourceSnapshot } from "./source-auth-snapshot.mjs";
import { productionCandidateUrl } from "./production-candidate-boundary.mjs";
import { tableFingerprintsBatched,assertFingerprints,sha256 } from "./recovery-integrity.mjs";
const apply=process.argv.includes('--apply-expired-metadata');
const args=Object.fromEntries(process.argv.slice(2).filter(v=>v!=='--apply-expired-metadata').map(v=>{
  const m=/^--(snapshot|snapshot-sha256|backup-report|report)=(.+)$/.exec(v);if(!m)throw new Error('INVALID_ARGUMENT');return[m[1],m[2]];
}));
let client,open=false;
try{
  if(!args.report?.startsWith('/'))throw new Error('PRIVATE_REPORT_REQUIRED');
  const source=await readEncryptedSourceSnapshot(args.snapshot);
  if(summarizeSourceSnapshot(source).snapshotSha256!==args['snapshot-sha256']||source.public.media_upload_intents.length!==0)throw new Error('EMPTY_VERIFIED_SOURCE_RESERVATIONS_REQUIRED');
  const stat=await lstat(args['backup-report']);if(!stat.isFile()||stat.isSymbolicLink()||stat.mode&0o077||stat.uid!==process.getuid())throw new Error('PRIVATE_BACKUP_REPORT_REQUIRED');
  const backup=JSON.parse(await readFile(args['backup-report'],'utf8'));
  if(backup.result!=='PASS'||backup.target!=='existing-production-candidate'||!backup.restoredFromEncryptedArchive||!backup.applicationRowAndSchemaFingerprintsVerified)throw new Error('VERIFIED_RESTORE_REQUIRED');
  dotenv.config({path:'.migration.env',quiet:true});client=new pg.Client({connectionString:productionCandidateUrl(process.env.NEON_PRODUCTION_DATABASE_URL).href,connectionTimeoutMillis:15000,query_timeout:30000});client.on('error',()=>{});await client.connect();
  await client.query(apply?'BEGIN ISOLATION LEVEL SERIALIZABLE':'BEGIN READ ONLY');open=true;
  await client.query("SET LOCAL statement_timeout='30s';SET LOCAL lock_timeout='5s'");
  if(apply)await client.query('LOCK TABLE public.media_upload_intents IN SHARE ROW EXCLUSIVE MODE');
  if((await client.query('SELECT count(*)::int AS n FROM neon_auth."user"')).rows[0].n!==0)throw new Error('OFFLINE_CANDIDATE_REQUIRED');
  const rows=(await client.query("SELECT to_jsonb(t)::text AS raw,created_at<now()-interval '2 days' AS expired FROM public.media_upload_intents t ORDER BY id")).rows;
  if(rows.length>7||rows.some(r=>!r.expired))throw new Error('UNREVIEWED_RESERVATION_RECORDS');
  if((await client.query("SELECT 1 FROM pg_trigger WHERE tgrelid='public.media_upload_intents'::regclass AND NOT tgisinternal AND tgenabled<>'D' AND (tgtype&8)<>0")).rowCount)throw new Error('DELETE_TRIGGER_REQUIRES_REVIEW');
  const before=await tableFingerprintsBatched(client);
  let removed=0;
  if(apply){removed=(await client.query("DELETE FROM public.media_upload_intents WHERE created_at<now()-interval '2 days'")).rowCount;
    if(removed!==rows.length)throw new Error('RESERVATION_DELETE_COUNT_MISMATCH');
    const keep=values=>values.filter(r=>!(r.schema==='public'&&r.name==='media_upload_intents'));
    assertFingerprints(keep(before),keep(await tableFingerprintsBatched(client)));}
  await client.query(apply?'COMMIT':'ROLLBACK');open=false;
  const report={result:'PASS',mode:apply?'APPLY_OFFLINE_CANDIDATE':'DRY_RUN',expiredReservations:rows.length,removed,
    reservationRowsSha256:sha256(rows.map(r=>r.raw).join('\n')),backupArchiveSha256:backup.archiveSha256,
    recoverableFromEncryptedBackup:true,retentionRule:'existing media_upload_intents created_at older than two days',
    fileObjectsDeleted:0,otherRowsUnchanged:true,sourceWrites:0,productionTrafficSwitched:false};
  await writeFile(args.report,JSON.stringify(report,null,2),{mode:0o600,flag:'wx'});console.log(JSON.stringify(report));
}catch(error){console.error(JSON.stringify({result:'FAIL',code:/^[A-Z_]+$/.test(error?.message??'')?error.message:error.code??'RESERVATION_EXPIRY_FAILED'}));process.exitCode=1;}
finally{if(open)await client?.query('ROLLBACK').catch(()=>{});await client?.end().catch(()=>{});}
