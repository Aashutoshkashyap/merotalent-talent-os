/** Reversible database write fence. Object-byte quiescence is a separate gate. */
import {quoteIdentifier as q} from './recovery-integrity.mjs';
const name='merotalent_cutover_write_fence';
export function sourceDatabaseWriteFence({tables,fenceId,includeStorage=true}){
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(fenceId??'')||!Array.isArray(tables)||!tables.length||tables.some(t=>typeof t!=='string'||!/^[a-z][a-z0-9_]*$/.test(t))||new Set(tables).size!==tables.length)throw Error('INVALID_SOURCE_FENCE_TARGET');
  const targets=tables.toSorted().map(table=>({schema:'public',table}));
  if(includeStorage)targets.push({schema:'storage',table:'objects'});
  const qualified=t=>`${q(t.schema)}.${q(t.table)}`;
  const body=`BEGIN\n  RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='MEROTALENT_MIGRATION_WRITES_PAUSED', DETAIL='${fenceId}';\nEND;`;
  const install=`SET LOCAL lock_timeout='5s';\nLOCK TABLE ${targets.map(qualified).join(',')} IN SHARE ROW EXCLUSIVE MODE;
CREATE FUNCTION public.${q(name)}() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fence$${body}$fence$;
${targets.map(t=>`CREATE TRIGGER ${q(name)} BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON ${qualified(t)} FOR EACH STATEMENT EXECUTE FUNCTION public.${q(name)}();\nALTER TABLE ${qualified(t)} ENABLE ALWAYS TRIGGER ${q(name)};`).join('\n')}`;
  return {targets,body,install,async preflight(client,{operatorRole=null}={}){
    // ENABLE ALWAYS requires table ownership, not just the TRIGGER grant.
    // Check all targets before any DDL; never change role membership to pass.
    if(operatorRole!==null&&!/^[a-z][a-z0-9_]*$/.test(operatorRole))throw Error('INVALID_SOURCE_FENCE_OPERATOR');
    // An inventory endpoint may run as a dedicated read-only identity. Inspect
    // the named DDL operator without impersonating it or granting it privileges.
    const rows=(await client.query(`SELECT n.nspname AS schema,c.relname AS table,
      c.relname=ANY($1::text[]) AS expected_public_table,
      pg_has_role(COALESCE($3::name,current_user),c.relowner,'USAGE') AS can_alter,
      has_table_privilege(COALESCE($3::name,current_user),c.oid,'TRIGGER') AS can_trigger
      FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE (n.nspname='public' AND c.relkind IN ('r','p'))
      OR ($2::boolean AND n.nspname='storage' AND c.relname='objects')`,[tables,includeStorage,operatorRole])).rows;
    if(rows.some(r=>!targets.some(target=>r.schema===target.schema&&r.table===target.table)))throw Error('SOURCE_FENCE_TABLE_INVENTORY_CHANGED');
    if(rows.length!==targets.length||targets.some(target=>!rows.some(r=>r.schema===target.schema&&r.table===target.table)))throw Error('SOURCE_FENCE_TABLE_MISSING');
    const blocked=rows.filter(row=>!row.can_alter||!row.can_trigger).map(({schema,table})=>({schema,table}));
    return {ready:blocked.length===0,blocked,required:'TABLE_OWNER_AND_TRIGGER',roleChangesAllowed:false};
  },async verify(client){
    const functions=(await client.query(`SELECT p.prosrc,p.prosecdef,p.prorettype='trigger'::regtype AS is_trigger FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname=$1`,[name])).rows;
    if(functions.length!==1||functions[0].prosrc!==body||functions[0].prosecdef||!functions[0].is_trigger)throw Error('SOURCE_FENCE_FUNCTION_MISMATCH');
    const actual=(await client.query(`SELECT n.nspname AS schema,c.relname AS table,t.tgenabled,t.tgtype,p.proname AS function_name,pn.nspname AS function_schema
      FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_namespace pn ON pn.oid=p.pronamespace WHERE t.tgname=$1 AND NOT t.tgisinternal`,[name])).rows;
    if(actual.length!==targets.length||targets.some(target=>!actual.some(a=>a.schema===target.schema&&a.table===target.table&&a.tgenabled==='A'&&Number(a.tgtype)===62&&a.function_name===name&&a.function_schema==='public')))throw Error('SOURCE_FENCE_COVERAGE_MISMATCH');
    return {tables:targets.length,databaseWritesBlocked:true,storageMetadataIncluded:includeStorage,objectBytesQuiescent:false};
  },async remove(client){
    await this.verify(client);
    await client.query(`LOCK TABLE ${targets.map(qualified).join(',')} IN SHARE ROW EXCLUSIVE MODE;\n${targets.map(t=>`DROP TRIGGER ${q(name)} ON ${qualified(t)};`).join('\n')}\nDROP FUNCTION public.${q(name)}();`);
  }};
}
