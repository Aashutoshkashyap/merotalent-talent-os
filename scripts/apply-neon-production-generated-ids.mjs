/** Apply only the locally rehearsed bigint-default repair to the offline candidate. */
import dotenv from "dotenv";
import pg from "pg";
import { readFile, lstat, writeFile } from "node:fs/promises";
import { productionCandidateUrl } from "./production-candidate-boundary.mjs";
import { tableFingerprintsBatched, assertFingerprints, sha256 } from "./recovery-integrity.mjs";
if (!process.argv.includes("--apply-candidate")) throw new Error("EXPLICIT_CANDIDATE_APPLY_REQUIRED");
const args=Object.fromEntries(process.argv.slice(2).filter(v=>v!=="--apply-candidate").map(v=>{
  const m=/^--(backup-report|report)=(\/.*)$/.exec(v);if(!m)throw new Error("INVALID_ARGUMENT");return[m[1],m[2]];
}));
let client;
try {
  const stat=await lstat(args["backup-report"]);
  if(!stat.isFile()||stat.isSymbolicLink()||stat.uid!==process.getuid()||stat.mode&0o077)throw new Error("PRIVATE_BACKUP_REPORT_REQUIRED");
  const backup=JSON.parse(await readFile(args["backup-report"],"utf8"));
  const sql=await readFile(new URL('./sql/neon-production-generated-ids.sql',import.meta.url),'utf8');
  if(backup.result!=="PASS"||backup.target!=="existing-production-candidate"||!backup.restoredFromEncryptedArchive||
    !backup.applicationRowAndSchemaFingerprintsVerified||backup.remoteWrites!==0||
    backup.generatedIdsRehearsal?.sqlSha256!==sha256(sql)||!backup.generatedIdsRehearsal.idempotent)throw new Error("REHEARSED_GENERATED_IDS_REQUIRED");
  dotenv.config({path:'.migration.env',quiet:true});
  client=new pg.Client({connectionString:productionCandidateUrl(process.env.NEON_PRODUCTION_DATABASE_URL).href,connectionTimeoutMillis:15000,query_timeout:30000});
  client.on('error',()=>{});await client.connect();await client.query('BEGIN');
  await client.query("SET LOCAL statement_timeout='30s'");
  await client.query('LOCK TABLE public.audit_logs,public.guest_college_verification_sends IN ACCESS EXCLUSIVE MODE');
  const before=await tableFingerprintsBatched(client);
  if(before.length!==backup.tables||before.reduce((n,r)=>n+r.count,0)!==backup.rows)throw new Error("CANDIDATE_CHANGED_SINCE_REHEARSAL");
  await client.query(sql);
  assertFingerprints(before,await tableFingerprintsBatched(client));
  const defaults=(await client.query(`SELECT column_default FROM information_schema.columns WHERE table_schema='public'
    AND table_name IN ('audit_logs','guest_college_verification_sends') AND column_name='id'`)).rows;
  if(defaults.length!==2||defaults.some(r=>!r.column_default?.startsWith('nextval(')))throw new Error("GENERATED_DEFAULT_MISSING");
  await client.query('COMMIT');
  const report={result:'PASS',at:new Date().toISOString(),sqlSha256:sha256(sql),defaultsVerified:2,
    originalRowsUnchanged:true,sourceWrites:0,authIdentityChanges:0,productionTrafficSwitched:false};
  await writeFile(args.report,JSON.stringify(report,null,2),{mode:0o600,flag:'wx'});console.log(JSON.stringify(report));
}catch(error){await client?.query('ROLLBACK').catch(()=>{});console.error(JSON.stringify({result:'FAIL',code:/^[A-Z_]+$/.test(error?.message??'')?error.message:error.code??'CANDIDATE_GENERATED_IDS_FAILED'}));process.exitCode=1;}
finally{await client?.end().catch(()=>{});}
