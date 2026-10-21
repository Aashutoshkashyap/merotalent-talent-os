/** Forward-only validation of the reviewed staging CHECK constraints. Never changes business rows. */
import dotenv from "dotenv";
import pg from "pg";
import {writeFile}from"node:fs/promises";
import {isAbsolute}from"node:path";
import {requireNeonMigrationStaging}from"./require-neon-migration-staging.mjs";
import {quoteIdentifier as q,sha256}from"./recovery-integrity.mjs";
const reviewed=new Set(["companies_status_check","courses_partner_redirect_check","courses_status_check","institutes_established_year_check","institutes_institution_category_check","institutes_source_url_check","institutes_status_check","jobs_approval_status_check","jobs_status_check","mentors_approval_status_check","notifications_channel_check","notifications_status_check","packages_default_free_check","packages_duration_days_check","packages_module_scope_check","packages_package_kind_check","payments_payout_status_check","payments_reconciliation_status_check","profiles_account_status_check","sub_admin_requests_modules_check","sub_admin_requests_status_check"]);
let client,open=false,phase="preflight";
try{
  const args={};for(const arg of process.argv.slice(2)){const m=/^--(mode|report)=(.+)$/.exec(arg);if(!m||args[m[1]])throw new Error("INVALID_ARGUMENT");args[m[1]]=m[2];}
  const mode=args.mode??"dry-run",branch="br-frosty-haze-azsnybmr";
  if(!["dry-run","rollback-probe","apply-staging"].includes(mode)||!isAbsolute(args.report??""))throw new Error("MODE_AND_PRIVATE_REPORT_REQUIRED");
  dotenv.config({path:".migration.env",quiet:true});
  if(process.env.VERCEL_ENV==="production"||process.env.NEON_STAGING_BRANCH_ID!==branch)throw new Error("STAGING_ONLY");
  if(mode==="apply-staging"&&process.env.NEON_STAGING_CONSTRAINT_APPLY!==branch)throw new Error("STAGING_APPLY_NOT_ENABLED");
  const url=new URL(process.env.NEON_STAGING_DATABASE_URL);requireNeonMigrationStaging(url.href);
  if(url.pathname!=="/neondb"||["host","hostaddr","options"].some(k=>url.searchParams.has(k)))throw new Error("DATABASE_OVERRIDE_DENIED");
  url.searchParams.set("sslmode","verify-full");client=new pg.Client({connectionString:url.href,connectionTimeoutMillis:15000});await client.connect();
  await client.query(mode==="dry-run"?"BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY":"BEGIN ISOLATION LEVEL SERIALIZABLE");open=true;
  await client.query("SET LOCAL statement_timeout='30s';SET LOCAL lock_timeout='5s'");
  const constraints=(await client.query(`SELECT c.relname AS table,p.conname AS name,p.contype AS type,pg_get_expr(p.conbin,p.conrelid) AS expression,pg_get_constraintdef(p.oid) AS definition
    FROM pg_constraint p JOIN pg_class c ON c.oid=p.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT p.convalidated ORDER BY c.relname,p.conname`)).rows;
  if(constraints.some(c=>c.type!=="c"||!reviewed.has(c.name)))throw new Error("UNREVIEWED_CONSTRAINT");
  const tables=[...new Set(constraints.map(c=>c.table))].sort();
  if(mode!=="dry-run"&&tables.length)await client.query(`LOCK TABLE ${tables.map(t=>`public.${q(t)}`).join(",")} IN SHARE ROW EXCLUSIVE MODE`);
  phase="check_rows";const checks=[];
  for(const c of constraints){const n=(await client.query(`SELECT count(*)::int AS n FROM public.${q(c.table)} WHERE NOT (${c.expression})`)).rows[0].n;checks.push({table:c.table,name:c.name,definitionHash:sha256(c.definition),violatingRows:n});}
  const invalid=checks.filter(c=>c.violatingRows>0);
  if(!invalid.length&&mode!=="dry-run"){
    phase="validate";for(const c of constraints)await client.query(`ALTER TABLE public.${q(c.table)} VALIDATE CONSTRAINT ${q(c.name)}`);
    const pending=(await client.query("SELECT count(*)::int AS n FROM pg_constraint p JOIN pg_class c ON c.oid=p.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT p.convalidated")).rows[0].n;
    if(pending)throw new Error("CONSTRAINTS_REMAIN_UNVALIDATED");
  }
  phase="finish";await client.query(mode==="apply-staging"&&!invalid.length?"COMMIT":"ROLLBACK");open=false;
  const report={result:invalid.length?"BLOCKED":"PASS",mode,checked:checks.length,checks,invalidConstraints:invalid.length,validated:mode==="apply-staging"&&!invalid.length?checks.length:0,businessRowWrites:0,productionWrites:0};
  await writeFile(args.report,JSON.stringify(report,null,2),{mode:0o600,flag:"wx"});console.log(JSON.stringify(report));if(invalid.length)process.exitCode=2;
}catch(e){console.error(JSON.stringify({result:"FAIL",phase,code:/^[A-Z_]+$/.test(e.message)?e.message:"STAGING_CONSTRAINT_VALIDATION_FAILED",sqlState:/^[A-Z0-9]{5}$/.test(e.code??"")?e.code:null}));process.exitCode=1;}
finally{if(open)await client?.query("ROLLBACK").catch(()=>{});await client?.end().catch(()=>{});}
