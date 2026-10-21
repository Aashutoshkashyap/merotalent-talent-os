/** Source-bound, read-only candidate data plan. No credential or row value is emitted. */
import dotenv from "dotenv";
import pg from "pg";
import { writeFile } from "node:fs/promises";
import { isAbsolute } from "node:path";
import { readEncryptedSourceSnapshot } from "./source-snapshot-artifact.mjs";
import { summarizeSourceSnapshot } from "./source-auth-snapshot.mjs";
import { productionCandidateUrl } from "./production-candidate-boundary.mjs";
import { sourceSnapshotPrimaryKeys } from "./plan-source-snapshot-delta.mjs";
import { planTableDelta, opaqueDelta } from "./staging-snapshot-delta.mjs";
import { precisionRepairPlan } from "./staging-timestamp-drift.mjs";
import { quoteIdentifier as q } from "./recovery-integrity.mjs";
import { verifiedCandidateOwnerLedger, preserveApprovedOwnerRole } from "./candidate-owner-exceptions.mjs";

let client;
try {
  const args = Object.fromEntries(process.argv.slice(2).map(v=>{
    const m=/^--(baseline|snapshot|snapshot-sha256|report)=(.+)$/.exec(v);if(!m)throw new Error("INVALID_ARGUMENT");return[m[1],m[2]];
  }));
  if (!isAbsolute(args.report??"")) throw new Error("PRIVATE_REPORT_REQUIRED");
  const source=await readEncryptedSourceSnapshot(args.snapshot), baseline=await readEncryptedSourceSnapshot(args.baseline);
  if (summarizeSourceSnapshot(source).snapshotSha256!==args["snapshot-sha256"])throw new Error("SOURCE_HASH_MISMATCH");
  dotenv.config({path:".migration.env",quiet:true});
  const url=productionCandidateUrl(process.env.NEON_PRODUCTION_DATABASE_URL);
  client=new pg.Client({connectionString:url.href,connectionTimeoutMillis:15000,query_timeout:30000});client.on("error",()=>{});
  await client.connect();await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  await client.query("SET LOCAL TIME ZONE 'UTC'");await client.query("SET LOCAL statement_timeout='30s'");
  // Reuse the exact, audited owner approval. This is not a generic conflict
  // override and never changes source/target data or links anyone by email.
  const ownerLedger = await verifiedCandidateOwnerLedger(client, source);
  const keys=sourceSnapshotPrimaryKeys(source), columns=source.publicColumns.map(JSON.parse);
  const tables=source.publicTableNames;
  const rows=(await client.query(tables.map(table=>`SELECT '${table}'::text AS table_name,to_jsonb(t)::text AS raw FROM public.${q(table)} t`).join(" UNION ALL "))).rows;
  const plans=[];let precisionRepairs=0, approvedOwnerExceptions=0;
  for (const table of tables) {
    const metadata=columns.filter(c=>c.table_name===table), names=metadata.map(c=>c.column_name);
    const target=rows.filter(r=>r.table_name===table).map(r=>r.raw);
    const reviewed=preserveApprovedOwnerRole({table,sourceRows:source.public[table],targetRows:target,ownerId:ownerLedger.ownerId});
    approvedOwnerExceptions+=reviewed.approvedExceptions;
    const plan=planTableDelta({table,baseline:baseline.public[table],final:reviewed.rows,target,
      keys:keys.get(table),columns:names,timestampColumns:metadata.filter(c=>c.udt_name==='timestamptz'&&c.udt_schema==='pg_catalog').map(c=>c.column_name)});
    const repairs=precisionRepairPlan({plan,baseline:baseline.public[table],source:reviewed.rows,target,keys:keys.get(table),columns:metadata});
    precisionRepairs+=repairs.operations.length;
    plans.push({...opaqueDelta(plan),reviewedTimestampRepairs:repairs.operations.length,precisionLedger:repairs.ledger});
  }
  await client.query("ROLLBACK");
  const result={result:"READ_ONLY_PLAN",at:new Date().toISOString(),sourceSnapshotSha256:args["snapshot-sha256"],
    baselineSnapshotSha256:summarizeSourceSnapshot(baseline).snapshotSha256,sourceTables:tables.length,
    sourceRows:plans.reduce((n,p)=>n+p.sourceCount,0),targetSourceTableRows:rows.length,
    exactMatches:plans.reduce((n,p)=>n+p.matched.length,0),safeOrdinaryOperations:plans.reduce((n,p)=>n+p.operations.length,0),
    approvedOwnerExceptions,identityLedgerSha256:ownerLedger.hash,
    reviewedTimestampRepairs:precisionRepairs,conflicts:plans.reduce((n,p)=>n+p.conflicts.length,0),
    targetOnlyRows:plans.reduce((n,p)=>n+p.targetOnly.length,0),plans,sourceWrites:0,targetWrites:0,productionCutover:false};
  await writeFile(args.report,JSON.stringify(result,null,2),{mode:0o600,flag:"wx"});
  const {plans:_,...summary}=result;console.log(JSON.stringify(summary));
} catch(error){await client?.query("ROLLBACK").catch(()=>{});console.error(JSON.stringify({result:"FAIL",code:/^[A-Z_]+$/.test(error?.message??"")?error.message:error.code??"CANDIDATE_DATA_PLAN_FAILED"}));process.exitCode=1;}
finally{await client?.end().catch(()=>{});}
