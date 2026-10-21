/** Source-shaped catalog comparison. Definitions are hashed, never printed; no DDL is executed. */
import {evidenceHash} from "./staging-timestamp-drift.mjs";
import {parseLosslessSnapshotRow} from "./lossless-snapshot-json.mjs";
import {quoteIdentifier as q} from "./recovery-integrity.mjs";
const queries={
  columns:"SELECT table_name,column_name,ordinal_position,data_type,udt_schema,udt_name,is_nullable,column_default,is_identity,identity_generation,identity_start,identity_increment,identity_minimum,identity_maximum,identity_cycle,is_generated,generation_expression FROM information_schema.columns WHERE table_schema='public'",
  constraints:"SELECT c.relname AS table_name,p.conname AS name,p.contype AS type,pg_get_constraintdef(p.oid,true) AS definition FROM pg_constraint p JOIN pg_class c ON c.oid=p.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'",
  indexes:"SELECT tablename AS table_name,indexname AS name,indexdef AS definition FROM pg_indexes WHERE schemaname='public'",
  functions:"SELECT p.proname AS name,pg_get_function_identity_arguments(p.oid) AS arguments,pg_get_functiondef(p.oid) AS definition,p.prosecdef AS security_definer,p.proconfig AS settings FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prokind IN ('f','p')",
  triggers:"SELECT c.relname AS table_name,t.tgname AS name,pg_get_triggerdef(t.oid,true) AS definition,t.tgenabled AS enabled FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal",
  views:"SELECT viewname AS name,definition FROM pg_views WHERE schemaname='public'",
  policies:"SELECT tablename AS table_name,policyname AS name,permissive,roles,cmd,qual,with_check FROM pg_policies WHERE schemaname='public'",
  enums:"SELECT t.typname AS name,e.enumlabel AS label,e.enumsortorder AS ordering FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public'",
  sequences:"SELECT sequencename AS name,data_type::text,start_value,min_value,max_value,increment_by,cycle,cache_size,last_value FROM pg_sequences WHERE schemaname='public'",
  extensions:"SELECT e.extname AS name,e.extversion AS version,n.nspname AS schema FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace",
};
export function compareSchemaRows(source,target) {
  const key=r=>[r.table_name??"",r.name??r.column_name,r.arguments??"",r.label??""].join("|");
  const s=new Map(source.map(r=>[key(r),r])),t=new Map(target.map(r=>[key(r),r]));
  const entries=[...new Set([...s.keys(),...t.keys()])].sort().map(k=>({object:k,sourceHash:s.has(k)?evidenceHash(s.get(k)):null,targetHash:t.has(k)?evidenceHash(t.get(k)):null,
    status:!s.has(k)?"TARGET_ONLY":!t.has(k)?"SOURCE_ONLY":evidenceHash(s.get(k))===evidenceHash(t.get(k))?"EXACT":"DEFINITION_DIFFERS"}));
  return {sourceCount:s.size,targetCount:t.size,exact:entries.filter(e=>e.status==="EXACT").length,entries};
}
export async function sourceSchemaEvidence(client,snapshot) {
  const result={};
  for(const [category,sql] of Object.entries(queries)) {
    const rows=(await client.query(`SELECT to_jsonb(c)::text AS raw FROM (${sql}) c`)).rows.map(r=>parseLosslessSnapshotRow(r.raw));
    result[category]=compareSchemaRows((category==="columns"?snapshot.publicColumns:snapshot.schema[category]??[]).map(parseLosslessSnapshotRow),rows);
  }
  const foreignKeys=(await client.query(`SELECT c.relname AS child,np.nspname AS parent_schema,p.relname AS parent,k.conname AS name,k.convalidated AS validated,
    ARRAY(SELECT a.attname::text FROM unnest(k.conkey) WITH ORDINALITY s(n,o) JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum=s.n ORDER BY s.o) AS child_columns,
    ARRAY(SELECT a.attname::text FROM unnest(k.confkey) WITH ORDINALITY s(n,o) JOIN pg_attribute a ON a.attrelid=p.oid AND a.attnum=s.n ORDER BY s.o) AS parent_columns
    FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_class p ON p.oid=k.confrelid
    JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_namespace np ON np.oid=p.relnamespace WHERE n.nspname='public' AND k.contype='f' ORDER BY c.relname,k.conname`)).rows;
  result.relationships=[];
  for(let offset=0;offset<foreignKeys.length;offset+=40) {
    const batch=foreignKeys.slice(offset,offset+40);
    const checks=(await client.query(batch.map((fk,i)=>`SELECT ${i}::int AS position,count(*)::int AS n FROM public.${q(fk.child)} c WHERE ${fk.child_columns.map(k=>`c.${q(k)} IS NOT NULL`).join(" AND ")}
      AND NOT EXISTS (SELECT 1 FROM ${q(fk.parent_schema)}.${q(fk.parent)} p WHERE ${fk.child_columns.map((k,j)=>`c.${q(k)}=p.${q(fk.parent_columns[j])}`).join(" AND ")})`).join(" UNION ALL "))).rows;
    for(const [i,fk]of batch.entries())result.relationships.push({table:fk.child,constraint:fk.name,validated:fk.validated,missingParentRows:checks.find(c=>c.position===i).n});
  }
  return result;
}
