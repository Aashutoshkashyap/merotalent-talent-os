/** Reviewed runtime DDL only. No source records, identities or traffic are changed. */
import dotenv from "dotenv";
import pg from "pg";
import { readFile, lstat, writeFile } from "node:fs/promises";
import { isAbsolute } from "node:path";
import { productionCandidateUrl } from "./production-candidate-boundary.mjs";
import { applyRuntimeCandidateFoundation } from "./runtime-foundation-rehearsal.mjs";

if (!process.argv.includes("--apply-candidate")) throw new Error("EXPLICIT_CANDIDATE_APPLY_REQUIRED");
const args = Object.fromEntries(process.argv.slice(2).filter(v=>v!=="--apply-candidate").map(v=>{
  const m=/^--(backup-report|report)=(.+)$/.exec(v); if(!m)throw new Error("INVALID_ARGUMENT");return[m[1],m[2]];
}));
let client;
try {
  if (!isAbsolute(args.report??"") || !isAbsolute(args["backup-report"]??"")) throw new Error("PRIVATE_ABSOLUTE_PATH_REQUIRED");
  const stat=await lstat(args["backup-report"]);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.uid!==process.getuid() || stat.mode&0o077) throw new Error("PRIVATE_BACKUP_REPORT_REQUIRED");
  const backup=JSON.parse(await readFile(args["backup-report"],"utf8"));
  if (backup.target!=="existing-production-candidate" || !backup.applicationRowAndSchemaFingerprintsVerified || backup.remoteWrites!==0) throw new Error("VERIFIED_RESTORE_REQUIRED");
  const artifact=JSON.parse(await readFile(backup.artifact,"utf8"));
  if (artifact.sha256!==backup.archiveSha256) throw new Error("BACKUP_ARCHIVE_MISMATCH");
  dotenv.config({path:".migration.env",quiet:true});
  const target=productionCandidateUrl(process.env.NEON_PRODUCTION_DATABASE_URL);
  client=new pg.Client({connectionString:target.href,connectionTimeoutMillis:15000,query_timeout:30000});
  client.on("error",()=>{});await client.connect();
  const applied=await applyRuntimeCandidateFoundation(client,target.href,backup);
  const report={result:"PASS",at:new Date().toISOString(),target:"offline-neon-production-candidate",
    backupArchiveSha256:backup.archiveSha256,applied,sourceWrites:0,sourceRecordsCopied:0,
    authIdentitiesCreated:0,productionTrafficSwitched:false};
  await writeFile(args.report,JSON.stringify(report,null,2),{mode:0o600,flag:"wx"});console.log(JSON.stringify(report));
} catch(error) {
  console.error(JSON.stringify({result:"FAIL",code:/^[A-Z_]+$/.test(error?.message??"")?error.message:error.code??"RUNTIME_FOUNDATION_FAILED"}));process.exitCode=1;
} finally {await client?.end().catch(()=>{});}
