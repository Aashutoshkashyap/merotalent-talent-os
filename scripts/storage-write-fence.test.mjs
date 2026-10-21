import {test} from 'node:test';import assert from 'node:assert/strict';
import {storageWriteFence} from './storage-write-fence.mjs';
import {storageStateWriteFence} from './storage-state-write-fence.mjs';
const fenceId='10000000-0000-4000-8000-000000000001';
test('compatibility helper delegates all SQL to the hardened private state fence',()=>{
 const f=storageWriteFence({fenceId});assert.equal(f.install,storageStateWriteFence(fenceId).install);
 assert.match(f.install,/TRUNCATE/);assert.doesNotMatch(f.install,/CREATE OR REPLACE|IF NOT EXISTS/);
 assert.equal(f.controlTable,'merotalent_migration.storage_freeze');
});
test('requires a reviewed immutable fence identifier',async()=>{
 assert.throws(()=>storageWriteFence(),/INVALID_STORAGE_FENCE_ID/);
 await assert.rejects(storageWriteFence({fenceId}).activate({query:()=>{throw Error('must not query');}},'another-id'),/STORAGE_FENCE_ID_MISMATCH/);
});
test('preflight requires both bucket and object lock/trigger permissions',async()=>{
 const rows=['buckets','objects'].map(relname=>({relname,can_trigger:true,can_lock:true,can_use_schema:true,can_create_schema:true}));
 assert.equal((await storageWriteFence({fenceId}).preflight({query:async()=>({rows})})).ready,true);
 assert.equal((await storageWriteFence({fenceId}).preflight({query:async()=>({rows:rows.map(row=>({...row,can_lock:false}))})})).ready,false);
 await assert.rejects(storageWriteFence({fenceId}).preflight({query:async()=>({rows:[]})}),/STORAGE_FENCE_TABLE_MISSING/);
});
