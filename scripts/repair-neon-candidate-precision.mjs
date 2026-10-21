/** Backup/ledger-gated candidate precision repair; source access is encrypted-file read only. */
import dotenv from "dotenv";
import pg from "pg";
import { readFile, lstat, writeFile } from "node:fs/promises";
import { readEncryptedSourceSnapshot } from "./source-snapshot-artifact.mjs";
import { summarizeSourceSnapshot } from "./source-auth-snapshot.mjs";
import { productionCandidateUrl } from "./production-candidate-boundary.mjs";
import { runCandidatePrecision } from "./candidate-precision-repair.mjs";
let client;
try {
  const args=Object.fromEntries(process.argv.slice(2).map(v=>{
    const m=/^--(baseline|baseline-sha256|snapshot|snapshot-sha256|backup-report|report|mode|expected-ledger-sha256)=(.+)$/.exec(v);if(!m)throw new Error("INVALID_ARGUMENT");return[m[1],m[2]];
  }));
  if(!args.report?.startsWith('/')||!args['backup-report']?.startsWith('/'))throw new Error("PRIVATE_REPORT_REQUIRED");
  const source=await readEncryptedSourceSnapshot(args.snapshot),baseline=await readEncryptedSourceSnapshot(args.baseline);
  if(summarizeSourceSnapshot(source).snapshotSha256!==args['snapshot-sha256']||summarizeSourceSnapshot(baseline).snapshotSha256!==args['baseline-sha256'])throw new Error("SOURCE_HASH_MISMATCH");
  const stat=await lstat(args['backup-report']);if(!stat.isFile()||stat.isSymbolicLink()||stat.mode&0o077||stat.uid!==process.getuid())throw new Error("PRIVATE_BACKUP_REPORT_REQUIRED");
  const backup=JSON.parse(await readFile(args['backup-report'],'utf8'));
  if(backup.result!=='PASS'||backup.target!=='existing-production-candidate'||!backup.applicationRowAndSchemaFingerprintsVerified)throw new Error("VERIFIED_RESTORE_REQUIRED");
  dotenv.config({path:'.migration.env',quiet:true});const url=productionCandidateUrl(process.env.NEON_PRODUCTION_DATABASE_URL);
  client=new pg.Client({connectionString:url.href,connectionTimeoutMillis:15000,query_timeout:65000});client.on('error',()=>{});await client.connect();
  const result=await runCandidatePrecision(client,baseline,source,{targetUrl:url.href,mode:args.mode??'dry-run',backup,expectedLedger:args['expected-ledger-sha256']});
  const report={...result,sourceSnapshotSha256:args['snapshot-sha256'],baselineSnapshotSha256:args['baseline-sha256'],backupArchiveSha256:backup.archiveSha256};
  await writeFile(args.report,JSON.stringify(report,null,2),{mode:0o600,flag:'wx'});console.log(JSON.stringify(report));
}catch(error){console.error(JSON.stringify({result:'FAIL',code:/^[A-Z_]+$/.test(error?.message??'')?error.message:error.code??'CANDIDATE_PRECISION_FAILED'}));process.exitCode=1;}
finally{await client?.end().catch(()=>{});}
