import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sourceDatabaseWriteFence} from './source-database-write-fence.mjs';
const input={tables:['profiles','skills'],fenceId:'10000000-0000-4000-8000-000000000001'};
test('fences direct DML, truncate and storage metadata without bypassing RLS or changing roles',()=>{
 const f=sourceDatabaseWriteFence(input);assert.equal(f.targets.length,3);assert.ok(f.install.includes('INSERT OR UPDATE OR DELETE OR TRUNCATE'));assert.ok(f.install.includes('ENABLE ALWAYS TRIGGER'));assert.ok(f.install.includes('SECURITY INVOKER'));
 assert.ok(!/DISABLE|SECURITY DEFINER|CASCADE|ALTER ROLE|row_security/i.test(f.install));
});
test('refuses duplicate tables, SQL names and arbitrary fence identifiers',()=>{
 for(const patch of [{tables:['skills','skills']},{tables:['skills;DROP']},{fenceId:"x'"},{tables:[]}])assert.throws(()=>sourceDatabaseWriteFence({...input,...patch}),/INVALID_SOURCE_FENCE_TARGET/);
});
test('removal fails closed before DDL when the installed function was replaced',async()=>{
 const calls=[];await assert.rejects(sourceDatabaseWriteFence(input).remove({query:async(sql)=>{calls.push(sql);return {rows:[]};}}),/SOURCE_FENCE_FUNCTION_MISMATCH/);assert.equal(calls.length,1);
});
test('TRIGGER permission alone cannot authorize ENABLE ALWAYS on storage',async()=>{
 const calls=[];const result=await sourceDatabaseWriteFence(input).preflight({query:async(sql,params)=>{
   calls.push({sql,params});return {rows:[{schema:'public',table:'profiles',can_alter:true,can_trigger:true},{schema:'public',table:'skills',can_alter:true,can_trigger:true},{schema:'storage',table:'objects',can_alter:false,can_trigger:true}]};
 }});
 assert.equal(result.ready,false);assert.deepEqual(result.blocked,[{schema:'storage',table:'objects'}]);
 assert.equal(result.roleChangesAllowed,false);assert.equal(calls.length,1);assert.ok(calls[0].sql.startsWith('SELECT'));
});
test('preflight rejects a missing target and accepts an entirely owner-controlled set',async()=>{
 const fence=sourceDatabaseWriteFence({...input,includeStorage:false});
 await assert.rejects(fence.preflight({query:async()=>({rows:[]})}),/SOURCE_FENCE_TABLE_MISSING/);
 assert.equal((await fence.preflight({query:async()=>({rows:input.tables.map(table=>({schema:'public',table,can_alter:true,can_trigger:true}))})})).ready,true);
});
test('named DDL operator inspection is read-only and validates the role identifier',async()=>{
 const fence=sourceDatabaseWriteFence({...input,includeStorage:false});let inspected;
 const client={query:async(sql,params)=>{inspected=params[2];assert.ok(sql.startsWith('SELECT'));return {rows:input.tables.map(table=>({schema:'public',table,can_alter:true,can_trigger:true}))};}};
 await fence.preflight(client,{operatorRole:'postgres'});assert.equal(inspected,'postgres');
 await assert.rejects(fence.preflight(client,{operatorRole:"postgres';SET ROLE x"}),/INVALID_SOURCE_FENCE_OPERATOR/);
});
test('new public tables absent from the reviewed snapshot block the fence',async()=>{
 const fence=sourceDatabaseWriteFence({...input,includeStorage:false});
 const rows=[...input.tables,'new_applicant_records'].map(table=>({schema:'public',table,can_alter:true,can_trigger:true}));
 await assert.rejects(fence.preflight({query:async()=>({rows})}),/SOURCE_FENCE_TABLE_INVENTORY_CHANGED/);
});
