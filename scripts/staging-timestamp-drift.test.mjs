import {test} from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import {readFileSync}from"node:fs";
import {classifyTimestampDrift,isPureTimestampTrigger,isUnchangedFieldGuard,isColumnDisjointTrigger,auditedProfileCreationRepair} from "./staging-timestamp-drift.mjs";
const columns=[{column_name:"created_at",udt_schema:"pg_catalog",udt_name:"timestamptz",datetime_precision:6}];
const source=JSON.stringify({id:1,created_at:"2026-10-01T00:00:00.123456+00:00",name:"synthetic"});
const target=JSON.stringify({id:1,created_at:"2026-10-01T00:00:00.123+00:00",name:"synthetic"});
const classify=(s=source,t=target,b=s)=>classifyTimestampDrift({baseline:b,source:s,target:t,keys:["id"],columns});
test("reproduces historical pg SELECT * Date parser losing microseconds before parameterized insertion",()=>{
  assert.equal(pg.types.getTypeParser(1184,"text")("2026-10-01 00:00:00.123456+00:00").toISOString(),"2026-10-01T00:00:00.123Z");
  assert.equal(classify().classification,"PROVEN_IMPORT_PRECISION_LOSS");
  assert.deepEqual(classify().repairFields,["created_at"]);
});
test("never repairs independent fields, timestamp writes, source changes, nested JSON or timestamp-looking text",()=>{
  assert.equal(classify(source,target.replace("synthetic","edited")).classification,"RETAIN_UNRESOLVED");
  assert.equal(classify(source,target.replace(".123+",".124+")).classification,"RETAIN_UNRESOLVED");
  assert.equal(classify(source,target,source.replace("123456","123457")).classification,"RETAIN_UNRESOLVED");
  const text=classifyTimestampDrift({baseline:source,source,target,keys:["id"],columns:[]});
  assert.equal(text.classification,"RETAIN_UNRESOLVED");
  assert.equal(classify(JSON.stringify({id:1,nested:JSON.parse(source)}),JSON.stringify({id:1,nested:JSON.parse(target)})).classification,"RETAIN_UNRESOLVED");
});
test("only exact reviewed timestamp trigger bodies qualify; authorization and audit triggers do not",()=>{
  const t={function_schema:"public",function_name:"update_updated_at_column",language:"plpgsql",type:19,body:"BEGIN\n NEW.updated_at = now();\n RETURN NEW;\nEND;"};
  assert.equal(isPureTimestampTrigger(t),true);
  assert.equal(isPureTimestampTrigger({...t,body:"BEGIN PERFORM log_change(); NEW.updated_at=now(); RETURN NEW; END;"}),false);
  assert.equal(isPureTimestampTrigger({...t,function_name:"authorize"}),false);
});
test("role and payment guards stay enabled only with the reviewed early-return body",()=>{
  const sql=readFileSync(new URL("../supabase/migrations/20260806090000_modular_platform_backend.sql",import.meta.url),"utf8");
  for(const name of ["protect_last_admin_role","sync_payment_result"]) {
    const segment=sql.slice(sql.indexOf(`CREATE OR REPLACE FUNCTION public.${name}()`));
    const body=segment.slice(segment.indexOf("AS $$")+5,segment.indexOf("$$;"));
    const trigger={function_schema:"public",function_name:name,language:"plpgsql",body};
    assert.equal(isUnchangedFieldGuard(trigger),true);
    assert.equal(isUnchangedFieldGuard({...trigger,body:body.replace("BEGIN","BEGIN PERFORM external_write();")}),false);
    assert.equal(isPureTimestampTrigger(trigger),false);
  }
});
test("column-specific guards stay enabled and are skipped only if no repaired column is watched",()=>{
  assert.equal(isColumnDisjointTrigger({update_columns:["module_scope","is_active"]},["created_at","updated_at"]),true);
  assert.equal(isColumnDisjointTrigger({update_columns:["updated_at"]},["updated_at"]),false);
  assert.equal(isColumnDisjointTrigger({update_columns:[]},["created_at"]),false);
  assert.equal(isColumnDisjointTrigger({},["created_at"]),false);
});
test("mixed profile corrections require an approved-snapshot audit and preserve the independent update field",()=>{
  const proof={classification:"RETAIN_UNRESOLVED",fields:[{field:"created_at",reason:"PG_DATE_MICROSECOND_TRUNCATION"},{field:"updated_at",reason:"INDEPENDENT_OR_UNPROVEN_CHANGE"}]};
  assert.equal(auditedProfileCreationRepair(proof,1),true);
  assert.equal(auditedProfileCreationRepair(proof,0),false);
  assert.equal(auditedProfileCreationRepair({...proof,fields:[...proof.fields,{field:"phone",reason:"INDEPENDENT_OR_UNPROVEN_CHANGE"}]},1),false);
  assert.equal(auditedProfileCreationRepair({...proof,fields:proof.fields.map(f=>({...f,reason:"INDEPENDENT_OR_UNPROVEN_CHANGE"}))},1),false);
});
